-- =========================================================
-- CLM ASSO — QUOTAS DOCUMENTS, ONBOARDING ET FINITIONS
-- Migration 015
-- À exécuter après 014_clm_asso_billing_portal_and_subscription_management.sql.
--
-- Cette migration :
-- - retire toute limite bloquante liée au nombre de licenciés ;
-- - fixe les quotas Documents à 0 Go / 5 Go / 20 Go ;
-- - refuse côté serveur tout ajout dépassant le quota ;
-- - conserve l'accès 7 jours pour past_due, mais aucun essai gratuit ;
-- - ajoute la notification de complétion du profil ;
-- - ajoute des diagnostics sécurisés Stripe ↔ club et stockage.
-- =========================================================

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- =========================================================
-- 1. OFFRES : AUCUNE LIMITE D'ÉQUIPES OU DE LICENCIÉS
-- =========================================================

update public.clm_asso_subscription_plans
set
  recommended_min_licensees = 0,
  maximum_licensees = null,
  audience_label = case code
    when 'essential' then 'Pour organiser simplement le quotidien du club'
    when 'club' then 'Pour centraliser aussi les documents du club'
    when 'grand_club' then 'Pour les besoins documentaires plus importants'
    else audience_label
  end,
  documents_enabled = case
    when code = 'essential' then false
    else true
  end,
  document_storage_limit_bytes = case code
    when 'essential' then 0
    when 'club' then 5368709120       -- 5 Gio
    when 'grand_club' then 21474836480 -- 20 Gio
    else document_storage_limit_bytes
  end,
  features = case code
    when 'essential' then jsonb_set(
      jsonb_set(features, '{documents}', 'false'::jsonb, true),
      '{document_versioning}',
      'false'::jsonb,
      true
    )
    when 'club' then jsonb_set(
      jsonb_set(features, '{documents}', 'true'::jsonb, true),
      '{document_versioning}',
      'true'::jsonb,
      true
    )
    when 'grand_club' then jsonb_set(
      jsonb_set(features, '{documents}', 'true'::jsonb, true),
      '{document_versioning}',
      'true'::jsonb,
      true
    )
    else features
  end,
  updated_at = now()
where code in ('essential', 'club', 'grand_club');

-- Aucun essai gratuit : seul active, ou past_due pendant le délai de grâce,
-- donne accès à l'application.
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
        subscription.status = 'active'
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
-- 2. CALCUL DU STOCKAGE PHYSIQUE RÉEL
-- Une même version restaurée ne compte pas deux fois : les chemins de
-- stockage sont dédupliqués avant de sommer leur taille.
-- =========================================================

create or replace function private.clm_asso_document_storage_usage_bytes(
  p_club_id uuid
)
returns bigint
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select coalesce(sum(stored_object.object_size), 0)::bigint
  from (
    select
      stored_path.storage_path,
      max(stored_path.size_bytes)::bigint as object_size
    from (
      select
        document.storage_path,
        document.size_bytes
      from public.clm_asso_documents document
      where document.club_id = p_club_id

      union all

      select
        version.storage_path,
        version.size_bytes
      from public.clm_asso_document_versions version
      join public.clm_asso_documents document
        on document.id = version.document_id
      where document.club_id = p_club_id
    ) stored_path
    where stored_path.storage_path is not null
    group by stored_path.storage_path
  ) stored_object;
$$;

revoke all on function
private.clm_asso_document_storage_usage_bytes(uuid)
from public, anon, authenticated;

