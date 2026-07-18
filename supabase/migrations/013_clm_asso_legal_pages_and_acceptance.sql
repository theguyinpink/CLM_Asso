-- =========================================================
-- CLM ASSO — PAGES JURIDIQUES ET PREUVE D’ACCEPTATION
-- Migration 013
-- À exécuter après 012_clm_asso_stripe_checkout_and_access.sql.
-- =========================================================

begin;

-- =========================================================
-- 1. CATALOGUE VERSIONNÉ DES DOCUMENTS JURIDIQUES
-- =========================================================

create table if not exists public.clm_asso_legal_documents (
  id uuid primary key default gen_random_uuid(),
  document_key text not null,
  title text not null,
  version text not null,
  route text not null,
  effective_at date not null,
  is_current boolean not null default false,
  requires_account_acceptance boolean not null default false,
  requires_billing_acceptance boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint clm_asso_legal_documents_key_check
    check (document_key in (
      'legal_notice',
      'privacy',
      'terms_of_use',
      'terms_of_sale',
      'cookies'
    )),

  constraint clm_asso_legal_documents_text_limits
    check (
      char_length(document_key) between 1 and 80
      and char_length(title) between 1 and 180
      and char_length(version) between 1 and 40
      and char_length(route) between 1 and 240
    ),

  constraint clm_asso_legal_documents_acceptance_scope_check
    check (not (
      requires_account_acceptance
      and requires_billing_acceptance
    )),

  unique (document_key, version),
  unique (id, document_key, version)
);

create unique index if not exists
clm_asso_legal_documents_one_current_per_key
on public.clm_asso_legal_documents (document_key)
where is_current = true;

create index if not exists
clm_asso_legal_documents_current_index
on public.clm_asso_legal_documents (is_current, document_key);

-- Permet une future migration de version sans conflit avec l’index partiel.
update public.clm_asso_legal_documents
set
  is_current = false,
  updated_at = now()
where document_key in (
  'legal_notice',
  'privacy',
  'terms_of_use',
  'terms_of_sale',
  'cookies'
)
and version <> '1.0'
and is_current = true;

insert into public.clm_asso_legal_documents (
  document_key,
  title,
  version,
  route,
  effective_at,
  is_current,
  requires_account_acceptance,
  requires_billing_acceptance
)
values
  (
    'legal_notice',
    'Mentions légales',
    '1.0',
    '/mentions-legales',
    date '2026-07-18',
    true,
    false,
    false
  ),
  (
    'privacy',
    'Politique de confidentialité',
    '1.0',
    '/confidentialite',
    date '2026-07-18',
    true,
    true,
    false
  ),
  (
    'terms_of_use',
    'Conditions générales d’utilisation',
    '1.0',
    '/cgu',
    date '2026-07-18',
    true,
    true,
    false
  ),
  (
    'terms_of_sale',
    'Conditions générales de vente',
    '1.0',
    '/cgv',
    date '2026-07-18',
    true,
    false,
    true
  ),
  (
    'cookies',
    'Politique relative aux cookies et traceurs',
    '1.0',
    '/cookies',
    date '2026-07-18',
    true,
    false,
    false
  )
on conflict (document_key, version) do update
set
  title = excluded.title,
  route = excluded.route,
  effective_at = excluded.effective_at,
  is_current = excluded.is_current,
  requires_account_acceptance = excluded.requires_account_acceptance,
  requires_billing_acceptance = excluded.requires_billing_acceptance,
  updated_at = now();

-- Un seul déclencheur de mise à jour, même en cas de relance de la migration.
drop trigger if exists clm_asso_legal_documents_updated_at
on public.clm_asso_legal_documents;

create trigger clm_asso_legal_documents_updated_at
before update on public.clm_asso_legal_documents
for each row execute function public.clm_asso_set_updated_at();

-- =========================================================
-- 2. PREUVES D’ACCEPTATION
-- =========================================================

