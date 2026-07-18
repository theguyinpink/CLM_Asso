-- =========================================================
-- CLM ASSO — CONSERVATION DU PLAN PENDANT L’INSCRIPTION
-- Migration 010
--
-- À exécuter après 009_clm_asso_subscription_plans.sql.
-- Cette migration lie atomiquement le nouveau club au plan
-- choisi et crée un abonnement en attente de paiement.
-- =========================================================

begin;

-- La signature historique n’est plus utilisée par la nouvelle
-- application. Elle est supprimée pour obliger tous les clients
-- à transmettre explicitement le plan et le nombre de licenciés.
drop function if exists
public.clm_asso_create_club(text, text);

create function public.clm_asso_create_club(
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
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Utilisateur non authentifié.';
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
    raise exception
      'Ce compte possède déjà un club actif.';
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