-- Statut du quota lisible par les membres actifs du club.
create or replace function public.clm_asso_get_document_storage_status(
  p_club_id uuid
)
returns table (
  plan_code text,
  plan_name text,
  documents_enabled boolean,
  used_bytes bigint,
  limit_bytes bigint,
  remaining_bytes bigint,
  usage_percent numeric
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_used_bytes bigint;
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

  v_used_bytes := private.clm_asso_document_storage_usage_bytes(p_club_id);

  return query
  select
    plan.code,
    plan.name,
    plan.documents_enabled,
    v_used_bytes,
    plan.document_storage_limit_bytes,
    greatest(plan.document_storage_limit_bytes - v_used_bytes, 0)::bigint,
    case
      when plan.document_storage_limit_bytes <= 0 then 0::numeric
      else round(
        (v_used_bytes::numeric / plan.document_storage_limit_bytes::numeric) * 100,
        2
      )
    end
  from public.clm_asso_club_subscriptions subscription
  join public.clm_asso_subscription_plans plan
    on plan.id = subscription.plan_id
  where subscription.club_id = p_club_id;
end;
$$;

revoke all on function
public.clm_asso_get_document_storage_status(uuid)
from public, anon;

grant execute on function
public.clm_asso_get_document_storage_status(uuid)
to authenticated;

-- =========================================================
-- 3. CONTRÔLE SERVEUR DU QUOTA AVANT INSERTION EN BASE
--
-- Le frontend actuel téléverse d'abord le fichier puis crée la ligne en base.
-- En cas de refus ici, son mécanisme d'erreur supprime automatiquement le
-- fichier qui vient d'être téléversé : aucun fichier orphelin n'est conservé.
-- =========================================================

create or replace function public.clm_asso_enforce_document_storage_quota()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_club_id uuid;
  v_plan_code text;
  v_plan_name text;
  v_documents_enabled boolean;
  v_limit_bytes bigint;
  v_status text;
  v_grace_ends_at timestamptz;
  v_used_bytes bigint;
  v_added_bytes bigint;
  v_path_already_counted boolean;
begin
  if tg_table_name = 'clm_asso_documents' then
    v_club_id := new.club_id;
  elsif tg_table_name = 'clm_asso_document_versions' then
    select document.club_id
    into v_club_id
    from public.clm_asso_documents document
    where document.id = new.document_id;

    if v_club_id is null then
      raise exception 'Document parent introuvable.';
    end if;
  else
    raise exception 'Table de document non prise en charge.';
  end if;

  -- Sérialise les ajouts d'un même club afin d'éviter deux dépassements
  -- simultanés qui passeraient chacun le contrôle séparément.
  perform pg_advisory_xact_lock(hashtextextended(v_club_id::text, 0));

  select
    plan.code,
    plan.name,
    plan.documents_enabled,
    plan.document_storage_limit_bytes,
    subscription.status,
    subscription.payment_grace_period_ends_at
  into
    v_plan_code,
    v_plan_name,
    v_documents_enabled,
    v_limit_bytes,
    v_status,
    v_grace_ends_at
  from public.clm_asso_club_subscriptions subscription
  join public.clm_asso_subscription_plans plan
    on plan.id = subscription.plan_id
  where subscription.club_id = v_club_id;

  if not found then
    raise exception
      'Aucun abonnement n’est relié à ce club. Vérifiez la page Abonnement.';
  end if;

  if v_status <> 'active'
     and not (
       v_status = 'past_due'
       and v_grace_ends_at is not null
       and v_grace_ends_at > now()
     )
  then
    raise exception
      'Votre abonnement ne permet pas actuellement d’ajouter des documents. Régularisez-le depuis la page Abonnement.';
  end if;

  if not coalesce(v_documents_enabled, false)
     or coalesce(v_limit_bytes, 0) <= 0
  then
    raise exception
      'L’offre Essentiel n’inclut pas l’espace Documents. Passez à l’offre Club ou Grand Club pour importer ou créer des documents.';
  end if;

  select exists (
    select 1
    from public.clm_asso_documents document
    where document.club_id = v_club_id
      and document.storage_path = new.storage_path

    union all

    select 1
    from public.clm_asso_document_versions version
    join public.clm_asso_documents document
      on document.id = version.document_id
    where document.club_id = v_club_id
      and version.storage_path = new.storage_path
  )
  into v_path_already_counted;

  v_used_bytes := private.clm_asso_document_storage_usage_bytes(v_club_id);
  v_added_bytes := case
    when v_path_already_counted then 0
    else greatest(coalesce(new.size_bytes, 0), 0)
  end;

  if v_used_bytes + v_added_bytes > v_limit_bytes then
    raise exception
      'Limite de stockage atteinte pour l’offre %. % Go utilisés sur % Go. Supprimez des documents ou passez à l’offre supérieure.',
      coalesce(v_plan_name, v_plan_code, 'actuelle'),
      round(v_used_bytes::numeric / 1073741824::numeric, 2),
      round(v_limit_bytes::numeric / 1073741824::numeric, 2);
  end if;

  return new;
end;
$$;

revoke all on function
public.clm_asso_enforce_document_storage_quota()
from public, anon, authenticated;

-- Chaque nouveau fichier principal et chaque nouvelle version est contrôlé.
drop trigger if exists clm_asso_documents_storage_quota
on public.clm_asso_documents;

create trigger clm_asso_documents_storage_quota
before insert on public.clm_asso_documents
for each row execute function public.clm_asso_enforce_document_storage_quota();

drop trigger if exists clm_asso_document_versions_storage_quota
on public.clm_asso_document_versions;

create trigger clm_asso_document_versions_storage_quota
before insert on public.clm_asso_document_versions
for each row execute function public.clm_asso_enforce_document_storage_quota();

-- =========================================================
-- 4. RLS DOCUMENTS : L'OFFRE ESSENTIEL NE PEUT PAS CONTOURNER L'UI
-- =========================================================

alter table public.clm_asso_documents enable row level security;
alter table public.clm_asso_document_versions enable row level security;

-- Documents principaux.
drop policy if exists "clm_asso_documents_select"
on public.clm_asso_documents;
create policy "clm_asso_documents_select"
on public.clm_asso_documents
for select to authenticated
using (public.clm_asso_can_access_resource(club_id, 'documents'));

drop policy if exists "clm_asso_documents_insert"
on public.clm_asso_documents;
create policy "clm_asso_documents_insert"
on public.clm_asso_documents
for insert to authenticated
with check (
  public.clm_asso_can_access_resource(club_id, 'documents')
  and public.clm_asso_has_permission(club_id, 'manage_documents')
);

drop policy if exists "clm_asso_documents_update"
on public.clm_asso_documents;
create policy "clm_asso_documents_update"
on public.clm_asso_documents
for update to authenticated
using (
  public.clm_asso_can_access_resource(club_id, 'documents')
  and public.clm_asso_has_permission(club_id, 'manage_documents')
)
with check (
  public.clm_asso_can_access_resource(club_id, 'documents')
  and public.clm_asso_has_permission(club_id, 'manage_documents')
);

drop policy if exists "clm_asso_documents_delete"
on public.clm_asso_documents;
create policy "clm_asso_documents_delete"
on public.clm_asso_documents
for delete to authenticated
using (
  public.clm_asso_can_access_resource(club_id, 'documents')
  and public.clm_asso_has_permission(club_id, 'manage_documents')
);

-- Versions de documents.
drop policy if exists "clm_asso_document_versions_select"
on public.clm_asso_document_versions;
create policy "clm_asso_document_versions_select"
on public.clm_asso_document_versions
for select to authenticated
using (
  exists (
    select 1
    from public.clm_asso_documents document
    where document.id = document_id
      and public.clm_asso_can_access_resource(document.club_id, 'documents')
  )
);

drop policy if exists "clm_asso_document_versions_insert"
on public.clm_asso_document_versions;
create policy "clm_asso_document_versions_insert"
on public.clm_asso_document_versions
for insert to authenticated
with check (
  exists (
    select 1
    from public.clm_asso_documents document
    where document.id = document_id
      and public.clm_asso_can_access_resource(document.club_id, 'documents')
      and public.clm_asso_has_permission(document.club_id, 'manage_documents')
  )
);

-- Aucun update direct d'une version : l'historique reste immuable.
drop policy if exists "clm_asso_document_versions_update"
on public.clm_asso_document_versions;

-- Suppression uniquement via les gestionnaires autorisés.
drop policy if exists "clm_asso_document_versions_delete"
on public.clm_asso_document_versions;
create policy "clm_asso_document_versions_delete"
on public.clm_asso_document_versions
for delete to authenticated
using (
  exists (
    select 1
    from public.clm_asso_documents document
    where document.id = document_id
      and public.clm_asso_can_access_resource(document.club_id, 'documents')
      and public.clm_asso_has_permission(document.club_id, 'manage_documents')
  )
);

-- Storage privé.
drop policy if exists "clm_asso_storage_select" on storage.objects;
create policy "clm_asso_storage_select"
on storage.objects
for select to authenticated
using (
  bucket_id = 'clm-asso-documents'
  and public.clm_asso_can_access_resource(
    ((storage.foldername(name))[1])::uuid,
    'documents'
  )
);

drop policy if exists "clm_asso_storage_insert" on storage.objects;
create policy "clm_asso_storage_insert"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'clm-asso-documents'
  and public.clm_asso_can_access_resource(
    ((storage.foldername(name))[1])::uuid,
    'documents'
  )
  and public.clm_asso_has_permission(
    ((storage.foldername(name))[1])::uuid,
    'manage_documents'
  )
);

