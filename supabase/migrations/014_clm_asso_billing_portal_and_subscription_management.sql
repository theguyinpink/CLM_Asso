-- =========================================================
-- CLM ASSO — PORTAIL STRIPE ET GESTION DES ABONNEMENTS
-- Migration 014
-- À exécuter après 013_clm_asso_legal_pages_and_acceptance.sql.
-- =========================================================

begin;

-- =========================================================
-- 1. SUIVI DU PORTAIL ET DÉLAI DE RÉGULARISATION
-- =========================================================

alter table public.clm_asso_club_subscriptions
  add column if not exists payment_grace_period_ends_at timestamptz,
  add column if not exists billing_portal_last_created_at timestamptz,
  add column if not exists billing_portal_last_created_by uuid
    references auth.users(id) on delete set null,
  add column if not exists last_plan_change_requested_at timestamptz,
  add column if not exists last_plan_change_target_plan_id uuid
    references public.clm_asso_subscription_plans(id) on delete set null;

create index if not exists
clm_asso_club_subscriptions_grace_period_index
on public.clm_asso_club_subscriptions (payment_grace_period_ends_at)
where payment_grace_period_ends_at is not null;

create or replace function public.clm_asso_manage_payment_grace_period()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'past_due' then
    if old.status is distinct from 'past_due'
      or new.payment_grace_period_ends_at is null
    then
      new.payment_grace_period_ends_at := now() + interval '7 days';
    end if;
  elsif new.status in (
    'active',
    'trialing',
    'pending_payment',
    'incomplete',
    'incomplete_expired',
    'canceled',
    'unpaid',
    'paused'
  ) then
    new.payment_grace_period_ends_at := null;
  end if;

  return new;
end;
$$;

revoke all on function public.clm_asso_manage_payment_grace_period()
from public, anon, authenticated;

drop trigger if exists clm_asso_subscription_payment_grace
on public.clm_asso_club_subscriptions;

create trigger clm_asso_subscription_payment_grace
before update of status, last_payment_error_at
on public.clm_asso_club_subscriptions
for each row
execute function public.clm_asso_manage_payment_grace_period();

update public.clm_asso_club_subscriptions
set payment_grace_period_ends_at = now() + interval '7 days'
where status = 'past_due'
  and payment_grace_period_ends_at is null;

-- =========================================================
-- 2. ACCÈS PENDANT LE DÉLAI DE RÉGULARISATION
-- =========================================================

create or replace function public.clm_asso_subscription_allows_app_access(
  p_club_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.clm_asso_club_subscriptions subscription
    where subscription.club_id = p_club_id
      and (
        subscription.status in ('active', 'trialing')
        or (
          subscription.status = 'past_due'
          and subscription.payment_grace_period_ends_at is not null
          and subscription.payment_grace_period_ends_at > now()
        )
      )
  );
$$;

revoke all on function
public.clm_asso_subscription_allows_app_access(uuid)
from public, anon;

grant execute on function
public.clm_asso_subscription_allows_app_access(uuid)
to authenticated, service_role;

-- =========================================================
-- 3. LECTURE DU STATUT DE FACTURATION POUR L’APPLICATION
-- =========================================================

drop function if exists public.clm_asso_get_club_subscription(uuid);

create function public.clm_asso_get_club_subscription(
  p_club_id uuid
)
returns table (
  subscription_id uuid,
  plan_code text,
  plan_name text,
  plan_description text,
  audience_label text,
  monthly_price_cents integer,
  currency text,
  subscription_status text,
  declared_licensees_count integer,
  documents_enabled boolean,
  document_storage_limit_bytes bigint,
  plan_features jsonb,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean,
  canceled_at timestamptz,
  payment_grace_period_ends_at timestamptz,
  billing_portal_available boolean,
  stripe_subscription_available boolean,
  can_manage_billing boolean,
  last_payment_error text,
  last_payment_error_at timestamptz
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
    plan.description,
    plan.audience_label,
    plan.monthly_price_cents,
    plan.currency,
    subscription.status,
    subscription.declared_licensees_count,
    plan.documents_enabled,
    plan.document_storage_limit_bytes,
    plan.features,
    subscription.current_period_start,
    subscription.current_period_end,
    subscription.trial_end,
    subscription.cancel_at_period_end,
    subscription.canceled_at,
    subscription.payment_grace_period_ends_at,
    subscription.stripe_customer_id is not null,
    subscription.stripe_subscription_id is not null,
    public.clm_asso_can_manage_billing(p_club_id),
    subscription.last_payment_error,
    subscription.last_payment_error_at
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
