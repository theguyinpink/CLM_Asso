-- =========================================================
-- CLM ASSO — STRIPE CHECKOUT, WEBHOOKS ET CONTRÔLE D’ACCÈS
-- Migration 012
-- À exécuter après la liaison du catalogue Stripe (migration 011).
-- =========================================================

begin;

-- =========================================================
-- 1. COLONNES DE SUIVI CHECKOUT / WEBHOOK
-- =========================================================

alter table public.clm_asso_club_subscriptions
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_checkout_session_expires_at timestamptz,
  add column if not exists last_checkout_created_at timestamptz,
  add column if not exists stripe_last_event_created_at bigint,
  add column if not exists last_payment_error text,
  add column if not exists last_payment_error_at timestamptz;

create unique index if not exists
clm_asso_club_subscriptions_checkout_session_unique
on public.clm_asso_club_subscriptions (stripe_checkout_session_id)
where stripe_checkout_session_id is not null;

create index if not exists
clm_asso_club_subscriptions_checkout_expiry_index
on public.clm_asso_club_subscriptions (stripe_checkout_session_expires_at)
where stripe_checkout_session_expires_at is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clm_asso_club_subscriptions_checkout_text_limits'
      and conrelid = 'public.clm_asso_club_subscriptions'::regclass
  ) then
    alter table public.clm_asso_club_subscriptions
      add constraint clm_asso_club_subscriptions_checkout_text_limits
      check (
        stripe_checkout_session_id is null
        or char_length(stripe_checkout_session_id) <= 255
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'clm_asso_club_subscriptions_payment_error_limit'
      and conrelid = 'public.clm_asso_club_subscriptions'::regclass
  ) then
    alter table public.clm_asso_club_subscriptions
      add constraint clm_asso_club_subscriptions_payment_error_limit
      check (
        last_payment_error is null
        or char_length(last_payment_error) <= 2000
      );
  end if;
end;
$$;

-- Les clubs créés avant la migration 010 reçoivent l’offre Club
-- afin de conserver l’accès potentiel aux Documents. Ils restent
-- en attente de paiement et peuvent modifier ce choix plus tard.
insert into public.clm_asso_club_subscriptions (
  club_id,
  plan_id,
  status,
  declared_licensees_count,
  selected_by,
  metadata
)
select
  club.id,
  plan.id,
  'pending_payment',
  greatest(
    1,
    (
      select count(*)::integer
      from public.clm_asso_members member
      where member.club_id = club.id
        and member.status = 'active'
    )
  ),
  club.created_by,
  jsonb_build_object(
    'selection_source', 'legacy_backfill',
    'selected_at', now(),
    'review_required', true
  )
from public.clm_asso_clubs club
join public.clm_asso_subscription_plans plan
  on plan.code = 'club'
where not exists (
  select 1
  from public.clm_asso_club_subscriptions subscription
  where subscription.club_id = club.id
);

-- =========================================================
-- 2. FONCTIONS D’ACCÈS À L’APPLICATION ET À LA FACTURATION
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
      and subscription.status in ('active', 'trialing')
  );
$$;

revoke all on function
public.clm_asso_subscription_allows_app_access(uuid)
from public, anon;

grant execute on function
public.clm_asso_subscription_allows_app_access(uuid)
to authenticated, service_role;

create or replace function public.clm_asso_can_manage_billing(
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
    from public.clm_asso_club_members membership
    where membership.club_id = p_club_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role in ('owner', 'admin')
  );
$$;

revoke all on function public.clm_asso_can_manage_billing(uuid)
from public, anon;

grant execute on function public.clm_asso_can_manage_billing(uuid)
to authenticated, service_role;