create table if not exists public.clm_asso_legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  club_id uuid references public.clm_asso_clubs(id) on delete cascade,
  document_id uuid not null,
  document_key text not null,
  document_version text not null,
  document_title_snapshot text not null,
  document_route_snapshot text not null,
  context text not null,
  accepted_at timestamptz not null default now(),

  constraint clm_asso_legal_acceptances_document_fkey
    foreign key (document_id, document_key, document_version)
    references public.clm_asso_legal_documents (
      id,
      document_key,
      version
    )
    on delete restrict,

  constraint clm_asso_legal_acceptances_context_check
    check (context in ('signup', 'first_access', 'checkout', 'manual')),

  constraint clm_asso_legal_acceptances_document_key_check
    check (document_key in ('privacy', 'terms_of_use', 'terms_of_sale')),

  constraint clm_asso_legal_acceptances_club_scope_check
    check (
      (document_key = 'terms_of_sale' and club_id is not null)
      or
      (document_key in ('privacy', 'terms_of_use') and club_id is null)
    ),

  constraint clm_asso_legal_acceptances_snapshot_limits
    check (
      char_length(document_title_snapshot) between 1 and 180
      and char_length(document_route_snapshot) between 1 and 240
      and char_length(document_version) between 1 and 40
    )
);

create unique index if not exists
clm_asso_legal_acceptances_account_unique
on public.clm_asso_legal_acceptances (
  user_id,
  document_key,
  document_version
)
where club_id is null;

create unique index if not exists
clm_asso_legal_acceptances_club_unique
on public.clm_asso_legal_acceptances (
  user_id,
  club_id,
  document_key,
  document_version
)
where club_id is not null;

create index if not exists
clm_asso_legal_acceptances_user_index
on public.clm_asso_legal_acceptances (user_id, accepted_at desc);

create index if not exists
clm_asso_legal_acceptances_club_index
on public.clm_asso_legal_acceptances (club_id, accepted_at desc)
where club_id is not null;

-- =========================================================
-- 3. RLS ET DROITS SQL
-- =========================================================

alter table public.clm_asso_legal_documents enable row level security;
alter table public.clm_asso_legal_acceptances enable row level security;

-- Les textes courants doivent être consultables avant même l’inscription.
drop policy if exists "clm_asso_legal_documents_read_current"
on public.clm_asso_legal_documents;

create policy "clm_asso_legal_documents_read_current"
on public.clm_asso_legal_documents
for select
to anon, authenticated
using (is_current = true);

-- Chaque utilisateur peut uniquement consulter ses propres preuves.
drop policy if exists "clm_asso_legal_acceptances_read_own"
on public.clm_asso_legal_acceptances;

create policy "clm_asso_legal_acceptances_read_own"
on public.clm_asso_legal_acceptances
for select
to authenticated
using (user_id = (select auth.uid()));

grant select on table public.clm_asso_legal_documents
to anon, authenticated;

grant select on table public.clm_asso_legal_acceptances
to authenticated;

revoke insert, update, delete, truncate, references, trigger
on table public.clm_asso_legal_documents
from public, anon, authenticated;

revoke insert, update, delete, truncate, references, trigger
on table public.clm_asso_legal_acceptances
from public, anon, authenticated;

-- =========================================================
-- 4. LECTURE DU STATUT JURIDIQUE COURANT
-- =========================================================

