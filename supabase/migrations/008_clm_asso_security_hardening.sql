-- =========================================================
-- CLM ASSO — DURCISSEMENT SÉCURITÉ AVANT PRODUCTION
-- Migration 008
-- À exécuter après 007_clm_asso_whatsapp_phone.sql.
-- =========================================================

begin;

-- =========================================================
-- 1. SCHÉMA PRIVÉ ET LIMITATION DE DÉBIT
-- =========================================================

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table if not exists private.clm_asso_rate_limits (
  scope_key text not null,
  action text not null,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (scope_key, action)
);

revoke all on table private.clm_asso_rate_limits
from public, anon, authenticated;

create or replace function private.clm_asso_enforce_rate_limit(
  p_scope_key text,
  p_action text,
  p_max_requests integer,
  p_window interval
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
declare
  v_count integer;
begin
  if nullif(btrim(p_scope_key), '') is null
     or nullif(btrim(p_action), '') is null
     or p_max_requests < 1
     or p_window <= interval '0 seconds' then
    raise exception 'Configuration de limitation invalide.';
  end if;

  insert into private.clm_asso_rate_limits (
    scope_key,
    action,
    window_started_at,
    request_count,
    updated_at
  )
  values (
    btrim(p_scope_key),
    btrim(p_action),
    now(),
    1,
    now()
  )
  on conflict (scope_key, action)
  do update set
    window_started_at = case
      when private.clm_asso_rate_limits.window_started_at <= now() - p_window
      then now()
      else private.clm_asso_rate_limits.window_started_at
    end,
    request_count = case
      when private.clm_asso_rate_limits.window_started_at <= now() - p_window
      then 1
      else private.clm_asso_rate_limits.request_count + 1
    end,
    updated_at = now()
  returning request_count into v_count;

  if v_count > p_max_requests then
    raise exception 'Trop de tentatives. Réessayez dans quelques instants.'
      using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function private.clm_asso_enforce_rate_limit(
  text,
  text,
  integer,
  interval
) from public, anon, authenticated;

create or replace function private.clm_asso_limit_message_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
begin
  if new.sender_user_id is null or new.message_type = 'system' then
    return new;
  end if;

  perform private.clm_asso_enforce_rate_limit(
    new.sender_user_id::text || ':' || new.sender_club_id::text,
    'interclub-messages-global',
    300,
    interval '10 minutes'
  );

  perform private.clm_asso_enforce_rate_limit(
    new.sender_user_id::text || ':' || new.conversation_id::text,
    'interclub-messages-conversation',
    100,
    interval '10 minutes'
  );

  if new.message_type = 'calendar_proposal' then
    perform private.clm_asso_enforce_rate_limit(
      new.sender_user_id::text || ':' || new.sender_club_id::text,
      'calendar-proposals',
      20,
      interval '1 hour'
    );
  end if;

  return new;
end;
$$;

revoke all on function private.clm_asso_limit_message_insert()
from public, anon, authenticated;

drop trigger if exists clm_asso_messages_rate_limit
on public.clm_asso_messages;

create trigger clm_asso_messages_rate_limit
before insert on public.clm_asso_messages
for each row
execute function private.clm_asso_limit_message_insert();

-- L'Edge Function appelle cette fonction avant de créer une invitation.
create or replace function public.clm_asso_consume_invitation_rate_limit(
  p_club_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  if not public.clm_asso_has_permission(p_club_id, 'manage_roles') then
    raise exception 'Permission insuffisante.';
  end if;

  perform private.clm_asso_enforce_rate_limit(
    auth.uid()::text || ':' || p_club_id::text,
    'club-invitations',
    20,
    interval '1 hour'
  );
end;
$$;

revoke all on function public.clm_asso_consume_invitation_rate_limit(uuid)
from public, anon;

grant execute on function public.clm_asso_consume_invitation_rate_limit(uuid)
to authenticated;

-- =========================================================
-- 2. FORMULAIRE PUBLIC : PLUS D'INSERTION DIRECTE
-- =========================================================

create or replace function public.clm_asso_submit_interest(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_role text,
  p_club_name text,
  p_city text,
  p_sport text,
  p_licensees_count integer,
  p_teams_count integer,
  p_current_tools text[],
  p_problems text[],
  p_desired_features text[],
  p_main_problem text,
  p_interest_level text,
  p_contact_permission boolean
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id uuid;
begin
  if p_contact_permission is not true then
    raise exception 'Le consentement de contact est obligatoire.';
  end if;

  if char_length(btrim(coalesce(p_first_name, ''))) not between 1 and 80
     or char_length(btrim(coalesce(p_last_name, ''))) not between 1 and 80
     or char_length(btrim(coalesce(p_club_name, ''))) not between 2 and 160
     or char_length(btrim(coalesce(p_city, ''))) not between 1 and 120
     or char_length(btrim(coalesce(p_sport, ''))) not between 1 and 80 then
    raise exception 'Un ou plusieurs champs obligatoires sont invalides.';
  end if;

  if char_length(v_email) > 254
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Adresse e-mail invalide.';
  end if;

  if p_phone is not null
     and nullif(btrim(p_phone), '') is not null
     and (
       char_length(btrim(p_phone)) > 32
       or btrim(p_phone) !~ '^[0-9+(). /-]{6,32}$'
     ) then
    raise exception 'Numéro de téléphone invalide.';
  end if;

  if p_role not in (
    'president', 'secretary', 'treasurer', 'correspondent',
    'sport_manager', 'administrative_manager', 'coach', 'team_manager',
    'volunteer', 'player', 'parent', 'other'
  ) then
    raise exception 'Rôle invalide.';
  end if;

  if p_interest_level not in (
    'club_pilot', 'keep_informed', 'need_more_information', 'opinion_only'
  ) then
    raise exception 'Niveau d’intérêt invalide.';
  end if;

  if p_licensees_count is not null
     and p_licensees_count not between 0 and 100000 then
    raise exception 'Nombre de licenciés invalide.';
  end if;

  if p_teams_count is not null
     and p_teams_count not between 0 and 10000 then
    raise exception 'Nombre d’équipes invalide.';
  end if;

  if cardinality(coalesce(p_current_tools, '{}'::text[])) > 30
     or cardinality(coalesce(p_problems, '{}'::text[])) > 30
     or cardinality(coalesce(p_desired_features, '{}'::text[])) > 30
     or char_length(coalesce(p_main_problem, '')) > 2000 then
    raise exception 'Le contenu du formulaire est trop volumineux.';
  end if;

  perform private.clm_asso_enforce_rate_limit(
    md5(v_email),
    'public-interest-form',
    3,
    interval '24 hours'
  );

  insert into public.clm_asso_club_interests (
    first_name,
    last_name,
    email,
    phone,
    role,
    club_name,
    city,
    sport,
    licensees_count,
    teams_count,
    current_tools,
    problems,
    desired_features,
    main_problem,
    interest_level,
    contact_permission
  ) values (
    btrim(p_first_name),
    btrim(p_last_name),
    v_email,
    nullif(btrim(p_phone), ''),
    p_role,
    btrim(p_club_name),
    btrim(p_city),
    btrim(p_sport),
    p_licensees_count,
    p_teams_count,
    coalesce(p_current_tools, '{}'::text[]),
    coalesce(p_problems, '{}'::text[]),
    coalesce(p_desired_features, '{}'::text[]),
    nullif(btrim(p_main_problem), ''),
    p_interest_level,
    true
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.clm_asso_submit_interest(
  text, text, text, text, text, text, text, text,
  integer, integer, text[], text[], text[], text, text, boolean
) from public;

grant execute on function public.clm_asso_submit_interest(
  text, text, text, text, text, text, text, text,
  integer, integer, text[], text[], text[], text, text, boolean
) to anon, authenticated;

revoke insert on table public.clm_asso_club_interests
from anon, authenticated;

drop policy if exists "clm_asso_club_interests_public_insert"
on public.clm_asso_club_interests;

-- =========================================================
-- 3. CONTRAINTES DE TAILLE ET DE FORMAT
-- NOT VALID évite de bloquer la migration à cause d'anciennes données,
-- tout en protégeant les nouvelles insertions et modifications.
-- =========================================================

alter table public.clm_asso_profiles
  drop constraint if exists clm_asso_profiles_text_limits,
  add constraint clm_asso_profiles_text_limits check (
    (first_name is null or char_length(first_name) <= 80)
    and (last_name is null or char_length(last_name) <= 80)
    and (display_name is null or char_length(display_name) <= 160)
    and (avatar_url is null or char_length(avatar_url) <= 2048)
    and (phone is null or (
      char_length(phone) <= 32
      and phone ~ '^[0-9+(). /-]{6,32}$'
    ))
    and (birth_date is null or birth_date between date '1900-01-01' and date '2100-01-01')
  ) not valid;

alter table public.clm_asso_clubs
  drop constraint if exists clm_asso_clubs_text_limits,
  add constraint clm_asso_clubs_text_limits check (
    char_length(btrim(name)) between 2 and 160
    and char_length(slug) <= 190
    and (acronym is null or char_length(acronym) <= 20)
    and (description is null or char_length(description) <= 4000)
    and (logo_url is null or char_length(logo_url) <= 2048)
    and (season_label is null or char_length(season_label) <= 40)
    and (contact_email is null or (
      char_length(contact_email) <= 254
      and contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ))
    and (contact_phone is null or (
      char_length(contact_phone) <= 32
      and contact_phone ~ '^[0-9+(). /-]{6,32}$'
    ))
    and (website is null or char_length(website) <= 2048)
    and (address is null or char_length(address) <= 255)
    and (postal_code is null or char_length(postal_code) <= 20)
    and (city is null or char_length(city) <= 120)
    and char_length(timezone) <= 80
  ) not valid;

alter table public.clm_asso_members
  drop constraint if exists clm_asso_members_text_limits,
  add constraint clm_asso_members_text_limits check (
    char_length(btrim(first_name)) between 1 and 80
    and char_length(btrim(last_name)) between 1 and 80
    and (email is null or char_length(email) <= 254)
    and (phone is null or char_length(phone) <= 32)
    and char_length(role_label) <= 80
    and (license_number is null or char_length(license_number) <= 80)
    and (notes is null or char_length(notes) <= 5000)
  ) not valid;

alter table public.clm_asso_teams
  drop constraint if exists clm_asso_teams_text_limits,
  add constraint clm_asso_teams_text_limits check (
    char_length(btrim(name)) between 1 and 160
    and char_length(category) <= 80
    and (description is null or char_length(description) <= 4000)
    and color ~ '^#[0-9A-Fa-f]{6}$'
  ) not valid;

alter table public.clm_asso_events
  drop constraint if exists clm_asso_events_content_limits,
  add constraint clm_asso_events_content_limits check (
    char_length(btrim(title)) between 1 and 200
    and (location is null or char_length(location) <= 255)
    and (description is null or char_length(description) <= 5000)
    and (ends_at is null or ends_at > starts_at)
  ) not valid;

alter table public.clm_asso_matches
  drop constraint if exists clm_asso_matches_content_limits,
  add constraint clm_asso_matches_content_limits check (
    char_length(btrim(opponent_name)) between 1 and 200
    and (location is null or char_length(location) <= 255)
    and (competition is null or char_length(competition) <= 160)
    and (notes is null or char_length(notes) <= 5000)
    and (score_home is null or score_home <= 999)
    and (score_away is null or score_away <= 999)
  ) not valid;

alter table public.clm_asso_convocations
  drop constraint if exists clm_asso_convocations_content_limits,
  add constraint clm_asso_convocations_content_limits check (
    char_length(btrim(title)) between 1 and 200
    and (message is null or char_length(message) <= 5000)
  ) not valid;

alter table public.clm_asso_convocation_recipients
  drop constraint if exists clm_asso_convocation_comments_limit,
  add constraint clm_asso_convocation_comments_limit check (
    comment is null or char_length(comment) <= 2000
  ) not valid;

alter table public.clm_asso_announcements
  drop constraint if exists clm_asso_announcements_content_limits,
  add constraint clm_asso_announcements_content_limits check (
    char_length(btrim(title)) between 1 and 200
    and char_length(content) between 1 and 10000
    and char_length(audience) <= 160
  ) not valid;

alter table public.clm_asso_tasks
  drop constraint if exists clm_asso_tasks_content_limits,
  add constraint clm_asso_tasks_content_limits check (
    char_length(btrim(title)) between 1 and 200
    and (description is null or char_length(description) <= 5000)
    and char_length(category) <= 100
  ) not valid;

alter table public.clm_asso_documents
  drop constraint if exists clm_asso_documents_content_limits,
  add constraint clm_asso_documents_content_limits check (
    char_length(btrim(name)) between 1 and 255
    and char_length(folder) between 1 and 120
    and (mime_type is null or char_length(mime_type) <= 160)
    and size_bytes between 0 and 52428800
    and char_length(storage_path) between 1 and 1024
  ) not valid;

alter table public.clm_asso_invitations
  drop constraint if exists clm_asso_invitations_content_limits,
  add constraint clm_asso_invitations_content_limits check (
    char_length(email) <= 254
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and (first_name is null or char_length(first_name) <= 80)
    and (last_name is null or char_length(last_name) <= 80)
  ) not valid;

alter table public.clm_asso_notifications
  drop constraint if exists clm_asso_notifications_content_limits,
  add constraint clm_asso_notifications_content_limits check (
    char_length(title) between 1 and 200
    and (body is null or char_length(body) <= 2000)
    and (href is null or (
      char_length(href) <= 500
      and href like '/app/%'
    ))
    and (dedupe_key is null or char_length(dedupe_key) <= 500)
  ) not valid;

alter table public.clm_asso_messages
  drop constraint if exists clm_asso_messages_content_limits,
  add constraint clm_asso_messages_content_limits check (
    body is null or char_length(body) <= 5000
  ) not valid;

alter table public.clm_asso_calendar_proposals
  drop constraint if exists clm_asso_calendar_proposals_content_limits,
  add constraint clm_asso_calendar_proposals_content_limits check (
    char_length(btrim(title)) between 1 and 200
    and (location is null or char_length(location) <= 255)
    and (description is null or char_length(description) <= 5000)
  ) not valid;

alter table public.clm_asso_club_interests
  drop constraint if exists clm_asso_club_interests_content_limits,
  add constraint clm_asso_club_interests_content_limits check (
    char_length(first_name) between 1 and 80
    and char_length(last_name) between 1 and 80
    and char_length(email) <= 254
    and (phone is null or char_length(phone) <= 32)
    and char_length(role) <= 80
    and char_length(club_name) between 2 and 160
    and char_length(city) between 1 and 120
    and char_length(sport) between 1 and 80
    and cardinality(current_tools) <= 30
    and cardinality(problems) <= 30
    and cardinality(desired_features) <= 30
    and (main_problem is null or char_length(main_problem) <= 2000)
    and char_length(interest_level) <= 80
  ) not valid;

-- =========================================================
-- 4. RLS, PRIVILÈGES ET SECURITY DEFINER
-- =========================================================

revoke create on schema public from public, anon, authenticated;

do $$
declare
  v_table record;
begin
  for v_table in
    select format('%I.%I', schemaname, tablename) as qualified_name
    from pg_catalog.pg_tables
    where schemaname = 'public'
      and tablename like 'clm_asso_%'
  loop
    execute format('alter table %s enable row level security', v_table.qualified_name);
    execute format('alter table %s force row level security', v_table.qualified_name);
    execute format('revoke all on table %s from anon', v_table.qualified_name);
  end loop;
end;
$$;

-- Le formulaire public passe uniquement par clm_asso_submit_interest().
grant execute on function public.clm_asso_submit_interest(
  text, text, text, text, text, text, text, text,
  integer, integer, text[], text[], text[], text, text, boolean
) to anon, authenticated;

do $$
declare
  v_function record;
begin
  for v_function in
    select
      procedure.oid::regprocedure as signature,
      procedure.prosecdef as is_security_definer
    from pg_catalog.pg_proc procedure
    join pg_catalog.pg_namespace namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname like 'clm_asso_%'
  loop
    execute format(
      'revoke all on function %s from public, anon',
      v_function.signature
    );

    if v_function.is_security_definer then
      execute format(
        'alter function %s set search_path = pg_catalog, public, private',
        v_function.signature
      );
    end if;
  end loop;
end;
$$;

-- Réapplique les deux fonctions volontairement publiques après la révocation globale.
grant execute on function public.clm_asso_submit_interest(
  text, text, text, text, text, text, text, text,
  integer, integer, text[], text[], text[], text, text, boolean
) to anon, authenticated;

grant execute on function public.clm_asso_consume_invitation_rate_limit(uuid)
to authenticated;

commit;
