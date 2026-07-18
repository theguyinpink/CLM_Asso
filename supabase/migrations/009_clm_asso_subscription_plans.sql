-- =========================================================
-- CLM ASSO — ABONNEMENTS ET FONDATION DE FACTURATION
-- Migration 009
-- À exécuter après 008_clm_asso_security_hardening.sql.
--
-- Cette migration :
-- - crée les trois offres CLM Asso ;
-- - prépare la liaison future avec Stripe ;
-- - ne bloque pas encore l'accès des clubs existants ;
-- - n'autorise aucune écriture de facturation depuis le navigateur.
-- =========================================================

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- =========================================================
-- 1. CATALOGUE DES ABONNEMENTS
-- =========================================================

create table if not exists public.clm_asso_subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  audience_label text not null,

  monthly_price_cents integer not null,
  currency text not null default 'eur',

  recommended_min_licensees integer not null default 0,
  maximum_licensees integer,

  documents_enabled boolean not null default false,
  document_storage_limit_bytes bigint not null default 0,
  features jsonb not null default '{}'::jsonb,

  is_recommended boolean not null default false,
  is_active boolean not null default true,
  display_order integer not null default 0,

  stripe_product_id text,
  stripe_monthly_price_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint clm_asso_subscription_plans_code_format check (
    code ~ '^[a-z][a-z0-9_]{1,49}$'
  ),
  constraint clm_asso_subscription_plans_text_limits check (
    char_length(name) between 2 and 80
    and char_length(description) between 2 and 1200
    and char_length(audience_label) between 2 and 160
    and char_length(currency) = 3
    and (stripe_product_id is null or char_length(stripe_product_id) <= 255)
    and (stripe_monthly_price_id is null or char_length(stripe_monthly_price_id) <= 255)
  ),
  constraint clm_asso_subscription_plans_price_positive check (
    monthly_price_cents > 0
  ),
  constraint clm_asso_subscription_plans_licensees_valid check (
    recommended_min_licensees >= 0
    and (maximum_licensees is null or maximum_licensees >= 1)
  ),
  constraint clm_asso_subscription_plans_storage_valid check (
    document_storage_limit_bytes >= 0
    and (
      documents_enabled
      or document_storage_limit_bytes = 0
    )
  ),
  constraint clm_asso_subscription_plans_features_object check (
    jsonb_typeof(features) = 'object'
  )
);

create unique index if not exists
clm_asso_subscription_plans_stripe_product_unique
on public.clm_asso_subscription_plans (stripe_product_id)
where stripe_product_id is not null;

create unique index if not exists
clm_asso_subscription_plans_stripe_price_unique
on public.clm_asso_subscription_plans (stripe_monthly_price_id)
where stripe_monthly_price_id is not null;

drop trigger if exists clm_asso_subscription_plans_updated_at
on public.clm_asso_subscription_plans;

create trigger clm_asso_subscription_plans_updated_at
before update on public.clm_asso_subscription_plans
for each row
execute function public.clm_asso_set_updated_at();

insert into public.clm_asso_subscription_plans (
  code,
  name,
  description,
  audience_label,
  monthly_price_cents,
  currency,
  recommended_min_licensees,
  maximum_licensees,
  documents_enabled,
  document_storage_limit_bytes,
  features,
  is_recommended,
  is_active,
  display_order
)
values
  (
    'essential',
    'Essentiel',
    'L’essentiel pour organiser un petit club sans multiplier les outils.',
    'Jusqu’à 100 licenciés',
    1900,
    'eur',
    0,
    100,
    false,
    0,
    jsonb_build_object(
      'dashboard', true,
      'teams', true,
      'calendar', true,
      'matches', true,
      'convocations', true,
      'announcements', true,
      'tasks', true,
      'messaging', true,
      'whatsapp_phone', true,
      'documents', false,
      'document_versioning', false
    ),
    false,
    true,
    10
  ),
  (
    'club',
    'Club',
    'L’offre complète pour centraliser l’organisation et les documents du club.',
    'De 101 à 300 licenciés',
    3900,
    'eur',
    101,
    300,
    true,
    5368709120,
    jsonb_build_object(
      'dashboard', true,
      'teams', true,
      'calendar', true,
      'matches', true,
      'convocations', true,
      'announcements', true,
      'tasks', true,
      'messaging', true,
      'whatsapp_phone', true,
      'documents', true,
      'document_versioning', true
    ),
    true,
    true,
    20
  ),
  (
    'grand_club',
    'Grand Club',
    'Toute la puissance de CLM Asso pour les structures aux volumes plus importants.',
    'Plus de 300 licenciés',
    4900,
    'eur',
    301,
    null,
    true,
    21474836480,
    jsonb_build_object(
      'dashboard', true,
      'teams', true,
      'calendar', true,
      'matches', true,
      'convocations', true,
      'announcements', true,
      'tasks', true,
      'messaging', true,
      'whatsapp_phone', true,
      'documents', true,
      'document_versioning', true
    ),
    false,
    true,
    30
  )
on conflict (code)
do update set
  name = excluded.name,
  description = excluded.description,
  audience_label = excluded.audience_label,
  monthly_price_cents = excluded.monthly_price_cents,
  currency = excluded.currency,
  recommended_min_licensees = excluded.recommended_min_licensees,
  maximum_licensees = excluded.maximum_licensees,
  documents_enabled = excluded.documents_enabled,
  document_storage_limit_bytes = excluded.document_storage_limit_bytes,
  features = excluded.features,
  is_recommended = excluded.is_recommended,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

-- =========================================================
-- 2. ABONNEMENT ACTUEL DE CHAQUE CLUB
-- =========================================================

