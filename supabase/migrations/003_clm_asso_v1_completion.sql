-- CLM Asso - finalisation V1
-- À exécuter après 001_clm_asso_core.sql puis 002_clm_asso_production.sql.
-- Cette migration est idempotente et ajoute invitations, permissions détaillées,
-- réponses personnelles aux convocations, notifications, activité et versions de documents.

create extension if not exists pgcrypto;

-- =========================================================
-- PERMISSIONS PAR RÔLE
-- =========================================================

create or replace function public.clm_asso_has_permission(
  p_club_id uuid,
  p_permission text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clm_asso_club_members membership
    where membership.club_id = p_club_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role = 'owner'
        or (
          membership.role = 'admin'
          and p_permission = any(array[
            'manage_club', 'manage_roles', 'manage_members', 'manage_teams',
            'manage_calendar', 'manage_matches', 'manage_convocations',
            'manage_announcements', 'manage_tasks', 'manage_documents'
          ])
        )
        or (
          membership.role = 'manager'
          and p_permission = any(array[
            'manage_club', 'manage_members', 'manage_teams', 'manage_calendar',
            'manage_matches', 'manage_convocations', 'manage_announcements',
            'manage_tasks', 'manage_documents'
          ])
        )
        or (
          membership.role = 'coach'
          and p_permission = any(array[
            'manage_teams', 'manage_calendar', 'manage_matches',
            'manage_convocations', 'manage_tasks'
          ])
        )
      )
  );
$$;

revoke all on function public.clm_asso_has_permission(uuid, text) from public;
grant execute on function public.clm_asso_has_permission(uuid, text) to authenticated;