drop policy if exists "clm_asso_storage_update" on storage.objects;
create policy "clm_asso_storage_update"
on storage.objects
for update to authenticated
using (
  bucket_id = 'clm-asso-documents'
  and public.clm_asso_can_access_resource(
    ((storage.foldername(name))[1])::uuid,
    'documents'
  )
  and public.clm_asso_has_permission(
    ((storage.foldername(name))[1])::uuid,
    'manage_documents'
  )
)
with check (
  bucket_id = 'clm-asso-documents'
  and public.clm_asso_can_access_resource(
    ((storage.foldername(name))[1])::uuid,
    'documents'
  )
  and public.clm_asso_has_permission(
    ((storage.foldername(name))[1])::uuid,
    'manage_documents'
  )
);

drop policy if exists "clm_asso_storage_delete" on storage.objects;
create policy "clm_asso_storage_delete"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'clm-asso-documents'
  and public.clm_asso_can_access_resource(
    ((storage.foldername(name))[1])::uuid,
    'documents'
  )
  and public.clm_asso_has_permission(
    ((storage.foldername(name))[1])::uuid,
    'manage_documents'
  )
);

-- =========================================================
-- 5. DEUXIÈME NOTIFICATION D'ONBOARDING POUR LE PROPRIÉTAIRE
-- =========================================================

