-- =========================================================
-- CLM ASSO — ADMINISTRATION PLATEFORME
-- Migration 018
--
-- Ajoute :
-- - des comptes administrateurs Maison CLM ;
-- - un tableau de bord global sécurisé ;
-- - la gestion interne des demandes d'intérêt ;
-- - aucun accès admin n'est accordé automatiquement.
-- =========================================================

begin;

-- =========================================================
-- 1. ADMINISTRATEURS DE PLATEFORME
-- =========================================================

create table if not exists public.clm_asso_platform_admins (
  user_id uuid primary key
    references auth.users(id) on delete cascade,

  role text not null default 'super_admin'
    check (role in ('super_admin', 'support', 'billing')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clm_asso_platform_admins enable row level security;
alter table public.clm_asso_platform_admins force row level security;

revoke all on table public.clm_asso_platform_admins
from public, anon, authenticated;

create or replace function public.clm_asso_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.clm_asso_platform_admins admin
      where admin.user_id = auth.uid()
    );
$$;

revoke all on function public.clm_asso_is_platform_admin()
from public, anon;

grant execute on function public.clm_asso_is_platform_admin()
to authenticated;

-- =========================================================
-- 2. SUIVI INTERNE DES DEMANDES
-- =========================================================

alter table public.clm_asso_club_interests
  add column if not exists admin_status text not null default 'new',
  add column if not exists admin_notes text,
  add column if not exists admin_updated_at timestamptz not null default now();

alter table public.clm_asso_club_interests
  drop constraint if exists clm_asso_club_interests_admin_status_check;

alter table public.clm_asso_club_interests
  add constraint clm_asso_club_interests_admin_status_check
  check (
    admin_status in (
      'new',
      'in_progress',
      'contacted',
      'converted',
      'rejected',
      'archived'
    )
  );

alter table public.clm_asso_club_interests
  drop constraint if exists clm_asso_club_interests_admin_notes_limit;

alter table public.clm_asso_club_interests
  add constraint clm_asso_club_interests_admin_notes_limit
  check (
    admin_notes is null
    or char_length(admin_notes) <= 5000
  );

-- =========================================================
-- 3. TABLEAU DE BORD ADMIN
-- =========================================================

create or replace function public.clm_asso_admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_stats jsonb;
  v_clubs jsonb;
  v_interests jsonb;
  v_users jsonb;
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  if not public.clm_asso_is_platform_admin() then
    raise exception 'Accès administrateur requis.';
  end if;

  select jsonb_build_object(
    'total_users',
      (select count(*) from auth.users),
    'total_clubs',
      (select count(*) from public.clm_asso_clubs),
    'active_subscriptions',
      (
        select count(*)
        from public.clm_asso_club_subscriptions subscription
        where subscription.status = 'active'
      ),
    'past_due_subscriptions',
      (
        select count(*)
        from public.clm_asso_club_subscriptions subscription
        where subscription.status = 'past_due'
      ),
    'canceled_subscriptions',
      (
        select count(*)
        from public.clm_asso_club_subscriptions subscription
        where subscription.status = 'canceled'
      ),
    'mrr_cents',
      (
        select coalesce(sum(plan.monthly_price_cents), 0)
        from public.clm_asso_club_subscriptions subscription
        join public.clm_asso_subscription_plans plan
          on plan.id = subscription.plan_id
        where subscription.status = 'active'
      ),
    'pending_interests',
      (
        select count(*)
        from public.clm_asso_club_interests interest
        where interest.admin_status in ('new', 'in_progress')
      )
  )
  into v_stats;

  select coalesce(
    jsonb_agg(to_jsonb(club_row) order by club_row.created_at desc),
    '[]'::jsonb
  )
  into v_clubs
  from (
    select
      club.id,
      club.name,
      club.city,
      club.created_at,
      owner_account.email as owner_email,
      plan.code as plan_code,
      plan.name as plan_name,
      subscription.status as subscription_status,
      subscription.current_period_end,
      subscription.cancel_at_period_end,
      subscription.declared_licensees_count
    from public.clm_asso_clubs club

    left join public.clm_asso_club_subscriptions subscription
      on subscription.club_id = club.id

    left join public.clm_asso_subscription_plans plan
      on plan.id = subscription.plan_id

    left join lateral (
      select account.email
      from public.clm_asso_club_members membership
      join auth.users account
        on account.id = membership.user_id
      where membership.club_id = club.id
        and membership.role = 'owner'
      order by membership.joined_at nulls last, membership.id
      limit 1
    ) owner_account on true

    order by club.created_at desc
    limit 250
  ) club_row;

  select coalesce(
    jsonb_agg(to_jsonb(interest_row) order by interest_row.created_at desc),
    '[]'::jsonb
  )
  into v_interests
  from (
    select
      interest.id,
      interest.first_name,
      interest.last_name,
      interest.email,
      interest.phone,
      interest.role,
      interest.club_name,
      interest.city,
      interest.sport,
      interest.licensees_count,
      interest.teams_count,
      interest.interest_level,
      interest.main_problem,
      interest.admin_status,
      interest.admin_notes,
      interest.created_at,
      interest.admin_updated_at
    from public.clm_asso_club_interests interest
    order by interest.created_at desc
    limit 300
  ) interest_row;

  select coalesce(
    jsonb_agg(to_jsonb(user_row) order by user_row.created_at desc),
    '[]'::jsonb
  )
  into v_users
  from (
    select
      account.id,
      account.email,
      account.email_confirmed_at,
      account.created_at,
      account.last_sign_in_at,
      profile.first_name,
      profile.last_name
    from auth.users account
    left join public.clm_asso_profiles profile
      on profile.id = account.id
    order by account.created_at desc
    limit 250
  ) user_row;

  return jsonb_build_object(
    'stats', v_stats,
    'clubs', v_clubs,
    'interests', v_interests,
    'users', v_users
  );
end;
$$;

revoke all on function public.clm_asso_admin_overview()
from public, anon;

grant execute on function public.clm_asso_admin_overview()
to authenticated;

-- =========================================================
-- 4. MODIFICATION D'UNE DEMANDE PAR UN ADMIN
-- =========================================================

create or replace function public.clm_asso_admin_update_interest(
  p_interest_id uuid,
  p_status text,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  if not public.clm_asso_is_platform_admin() then
    raise exception 'Accès administrateur requis.';
  end if;

  if p_status not in (
    'new',
    'in_progress',
    'contacted',
    'converted',
    'rejected',
    'archived'
  ) then
    raise exception 'Statut de demande invalide.';
  end if;

  if p_notes is not null and char_length(p_notes) > 5000 then
    raise exception 'Les notes sont trop longues.';
  end if;

  update public.clm_asso_club_interests
  set
    admin_status = p_status,
    admin_notes = nullif(btrim(coalesce(p_notes, '')), ''),
    admin_updated_at = now()
  where id = p_interest_id;

  if not found then
    raise exception 'Demande introuvable.';
  end if;
end;
$$;

revoke all on function public.clm_asso_admin_update_interest(
  uuid,
  text,
  text
)
from public, anon;

grant execute on function public.clm_asso_admin_update_interest(
  uuid,
  text,
  text
)
to authenticated;

commit;

-- =========================================================
-- APRÈS LA MIGRATION : AJOUTER TON COMPTE
-- =========================================================
-- Remplace l'adresse ci-dessous puis exécute cette requête séparément :
--
-- insert into public.clm_asso_platform_admins (user_id, role)
-- select id, 'super_admin'
-- from auth.users
-- where lower(email) = lower('TON_ADRESSE_EMAIL')
-- on conflict (user_id) do update
-- set
--   role = excluded.role,
--   updated_at = now();