-- Les écritures utilisant le système de permissions sont bloquées
-- tant que l’abonnement n’est ni actif ni en période d’essai.
create or replace function public.clm_asso_has_permission(
  p_club_id uuid,
  p_permission text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    public.clm_asso_subscription_allows_app_access(p_club_id)
    and exists (
      select 1
      from public.clm_asso_club_members membership
      where membership.club_id = p_club_id
        and membership.user_id = auth.uid()
        and membership.status = 'active'
        and (
          membership.role = 'owner'
          or (
            membership.role = 'admin'
            and p_permission = any(array[
              'manage_club',
              'manage_roles',
              'manage_members',
              'manage_teams',
              'manage_calendar',
              'manage_matches',
              'manage_convocations',
              'manage_announcements',
              'manage_tasks',
              'manage_documents',
              'manage_messaging'
            ])
          )
          or (
            membership.role = 'manager'
            and p_permission = any(array[
              'manage_club',
              'manage_members',
              'manage_teams',
              'manage_calendar',
              'manage_matches',
              'manage_convocations',
              'manage_announcements',
              'manage_tasks',
              'manage_documents',
              'manage_messaging'
            ])
          )
          or (
            membership.role = 'coach'
            and p_permission = any(array[
              'manage_teams',
              'manage_calendar',
              'manage_matches',
              'manage_convocations'
            ])
          )
        )
    );
$$;

revoke all on function public.clm_asso_has_permission(uuid, text)
from public, anon;

grant execute on function public.clm_asso_has_permission(uuid, text)
to authenticated;

create or replace function public.clm_asso_can_access_resource(
  p_club_id uuid,
  p_resource text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    public.clm_asso_subscription_allows_app_access(p_club_id)
    and exists (
      select 1
      from public.clm_asso_club_members membership
      join public.clm_asso_club_subscriptions subscription
        on subscription.club_id = membership.club_id
      join public.clm_asso_subscription_plans plan
        on plan.id = subscription.plan_id
      where membership.club_id = p_club_id
        and membership.user_id = auth.uid()
        and membership.status = 'active'
        and (
          p_resource not in ('tasks', 'documents')
          or (
            p_resource = 'tasks'
            and membership.role <> 'coach'
          )
          or (
            p_resource = 'documents'
            and membership.role <> 'coach'
            and plan.documents_enabled = true
          )
        )
    );
$$;

revoke all on function public.clm_asso_can_access_resource(uuid, text)
from public, anon;

grant execute on function public.clm_asso_can_access_resource(uuid, text)
to authenticated;

-- =========================================================
-- 3. LECTURE DU STATUT PAR LES MEMBRES DU CLUB
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
  can_manage_billing boolean,
  last_payment_error text
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
    public.clm_asso_can_manage_billing(p_club_id),
    subscription.last_payment_error
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

-- =========================================================
-- 4. APPLICATION ATOMIQUE ET IDEMPOTENTE DES ÉVÉNEMENTS STRIPE
-- =========================================================

create or replace function public.clm_asso_apply_stripe_event(
  p_event_id text,
  p_event_type text,
  p_livemode boolean,
  p_event_created_at bigint,
  p_club_id uuid default null,
  p_checkout_session_id text default null,
  p_customer_id text default null,
  p_subscription_id text default null,
  p_price_id text default null,
  p_status text default null,
  p_current_period_start timestamptz default null,
  p_current_period_end timestamptz default null,
  p_trial_end timestamptz default null,
  p_cancel_at_period_end boolean default null,
  p_canceled_at timestamptz default null,
  p_last_payment_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_subscription_id uuid;
  v_club_id uuid;
  v_plan_id uuid;
  v_existing_event_created_at bigint;
  v_unknown_price boolean := false;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Cette fonction est réservée au serveur de facturation.';
  end if;

  if char_length(btrim(coalesce(p_event_id, ''))) < 1
    or char_length(btrim(coalesce(p_event_type, ''))) < 1
  then
    raise exception 'Événement Stripe invalide.';
  end if;

  insert into private.clm_asso_stripe_events (
    event_id,
    event_type,
    livemode,
    club_id,
    stripe_customer_id,
    stripe_subscription_id
  )
  values (
    left(btrim(p_event_id), 255),
    left(btrim(p_event_type), 160),
    coalesce(p_livemode, false),
    p_club_id,
    nullif(left(btrim(coalesce(p_customer_id, '')), 255), ''),
    nullif(left(btrim(coalesce(p_subscription_id, '')), 255), '')
  )
  on conflict (event_id) do nothing;

  if not found then
    return false;
  end if;

  select
    subscription.id,
    subscription.club_id,
    subscription.stripe_last_event_created_at
  into
    v_subscription_id,
    v_club_id,
    v_existing_event_created_at
  from public.clm_asso_club_subscriptions subscription
  where
    (p_club_id is not null and subscription.club_id = p_club_id)
    or (
      p_subscription_id is not null
      and subscription.stripe_subscription_id = p_subscription_id
    )
    or (
      p_customer_id is not null
      and subscription.stripe_customer_id = p_customer_id
    )
    or (
      p_checkout_session_id is not null
      and subscription.stripe_checkout_session_id = p_checkout_session_id
    )
  order by
    case
      when p_club_id is not null and subscription.club_id = p_club_id then 1
      when p_subscription_id is not null
        and subscription.stripe_subscription_id = p_subscription_id then 2
      when p_customer_id is not null
        and subscription.stripe_customer_id = p_customer_id then 3
      else 4
    end
  limit 1
  for update;

  if v_subscription_id is null then
    update private.clm_asso_stripe_events
    set
      processed_at = now(),
      processing_error = 'Aucun abonnement CLM Asso correspondant.'
    where event_id = p_event_id;

    return true;
  end if;

  if p_price_id is not null then
    select plan.id
    into v_plan_id
    from public.clm_asso_subscription_plans plan
    where plan.stripe_monthly_price_id = p_price_id
      and plan.is_active = true;

    if v_plan_id is null then
      v_unknown_price := true;
    end if;
  end if;

  if v_unknown_price then
    update private.clm_asso_stripe_events
    set
      club_id = v_club_id,
      processed_at = now(),
      processing_error = 'Le prix Stripe ne correspond à aucune offre active.'
    where event_id = p_event_id;

    return true;
  end if;

  if p_status is not null
    and p_status not in (
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
  then
    raise exception 'Statut Stripe non pris en charge : %', p_status;
  end if;

  -- Évite qu’un ancien événement reçu en retard ne rétablisse un état obsolète.
  if v_existing_event_created_at is null
    or p_event_created_at >= v_existing_event_created_at
  then
    update public.clm_asso_club_subscriptions
    set
      plan_id = coalesce(v_plan_id, plan_id),
      status = coalesce(p_status, status),
      stripe_checkout_session_id = coalesce(
        nullif(p_checkout_session_id, ''),
        stripe_checkout_session_id
      ),
      stripe_customer_id = coalesce(
        nullif(p_customer_id, ''),
        stripe_customer_id
      ),
      stripe_subscription_id = coalesce(
        nullif(p_subscription_id, ''),
        stripe_subscription_id
      ),
      stripe_price_id = coalesce(
        nullif(p_price_id, ''),
        stripe_price_id
      ),
      current_period_start = coalesce(
        p_current_period_start,
        current_period_start
      ),
      current_period_end = coalesce(
        p_current_period_end,
        current_period_end
      ),
      trial_end = coalesce(p_trial_end, trial_end),
      cancel_at_period_end = coalesce(
        p_cancel_at_period_end,
        cancel_at_period_end
      ),
      canceled_at = coalesce(p_canceled_at, canceled_at),
      stripe_last_event_created_at = p_event_created_at,
      last_payment_error = case
        when p_last_payment_error is not null
          then left(p_last_payment_error, 2000)
        when p_event_type = 'invoice.paid'
          then null
        else last_payment_error
      end,
      last_payment_error_at = case
        when p_last_payment_error is not null then now()
        when p_event_type = 'invoice.paid' then null
        else last_payment_error_at
      end,
      updated_at = now()
    where id = v_subscription_id;
  end if;

  update private.clm_asso_stripe_events
  set
    club_id = v_club_id,
    stripe_customer_id = coalesce(
      nullif(p_customer_id, ''),
      stripe_customer_id
    ),
    stripe_subscription_id = coalesce(
      nullif(p_subscription_id, ''),
      stripe_subscription_id
    ),
    processed_at = now(),
    processing_error = null
  where event_id = p_event_id;

  return true;
end;
$$;

revoke all on function public.clm_asso_apply_stripe_event(
  text,
  text,
  boolean,
  bigint,
  uuid,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  boolean,
  timestamptz,
  text
)
from public, anon, authenticated;

grant execute on function public.clm_asso_apply_stripe_event(
  text,
  text,
  boolean,
  bigint,
  uuid,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  boolean,
  timestamptz,
  text
)
to service_role;

commit;