create or replace function public.clm_asso_notify_membership_activation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_club_name text;
begin
  if new.status <> 'active' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is not distinct from 'active' then
    return new;
  end if;

  select club.name
    into v_club_name
    from public.clm_asso_clubs club
    where club.id = new.club_id;

    insert into public.clm_asso_notifications (
      club_id,
      user_id,
      notification_type,
      title,
      body,
      href,
      dedupe_key
    )
    values (
      new.club_id,
      new.user_id,
      'membership',
      'Bienvenue dans ' || coalesce(v_club_name, 'votre club'),
      'Votre accès CLM Asso est maintenant actif.',
      '/app/tableau-de-bord',
      'membership:' || new.club_id::text || ':' || new.user_id::text
    )
    on conflict (user_id, dedupe_key)
    where dedupe_key is not null
    do nothing;

    if new.role = 'owner' then
      insert into public.clm_asso_notifications (
        club_id,
        user_id,
        notification_type,
        title,
        body,
        href,
        dedupe_key
      )
      values (
        new.club_id,
        new.user_id,
        'onboarding',
        'Complétez les informations de votre club',
        'Rendez-vous dans Paramètres pour compléter le profil du club et vos informations personnelles.',
        '/app/parametres',
        'onboarding-profile:' || new.club_id::text || ':' || new.user_id::text
      )
      on conflict (user_id, dedupe_key)
      where dedupe_key is not null
      do nothing;
    end if;

  return new;