create or replace function public.clm_asso_current_member_id(p_club_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select member.id
  from public.clm_asso_members member
  where member.club_id = p_club_id
    and member.user_id = (select auth.uid())
  limit 1;
$$;

revoke all on function public.clm_asso_current_member_id(uuid) from public;
grant execute on function public.clm_asso_current_member_id(uuid) to authenticated;

-- Compatibilité avec les anciennes fonctions.
create or replace function public.clm_asso_can_manage_club(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.clm_asso_has_permission(p_club_id, 'manage_club');
$$;

create or replace function public.clm_asso_can_manage_sport(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.clm_asso_has_permission(p_club_id, 'manage_matches');
$$;

-- =========================================================
-- INVITATIONS AU CLUB
-- =========================================================

create table if not exists public.clm_asso_invitations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clm_asso_clubs(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  role public.clm_asso_club_role not null default 'member',
  token uuid not null default gen_random_uuid() unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'cancelled', 'expired')),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists clm_asso_invitations_pending_email_unique
  on public.clm_asso_invitations(club_id, lower(email))
  where status = 'pending';
create index if not exists clm_asso_invitations_token_idx
  on public.clm_asso_invitations(token);

alter table public.clm_asso_invitations enable row level security;

drop policy if exists "clm_asso_invitations_select" on public.clm_asso_invitations;
create policy "clm_asso_invitations_select"
on public.clm_asso_invitations for select to authenticated
using (
  public.clm_asso_has_permission(club_id, 'manage_roles')
  or lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
);

drop policy if exists "clm_asso_invitations_insert" on public.clm_asso_invitations;
create policy "clm_asso_invitations_insert"
on public.clm_asso_invitations for insert to authenticated
with check (
  public.clm_asso_has_permission(club_id, 'manage_roles')
  and invited_by = (select auth.uid())
  and role <> 'owner'
);

drop policy if exists "clm_asso_invitations_update" on public.clm_asso_invitations;
create policy "clm_asso_invitations_update"
on public.clm_asso_invitations for update to authenticated
using (public.clm_asso_has_permission(club_id, 'manage_roles'))
with check (public.clm_asso_has_permission(club_id, 'manage_roles'));

drop policy if exists "clm_asso_invitations_delete" on public.clm_asso_invitations;
create policy "clm_asso_invitations_delete"
on public.clm_asso_invitations for delete to authenticated
using (public.clm_asso_has_permission(club_id, 'manage_roles'));

grant select, insert, update, delete on public.clm_asso_invitations to authenticated;
revoke all on public.clm_asso_invitations from anon;

create or replace function public.clm_asso_accept_invitation(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_invitation public.clm_asso_invitations%rowtype;
  v_profile public.clm_asso_profiles%rowtype;
  v_role_label text;
begin
  if v_user_id is null then
    raise exception 'Utilisateur non authentifié.';
  end if;

  select * into v_invitation
  from public.clm_asso_invitations
  where token = p_token
  for update;

  if not found then
    raise exception 'Invitation introuvable.';
  end if;

  if v_invitation.status = 'accepted' and v_invitation.accepted_by = v_user_id then
    return v_invitation.club_id;
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'Cette invitation n’est plus valide.';
  end if;

  if v_invitation.expires_at < now() then
    update public.clm_asso_invitations
    set status = 'expired', updated_at = now()
    where id = v_invitation.id;
    raise exception 'Cette invitation a expiré.';
  end if;

  if v_email = '' or v_email <> lower(v_invitation.email) then
    raise exception 'Connectez-vous avec l’adresse e-mail invitée.';
  end if;

  select * into v_profile
  from public.clm_asso_profiles
  where id = v_user_id;

  insert into public.clm_asso_club_members (
    club_id, user_id, role, status, joined_at
  ) values (
    v_invitation.club_id, v_user_id, v_invitation.role, 'active', now()
  )
  on conflict (club_id, user_id) do update
  set role = excluded.role,
      status = 'active',
      joined_at = coalesce(clm_asso_club_members.joined_at, now()),
      updated_at = now();

  v_role_label := case v_invitation.role
    when 'admin' then 'Administrateur'
    when 'manager' then 'Responsable'
    when 'coach' then 'Entraîneur'
    else 'Membre'
  end;

  insert into public.clm_asso_members (
    club_id, user_id, first_name, last_name, email, role_label, status
  ) values (
    v_invitation.club_id,
    v_user_id,
    coalesce(nullif(trim(v_profile.first_name), ''), nullif(trim(v_invitation.first_name), ''), 'À compléter'),
    coalesce(nullif(trim(v_profile.last_name), ''), nullif(trim(v_invitation.last_name), ''), 'À compléter'),
    v_invitation.email,
    v_role_label,
    'active'
  )
  on conflict (club_id, user_id) where user_id is not null do update
  set first_name = coalesce(nullif(excluded.first_name, 'À compléter'), clm_asso_members.first_name),
      last_name = coalesce(nullif(excluded.last_name, 'À compléter'), clm_asso_members.last_name),
      email = excluded.email,
      role_label = excluded.role_label,
      status = 'active',
      updated_at = now();

  update public.clm_asso_invitations
  set status = 'accepted',
      accepted_by = v_user_id,
      accepted_at = now(),
      updated_at = now()
  where id = v_invitation.id;

  return v_invitation.club_id;
end;
$$;

revoke all on function public.clm_asso_accept_invitation(uuid) from public;
grant execute on function public.clm_asso_accept_invitation(uuid) to authenticated;

-- Modification sécurisée d'un rôle. Le propriétaire ne peut pas être rétrogradé ici.
create or replace function public.clm_asso_set_member_role(
  p_club_id uuid,
  p_user_id uuid,
  p_role public.clm_asso_club_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_role public.clm_asso_club_role;
  v_label text;
begin
  if not public.clm_asso_has_permission(p_club_id, 'manage_roles') then
    raise exception 'Permission insuffisante.';
  end if;

  if p_role = 'owner' then
    raise exception 'Le transfert de propriété doit utiliser une procédure dédiée.';
  end if;

  select role into v_existing_role
  from public.clm_asso_club_members
  where club_id = p_club_id and user_id = p_user_id;

  if v_existing_role = 'owner' then
    raise exception 'Le propriétaire ne peut pas être rétrogradé.';
  end if;

  update public.clm_asso_club_members
  set role = p_role, updated_at = now()
  where club_id = p_club_id and user_id = p_user_id;

  v_label := case p_role
    when 'admin' then 'Administrateur'
    when 'manager' then 'Responsable'
    when 'coach' then 'Entraîneur'
    else 'Membre'
  end;

  update public.clm_asso_members
  set role_label = v_label, updated_at = now()
  where club_id = p_club_id and user_id = p_user_id;
end;
$$;

revoke all on function public.clm_asso_set_member_role(uuid, uuid, public.clm_asso_club_role) from public;
grant execute on function public.clm_asso_set_member_role(uuid, uuid, public.clm_asso_club_role) to authenticated;

-- =========================================================
-- NOTIFICATIONS
-- =========================================================

create table if not exists public.clm_asso_notifications (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clm_asso_clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null default 'information',
  title text not null,
  body text,
  href text,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists clm_asso_notifications_user_idx
  on public.clm_asso_notifications(user_id, created_at desc);
create unique index if not exists clm_asso_notifications_dedupe_unique
  on public.clm_asso_notifications(user_id, dedupe_key)
  where dedupe_key is not null;

alter table public.clm_asso_notifications enable row level security;

drop policy if exists "clm_asso_notifications_select_own" on public.clm_asso_notifications;
create policy "clm_asso_notifications_select_own"
on public.clm_asso_notifications for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "clm_asso_notifications_update_own" on public.clm_asso_notifications;
create policy "clm_asso_notifications_update_own"
on public.clm_asso_notifications for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "clm_asso_notifications_delete_own" on public.clm_asso_notifications;
create policy "clm_asso_notifications_delete_own"
on public.clm_asso_notifications for delete to authenticated
using (user_id = (select auth.uid()));

grant select, update, delete on public.clm_asso_notifications to authenticated;
revoke all on public.clm_asso_notifications from anon;

create or replace function public.clm_asso_mark_all_notifications_read(p_club_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.clm_asso_notifications
  set read_at = now()
  where user_id = auth.uid()
    and read_at is null
    and (p_club_id is null or club_id = p_club_id);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.clm_asso_mark_all_notifications_read(uuid) from public;
grant execute on function public.clm_asso_mark_all_notifications_read(uuid) to authenticated;

create or replace function public.clm_asso_notify_announcement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    insert into public.clm_asso_notifications (
      club_id, user_id, notification_type, title, body, href, dedupe_key
    )
    select new.club_id, membership.user_id, 'announcement', new.title,
           left(new.content, 240), '/app/annonces', 'announcement:' || new.id::text
    from public.clm_asso_club_members membership
    where membership.club_id = new.club_id and membership.status = 'active'
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists clm_asso_announcement_notifications on public.clm_asso_announcements;
create trigger clm_asso_announcement_notifications
after insert or update of status on public.clm_asso_announcements
for each row execute function public.clm_asso_notify_announcement();

create or replace function public.clm_asso_notify_convocation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'sent'
     and (tg_op = 'INSERT' or old.status is distinct from 'sent') then
    insert into public.clm_asso_notifications (
      club_id, user_id, notification_type, title, body, href, dedupe_key
    )
    select new.club_id, member.user_id, 'convocation', new.title,
           coalesce(new.message, 'Vous avez reçu une nouvelle convocation.'),
           '/app/convocations', 'convocation:' || new.id::text
    from public.clm_asso_convocation_recipients recipient
    join public.clm_asso_members member on member.id = recipient.member_id
    where recipient.convocation_id = new.id and member.user_id is not null
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists clm_asso_convocation_notifications on public.clm_asso_convocations;
create trigger clm_asso_convocation_notifications
after insert or update of status on public.clm_asso_convocations
for each row execute function public.clm_asso_notify_convocation();

create or replace function public.clm_asso_notify_task_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if new.assignee_member_id is null then return new; end if;
  if tg_op = 'UPDATE' and old.assignee_member_id is not distinct from new.assignee_member_id then return new; end if;

  select user_id into v_user_id
  from public.clm_asso_members
  where id = new.assignee_member_id;

  if v_user_id is not null then
    insert into public.clm_asso_notifications (
      club_id, user_id, notification_type, title, body, href, dedupe_key
    ) values (
      new.club_id, v_user_id, 'task', 'Nouvelle tâche assignée', new.title,
      '/app/taches', 'task:' || new.id::text || ':' || v_user_id::text
    )
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists clm_asso_task_assignment_notifications on public.clm_asso_tasks;
create trigger clm_asso_task_assignment_notifications
after insert or update of assignee_member_id on public.clm_asso_tasks
for each row execute function public.clm_asso_notify_task_assignment();

-- =========================================================
-- PUBLICATION AUTOMATIQUE DES ANNONCES PROGRAMMÉES
-- =========================================================

create or replace function public.clm_asso_publish_due_announcements()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.clm_asso_announcements
  set status = 'published', published_at = coalesce(published_at, now()), updated_at = now()
  where status = 'scheduled'
    and scheduled_at is not null
    and scheduled_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.clm_asso_publish_due_announcements() from public;
grant execute on function public.clm_asso_publish_due_announcements() to authenticated;

-- Planifie la publication chaque minute lorsque l'extension pg_cron est disponible.
do $$
declare
  v_job_id bigint;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    select jobid into v_job_id from cron.job where jobname = 'clm-asso-publish-announcements' limit 1;
    if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
    perform cron.schedule(
      'clm-asso-publish-announcements',
      '* * * * *',
      'select public.clm_asso_publish_due_announcements();'
    );
  end if;
exception when others then
  raise notice 'Planification pg_cron non installée : %', sqlerrm;
end;
$$;

-- =========================================================
-- JOURNAL D'ACTIVITÉ
-- =========================================================

create table if not exists public.clm_asso_activity_logs (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clm_asso_clubs(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  title text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists clm_asso_activity_logs_club_idx
  on public.clm_asso_activity_logs(club_id, created_at desc);

alter table public.clm_asso_activity_logs enable row level security;

drop policy if exists "clm_asso_activity_logs_select" on public.clm_asso_activity_logs;
create policy "clm_asso_activity_logs_select"
on public.clm_asso_activity_logs for select to authenticated
using (public.clm_asso_is_club_member(club_id));

grant select on public.clm_asso_activity_logs to authenticated;
revoke all on public.clm_asso_activity_logs from anon;

create or replace function public.clm_asso_log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_old jsonb;
  v_club_id uuid;
  v_entity_id uuid;
  v_title text;
  v_action text;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_old := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  v_club_id := (v_row ->> 'club_id')::uuid;
  v_entity_id := nullif(v_row ->> 'id', '')::uuid;
  v_title := coalesce(
    nullif(v_row ->> 'title', ''),
    nullif(v_row ->> 'name', ''),
    nullif(v_row ->> 'opponent_name', ''),
    nullif(trim(concat_ws(' ', v_row ->> 'first_name', v_row ->> 'last_name')), ''),
    tg_table_name
  );
  v_action := lower(tg_op);

  insert into public.clm_asso_activity_logs (
    club_id, actor_user_id, action, entity_type, entity_id, title, metadata
  ) values (
    v_club_id,
    auth.uid(),
    v_action,
    replace(tg_table_name, 'clm_asso_', ''),
    v_entity_id,
    v_title,
    jsonb_build_object('new', v_row, 'old', v_old)
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'clm_asso_members', 'clm_asso_teams', 'clm_asso_events',
    'clm_asso_matches', 'clm_asso_convocations', 'clm_asso_announcements',
    'clm_asso_tasks', 'clm_asso_documents'
  ] loop
    execute format('drop trigger if exists %I on public.%I', v_table || '_activity_log', v_table);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.clm_asso_log_activity()',
      v_table || '_activity_log', v_table
    );
  end loop;
end;
$$;

-- =========================================================
-- VERSIONS DES DOCUMENTS
-- =========================================================

create table if not exists public.clm_asso_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.clm_asso_documents(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  storage_path text not null,
  mime_type text,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  uploaded_by uuid references auth.users(id) on delete set null,
  change_note text,
  created_at timestamptz not null default now(),
  unique (document_id, version_number)
);

create index if not exists clm_asso_document_versions_document_idx
  on public.clm_asso_document_versions(document_id, version_number desc);

insert into public.clm_asso_document_versions (
  document_id, version_number, storage_path, mime_type, size_bytes, uploaded_by, change_note, created_at
)
select document.id, 1, document.storage_path, document.mime_type, document.size_bytes,
       document.uploaded_by, 'Version initiale', document.created_at
from public.clm_asso_documents document
where not exists (
  select 1 from public.clm_asso_document_versions version
  where version.document_id = document.id
);

alter table public.clm_asso_document_versions enable row level security;

drop policy if exists "clm_asso_document_versions_select" on public.clm_asso_document_versions;
create policy "clm_asso_document_versions_select"
on public.clm_asso_document_versions for select to authenticated
using (
  exists (
    select 1 from public.clm_asso_documents document
    where document.id = document_id
      and public.clm_asso_is_club_member(document.club_id)
  )
);

drop policy if exists "clm_asso_document_versions_insert" on public.clm_asso_document_versions;
create policy "clm_asso_document_versions_insert"
on public.clm_asso_document_versions for insert to authenticated
with check (
  exists (
    select 1 from public.clm_asso_documents document
    where document.id = document_id
      and public.clm_asso_has_permission(document.club_id, 'manage_documents')
  )
);

drop policy if exists "clm_asso_document_versions_update" on public.clm_asso_document_versions;
create policy "clm_asso_document_versions_update"
on public.clm_asso_document_versions for update to authenticated
using (
  exists (
    select 1 from public.clm_asso_documents document
    where document.id = document_id
      and public.clm_asso_has_permission(document.club_id, 'manage_documents')
  )
)
with check (
  exists (
    select 1 from public.clm_asso_documents document
    where document.id = document_id
      and public.clm_asso_has_permission(document.club_id, 'manage_documents')
  )
);

grant select, insert, update on public.clm_asso_document_versions to authenticated;
revoke all on public.clm_asso_document_versions from anon;

-- =========================================================
-- CONVOCATIONS : RÉPONSE PERSONNELLE SÉCURISÉE
-- =========================================================

create or replace function public.clm_asso_respond_to_convocation(
  p_recipient_id uuid,
  p_response text,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
  v_member_user_id uuid;
  v_status text;
begin
  if p_response not in ('pending', 'present', 'absent', 'maybe') then
    raise exception 'Réponse invalide.';
  end if;

  select convocation.club_id, member.user_id, convocation.status
  into v_club_id, v_member_user_id, v_status
  from public.clm_asso_convocation_recipients recipient
  join public.clm_asso_convocations convocation on convocation.id = recipient.convocation_id
  join public.clm_asso_members member on member.id = recipient.member_id
  where recipient.id = p_recipient_id;

  if not found then raise exception 'Destinataire introuvable.'; end if;
  if v_status = 'closed' then raise exception 'Cette convocation est clôturée.'; end if;

  if v_member_user_id is distinct from auth.uid()
     and not public.clm_asso_has_permission(v_club_id, 'manage_convocations') then
    raise exception 'Permission insuffisante.';
  end if;

  update public.clm_asso_convocation_recipients
  set response = p_response,
      comment = nullif(trim(p_comment), ''),
      responded_at = case when p_response = 'pending' then null else now() end
  where id = p_recipient_id;
end;
$$;

revoke all on function public.clm_asso_respond_to_convocation(uuid, text, text) from public;
grant execute on function public.clm_asso_respond_to_convocation(uuid, text, text) to authenticated;

-- =========================================================
-- RLS DÉTAILLÉE PAR RESSOURCE
-- =========================================================

-- Annuaire.
drop policy if exists "clm_asso_members_insert" on public.clm_asso_members;
drop policy if exists "clm_asso_members_update" on public.clm_asso_members;
drop policy if exists "clm_asso_members_delete" on public.clm_asso_members;
create policy "clm_asso_members_insert" on public.clm_asso_members for insert to authenticated
with check (public.clm_asso_has_permission(club_id, 'manage_members'));
create policy "clm_asso_members_update" on public.clm_asso_members for update to authenticated
using (public.clm_asso_has_permission(club_id, 'manage_members'))
with check (public.clm_asso_has_permission(club_id, 'manage_members'));
create policy "clm_asso_members_delete" on public.clm_asso_members for delete to authenticated
using (public.clm_asso_has_permission(club_id, 'manage_members') and user_id is null);

-- Équipes.
drop policy if exists "clm_asso_teams_insert" on public.clm_asso_teams;
drop policy if exists "clm_asso_teams_update" on public.clm_asso_teams;
drop policy if exists "clm_asso_teams_delete" on public.clm_asso_teams;
create policy "clm_asso_teams_insert" on public.clm_asso_teams for insert to authenticated
with check (public.clm_asso_has_permission(club_id, 'manage_teams'));
create policy "clm_asso_teams_update" on public.clm_asso_teams for update to authenticated
using (public.clm_asso_has_permission(club_id, 'manage_teams'))
with check (public.clm_asso_has_permission(club_id, 'manage_teams'));
create policy "clm_asso_teams_delete" on public.clm_asso_teams for delete to authenticated
using (public.clm_asso_has_permission(club_id, 'manage_teams'));

-- Calendrier.
drop policy if exists "clm_asso_events_insert" on public.clm_asso_events;
drop policy if exists "clm_asso_events_update" on public.clm_asso_events;
drop policy if exists "clm_asso_events_delete" on public.clm_asso_events;
create policy "clm_asso_events_insert" on public.clm_asso_events for insert to authenticated
with check (public.clm_asso_has_permission(club_id, 'manage_calendar'));
create policy "clm_asso_events_update" on public.clm_asso_events for update to authenticated
using (public.clm_asso_has_permission(club_id, 'manage_calendar'))
with check (public.clm_asso_has_permission(club_id, 'manage_calendar'));
create policy "clm_asso_events_delete" on public.clm_asso_events for delete to authenticated
using (public.clm_asso_has_permission(club_id, 'manage_calendar'));

-- Matchs.
drop policy if exists "clm_asso_matches_insert" on public.clm_asso_matches;
drop policy if exists "clm_asso_matches_update" on public.clm_asso_matches;
drop policy if exists "clm_asso_matches_delete" on public.clm_asso_matches;
create policy "clm_asso_matches_insert" on public.clm_asso_matches for insert to authenticated
with check (public.clm_asso_has_permission(club_id, 'manage_matches'));
create policy "clm_asso_matches_update" on public.clm_asso_matches for update to authenticated
using (public.clm_asso_has_permission(club_id, 'manage_matches'))
with check (public.clm_asso_has_permission(club_id, 'manage_matches'));
create policy "clm_asso_matches_delete" on public.clm_asso_matches for delete to authenticated
using (public.clm_asso_has_permission(club_id, 'manage_matches'));

-- Convocations.
drop policy if exists "clm_asso_convocations_insert" on public.clm_asso_convocations;
drop policy if exists "clm_asso_convocations_update" on public.clm_asso_convocations;
drop policy if exists "clm_asso_convocations_delete" on public.clm_asso_convocations;
create policy "clm_asso_convocations_insert" on public.clm_asso_convocations for insert to authenticated
with check (public.clm_asso_has_permission(club_id, 'manage_convocations'));
create policy "clm_asso_convocations_update" on public.clm_asso_convocations for update to authenticated
using (public.clm_asso_has_permission(club_id, 'manage_convocations'))
with check (public.clm_asso_has_permission(club_id, 'manage_convocations'));
create policy "clm_asso_convocations_delete" on public.clm_asso_convocations for delete to authenticated
using (public.clm_asso_has_permission(club_id, 'manage_convocations'));

-- Annonces.
drop policy if exists "clm_asso_announcements_insert" on public.clm_asso_announcements;
drop policy if exists "clm_asso_announcements_update" on public.clm_asso_announcements;
drop policy if exists "clm_asso_announcements_delete" on public.clm_asso_announcements;
create policy "clm_asso_announcements_insert" on public.clm_asso_announcements for insert to authenticated
with check (public.clm_asso_has_permission(club_id, 'manage_announcements'));
create policy "clm_asso_announcements_update" on public.clm_asso_announcements for update to authenticated
using (public.clm_asso_has_permission(club_id, 'manage_announcements'))
with check (public.clm_asso_has_permission(club_id, 'manage_announcements'));
create policy "clm_asso_announcements_delete" on public.clm_asso_announcements for delete to authenticated
using (public.clm_asso_has_permission(club_id, 'manage_announcements'));

-- Tâches.
drop policy if exists "clm_asso_tasks_insert" on public.clm_asso_tasks;
drop policy if exists "clm_asso_tasks_update" on public.clm_asso_tasks;
drop policy if exists "clm_asso_tasks_delete" on public.clm_asso_tasks;
create policy "clm_asso_tasks_insert" on public.clm_asso_tasks for insert to authenticated
with check (public.clm_asso_has_permission(club_id, 'manage_tasks'));
create policy "clm_asso_tasks_update" on public.clm_asso_tasks for update to authenticated
using (
  public.clm_asso_has_permission(club_id, 'manage_tasks')
  or assignee_member_id = public.clm_asso_current_member_id(club_id)
)
with check (
  public.clm_asso_has_permission(club_id, 'manage_tasks')
  or assignee_member_id = public.clm_asso_current_member_id(club_id)
);
create policy "clm_asso_tasks_delete" on public.clm_asso_tasks for delete to authenticated
using (public.clm_asso_has_permission(club_id, 'manage_tasks'));

-- Documents.
drop policy if exists "clm_asso_documents_insert" on public.clm_asso_documents;
drop policy if exists "clm_asso_documents_update" on public.clm_asso_documents;
drop policy if exists "clm_asso_documents_delete" on public.clm_asso_documents;
create policy "clm_asso_documents_insert" on public.clm_asso_documents for insert to authenticated
with check (public.clm_asso_has_permission(club_id, 'manage_documents'));
create policy "clm_asso_documents_update" on public.clm_asso_documents for update to authenticated
using (public.clm_asso_has_permission(club_id, 'manage_documents'))
with check (public.clm_asso_has_permission(club_id, 'manage_documents'));
create policy "clm_asso_documents_delete" on public.clm_asso_documents for delete to authenticated
using (public.clm_asso_has_permission(club_id, 'manage_documents'));

-- Paramètres du club.
drop policy if exists "clm_asso_clubs_update_admins" on public.clm_asso_clubs;
create policy "clm_asso_clubs_update_admins"
on public.clm_asso_clubs for update to authenticated
using (public.clm_asso_has_permission(id, 'manage_club'))
with check (public.clm_asso_has_permission(id, 'manage_club'));

-- Liaisons équipe/membre.
drop policy if exists "clm_asso_team_members_insert" on public.clm_asso_team_members;
drop policy if exists "clm_asso_team_members_update" on public.clm_asso_team_members;
drop policy if exists "clm_asso_team_members_delete" on public.clm_asso_team_members;
create policy "clm_asso_team_members_insert" on public.clm_asso_team_members for insert to authenticated
with check (exists (
  select 1 from public.clm_asso_teams team
  where team.id = team_id and public.clm_asso_has_permission(team.club_id, 'manage_teams')
));
create policy "clm_asso_team_members_update" on public.clm_asso_team_members for update to authenticated
using (exists (
  select 1 from public.clm_asso_teams team
  where team.id = team_id and public.clm_asso_has_permission(team.club_id, 'manage_teams')
))
with check (exists (
  select 1 from public.clm_asso_teams team
  where team.id = team_id and public.clm_asso_has_permission(team.club_id, 'manage_teams')
));
create policy "clm_asso_team_members_delete" on public.clm_asso_team_members for delete to authenticated
using (exists (
  select 1 from public.clm_asso_teams team
  where team.id = team_id and public.clm_asso_has_permission(team.club_id, 'manage_teams')
));

-- Destinataires des convocations : lecture par le club, écriture par les gestionnaires uniquement.
drop policy if exists "clm_asso_convocation_recipients_update" on public.clm_asso_convocation_recipients;
create policy "clm_asso_convocation_recipients_update"
on public.clm_asso_convocation_recipients for update to authenticated
using (exists (
  select 1 from public.clm_asso_convocations convocation
  where convocation.id = convocation_id
    and public.clm_asso_has_permission(convocation.club_id, 'manage_convocations')
))
with check (exists (
  select 1 from public.clm_asso_convocations convocation
  where convocation.id = convocation_id
    and public.clm_asso_has_permission(convocation.club_id, 'manage_convocations')
));

-- Adhésions réelles au club.
drop policy if exists "clm_asso_club_members_insert_manage" on public.clm_asso_club_members;
create policy "clm_asso_club_members_insert_manage"
on public.clm_asso_club_members for insert to authenticated
with check (public.clm_asso_has_permission(club_id, 'manage_roles') and role <> 'owner');

drop policy if exists "clm_asso_club_members_update_manage" on public.clm_asso_club_members;
create policy "clm_asso_club_members_update_manage"
on public.clm_asso_club_members for update to authenticated
using (public.clm_asso_has_permission(club_id, 'manage_roles') and role <> 'owner')
with check (public.clm_asso_has_permission(club_id, 'manage_roles') and role <> 'owner');

drop policy if exists "clm_asso_club_members_delete_manage" on public.clm_asso_club_members;
create policy "clm_asso_club_members_delete_manage"
on public.clm_asso_club_members for delete to authenticated
using (public.clm_asso_has_permission(club_id, 'manage_roles') and role <> 'owner');

grant insert, update, delete on public.clm_asso_club_members to authenticated;

-- Storage des documents selon la permission dédiée.
drop policy if exists "clm_asso_storage_insert" on storage.objects;
create policy "clm_asso_storage_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'clm-asso-documents'
  and public.clm_asso_has_permission(((storage.foldername(name))[1])::uuid, 'manage_documents')
);

drop policy if exists "clm_asso_storage_update" on storage.objects;
create policy "clm_asso_storage_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'clm-asso-documents'
  and public.clm_asso_has_permission(((storage.foldername(name))[1])::uuid, 'manage_documents')
)
with check (
  bucket_id = 'clm-asso-documents'
  and public.clm_asso_has_permission(((storage.foldername(name))[1])::uuid, 'manage_documents')
);

drop policy if exists "clm_asso_storage_delete" on storage.objects;
create policy "clm_asso_storage_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'clm-asso-documents'
  and public.clm_asso_has_permission(((storage.foldername(name))[1])::uuid, 'manage_documents')
);

-- Trigger updated_at pour les nouvelles tables.
drop trigger if exists clm_asso_invitations_updated_at on public.clm_asso_invitations;
create trigger clm_asso_invitations_updated_at
before update on public.clm_asso_invitations
for each row execute function public.clm_asso_set_updated_at();

-- Notifie un destinataire ajouté à une convocation déjà envoyée.
create or replace function public.clm_asso_notify_new_convocation_recipient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_convocation public.clm_asso_convocations%rowtype;
  v_user_id uuid;
begin
  select * into v_convocation
  from public.clm_asso_convocations
  where id = new.convocation_id;

  if v_convocation.status <> 'sent' then return new; end if;

  select user_id into v_user_id
  from public.clm_asso_members
  where id = new.member_id;

  if v_user_id is not null then
    insert into public.clm_asso_notifications (
      club_id, user_id, notification_type, title, body, href, dedupe_key
    ) values (
      v_convocation.club_id, v_user_id, 'convocation', v_convocation.title,
      coalesce(v_convocation.message, 'Vous avez reçu une nouvelle convocation.'),
      '/app/convocations', 'convocation:' || v_convocation.id::text
    )
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists clm_asso_new_recipient_notification on public.clm_asso_convocation_recipients;
create trigger clm_asso_new_recipient_notification
after insert on public.clm_asso_convocation_recipients
for each row execute function public.clm_asso_notify_new_convocation_recipient();

-- =========================================================
-- DURCISSEMENTS FINAUX : ACCÈS MEMBRES, LECTURE DES
-- CONVOCATIONS, REALTIME ET MÉTADONNÉES DES VERSIONS
-- =========================================================

-- Helpers SECURITY DEFINER pour éviter toute récursion RLS entre
-- convocations et destinataires.
create or replace function public.clm_asso_can_read_convocation(
  p_convocation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clm_asso_convocations convocation
    where convocation.id = p_convocation_id
      and (
        public.clm_asso_has_permission(convocation.club_id, 'manage_convocations')
        or exists (
          select 1
          from public.clm_asso_convocation_recipients recipient
          join public.clm_asso_members member on member.id = recipient.member_id
          where recipient.convocation_id = convocation.id
            and member.user_id = (select auth.uid())
        )
      )
  );
$$;

create or replace function public.clm_asso_can_read_convocation_recipient(
  p_recipient_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clm_asso_convocation_recipients recipient
    join public.clm_asso_convocations convocation on convocation.id = recipient.convocation_id
    join public.clm_asso_members member on member.id = recipient.member_id
    where recipient.id = p_recipient_id
      and (
        public.clm_asso_has_permission(convocation.club_id, 'manage_convocations')
        or member.user_id = (select auth.uid())
      )
  );
$$;

revoke all on function public.clm_asso_can_read_convocation(uuid) from public;
revoke all on function public.clm_asso_can_read_convocation_recipient(uuid) from public;
grant execute on function public.clm_asso_can_read_convocation(uuid) to authenticated;
grant execute on function public.clm_asso_can_read_convocation_recipient(uuid) to authenticated;

-- Un utilisateur non gestionnaire ne lit que ses propres convocations.
drop policy if exists "clm_asso_convocations_select" on public.clm_asso_convocations;
create policy "clm_asso_convocations_select"
on public.clm_asso_convocations for select to authenticated
using (public.clm_asso_can_read_convocation(id));

-- Un utilisateur non gestionnaire ne lit que sa ligne de réponse.
drop policy if exists "clm_asso_convocation_recipients_select" on public.clm_asso_convocation_recipients;
create policy "clm_asso_convocation_recipients_select"
on public.clm_asso_convocation_recipients for select to authenticated
using (public.clm_asso_can_read_convocation_recipient(id));

-- Active ou suspend réellement l'accès d'un compte lié au club.
create or replace function public.clm_asso_set_member_access_status(
  p_club_id uuid,
  p_user_id uuid,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_role public.clm_asso_club_role;
begin
  if not public.clm_asso_has_permission(p_club_id, 'manage_roles') then
    raise exception 'Permission insuffisante.';
  end if;

  select role into v_existing_role
  from public.clm_asso_club_members
  where club_id = p_club_id and user_id = p_user_id;

  if not found then
    raise exception 'Adhésion introuvable.';
  end if;

  if v_existing_role = 'owner' and not p_active then
    raise exception 'Le compte propriétaire ne peut pas être suspendu.';
  end if;

  update public.clm_asso_club_members
  set status = case when p_active then 'active' else 'suspended' end,
      joined_at = case when p_active then coalesce(joined_at, now()) else joined_at end,
      updated_at = now()
  where club_id = p_club_id and user_id = p_user_id;

  update public.clm_asso_members
  set status = case when p_active then 'active' else 'inactive' end,
      updated_at = now()
  where club_id = p_club_id and user_id = p_user_id;
end;
$$;

revoke all on function public.clm_asso_set_member_access_status(uuid, uuid, boolean) from public;
grant execute on function public.clm_asso_set_member_access_status(uuid, uuid, boolean) to authenticated;

-- Le nom d'origine de chaque fichier fait partie de son historique.
alter table public.clm_asso_document_versions
  add column if not exists file_name text;

update public.clm_asso_document_versions version
set file_name = document.name
from public.clm_asso_documents document
where document.id = version.document_id
  and version.file_name is null;

-- Active les notifications en temps réel quand la publication Supabase existe.
do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'clm_asso_notifications'
  ) then
    alter publication supabase_realtime add table public.clm_asso_notifications;
  end if;
exception when others then
  raise notice 'Activation Realtime non appliquée : %', sqlerrm;
end;
$$;

-- Essaie d'activer pg_cron puis garantit la planification. Si le projet ne
-- l'autorise pas, la publication opportuniste côté application reste active.
do $$
declare
  v_job_id bigint;
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'Extension pg_cron non activée : %', sqlerrm;
  end;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    select jobid into v_job_id
    from cron.job
    where jobname = 'clm-asso-publish-announcements'
    limit 1;

    if v_job_id is not null then
      perform cron.unschedule(v_job_id);
    end if;

    perform cron.schedule(
      'clm-asso-publish-announcements',
      '* * * * *',
      'select public.clm_asso_publish_due_announcements();'
    );
  end if;
exception when others then
  raise notice 'Planification automatique non appliquée : %', sqlerrm;
end;
$$;

-- Journalise les changements d'accès et de rôle des comptes liés.
drop trigger if exists clm_asso_club_members_activity_log on public.clm_asso_club_members;
create trigger clm_asso_club_members_activity_log
after insert or update or delete on public.clm_asso_club_members
for each row execute function public.clm_asso_log_activity();

-- Une adhésion activée produit une notification de bienvenue.
create or replace function public.clm_asso_notify_membership_activation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_name text;
begin
  if new.status = 'active'
     and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    select name into v_club_name
    from public.clm_asso_clubs
    where id = new.club_id;

    insert into public.clm_asso_notifications (
      club_id, user_id, notification_type, title, body, href, dedupe_key
    ) values (
      new.club_id,
      new.user_id,
      'membership',
      'Bienvenue dans ' || coalesce(v_club_name, 'votre club'),
      'Votre accès CLM Asso est maintenant actif.',
      '/app/tableau-de-bord',
      'membership:' || new.club_id::text || ':' || new.user_id::text
    )
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists clm_asso_membership_activation_notification on public.clm_asso_club_members;
create trigger clm_asso_membership_activation_notification
after insert or update of status on public.clm_asso_club_members
for each row execute function public.clm_asso_notify_membership_activation();

-- Un membre assigné peut changer uniquement le statut de sa propre tâche.
create or replace function public.clm_asso_update_task_status(
  p_task_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
  v_assignee_user_id uuid;
begin
  if p_status not in ('pending', 'in_progress', 'completed') then
    raise exception 'Statut de tâche invalide.';
  end if;

  select task.club_id, member.user_id
  into v_club_id, v_assignee_user_id
  from public.clm_asso_tasks task
  left join public.clm_asso_members member on member.id = task.assignee_member_id
  where task.id = p_task_id;

  if not found then
    raise exception 'Tâche introuvable.';
  end if;

  if v_assignee_user_id is distinct from auth.uid()
     and not public.clm_asso_has_permission(v_club_id, 'manage_tasks') then
    raise exception 'Permission insuffisante.';
  end if;

  update public.clm_asso_tasks
  set status = p_status,
      updated_at = now()
  where id = p_task_id;
end;
$$;

revoke all on function public.clm_asso_update_task_status(uuid, text) from public;
grant execute on function public.clm_asso_update_task_status(uuid, text) to authenticated;

-- Toute modification directe d'une tâche reste réservée aux gestionnaires.
drop policy if exists "clm_asso_tasks_update" on public.clm_asso_tasks;
create policy "clm_asso_tasks_update"
on public.clm_asso_tasks for update to authenticated
using (public.clm_asso_has_permission(club_id, 'manage_tasks'))
with check (public.clm_asso_has_permission(club_id, 'manage_tasks'));

-- Marque une notification comme lue sans autoriser la modification de son contenu.
create or replace function public.clm_asso_mark_notification_read(
  p_notification_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.clm_asso_notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Notification introuvable.';
  end if;
end;
$$;

revoke all on function public.clm_asso_mark_notification_read(uuid) from public;
grant execute on function public.clm_asso_mark_notification_read(uuid) to authenticated;
revoke update on public.clm_asso_notifications from authenticated;

-- Formulaire public « Manifester mon intérêt » conservé dans le projet complet.
create table if not exists public.clm_asso_club_interests (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  role text not null,
  club_name text not null,
  city text not null,
  sport text not null default 'Basketball',
  licensees_count integer check (licensees_count is null or licensees_count >= 0),
  teams_count integer check (teams_count is null or teams_count >= 0),
  current_tools text[] not null default '{}',
  problems text[] not null default '{}',
  desired_features text[] not null default '{}',
  main_problem text,
  interest_level text not null,
  contact_permission boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.clm_asso_club_interests enable row level security;

drop policy if exists "clm_asso_club_interests_public_insert" on public.clm_asso_club_interests;
create policy "clm_asso_club_interests_public_insert"
on public.clm_asso_club_interests for insert to anon, authenticated
with check (
  contact_permission = true
  and nullif(trim(first_name), '') is not null
  and nullif(trim(last_name), '') is not null
  and nullif(trim(email), '') is not null
  and nullif(trim(club_name), '') is not null
);

revoke all on public.clm_asso_club_interests from anon, authenticated;
grant insert on public.clm_asso_club_interests to anon, authenticated;
