-- CLM Asso - socle Auth, profils, clubs et adhésions
-- Sur votre projet actuel, ce socle est probablement déjà installé.
-- Pour une base neuve : exécuter 001 puis 002.

create extension if not exists pgcrypto;

do $$
begin
  create type public.clm_asso_club_role as enum ('owner', 'admin', 'manager', 'coach', 'member');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.clm_asso_membership_status as enum ('pending', 'active', 'suspended');
exception when duplicate_object then null;
end $$;

create table if not exists public.clm_asso_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clm_asso_clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  acronym text,
  description text,
  logo_url text,
  season_label text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clm_asso_club_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clm_asso_clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.clm_asso_club_role not null default 'member',
  status public.clm_asso_membership_status not null default 'pending',
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, user_id)
);

create index if not exists clm_asso_club_members_user_id_idx on public.clm_asso_club_members(user_id);
create index if not exists clm_asso_club_members_club_id_idx on public.clm_asso_club_members(club_id);

create or replace function public.clm_asso_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['clm_asso_profiles','clm_asso_clubs','clm_asso_club_members'] loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_updated_at', table_name);
    execute format('create trigger %I before update on public.%I for each row execute function public.clm_asso_set_updated_at()', table_name || '_updated_at', table_name);
  end loop;
end $$;

create or replace function public.clm_asso_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first_name text;
  v_last_name text;
  v_display_name text;
begin
  v_first_name := nullif(trim(new.raw_user_meta_data ->> 'first_name'), '');
  v_last_name := nullif(trim(new.raw_user_meta_data ->> 'last_name'), '');
  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(concat_ws(' ', v_first_name, v_last_name)), '')
  );

  insert into public.clm_asso_profiles (id, first_name, last_name, display_name)
  values (new.id, v_first_name, v_last_name, v_display_name)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists clm_asso_on_auth_user_created on auth.users;
create trigger clm_asso_on_auth_user_created
after insert on auth.users
for each row execute function public.clm_asso_handle_new_user();

insert into public.clm_asso_profiles (id, first_name, last_name, display_name)
select
  u.id,
  nullif(trim(u.raw_user_meta_data ->> 'first_name'), ''),
  nullif(trim(u.raw_user_meta_data ->> 'last_name'), ''),
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(concat_ws(' ', u.raw_user_meta_data ->> 'first_name', u.raw_user_meta_data ->> 'last_name')), '')
  )
from auth.users u
on conflict (id) do nothing;

create or replace function public.clm_asso_is_club_member(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clm_asso_club_members
    where club_id = p_club_id
      and user_id = (select auth.uid())
      and status = 'active'
  );
$$;

create or replace function public.clm_asso_has_club_role(
  p_club_id uuid,
  p_roles public.clm_asso_club_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clm_asso_club_members
    where club_id = p_club_id
      and user_id = (select auth.uid())
      and status = 'active'
      and role = any(p_roles)
  );
$$;

create or replace function public.clm_asso_shares_club_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clm_asso_club_members current_membership
    join public.clm_asso_club_members target_membership
      on target_membership.club_id = current_membership.club_id
    where current_membership.user_id = (select auth.uid())
      and current_membership.status = 'active'
      and target_membership.user_id = p_user_id
      and target_membership.status = 'active'
  );
$$;

revoke all on function public.clm_asso_is_club_member(uuid) from public;
revoke all on function public.clm_asso_has_club_role(uuid, public.clm_asso_club_role[]) from public;
revoke all on function public.clm_asso_shares_club_with(uuid) from public;
grant execute on function public.clm_asso_is_club_member(uuid) to authenticated;
grant execute on function public.clm_asso_has_club_role(uuid, public.clm_asso_club_role[]) to authenticated;
grant execute on function public.clm_asso_shares_club_with(uuid) to authenticated;

create or replace function public.clm_asso_create_club(p_name text, p_season_label text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_club_id uuid;
  v_slug_base text;
  v_slug text;
begin
  if v_user_id is null then raise exception 'Utilisateur non authentifié.'; end if;
  if char_length(trim(p_name)) < 2 then raise exception 'Le nom du club est trop court.'; end if;

  v_slug_base := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if v_slug_base = '' then v_slug_base := 'club'; end if;
  v_slug := v_slug_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.clm_asso_clubs (name, slug, season_label, created_by)
  values (trim(p_name), v_slug, nullif(trim(p_season_label), ''), v_user_id)
  returning id into v_club_id;

  insert into public.clm_asso_club_members (club_id, user_id, role, status, joined_at)
  values (v_club_id, v_user_id, 'owner', 'active', now());

  return v_club_id;
end;
$$;

revoke all on function public.clm_asso_create_club(text, text) from public;
grant execute on function public.clm_asso_create_club(text, text) to authenticated;

alter table public.clm_asso_profiles enable row level security;
alter table public.clm_asso_clubs enable row level security;
alter table public.clm_asso_club_members enable row level security;

drop policy if exists "clm_asso_profiles_select" on public.clm_asso_profiles;
create policy "clm_asso_profiles_select" on public.clm_asso_profiles
for select to authenticated
using (id = (select auth.uid()) or public.clm_asso_shares_club_with(id));

drop policy if exists "clm_asso_profiles_update_own" on public.clm_asso_profiles;
create policy "clm_asso_profiles_update_own" on public.clm_asso_profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "clm_asso_clubs_select_members" on public.clm_asso_clubs;
create policy "clm_asso_clubs_select_members" on public.clm_asso_clubs
for select to authenticated
using (public.clm_asso_is_club_member(id));

drop policy if exists "clm_asso_clubs_update_admins" on public.clm_asso_clubs;
create policy "clm_asso_clubs_update_admins" on public.clm_asso_clubs
for update to authenticated
using (public.clm_asso_has_club_role(id, array['owner'::public.clm_asso_club_role,'admin'::public.clm_asso_club_role]))
with check (public.clm_asso_has_club_role(id, array['owner'::public.clm_asso_club_role,'admin'::public.clm_asso_club_role]));

drop policy if exists "clm_asso_club_members_select_members" on public.clm_asso_club_members;
create policy "clm_asso_club_members_select_members" on public.clm_asso_club_members
for select to authenticated
using (public.clm_asso_is_club_member(club_id));

revoke all on table public.clm_asso_profiles, public.clm_asso_clubs, public.clm_asso_club_members from anon;
grant select, update on table public.clm_asso_profiles to authenticated;
grant select, update on table public.clm_asso_clubs to authenticated;
grant select on table public.clm_asso_club_members to authenticated;
