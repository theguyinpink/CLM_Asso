-- CLM Asso - données de production
-- À exécuter après la migration du socle d'authentification/clubs.
-- Le script est volontairement idempotent afin de pouvoir être relancé.

create extension if not exists pgcrypto;

-- =========================================================
-- PROFILS ET CLUBS : COLONNES COMPLÉMENTAIRES
-- =========================================================

alter table public.clm_asso_profiles
  add column if not exists phone text,
  add column if not exists birth_date date;

alter table public.clm_asso_clubs
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists website text,
  add column if not exists address text,
  add column if not exists postal_code text,
  add column if not exists city text,
  add column if not exists timezone text not null default 'Europe/Paris';

-- Synchronise correctement un profil lors de la création ou mise à jour Auth.
create or replace function public.clm_asso_handle_auth_user_profile()
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
  v_display_name := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');

  if v_display_name is null and (v_first_name is not null or v_last_name is not null) then
    v_display_name := nullif(trim(concat_ws(' ', v_first_name, v_last_name)), '');
  end if;

  insert into public.clm_asso_profiles (
    id,
    first_name,
    last_name,
    display_name,
    avatar_url
  )
  values (
    new.id,
    v_first_name,
    v_last_name,
    v_display_name,
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), '')
  )
  on conflict (id) do update
  set
    first_name = coalesce(excluded.first_name, clm_asso_profiles.first_name),
    last_name = coalesce(excluded.last_name, clm_asso_profiles.last_name),
    display_name = coalesce(excluded.display_name, clm_asso_profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, clm_asso_profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists clm_asso_on_auth_user_created on auth.users;
drop trigger if exists clm_asso_on_auth_user_profile_changed on auth.users;

create trigger clm_asso_on_auth_user_created
after insert on auth.users
for each row execute function public.clm_asso_handle_auth_user_profile();

create trigger clm_asso_on_auth_user_profile_changed
after update of raw_user_meta_data on auth.users
for each row execute function public.clm_asso_handle_auth_user_profile();

-- Rattrapage des métadonnées déjà disponibles sans écraser les valeurs saisies.
insert into public.clm_asso_profiles (
  id,
  first_name,
  last_name,
  display_name,
  avatar_url
)
select
  u.id,
  nullif(trim(u.raw_user_meta_data ->> 'first_name'), ''),
  nullif(trim(u.raw_user_meta_data ->> 'last_name'), ''),
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(concat_ws(
      ' ',
      u.raw_user_meta_data ->> 'first_name',
      u.raw_user_meta_data ->> 'last_name'
    )), '')
  ),
  nullif(trim(u.raw_user_meta_data ->> 'avatar_url'), '')
from auth.users u
on conflict (id) do update
set
  first_name = coalesce(excluded.first_name, clm_asso_profiles.first_name),
  last_name = coalesce(excluded.last_name, clm_asso_profiles.last_name),
  display_name = coalesce(excluded.display_name, clm_asso_profiles.display_name),
  avatar_url = coalesce(excluded.avatar_url, clm_asso_profiles.avatar_url),
  updated_at = now();

-- Le nom complet saisi est prioritaire sur un ancien nom d’affichage dérivé de l’e-mail.
update public.clm_asso_profiles
set
  display_name = trim(concat_ws(' ', first_name, last_name)),
  updated_at = now()
where nullif(trim(first_name), '') is not null
  and nullif(trim(last_name), '') is not null
  and display_name is distinct from trim(concat_ws(' ', first_name, last_name));

-- L'utilisateur peut créer/réparer sa propre ligne de profil.
drop policy if exists "clm_asso_profiles_insert_own" on public.clm_asso_profiles;
create policy "clm_asso_profiles_insert_own"
on public.clm_asso_profiles
for insert
to authenticated
with check (id = (select auth.uid()));

grant insert on table public.clm_asso_profiles to authenticated;

-- =========================================================
-- FONCTIONS D'AUTORISATION
-- =========================================================