create or replace function public.clm_asso_get_legal_status(
  p_club_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_terms_of_use_id uuid;
  v_terms_of_use_version text;
  v_privacy_id uuid;
  v_privacy_version text;
  v_terms_of_sale_id uuid;
  v_terms_of_sale_version text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  if p_club_id is not null
    and not exists (
      select 1
      from public.clm_asso_club_members membership
      where membership.club_id = p_club_id
        and membership.user_id = v_user_id
        and membership.status = 'active'
    )
  then
    raise exception 'Vous ne faites pas partie de ce club.';
  end if;

  select document.id, document.version
  into v_terms_of_use_id, v_terms_of_use_version
  from public.clm_asso_legal_documents document
  where document.document_key = 'terms_of_use'
    and document.is_current = true;

  select document.id, document.version
  into v_privacy_id, v_privacy_version
  from public.clm_asso_legal_documents document
  where document.document_key = 'privacy'
    and document.is_current = true;

  select document.id, document.version
  into v_terms_of_sale_id, v_terms_of_sale_version
  from public.clm_asso_legal_documents document
  where document.document_key = 'terms_of_sale'
    and document.is_current = true;

  if v_terms_of_use_id is null
    or v_privacy_id is null
    or v_terms_of_sale_id is null
  then
    raise exception 'Configuration des documents juridiques incomplète.';
  end if;

  return jsonb_build_object(
    'terms_of_use_accepted', exists (
      select 1
      from public.clm_asso_legal_acceptances acceptance
      where acceptance.user_id = v_user_id
        and acceptance.club_id is null
        and acceptance.document_id = v_terms_of_use_id
    ),
    'privacy_acknowledged', exists (
      select 1
      from public.clm_asso_legal_acceptances acceptance
      where acceptance.user_id = v_user_id
        and acceptance.club_id is null
        and acceptance.document_id = v_privacy_id
    ),
    'terms_of_sale_accepted', (
      p_club_id is not null
      and exists (
        select 1
        from public.clm_asso_legal_acceptances acceptance
        where acceptance.user_id = v_user_id
          and acceptance.club_id = p_club_id
          and acceptance.document_id = v_terms_of_sale_id
      )
    ),
    'terms_of_use_version', v_terms_of_use_version,
    'privacy_version', v_privacy_version,
    'terms_of_sale_version', v_terms_of_sale_version
  );
end;
$$;

revoke all on function public.clm_asso_get_legal_status(uuid)
from public, anon;

grant execute on function public.clm_asso_get_legal_status(uuid)
to authenticated;

-- =========================================================
-- 5. ENREGISTREMENT SÉCURISÉ DES ACCEPTATIONS
-- =========================================================

create or replace function public.clm_asso_accept_legal_documents(
  p_document_keys text[],
  p_club_id uuid default null,
  p_context text default 'first_access'
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_key text;
  v_document public.clm_asso_legal_documents%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  if p_context not in ('first_access', 'checkout', 'manual') then
    raise exception 'Contexte d’acceptation invalide.';
  end if;

  if coalesce(cardinality(p_document_keys), 0) < 1
    or cardinality(p_document_keys) > 5
  then
    raise exception 'Liste de documents juridiques invalide.';
  end if;

  for v_key in
    select distinct btrim(requested.document_key)
    from unnest(p_document_keys) as requested(document_key)
  loop
    if v_key not in ('privacy', 'terms_of_use', 'terms_of_sale') then
      raise exception 'Document juridique non autorisé : %', v_key;
    end if;

    select document.*
    into v_document
    from public.clm_asso_legal_documents document
    where document.document_key = v_key
      and document.is_current = true;

    if v_document.id is null then
      raise exception 'Version juridique courante introuvable : %', v_key;
    end if;

    if v_key = 'terms_of_sale' then
      if p_club_id is null then
        raise exception 'Le club est obligatoire pour accepter les CGV.';
      end if;

      if not exists (
        select 1
        from public.clm_asso_club_members membership
        where membership.club_id = p_club_id
          and membership.user_id = v_user_id
          and membership.status = 'active'
          and membership.role in ('owner', 'admin')
      ) then
        raise exception
          'Seul le propriétaire ou un administrateur peut accepter les CGV.';
      end if;

      insert into public.clm_asso_legal_acceptances (
        user_id,
        club_id,
        document_id,
        document_key,
        document_version,
        document_title_snapshot,
        document_route_snapshot,
        context
      )
      values (
        v_user_id,
        p_club_id,
        v_document.id,
        v_document.document_key,
        v_document.version,
        v_document.title,
        v_document.route,
        p_context
      )
      on conflict (
        user_id,
        club_id,
        document_key,
        document_version
      )
      where club_id is not null
      do nothing;
    else
      insert into public.clm_asso_legal_acceptances (
        user_id,
        club_id,
        document_id,
        document_key,
        document_version,
        document_title_snapshot,
        document_route_snapshot,
        context
      )
      values (
        v_user_id,
        null,
        v_document.id,
        v_document.document_key,
        v_document.version,
        v_document.title,
        v_document.route,
        p_context
      )
      on conflict (
        user_id,
        document_key,
        document_version
      )
      where club_id is null
      do nothing;
    end if;
  end loop;
end;
$$;

revoke all on function
public.clm_asso_accept_legal_documents(text[], uuid, text)
from public, anon;

grant execute on function
public.clm_asso_accept_legal_documents(text[], uuid, text)
to authenticated;

-- =========================================================
-- 6. ACCEPTATION TRANSMISE LORS D’UNE NOUVELLE INSCRIPTION
-- =========================================================

create or replace function public.clm_asso_capture_signup_legal_acceptance()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_document public.clm_asso_legal_documents%rowtype;
begin
  if coalesce(new.raw_user_meta_data ->> 'legal_signup_accepted', '') <> 'true' then
    return new;
  end if;

  select document.*
  into v_document
  from public.clm_asso_legal_documents document
  where document.document_key = 'terms_of_use'
    and document.is_current = true;

  if v_document.id is not null
    and coalesce(
      new.raw_user_meta_data ->> 'accepted_terms_of_use_version',
      ''
    ) = v_document.version
  then
    insert into public.clm_asso_legal_acceptances (
      user_id,
      club_id,
      document_id,
      document_key,
      document_version,
      document_title_snapshot,
      document_route_snapshot,
      context
    )
    values (
      new.id,
      null,
      v_document.id,
      v_document.document_key,
      v_document.version,
      v_document.title,
      v_document.route,
      'signup'
    )
    on conflict (
      user_id,
      document_key,
      document_version
    )
    where club_id is null
    do nothing;
  end if;

  select document.*
  into v_document
  from public.clm_asso_legal_documents document
  where document.document_key = 'privacy'
    and document.is_current = true;

  if v_document.id is not null
    and coalesce(
      new.raw_user_meta_data ->> 'acknowledged_privacy_version',
      ''
    ) = v_document.version
  then
    insert into public.clm_asso_legal_acceptances (
      user_id,
      club_id,
      document_id,
      document_key,
      document_version,
      document_title_snapshot,
      document_route_snapshot,
      context
    )
    values (
      new.id,
      null,
      v_document.id,
      v_document.document_key,
      v_document.version,
      v_document.title,
      v_document.route,
      'signup'
    )
    on conflict (
      user_id,
      document_key,
      document_version
    )
    where club_id is null
    do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists clm_asso_capture_signup_legal_acceptance
on auth.users;

create trigger clm_asso_capture_signup_legal_acceptance
after insert on auth.users
for each row execute function public.clm_asso_capture_signup_legal_acceptance();

-- Rattrape les comptes éventuellement créés avec les bonnes métadonnées
-- entre le déploiement du frontend et l’exécution de cette migration.
insert into public.clm_asso_legal_acceptances (
  user_id,
  club_id,
  document_id,
  document_key,
  document_version,
  document_title_snapshot,
  document_route_snapshot,
  context
)
select
  auth_user.id,
  null,
  document.id,
  document.document_key,
  document.version,
  document.title,
  document.route,
  'signup'
from auth.users auth_user
join public.clm_asso_legal_documents document
  on document.document_key = 'terms_of_use'
  and document.is_current = true
where coalesce(auth_user.raw_user_meta_data ->> 'legal_signup_accepted', '') = 'true'
  and coalesce(
    auth_user.raw_user_meta_data ->> 'accepted_terms_of_use_version',
    ''
  ) = document.version
on conflict (
  user_id,
  document_key,
  document_version
)
where club_id is null
do nothing;

insert into public.clm_asso_legal_acceptances (
  user_id,
  club_id,
  document_id,
  document_key,
  document_version,
  document_title_snapshot,
  document_route_snapshot,
  context
)
select
  auth_user.id,
  null,
  document.id,
  document.document_key,
  document.version,
  document.title,
  document.route,
  'signup'
from auth.users auth_user
join public.clm_asso_legal_documents document
  on document.document_key = 'privacy'
  and document.is_current = true
where coalesce(auth_user.raw_user_meta_data ->> 'legal_signup_accepted', '') = 'true'
  and coalesce(
    auth_user.raw_user_meta_data ->> 'acknowledged_privacy_version',
    ''
  ) = document.version
on conflict (
  user_id,
  document_key,
  document_version
)
where club_id is null
do nothing;

-- =========================================================
-- 7. CRÉATION DE CLUB CONDITIONNÉE AUX CGU COURANTES
-- =========================================================

create or replace function public.clm_asso_create_club(
  p_name text,
  p_season_label text,
  p_plan_code text,
  p_declared_licensees_count integer
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_club_id uuid;
  v_plan_id uuid;
  v_plan_name text;
  v_plan_maximum_licensees integer;
  v_slug_base text;
  v_slug text;
  v_first_name text;
  v_last_name text;
  v_email text;
  v_required_legal_count integer;
  v_accepted_legal_count integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  select count(*)::integer
  into v_required_legal_count
  from public.clm_asso_legal_documents document
  where document.is_current = true
    and document.requires_account_acceptance = true;

  select count(distinct document.id)::integer
  into v_accepted_legal_count
  from public.clm_asso_legal_documents document
  join public.clm_asso_legal_acceptances acceptance
    on acceptance.document_id = document.id
    and acceptance.user_id = v_user_id
    and acceptance.club_id is null
  where document.is_current = true
    and document.requires_account_acceptance = true;

  if v_required_legal_count < 2
    or v_accepted_legal_count < v_required_legal_count
  then
    raise exception
      'Vous devez accepter les CGU et consulter la politique de confidentialité avant de créer un club.';
  end if;

  if char_length(btrim(coalesce(p_name, ''))) < 2 then
    raise exception 'Le nom du club est trop court.';
  end if;

  if char_length(btrim(p_name)) > 160 then
    raise exception 'Le nom du club est trop long.';
  end if;

  if p_declared_licensees_count is null
    or p_declared_licensees_count < 1
    or p_declared_licensees_count > 100000
  then
    raise exception
      'Le nombre de licenciés doit être compris entre 1 et 100 000.';
  end if;

  select
    plan.id,
    plan.name,
    plan.maximum_licensees
  into
    v_plan_id,
    v_plan_name,
    v_plan_maximum_licensees
  from public.clm_asso_subscription_plans plan
  where plan.code = btrim(coalesce(p_plan_code, ''))
    and plan.is_active = true;

  if v_plan_id is null then
    raise exception 'L’abonnement sélectionné est invalide ou indisponible.';
  end if;

  if v_plan_maximum_licensees is not null
    and p_declared_licensees_count > v_plan_maximum_licensees
  then
    raise exception
      'L’offre % est limitée à % licenciés.',
      v_plan_name,
      v_plan_maximum_licensees;
  end if;

  if exists (
    select 1
    from public.clm_asso_club_members membership
    where membership.user_id = v_user_id
      and membership.role = 'owner'
      and membership.status = 'active'
  ) then
    raise exception 'Ce compte possède déjà un club actif.';
  end if;

  select
    coalesce(nullif(btrim(profile.first_name), ''), 'À compléter'),
    coalesce(nullif(btrim(profile.last_name), ''), 'À compléter'),
    auth_user.email
  into
    v_first_name,
    v_last_name,
    v_email
  from auth.users auth_user
  left join public.clm_asso_profiles profile
    on profile.id = auth_user.id
  where auth_user.id = v_user_id;

  v_slug_base := btrim(
    regexp_replace(
      lower(btrim(p_name)),
      '[^a-z0-9]+',
      '-',
      'g'
    ),
    '-'
  );

  if v_slug_base = '' then
    v_slug_base := 'club';
  end if;

  v_slug :=
    v_slug_base || '-' ||
    substr(
      replace(gen_random_uuid()::text, '-', ''),
      1,
      8
    );

  insert into public.clm_asso_clubs (
    name,
    slug,
    season_label,
    created_by
  )
  values (
    btrim(p_name),
    v_slug,
    nullif(btrim(p_season_label), ''),
    v_user_id
  )
  returning id into v_club_id;

  insert into public.clm_asso_club_members (
    club_id,
    user_id,
    role,
    status,
    joined_at
  )
  values (
    v_club_id,
    v_user_id,
    'owner',
    'active',
    now()
  );

  insert into public.clm_asso_members (
    club_id,
    user_id,
    first_name,
    last_name,
    email,
    role_label,
    status
  )
  values (
    v_club_id,
    v_user_id,
    v_first_name,
    v_last_name,
    v_email,
    'Propriétaire',
    'active'
  );

  insert into public.clm_asso_club_subscriptions (
    club_id,
    plan_id,
    status,
    declared_licensees_count,
    selected_by,
    metadata
  )
  values (
    v_club_id,
    v_plan_id,
    'pending_payment',
    p_declared_licensees_count,
    v_user_id,
    jsonb_build_object(
      'selection_source',
      'signup',
      'selected_at',
      now()
    )
  );

  return v_club_id;
end;
$$;

revoke all on function
public.clm_asso_create_club(text, text, text, integer)
from public, anon;

grant execute on function
public.clm_asso_create_club(text, text, text, integer)
to authenticated;

commit;