create table if not exists public.clm_asso_club_subscriptions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null unique
    references public.clm_asso_clubs(id) on delete cascade,
  plan_id uuid not null
    references public.clm_asso_subscription_plans(id) on delete restrict,

  status text not null default 'pending_payment',
  declared_licensees_count integer not null,

  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,

  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,

  selected_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint clm_asso_club_subscriptions_status_valid check (
    status in (
      'pending_payment',
      'incomplete',
      'incomplete_expired',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'paused'
    )
  ),
  constraint clm_asso_club_subscriptions_licensees_valid check (
    declared_licensees_count between 1 and 100000
  ),
  constraint clm_asso_club_subscriptions_period_valid check (
    current_period_end is null
    or current_period_start is null
    or current_period_end >= current_period_start
  ),
  constraint clm_asso_club_subscriptions_metadata_object check (
    jsonb_typeof(metadata) = 'object'
  ),
  constraint clm_asso_club_subscriptions_stripe_text_limits check (
    (stripe_customer_id is null or char_length(stripe_customer_id) <= 255)
    and (stripe_subscription_id is null or char_length(stripe_subscription_id) <= 255)
    and (stripe_price_id is null or char_length(stripe_price_id) <= 255)
  )
);

create unique index if not exists
clm_asso_club_subscriptions_customer_unique
on public.clm_asso_club_subscriptions (stripe_customer_id)
where stripe_customer_id is not null;

create unique index if not exists
clm_asso_club_subscriptions_subscription_unique
on public.clm_asso_club_subscriptions (stripe_subscription_id)
where stripe_subscription_id is not null;

create index if not exists
clm_asso_club_subscriptions_status_index
on public.clm_asso_club_subscriptions (status);

drop trigger if exists clm_asso_club_subscriptions_updated_at
on public.clm_asso_club_subscriptions;

create trigger clm_asso_club_subscriptions_updated_at
before update on public.clm_asso_club_subscriptions
for each row
execute function public.clm_asso_set_updated_at();

-- =========================================================
-- 3. JOURNAL PRIVÉ POUR LES FUTURS WEBHOOKS STRIPE
-- =========================================================

create table if not exists private.clm_asso_stripe_events (
  event_id text primary key,
  event_type text not null,
  livemode boolean not null default false,
  club_id uuid references public.clm_asso_clubs(id) on delete set null,
  stripe_customer_id text,
  stripe_subscription_id text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,

  constraint clm_asso_stripe_events_text_limits check (
    char_length(event_id) between 1 and 255
    and char_length(event_type) between 1 and 160
    and (stripe_customer_id is null or char_length(stripe_customer_id) <= 255)
    and (stripe_subscription_id is null or char_length(stripe_subscription_id) <= 255)
    and (processing_error is null or char_length(processing_error) <= 4000)
  )
);

revoke all on table private.clm_asso_stripe_events
from public, anon, authenticated;

-- =========================================================
-- 4. RLS ET PRIVILÈGES
-- =========================================================

alter table public.clm_asso_subscription_plans
  enable row level security;
alter table public.clm_asso_subscription_plans
  force row level security;

alter table public.clm_asso_club_subscriptions
  enable row level security;
alter table public.clm_asso_club_subscriptions
  force row level security;

revoke all on table public.clm_asso_subscription_plans
from public, anon, authenticated;

revoke all on table public.clm_asso_club_subscriptions
from public, anon, authenticated;

grant select on table public.clm_asso_subscription_plans
to anon, authenticated;

grant select on table public.clm_asso_club_subscriptions
to authenticated;

drop policy if exists "clm_asso_subscription_plans_public_select"
on public.clm_asso_subscription_plans;

create policy "clm_asso_subscription_plans_public_select"
on public.clm_asso_subscription_plans
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "clm_asso_club_subscriptions_billing_admin_select"
on public.clm_asso_club_subscriptions;

create policy "clm_asso_club_subscriptions_billing_admin_select"
on public.clm_asso_club_subscriptions
for select
to authenticated
using (
  exists (
    select 1
    from public.clm_asso_club_members membership
    where membership.club_id = clm_asso_club_subscriptions.club_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role in ('owner', 'admin')
  )
);

-- Aucune policy INSERT/UPDATE/DELETE n'est créée volontairement.
-- Les écritures seront réalisées par les futures Edge Functions Stripe.

-- =========================================================
-- 5. LECTURE SÉCURISÉE DE L'ACCÈS POUR TOUS LES MEMBRES
-- =========================================================

create or replace function public.clm_asso_get_club_subscription(
  p_club_id uuid
)
returns table (
  subscription_id uuid,
  plan_code text,
  plan_name text,
  subscription_status text,
  declared_licensees_count integer,
  documents_enabled boolean,
  document_storage_limit_bytes bigint,
  plan_features jsonb,
  current_period_end timestamptz,
  cancel_at_period_end boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  if not exists (
    select 1
    from public.clm_asso_club_members membership
    where membership.club_id = p_club_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  ) then
    raise exception 'Vous ne faites pas partie de ce club.';
  end if;

  return query
  select
    subscription.id,
    plan.code,
    plan.name,
    subscription.status,
    subscription.declared_licensees_count,
    plan.documents_enabled,
    plan.document_storage_limit_bytes,
    plan.features,
    subscription.current_period_end,
    subscription.cancel_at_period_end
  from public.clm_asso_club_subscriptions subscription
  join public.clm_asso_subscription_plans plan
    on plan.id = subscription.plan_id
  where subscription.club_id = p_club_id;
end;
$$;

revoke all on function public.clm_asso_get_club_subscription(uuid)
from public, anon;

grant execute on function public.clm_asso_get_club_subscription(uuid)
to authenticated;

commit;