end;
$$;

revoke all on function
public.clm_asso_notify_membership_activation()
from public, anon, authenticated;

drop trigger if exists clm_asso_membership_activation_notification
on public.clm_asso_club_members;

create trigger clm_asso_membership_activation_notification
after insert or update of status on public.clm_asso_club_members
for each row execute function public.clm_asso_notify_membership_activation();

-- Rattrapage pour les propriétaires existants dont le profil ou le club
-- contient encore des informations importantes non renseignées.
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
  membership.club_id,
  membership.user_id,
  'onboarding',
  'Complétez les informations de votre club',
  'Rendez-vous dans Paramètres pour compléter le profil du club et vos informations personnelles.',
  '/app/parametres',
  'onboarding-profile:' || membership.club_id::text || ':' || membership.user_id::text
from public.clm_asso_club_members membership
join public.clm_asso_clubs club
  on club.id = membership.club_id
left join public.clm_asso_profiles profile
  on profile.id = membership.user_id
where membership.role = 'owner'
  and membership.status = 'active'
  and (
    nullif(btrim(coalesce(profile.first_name, '')), '') is null
    or nullif(btrim(coalesce(profile.last_name, '')), '') is null
    or nullif(btrim(coalesce(club.acronym, '')), '') is null
    or nullif(btrim(coalesce(club.description, '')), '') is null
    or nullif(btrim(coalesce(club.logo_url, '')), '') is null
    or nullif(btrim(coalesce(club.contact_email, '')), '') is null
    or nullif(btrim(coalesce(club.contact_phone, '')), '') is null
    or nullif(btrim(coalesce(club.city, '')), '') is null
  )
on conflict (user_id, dedupe_key)
where dedupe_key is not null
do nothing;

-- =========================================================
-- 6. DIAGNOSTIC SÉCURISÉ STRIPE ↔ CLUB
-- =========================================================

create or replace function public.clm_asso_check_billing_link(
  p_club_id uuid
)
returns table (
  checked_club_id uuid,
  plan_code text,
  subscription_status text,
  stripe_customer_linked boolean,
  stripe_subscription_linked boolean,
  stripe_price_linked boolean,
  stripe_price_matches_plan boolean,
  billing_link_complete boolean
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

  if not public.clm_asso_can_manage_billing(p_club_id) then
    raise exception 'Vous ne pouvez pas gérer la facturation de ce club.';
  end if;

  return query
  select
    club.id,
    plan.code,
    subscription.status,
    subscription.stripe_customer_id is not null,
    subscription.stripe_subscription_id is not null,
    subscription.stripe_price_id is not null,
    subscription.stripe_price_id is not null
      and plan.stripe_monthly_price_id is not null
      and subscription.stripe_price_id = plan.stripe_monthly_price_id,
    subscription.stripe_customer_id is not null
      and subscription.stripe_subscription_id is not null
      and subscription.stripe_price_id is not null
      and plan.stripe_monthly_price_id is not null
      and subscription.stripe_price_id = plan.stripe_monthly_price_id
  from public.clm_asso_clubs club
  left join public.clm_asso_club_subscriptions subscription
    on subscription.club_id = club.id
  left join public.clm_asso_subscription_plans plan
    on plan.id = subscription.plan_id
  where club.id = p_club_id;
end;
$$;

revoke all on function
public.clm_asso_check_billing_link(uuid)
from public, anon;

grant execute on function
public.clm_asso_check_billing_link(uuid)
to authenticated;

commit;