create or replace function public.clm_asso_can_manage_club(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.clm_asso_has_club_role(
    p_club_id,
    array[
      'owner'::public.clm_asso_club_role,
      'admin'::public.clm_asso_club_role,
      'manager'::public.clm_asso_club_role
    ]
  );
$$;

create or replace function public.clm_asso_can_manage_sport(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.clm_asso_has_club_role(
    p_club_id,
    array[
      'owner'::public.clm_asso_club_role,
      'admin'::public.clm_asso_club_role,
      'manager'::public.clm_asso_club_role,
      'coach'::public.clm_asso_club_role
    ]
  );
$$;

revoke all on function public.clm_asso_can_manage_club(uuid) from public;
revoke all on function public.clm_asso_can_manage_sport(uuid) from public;
grant execute on function public.clm_asso_can_manage_club(uuid) to authenticated;
grant execute on function public.clm_asso_can_manage_sport(uuid) to authenticated;

-- =========================================================
-- ANNUAIRE DES MEMBRES
-- =========================================================

create table if not exists public.clm_asso_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clm_asso_clubs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  role_label text not null default 'Membre',
  status text not null default 'active' check (status in ('active', 'inactive', 'pending')),
  birth_date date,
  license_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists clm_asso_members_club_user_unique
  on public.clm_asso_members(club_id, user_id)
  where user_id is not null;
create index if not exists clm_asso_members_club_idx on public.clm_asso_members(club_id);
create index if not exists clm_asso_members_name_idx on public.clm_asso_members(club_id, last_name, first_name);

-- =========================================================
-- ÉQUIPES ET EFFECTIFS
-- =========================================================

create table if not exists public.clm_asso_teams (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clm_asso_clubs(id) on delete cascade,
  name text not null,
  category text not null default 'Autre',
  gender text not null default 'mixte' check (gender in ('masculin', 'feminin', 'mixte')),
  coach_member_id uuid references public.clm_asso_members(id) on delete set null,
  description text,
  color text not null default '#0875f5',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, name)
);

create index if not exists clm_asso_teams_club_idx on public.clm_asso_teams(club_id);

create table if not exists public.clm_asso_team_members (
  team_id uuid not null references public.clm_asso_teams(id) on delete cascade,
  member_id uuid not null references public.clm_asso_members(id) on delete cascade,
  team_role text not null default 'player' check (team_role in ('player', 'coach', 'assistant', 'manager')),
  jersey_number integer check (jersey_number is null or jersey_number between 0 and 99),
  position text,
  joined_at date not null default current_date,
  primary key (team_id, member_id)
);

create index if not exists clm_asso_team_members_member_idx on public.clm_asso_team_members(member_id);

-- =========================================================
-- CALENDRIER ET MATCHS
-- =========================================================

create table if not exists public.clm_asso_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clm_asso_clubs(id) on delete cascade,
  team_id uuid references public.clm_asso_teams(id) on delete set null,
  title text not null,
  event_type text not null default 'club' check (event_type in ('training', 'meeting', 'club', 'stage', 'other')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clm_asso_events_club_start_idx on public.clm_asso_events(club_id, starts_at);
create index if not exists clm_asso_events_team_idx on public.clm_asso_events(team_id);

create table if not exists public.clm_asso_matches (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clm_asso_clubs(id) on delete cascade,
  team_id uuid references public.clm_asso_teams(id) on delete set null,
  opponent_name text not null,
  starts_at timestamptz not null,
  location text,
  competition text,
  is_home boolean not null default true,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'postponed')),
  score_home integer check (score_home is null or score_home >= 0),
  score_away integer check (score_away is null or score_away >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clm_asso_matches_club_start_idx on public.clm_asso_matches(club_id, starts_at);
create index if not exists clm_asso_matches_team_idx on public.clm_asso_matches(team_id);

-- =========================================================
-- CONVOCATIONS
-- =========================================================

create table if not exists public.clm_asso_convocations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clm_asso_clubs(id) on delete cascade,
  match_id uuid references public.clm_asso_matches(id) on delete cascade,
  team_id uuid references public.clm_asso_teams(id) on delete set null,
  title text not null,
  message text,
  response_deadline timestamptz,
  status text not null default 'draft' check (status in ('draft', 'sent', 'closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clm_asso_convocations_club_idx on public.clm_asso_convocations(club_id, created_at desc);

create table if not exists public.clm_asso_convocation_recipients (
  id uuid primary key default gen_random_uuid(),
  convocation_id uuid not null references public.clm_asso_convocations(id) on delete cascade,
  member_id uuid not null references public.clm_asso_members(id) on delete cascade,
  response text not null default 'pending' check (response in ('pending', 'present', 'absent', 'maybe')),
  comment text,
  responded_at timestamptz,
  unique (convocation_id, member_id)
);

create index if not exists clm_asso_convocation_recipients_convocation_idx
  on public.clm_asso_convocation_recipients(convocation_id);

-- =========================================================
-- ANNONCES ET TÂCHES
-- =========================================================

create table if not exists public.clm_asso_announcements (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clm_asso_clubs(id) on delete cascade,
  title text not null,
  content text not null,
  announcement_type text not null default 'information' check (announcement_type in ('important', 'event', 'club', 'organization', 'information')),
  audience text not null default 'Tout le club',
  priority boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published')),
  scheduled_at timestamptz,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clm_asso_announcements_club_idx
  on public.clm_asso_announcements(club_id, created_at desc);

create table if not exists public.clm_asso_tasks (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clm_asso_clubs(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'Général',
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  due_at timestamptz,
  assignee_member_id uuid references public.clm_asso_members(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clm_asso_tasks_club_idx on public.clm_asso_tasks(club_id, status, due_at);

-- =========================================================
-- DOCUMENTS
-- =========================================================

create table if not exists public.clm_asso_documents (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clm_asso_clubs(id) on delete cascade,
  name text not null,
  folder text not null default 'Général',
  mime_type text,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  storage_path text not null unique,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clm_asso_documents_club_idx on public.clm_asso_documents(club_id, folder, created_at desc);

-- =========================================================
-- TRIGGERS updated_at
-- =========================================================

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'clm_asso_members',
    'clm_asso_teams',
    'clm_asso_events',
    'clm_asso_matches',
    'clm_asso_convocations',
    'clm_asso_announcements',
    'clm_asso_tasks',
    'clm_asso_documents'
  ] loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_updated_at', table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.clm_asso_set_updated_at()',
      table_name || '_updated_at',
      table_name
    );
  end loop;
end;
$$;

-- =========================================================
-- RLS GÉNÉRIQUE
-- =========================================================

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'clm_asso_members',
    'clm_asso_teams',
    'clm_asso_events',
    'clm_asso_matches',
    'clm_asso_convocations',
    'clm_asso_announcements',
    'clm_asso_tasks',
    'clm_asso_documents'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);

    execute format('drop policy if exists %I on public.%I', table_name || '_select', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.clm_asso_is_club_member(club_id))',
      table_name || '_select',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_insert', table_name);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.clm_asso_can_manage_sport(club_id))',
      table_name || '_insert',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_update', table_name);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.clm_asso_can_manage_sport(club_id)) with check (public.clm_asso_can_manage_sport(club_id))',
      table_name || '_update',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_delete', table_name);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.clm_asso_can_manage_sport(club_id))',
      table_name || '_delete',
      table_name
    );

    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    execute format('revoke all on table public.%I from anon', table_name);
  end loop;
end;
$$;

-- Les paramètres sensibles du club restent réservés owner/admin/manager.
drop policy if exists "clm_asso_clubs_update_admins" on public.clm_asso_clubs;
create policy "clm_asso_clubs_update_admins"
on public.clm_asso_clubs
for update
to authenticated
using (public.clm_asso_can_manage_club(id))
with check (public.clm_asso_can_manage_club(id));

-- Tables de liaison sans club_id direct.
alter table public.clm_asso_team_members enable row level security;

drop policy if exists "clm_asso_team_members_select" on public.clm_asso_team_members;
create policy "clm_asso_team_members_select"
on public.clm_asso_team_members for select to authenticated
using (
  exists (
    select 1 from public.clm_asso_teams t
    where t.id = team_id and public.clm_asso_is_club_member(t.club_id)
  )
);

drop policy if exists "clm_asso_team_members_insert" on public.clm_asso_team_members;
create policy "clm_asso_team_members_insert"
on public.clm_asso_team_members for insert to authenticated
with check (
  exists (
    select 1 from public.clm_asso_teams t
    where t.id = team_id and public.clm_asso_can_manage_sport(t.club_id)
  )
);

drop policy if exists "clm_asso_team_members_update" on public.clm_asso_team_members;
create policy "clm_asso_team_members_update"
on public.clm_asso_team_members for update to authenticated
using (
  exists (
    select 1 from public.clm_asso_teams t
    where t.id = team_id and public.clm_asso_can_manage_sport(t.club_id)
  )
)
with check (
  exists (
    select 1 from public.clm_asso_teams t
    where t.id = team_id and public.clm_asso_can_manage_sport(t.club_id)
  )
);

drop policy if exists "clm_asso_team_members_delete" on public.clm_asso_team_members;
create policy "clm_asso_team_members_delete"
on public.clm_asso_team_members for delete to authenticated
using (
  exists (
    select 1 from public.clm_asso_teams t
    where t.id = team_id and public.clm_asso_can_manage_sport(t.club_id)
  )
);

grant select, insert, update, delete on table public.clm_asso_team_members to authenticated;
revoke all on table public.clm_asso_team_members from anon;

alter table public.clm_asso_convocation_recipients enable row level security;

drop policy if exists "clm_asso_convocation_recipients_select" on public.clm_asso_convocation_recipients;
create policy "clm_asso_convocation_recipients_select"
on public.clm_asso_convocation_recipients for select to authenticated
using (
  exists (
    select 1 from public.clm_asso_convocations c
    where c.id = convocation_id and public.clm_asso_is_club_member(c.club_id)
  )
);

drop policy if exists "clm_asso_convocation_recipients_insert" on public.clm_asso_convocation_recipients;
create policy "clm_asso_convocation_recipients_insert"
on public.clm_asso_convocation_recipients for insert to authenticated
with check (
  exists (
    select 1 from public.clm_asso_convocations c
    where c.id = convocation_id and public.clm_asso_can_manage_sport(c.club_id)
  )
);

drop policy if exists "clm_asso_convocation_recipients_update" on public.clm_asso_convocation_recipients;
create policy "clm_asso_convocation_recipients_update"
on public.clm_asso_convocation_recipients for update to authenticated
using (
  exists (
    select 1 from public.clm_asso_convocations c
    where c.id = convocation_id and public.clm_asso_is_club_member(c.club_id)
  )
)
with check (
  exists (
    select 1 from public.clm_asso_convocations c
    where c.id = convocation_id and public.clm_asso_is_club_member(c.club_id)
  )
);

drop policy if exists "clm_asso_convocation_recipients_delete" on public.clm_asso_convocation_recipients;
create policy "clm_asso_convocation_recipients_delete"
on public.clm_asso_convocation_recipients for delete to authenticated
using (
  exists (
    select 1 from public.clm_asso_convocations c
    where c.id = convocation_id and public.clm_asso_can_manage_sport(c.club_id)
  )
);

grant select, insert, update, delete on table public.clm_asso_convocation_recipients to authenticated;
revoke all on table public.clm_asso_convocation_recipients from anon;

-- =========================================================
-- BACKFILL DU PROPRIÉTAIRE DANS L'ANNUAIRE
-- =========================================================

insert into public.clm_asso_members (
  club_id,
  user_id,
  first_name,
  last_name,
  email,
  role_label,
  status
)
select
  cm.club_id,
  cm.user_id,
  coalesce(nullif(trim(p.first_name), ''), 'À compléter'),
  coalesce(nullif(trim(p.last_name), ''), 'À compléter'),
  u.email,
  case cm.role
    when 'owner' then 'Propriétaire'
    when 'admin' then 'Administrateur'
    when 'manager' then 'Responsable'
    when 'coach' then 'Entraîneur'
    else 'Membre'
  end,
  'active'
from public.clm_asso_club_members cm
join auth.users u on u.id = cm.user_id
left join public.clm_asso_profiles p on p.id = cm.user_id
where cm.status = 'active'
on conflict (club_id, user_id) where user_id is not null do update
set
  first_name = case
    when clm_asso_members.first_name = 'À compléter' then excluded.first_name
    else clm_asso_members.first_name
  end,
  last_name = case
    when clm_asso_members.last_name = 'À compléter' then excluded.last_name
    else clm_asso_members.last_name
  end,
  email = coalesce(clm_asso_members.email, excluded.email),
  role_label = excluded.role_label,
  updated_at = now();

-- Redéfinition de la création de club pour alimenter aussi l'annuaire.
create or replace function public.clm_asso_create_club(
  p_name text,
  p_season_label text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_club_id uuid;
  v_slug_base text;
  v_slug text;
  v_first_name text;
  v_last_name text;
  v_email text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  if char_length(trim(p_name)) < 2 then
    raise exception 'Le nom du club est trop court.';
  end if;

  select
    coalesce(nullif(trim(p.first_name), ''), 'À compléter'),
    coalesce(nullif(trim(p.last_name), ''), 'À compléter'),
    u.email
  into v_first_name, v_last_name, v_email
  from auth.users u
  left join public.clm_asso_profiles p on p.id = u.id
  where u.id = v_user_id;

  v_slug_base := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if v_slug_base = '' then v_slug_base := 'club'; end if;
  v_slug := v_slug_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.clm_asso_clubs (name, slug, season_label, created_by)
  values (trim(p_name), v_slug, nullif(trim(p_season_label), ''), v_user_id)
  returning id into v_club_id;

  insert into public.clm_asso_club_members (club_id, user_id, role, status, joined_at)
  values (v_club_id, v_user_id, 'owner', 'active', now());

  insert into public.clm_asso_members (
    club_id, user_id, first_name, last_name, email, role_label, status
  ) values (
    v_club_id, v_user_id, v_first_name, v_last_name, v_email, 'Propriétaire', 'active'
  );

  return v_club_id;
end;
$$;

revoke all on function public.clm_asso_create_club(text, text) from public;
grant execute on function public.clm_asso_create_club(text, text) to authenticated;

-- =========================================================
-- STORAGE PRIVÉ DES DOCUMENTS
-- =========================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('clm-asso-documents', 'clm-asso-documents', false, 52428800)
on conflict (id) do update
set public = false, file_size_limit = 52428800;

drop policy if exists "clm_asso_storage_select" on storage.objects;
create policy "clm_asso_storage_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'clm-asso-documents'
  and public.clm_asso_is_club_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "clm_asso_storage_insert" on storage.objects;
create policy "clm_asso_storage_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'clm-asso-documents'
  and public.clm_asso_can_manage_sport(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "clm_asso_storage_update" on storage.objects;
create policy "clm_asso_storage_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'clm-asso-documents'
  and public.clm_asso_can_manage_sport(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'clm-asso-documents'
  and public.clm_asso_can_manage_sport(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "clm_asso_storage_delete" on storage.objects;
create policy "clm_asso_storage_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'clm-asso-documents'
  and public.clm_asso_can_manage_sport(((storage.foldername(name))[1])::uuid)
);

-- Maintient l'annuaire du club synchronisé avec le profil Maison CLM.
create or replace function public.clm_asso_sync_profile_to_member_directory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.clm_asso_members
  set
    first_name = coalesce(nullif(trim(new.first_name), ''), first_name),
    last_name = coalesce(nullif(trim(new.last_name), ''), last_name),
    phone = coalesce(new.phone, phone),
    birth_date = coalesce(new.birth_date, birth_date),
    updated_at = now()
  where user_id = new.id;
  return new;
end;
$$;

drop trigger if exists clm_asso_profile_sync_member_directory on public.clm_asso_profiles;
create trigger clm_asso_profile_sync_member_directory
after insert or update on public.clm_asso_profiles
for each row execute function public.clm_asso_sync_profile_to_member_directory();
