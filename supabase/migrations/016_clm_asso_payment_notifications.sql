-- =========================================================
-- CLM ASSO — NOTIFICATIONS DE PAIEMENT
-- Migration 016
-- À exécuter après la migration 015.
-- =========================================================

begin;

create or replace function
public.clm_asso_notify_subscription_payment_status()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_marker text;
  v_body text;
begin
  -- Un nouvel échec est identifié par le passage en past_due ou par
  -- un nouvel horodatage d'erreur sur une souscription déjà past_due.
  if new.status = 'past_due'
    and (
      old.status is distinct from 'past_due'
      or old.last_payment_error_at
        is distinct from new.last_payment_error_at
    )
  then
    v_marker := coalesce(
      extract(epoch from new.last_payment_error_at)::bigint::text,
      new.stripe_last_event_created_at::text,
      extract(epoch from statement_timestamp())::bigint::text
    );

    v_body := case
      when new.payment_grace_period_ends_at is not null then
        'Le paiement de votre abonnement a échoué. ' ||
        'Votre accès reste ouvert jusqu’au ' ||
        to_char(
          new.payment_grace_period_ends_at at time zone 'Europe/Paris',
          'DD/MM/YYYY'
        ) ||
        '. Ouvrez la page Abonnement pour mettre à jour votre moyen de paiement.'
      else
        'Le paiement de votre abonnement a échoué. ' ||
        'Ouvrez la page Abonnement pour mettre à jour votre moyen de paiement.'
    end;

    insert into public.clm_asso_notifications (
      club_id,
      user_id,
      notification_type,
      title,
      body,
      href,
      dedupe_key
    )
    select
      new.club_id,
      membership.user_id,
      'billing',
      'Paiement de l’abonnement refusé',
      v_body,
      '/app/abonnement',
      'billing:payment-failed:' ||
        new.id::text || ':' || v_marker
    from public.clm_asso_club_members membership
    where membership.club_id = new.club_id
      and membership.status = 'active'
      and membership.role = any(array[
        'owner'::public.clm_asso_club_role,
        'admin'::public.clm_asso_club_role
      ])
    on conflict (user_id, dedupe_key)
    where dedupe_key is not null
    do nothing;

  -- La régularisation est créée uniquement après un état réellement impayé.
  elsif new.status = 'active'
    and (
      old.status = 'past_due'
      or old.last_payment_error_at is not null
    )
  then
    v_marker := coalesce(
      extract(epoch from old.last_payment_error_at)::bigint::text,
      old.stripe_last_event_created_at::text,
      new.stripe_last_event_created_at::text,
      extract(epoch from statement_timestamp())::bigint::text
    );

    insert into public.clm_asso_notifications (
      club_id,
      user_id,
      notification_type,
      title,
      body,
      href,
      dedupe_key
    )
    select
      new.club_id,
      membership.user_id,
      'billing',
      'Paiement régularisé',
      'Votre paiement a bien été régularisé. ' ||
        'Votre abonnement CLM Asso est de nouveau à jour.',
      '/app/abonnement',
      'billing:payment-recovered:' ||
        new.id::text || ':' || v_marker
    from public.clm_asso_club_members membership
    where membership.club_id = new.club_id
      and membership.status = 'active'
      and membership.role = any(array[
        'owner'::public.clm_asso_club_role,
        'admin'::public.clm_asso_club_role
      ])
    on conflict (user_id, dedupe_key)
    where dedupe_key is not null
    do nothing;
  end if;

  return new;
end;
$$;

revoke all on function
public.clm_asso_notify_subscription_payment_status()
from public, anon, authenticated;

drop trigger if exists
clm_asso_subscription_payment_notifications
on public.clm_asso_club_subscriptions;

create trigger clm_asso_subscription_payment_notifications
after update of
  status,
  last_payment_error_at,
  payment_grace_period_ends_at
on public.clm_asso_club_subscriptions
for each row
execute function
public.clm_asso_notify_subscription_payment_status();

-- Crée la notification pour un abonnement déjà en retard au moment
-- de l'installation, sans générer de doublon lors d'une relance.
insert into public.clm_asso_notifications (
  club_id,
  user_id,
  notification_type,
  title,
  body,
  href,
  dedupe_key
)
select
  subscription.club_id,
  membership.user_id,
  'billing',
  'Paiement de l’abonnement refusé',
  case
    when subscription.payment_grace_period_ends_at is not null then
      'Le paiement de votre abonnement a échoué. ' ||
      'Votre accès reste ouvert jusqu’au ' ||
      to_char(
        subscription.payment_grace_period_ends_at at time zone 'Europe/Paris',
        'DD/MM/YYYY'
      ) ||
      '. Ouvrez la page Abonnement pour mettre à jour votre moyen de paiement.'
    else
      'Le paiement de votre abonnement a échoué. ' ||
      'Ouvrez la page Abonnement pour mettre à jour votre moyen de paiement.'
  end,
  '/app/abonnement',
  'billing:payment-failed:' || subscription.id::text || ':' ||
    coalesce(
      extract(epoch from subscription.last_payment_error_at)::bigint::text,
      subscription.stripe_last_event_created_at::text,
      'existing'
    )
from public.clm_asso_club_subscriptions subscription
join public.clm_asso_club_members membership
  on membership.club_id = subscription.club_id
where subscription.status = 'past_due'
  and membership.status = 'active'
  and membership.role = any(array[
    'owner'::public.clm_asso_club_role,
    'admin'::public.clm_asso_club_role
  ])
on conflict (user_id, dedupe_key)
where dedupe_key is not null
do nothing;

commit;
