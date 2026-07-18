-- =========================================================
-- CLM ASSO — MESSAGERIE INTERCLUBS
-- Migration 005
--
-- À exécuter après :
-- 001_clm_asso_core.sql
-- 002_clm_asso_production.sql
-- 003_clm_asso_v1_completion.sql
-- 004_clm_asso_permissions_and_member_removal.sql
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- PERMISSION DÉDIÉE
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

revoke all on function public.clm_asso_has_permission (uuid, text)
from public;

grant
execute on function public.clm_asso_has_permission (uuid, text) to authenticated;

create or replace function public.clm_asso_can_message(
  p_club_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.clm_asso_has_permission(
    p_club_id,
    'manage_messaging'
  );
$$;

revoke all on function public.clm_asso_can_message (uuid) from public;

grant
execute on function public.clm_asso_can_message (uuid) to authenticated;

-- =========================================================
-- TABLES
-- Une conversation contient exactement deux clubs.
-- Une diffusion vers plusieurs clubs crée une conversation
-- privée distincte pour chaque destinataire.
-- =========================================================

create table if not exists public.clm_asso_conversations (
    id uuid primary key default gen_random_uuid (),
    club_a_id uuid not null references public.clm_asso_clubs (id) on delete cascade,
    club_b_id uuid not null references public.clm_asso_clubs (id) on delete cascade,
    created_by_club_id uuid not null references public.clm_asso_clubs (id) on delete cascade,
    created_by_user_id uuid references auth.users (id) on delete set null,
    last_message_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (club_a_id <> club_b_id),
    check (
        created_by_club_id = club_a_id
        or created_by_club_id = club_b_id
    )
);

create unique index if not exists clm_asso_conversations_club_pair_unique on public.clm_asso_conversations (
    least(club_a_id, club_b_id),
    greatest(club_a_id, club_b_id)
);

create index if not exists clm_asso_conversations_club_a_idx on public.clm_asso_conversations (
    club_a_id,
    last_message_at desc
);

create index if not exists clm_asso_conversations_club_b_idx on public.clm_asso_conversations (
    club_b_id,
    last_message_at desc
);

create table if not exists public.clm_asso_messages (
    id uuid primary key default gen_random_uuid (),
    conversation_id uuid not null references public.clm_asso_conversations (id) on delete cascade,
    sender_club_id uuid not null references public.clm_asso_clubs (id) on delete cascade,
    sender_user_id uuid references auth.users (id) on delete set null,
    message_type text not null default 'text' check (
        message_type in (
            'text',
            'calendar_proposal',
            'system'
        )
    ),
    body text,
    edited_at timestamptz,
    deleted_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists clm_asso_messages_conversation_idx on public.clm_asso_messages (conversation_id, created_at);

create table if not exists public.clm_asso_conversation_reads (
    conversation_id uuid not null references public.clm_asso_conversations (id) on delete cascade,
    club_id uuid not null references public.clm_asso_clubs (id) on delete cascade,
    user_id uuid not null references auth.users (id) on delete cascade,
    last_read_at timestamptz not null default now(),
    primary key (conversation_id, user_id)
);

create index if not exists clm_asso_conversation_reads_user_idx on public.clm_asso_conversation_reads (user_id, last_read_at desc);

create table if not exists public.clm_asso_calendar_proposals (
    id uuid primary key default gen_random_uuid (),
    message_id uuid not null unique references public.clm_asso_messages (id) on delete cascade,
    conversation_id uuid not null references public.clm_asso_conversations (id) on delete cascade,
    proposed_by_club_id uuid not null references public.clm_asso_clubs (id) on delete cascade,
    proposed_by_user_id uuid references auth.users (id) on delete set null,
    target_club_id uuid not null references public.clm_asso_clubs (id) on delete cascade,
    title text not null,
    starts_at timestamptz not null,
    ends_at timestamptz,
    location text,
    description text,
    status text not null default 'pending' check (
        status in (
            'pending',
            'accepted',
            'rejected',
            'cancelled'
        )
    ),
    responded_by_user_id uuid references auth.users (id) on delete set null,
    responded_at timestamptz,
    proposer_event_id uuid references public.clm_asso_events (id) on delete set null,
    target_event_id uuid references public.clm_asso_events (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (
        proposed_by_club_id <> target_club_id
    ),
    check (
        ends_at is null
        or ends_at > starts_at
    )
);

create index if not exists clm_asso_calendar_proposals_conversation_idx on public.clm_asso_calendar_proposals (conversation_id, created_at);

-- =========================================================
-- HELPERS D’ACCÈS
-- =========================================================

create or replace function public.clm_asso_can_access_conversation(
  p_conversation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clm_asso_conversations conversation
    where conversation.id = p_conversation_id
      and (
        public.clm_asso_can_message(
          conversation.club_a_id
        )
        or public.clm_asso_can_message(
          conversation.club_b_id
        )
      )
  );
$$;

revoke all on function public.clm_asso_can_access_conversation (uuid)
from public;

grant
execute on function public.clm_asso_can_access_conversation (uuid) to authenticated;

-- =========================================================
-- RLS
-- Les écritures passent uniquement par les fonctions RPC.
-- =========================================================

alter table public.clm_asso_conversations enable row level security;

alter table public.clm_asso_messages enable row level security;

alter table public.clm_asso_conversation_reads enable row level security;

alter table public.clm_asso_calendar_proposals enable row level security;

drop policy if exists "clm_asso_conversations_select" on public.clm_asso_conversations;

create policy "clm_asso_conversations_select" on public.clm_asso_conversations for
select to authenticated using (
        public.clm_asso_can_access_conversation (id)
    );

drop policy if exists "clm_asso_messages_select" on public.clm_asso_messages;

create policy "clm_asso_messages_select" on public.clm_asso_messages for
select to authenticated using (
        public.clm_asso_can_access_conversation (conversation_id)
    );

drop policy if exists "clm_asso_conversation_reads_select" on public.clm_asso_conversation_reads;

create policy "clm_asso_conversation_reads_select" on public.clm_asso_conversation_reads for
select to authenticated using (
        user_id = (
            select auth.uid ()
        )
        and public.clm_asso_can_access_conversation (conversation_id)
    );

drop policy if exists "clm_asso_calendar_proposals_select" on public.clm_asso_calendar_proposals;

create policy "clm_asso_calendar_proposals_select" on public.clm_asso_calendar_proposals for
select to authenticated using (
        public.clm_asso_can_access_conversation (conversation_id)
    );

revoke all on
table public.clm_asso_conversations,
public.clm_asso_messages,
public.clm_asso_conversation_reads,
public.clm_asso_calendar_proposals
from anon;

revoke
insert
,
update,
delete on
table public.clm_asso_conversations,
public.clm_asso_messages,
public.clm_asso_conversation_reads,
public.clm_asso_calendar_proposals
from authenticated;

grant
select on
table public.clm_asso_conversations, public.clm_asso_messages, public.clm_asso_conversation_reads, public.clm_asso_calendar_proposals to authenticated;

-- =========================================================
-- TRIGGERS UPDATED_AT
-- =========================================================

drop trigger if exists clm_asso_conversations_updated_at on public.clm_asso_conversations;

create trigger clm_asso_conversations_updated_at
before update on public.clm_asso_conversations
for each row
execute function public.clm_asso_set_updated_at();

drop trigger if exists clm_asso_messages_updated_at on public.clm_asso_messages;

create trigger clm_asso_messages_updated_at
before update on public.clm_asso_messages
for each row
execute function public.clm_asso_set_updated_at();

drop trigger if exists clm_asso_calendar_proposals_updated_at on public.clm_asso_calendar_proposals;

create trigger clm_asso_calendar_proposals_updated_at
before update on public.clm_asso_calendar_proposals
for each row
execute function public.clm_asso_set_updated_at();

-- =========================================================
-- NOTIFICATION D’UN NOUVEAU MESSAGE
-- =========================================================

create or replace function
public.clm_asso_notify_interclub_message(
  p_message_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message public.clm_asso_messages%rowtype;
  v_conversation public.clm_asso_conversations%rowtype;
  v_sender_club_name text;
  v_target_club_id uuid;
  v_preview text;
begin
  select *
  into v_message
  from public.clm_asso_messages
  where id = p_message_id;

  if not found then
    raise exception 'Message introuvable.';
  end if;

  select *
  into v_conversation
  from public.clm_asso_conversations
  where id = v_message.conversation_id;

  if not found then
    raise exception 'Conversation introuvable.';
  end if;

  v_target_club_id :=
    case
      when v_conversation.club_a_id =
        v_message.sender_club_id
      then v_conversation.club_b_id
      else v_conversation.club_a_id
    end;

  select club.name
  into v_sender_club_name
  from public.clm_asso_clubs club
  where club.id = v_message.sender_club_id;

  v_preview :=
    case
      when v_message.message_type =
        'calendar_proposal'
      then 'Une proposition de calendrier vous a été envoyée.'
      when v_message.message_type = 'system'
      then coalesce(
        nullif(trim(v_message.body), ''),
        'La conversation a été mise à jour.'
      )
      else left(
        coalesce(
          nullif(trim(v_message.body), ''),
          'Nouveau message'
        ),
        180
      )
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
    v_target_club_id,
    membership.user_id,
    'message',
    'Nouveau message de ' ||
      coalesce(v_sender_club_name, 'un club'),
    v_preview,
    '/app/messagerie?conversation=' ||
      v_message.conversation_id::text,
    'message:' ||
      v_message.id::text ||
      ':' ||
      membership.user_id::text
  from public.clm_asso_club_members membership
  where membership.club_id = v_target_club_id
    and membership.status = 'active'
    and membership.role = any(array[
      'owner'::public.clm_asso_club_role,
      'admin'::public.clm_asso_club_role,
      'manager'::public.clm_asso_club_role
    ])
    and membership.user_id is distinct from auth.uid()
  on conflict (
    user_id,
    dedupe_key
  )
  where dedupe_key is not null
  do nothing;
end;
$$;

revoke all on function public.clm_asso_notify_interclub_message (uuid)
from public;

-- Fonction interne : pas de grant à authenticated.

-- =========================================================
-- ANNUAIRE DES CLUBS DISPONIBLES
-- =========================================================

create or replace function
public.clm_asso_list_messageable_clubs(
  p_source_club_id uuid
)
returns table (
  id uuid,
  name text,
  acronym text,
  logo_url text,
  city text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.clm_asso_can_message(
    p_source_club_id
  ) then
    raise exception
      'Vous ne pouvez pas accéder à la messagerie de ce club.';
  end if;

  return query
  select
    club.id,
    club.name,
    club.acronym,
    club.logo_url,
    club.city
  from public.clm_asso_clubs club
  where club.id <> p_source_club_id
  order by
    lower(club.name),
    club.created_at;
end;
$$;

revoke all on function public.clm_asso_list_messageable_clubs (uuid)
from public;

grant
execute on function public.clm_asso_list_messageable_clubs (uuid) to authenticated;

-- =========================================================
-- LISTE DES CONVERSATIONS
-- =========================================================

create or replace function
public.clm_asso_list_conversations(
  p_club_id uuid
)
returns table (
  conversation_id uuid,
  other_club_id uuid,
  other_club_name text,
  other_club_acronym text,
  other_club_logo_url text,
  other_club_city text,
  last_message_id uuid,
  last_message_body text,
  last_message_type text,
  last_message_at timestamptz,
  last_sender_club_id uuid,
  unread_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.clm_asso_can_message(
    p_club_id
  ) then
    raise exception
      'Vous ne pouvez pas accéder à la messagerie de ce club.';
  end if;

  return query
  select
    conversation.id as conversation_id,
    other_club.id as other_club_id,
    other_club.name as other_club_name,
    other_club.acronym as other_club_acronym,
    other_club.logo_url as other_club_logo_url,
    other_club.city as other_club_city,
    latest_message.id as last_message_id,
    case
      when latest_message.deleted_at is not null
      then 'Message supprimé'
      when latest_message.message_type =
        'calendar_proposal'
      then 'Proposition de calendrier'
      else latest_message.body
    end as last_message_body,
    latest_message.message_type as last_message_type,
    coalesce(
      latest_message.created_at,
      conversation.last_message_at
    ) as last_message_at,
    latest_message.sender_club_id
      as last_sender_club_id,
    (
      select count(*)
      from public.clm_asso_messages unread_message
      where unread_message.conversation_id =
        conversation.id
        and unread_message.sender_club_id <>
          p_club_id
        and unread_message.deleted_at is null
        and unread_message.created_at >
          coalesce(
            read_state.last_read_at,
            'epoch'::timestamptz
          )
    ) as unread_count
  from public.clm_asso_conversations conversation
  join public.clm_asso_clubs other_club
    on other_club.id =
      case
        when conversation.club_a_id = p_club_id
        then conversation.club_b_id
        else conversation.club_a_id
      end
  left join lateral (
    select message.*
    from public.clm_asso_messages message
    where message.conversation_id =
      conversation.id
    order by
      message.created_at desc,
      message.id desc
    limit 1
  ) latest_message on true
  left join public.clm_asso_conversation_reads
    read_state
    on read_state.conversation_id =
      conversation.id
    and read_state.user_id = auth.uid()
  where p_club_id in (
    conversation.club_a_id,
    conversation.club_b_id
  )
  order by
    coalesce(
      latest_message.created_at,
      conversation.last_message_at
    ) desc;
end;
$$;

revoke all on function public.clm_asso_list_conversations (uuid)
from public;

grant
execute on function public.clm_asso_list_conversations (uuid) to authenticated;

-- =========================================================
-- HISTORIQUE D’UNE CONVERSATION
-- =========================================================

create or replace function
public.clm_asso_list_messages(
  p_conversation_id uuid,
  p_club_id uuid
)
returns table (
  message_id uuid,
  conversation_id uuid,
  sender_club_id uuid,
  sender_club_name text,
  sender_user_id uuid,
  sender_display_name text,
  message_type text,
  body text,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz,
  proposal_id uuid,
  proposal_title text,
  proposal_starts_at timestamptz,
  proposal_ends_at timestamptz,
  proposal_location text,
  proposal_description text,
  proposal_status text,
  proposal_proposed_by_club_id uuid,
  proposal_target_club_id uuid,
  proposal_responded_at timestamptz,
  proposer_event_id uuid,
  target_event_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.clm_asso_conversations conversation
    where conversation.id = p_conversation_id
      and p_club_id in (
        conversation.club_a_id,
        conversation.club_b_id
      )
  ) then
    raise exception
      'Cette conversation ne concerne pas le club actif.';
  end if;

  if not public.clm_asso_can_message(
    p_club_id
  ) then
    raise exception
      'Vous ne pouvez pas accéder à cette conversation.';
  end if;

  return query
  select
    message.id as message_id,
    message.conversation_id,
    message.sender_club_id,
    sender_club.name as sender_club_name,
    message.sender_user_id,
    coalesce(
      nullif(profile.display_name, ''),
      nullif(
        trim(
          concat_ws(
            ' ',
            profile.first_name,
            profile.last_name
          )
        ),
        ''
      ),
      'Responsable du club'
    ) as sender_display_name,
    message.message_type,
    message.body,
    message.edited_at,
    message.deleted_at,
    message.created_at,
    proposal.id as proposal_id,
    proposal.title as proposal_title,
    proposal.starts_at as proposal_starts_at,
    proposal.ends_at as proposal_ends_at,
    proposal.location as proposal_location,
    proposal.description as proposal_description,
    proposal.status as proposal_status,
    proposal.proposed_by_club_id
      as proposal_proposed_by_club_id,
    proposal.target_club_id
      as proposal_target_club_id,
    proposal.responded_at
      as proposal_responded_at,
    proposal.proposer_event_id,
    proposal.target_event_id
  from public.clm_asso_messages message
  join public.clm_asso_clubs sender_club
    on sender_club.id =
      message.sender_club_id
  left join public.clm_asso_profiles profile
    on profile.id =
      message.sender_user_id
  left join public.clm_asso_calendar_proposals
    proposal
    on proposal.message_id =
      message.id
  where message.conversation_id =
    p_conversation_id
  order by
    message.created_at,
    message.id;
end;
$$;

revoke all on function public.clm_asso_list_messages (uuid, uuid)
from public;

grant
execute on function public.clm_asso_list_messages (uuid, uuid) to authenticated;

-- =========================================================
-- DIFFUSION : UN, PLUSIEURS OU TOUS LES CLUBS
-- =========================================================

create or replace function
public.clm_asso_start_conversations(
  p_source_club_id uuid,
  p_target_club_ids uuid[],
  p_body text
)
returns table (
  conversation_id uuid,
  target_club_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_club_id uuid;
  v_conversation_id uuid;
  v_message_id uuid;
  v_club_a_id uuid;
  v_club_b_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Vous devez être connecté.';
  end if;

  if not public.clm_asso_can_message(
    p_source_club_id
  ) then
    raise exception
      'Vous ne pouvez pas envoyer de message pour ce club.';
  end if;

  if nullif(trim(p_body), '') is null then
    raise exception 'Le message est vide.';
  end if;

  if length(trim(p_body)) > 5000 then
    raise exception
      'Le message ne peut pas dépasser 5 000 caractères.';
  end if;

  if coalesce(
    array_length(p_target_club_ids, 1),
    0
  ) = 0 then
    raise exception
      'Sélectionnez au moins un club.';
  end if;

  if array_length(p_target_club_ids, 1) > 250 then
    raise exception
      'La diffusion est limitée à 250 clubs.';
  end if;

  for v_target_club_id in
    select distinct target.target_club_id
    from unnest(p_target_club_ids)
      as target(target_club_id)
    where target.target_club_id is not null
      and target.target_club_id <>
        p_source_club_id
  loop
    if not exists (
      select 1
      from public.clm_asso_clubs club
      where club.id = v_target_club_id
    ) then
      raise exception 'Un club sélectionné est introuvable.';
    end if;

    v_club_a_id :=
      least(
        p_source_club_id,
        v_target_club_id
      );

    v_club_b_id :=
      greatest(
        p_source_club_id,
        v_target_club_id
      );

    v_conversation_id := null;

    insert into public.clm_asso_conversations (
      club_a_id,
      club_b_id,
      created_by_club_id,
      created_by_user_id,
      last_message_at
    )
    values (
      v_club_a_id,
      v_club_b_id,
      p_source_club_id,
      auth.uid(),
      now()
    )
    on conflict do nothing
    returning id
    into v_conversation_id;

    if v_conversation_id is null then
      select conversation.id
      into v_conversation_id
      from public.clm_asso_conversations
        conversation
      where conversation.club_a_id =
          v_club_a_id
        and conversation.club_b_id =
          v_club_b_id;
    end if;

    insert into public.clm_asso_messages (
      conversation_id,
      sender_club_id,
      sender_user_id,
      message_type,
      body
    )
    values (
      v_conversation_id,
      p_source_club_id,
      auth.uid(),
      'text',
      trim(p_body)
    )
    returning id
    into v_message_id;

    update public.clm_asso_conversations
    set
      last_message_at = now(),
      updated_at = now()
    where id = v_conversation_id;

    insert into public.clm_asso_conversation_reads (
      conversation_id,
      club_id,
      user_id,
      last_read_at
    )
    values (
      v_conversation_id,
      p_source_club_id,
      auth.uid(),
      now()
    )
    on conflict (
      conversation_id,
      user_id
    )
    do update set
      club_id = excluded.club_id,
      last_read_at = excluded.last_read_at;

    perform public.clm_asso_notify_interclub_message(
      v_message_id
    );

    return query
    select
      v_conversation_id,
      v_target_club_id;
  end loop;
end;
$$;

revoke all on function
  public.clm_asso_start_conversations(
    uuid,
    uuid[],
    text
  )
from public;

grant execute on function
  public.clm_asso_start_conversations(
    uuid,
    uuid[],
    text
  )
to authenticated;

-- =========================================================
-- ENVOI, MODIFICATION ET SUPPRESSION DE MESSAGE
-- =========================================================

create or replace function
public.clm_asso_send_message(
  p_conversation_id uuid,
  p_sender_club_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Vous devez être connecté.';
  end if;

  if not public.clm_asso_can_message(
    p_sender_club_id
  ) then
    raise exception
      'Vous ne pouvez pas envoyer de message pour ce club.';
  end if;

  if not exists (
    select 1
    from public.clm_asso_conversations conversation
    where conversation.id = p_conversation_id
      and p_sender_club_id in (
        conversation.club_a_id,
        conversation.club_b_id
      )
  ) then
    raise exception
      'Cette conversation ne concerne pas le club actif.';
  end if;

  if nullif(trim(p_body), '') is null then
    raise exception 'Le message est vide.';
  end if;

  if length(trim(p_body)) > 5000 then
    raise exception
      'Le message ne peut pas dépasser 5 000 caractères.';
  end if;

  insert into public.clm_asso_messages (
    conversation_id,
    sender_club_id,
    sender_user_id,
    message_type,
    body
  )
  values (
    p_conversation_id,
    p_sender_club_id,
    auth.uid(),
    'text',
    trim(p_body)
  )
  returning id
  into v_message_id;

  update public.clm_asso_conversations
  set
    last_message_at = now(),
    updated_at = now()
  where id = p_conversation_id;

  insert into public.clm_asso_conversation_reads (
    conversation_id,
    club_id,
    user_id,
    last_read_at
  )
  values (
    p_conversation_id,
    p_sender_club_id,
    auth.uid(),
    now()
  )
  on conflict (
    conversation_id,
    user_id
  )
  do update set
    club_id = excluded.club_id,
    last_read_at = excluded.last_read_at;

  perform public.clm_asso_notify_interclub_message(
    v_message_id
  );

  return v_message_id;
end;
$$;

revoke all on function public.clm_asso_send_message (uuid, uuid, text)
from public;

grant
execute on function public.clm_asso_send_message (uuid, uuid, text) to authenticated;

create or replace function
public.clm_asso_update_message(
  p_message_id uuid,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message public.clm_asso_messages%rowtype;
begin
  if nullif(trim(p_body), '') is null then
    raise exception 'Le message est vide.';
  end if;

  if length(trim(p_body)) > 5000 then
    raise exception
      'Le message ne peut pas dépasser 5 000 caractères.';
  end if;

  select *
  into v_message
  from public.clm_asso_messages
  where id = p_message_id;

  if not found then
    raise exception 'Message introuvable.';
  end if;

  if v_message.sender_user_id is distinct from auth.uid() then
    raise exception
      'Vous pouvez uniquement modifier vos propres messages.';
  end if;

  if v_message.deleted_at is not null then
    raise exception
      'Un message supprimé ne peut pas être modifié.';
  end if;

  if v_message.message_type <> 'text' then
    raise exception
      'Seuls les messages texte peuvent être modifiés.';
  end if;

  if not public.clm_asso_can_message(
    v_message.sender_club_id
  ) then
    raise exception 'Permission insuffisante.';
  end if;

  update public.clm_asso_messages
  set
    body = trim(p_body),
    edited_at = now(),
    updated_at = now()
  where id = p_message_id;
end;
$$;

revoke all on function public.clm_asso_update_message (uuid, text)
from public;

grant
execute on function public.clm_asso_update_message (uuid, text) to authenticated;

create or replace function
public.clm_asso_delete_message(
  p_message_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message public.clm_asso_messages%rowtype;
begin
  select *
  into v_message
  from public.clm_asso_messages
  where id = p_message_id;

  if not found then
    raise exception 'Message introuvable.';
  end if;

  if v_message.sender_user_id is distinct from auth.uid() then
    raise exception
      'Vous pouvez uniquement supprimer vos propres messages.';
  end if;

  if not public.clm_asso_can_message(
    v_message.sender_club_id
  ) then
    raise exception 'Permission insuffisante.';
  end if;

  update public.clm_asso_messages
  set
    body = null,
    deleted_at = coalesce(deleted_at, now()),
    updated_at = now()
  where id = p_message_id;

  update public.clm_asso_calendar_proposals
  set
    status = 'cancelled',
    updated_at = now()
  where message_id = p_message_id
    and status = 'pending';
end;
$$;

revoke all on function public.clm_asso_delete_message (uuid)
from public;

grant
execute on function public.clm_asso_delete_message (uuid) to authenticated;

-- =========================================================
-- LECTURE D’UNE CONVERSATION
-- =========================================================

create or replace function
public.clm_asso_mark_conversation_read(
  p_conversation_id uuid,
  p_club_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.clm_asso_can_message(
    p_club_id
  ) then
    raise exception 'Permission insuffisante.';
  end if;

  if not exists (
    select 1
    from public.clm_asso_conversations conversation
    where conversation.id = p_conversation_id
      and p_club_id in (
        conversation.club_a_id,
        conversation.club_b_id
      )
  ) then
    raise exception
      'Cette conversation ne concerne pas le club actif.';
  end if;

  insert into public.clm_asso_conversation_reads (
    conversation_id,
    club_id,
    user_id,
    last_read_at
  )
  values (
    p_conversation_id,
    p_club_id,
    auth.uid(),
    now()
  )
  on conflict (
    conversation_id,
    user_id
  )
  do update set
    club_id = excluded.club_id,
    last_read_at = excluded.last_read_at;
end;
$$;

revoke all on function public.clm_asso_mark_conversation_read (uuid, uuid)
from public;

grant
execute on function public.clm_asso_mark_conversation_read (uuid, uuid) to authenticated;

-- =========================================================
-- PROPOSITION D’ÉVÉNEMENT
-- =========================================================

create or replace function
public.clm_asso_send_calendar_proposal(
  p_conversation_id uuid,
  p_sender_club_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_ends_at timestamptz default null,
  p_location text default null,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation public.clm_asso_conversations%rowtype;
  v_target_club_id uuid;
  v_message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Vous devez être connecté.';
  end if;

  if not public.clm_asso_can_message(
    p_sender_club_id
  ) then
    raise exception
      'Vous ne pouvez pas proposer un événement pour ce club.';
  end if;

  select *
  into v_conversation
  from public.clm_asso_conversations
  where id = p_conversation_id
    and p_sender_club_id in (
      club_a_id,
      club_b_id
    );

  if not found then
    raise exception
      'Cette conversation ne concerne pas le club actif.';
  end if;

  if nullif(trim(p_title), '') is null then
    raise exception 'Le titre est obligatoire.';
  end if;

  if p_ends_at is not null
     and p_ends_at <= p_starts_at then
    raise exception
      'L’heure de fin doit être après l’heure de début.';
  end if;

  v_target_club_id :=
    case
      when v_conversation.club_a_id =
        p_sender_club_id
      then v_conversation.club_b_id
      else v_conversation.club_a_id
    end;

  insert into public.clm_asso_messages (
    conversation_id,
    sender_club_id,
    sender_user_id,
    message_type,
    body
  )
  values (
    p_conversation_id,
    p_sender_club_id,
    auth.uid(),
    'calendar_proposal',
    trim(p_title)
  )
  returning id
  into v_message_id;

  insert into public.clm_asso_calendar_proposals (
    message_id,
    conversation_id,
    proposed_by_club_id,
    proposed_by_user_id,
    target_club_id,
    title,
    starts_at,
    ends_at,
    location,
    description
  )
  values (
    v_message_id,
    p_conversation_id,
    p_sender_club_id,
    auth.uid(),
    v_target_club_id,
    trim(p_title),
    p_starts_at,
    p_ends_at,
    nullif(trim(p_location), ''),
    nullif(trim(p_description), '')
  );

  update public.clm_asso_conversations
  set
    last_message_at = now(),
    updated_at = now()
  where id = p_conversation_id;

  insert into public.clm_asso_conversation_reads (
    conversation_id,
    club_id,
    user_id,
    last_read_at
  )
  values (
    p_conversation_id,
    p_sender_club_id,
    auth.uid(),
    now()
  )
  on conflict (
    conversation_id,
    user_id
  )
  do update set
    club_id = excluded.club_id,
    last_read_at = excluded.last_read_at;

  perform public.clm_asso_notify_interclub_message(
    v_message_id
  );

  return v_message_id;
end;
$$;

revoke all on function public.clm_asso_send_calendar_proposal (
    uuid,
    uuid,
    text,
    timestamptz,
    timestamptz,
    text,
    text
)
from public;

grant
execute on function public.clm_asso_send_calendar_proposal (
    uuid,
    uuid,
    text,
    timestamptz,
    timestamptz,
    text,
    text
) to authenticated;

-- =========================================================
-- ACCEPTATION OU REFUS D’UNE PROPOSITION
-- L’acceptation crée les deux événements dans une transaction.
-- =========================================================

create or replace function
public.clm_asso_respond_calendar_proposal(
  p_proposal_id uuid,
  p_club_id uuid,
  p_response text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.clm_asso_calendar_proposals%rowtype;
  v_proposer_club_name text;
  v_target_club_name text;
  v_proposer_event_id uuid;
  v_target_event_id uuid;
  v_system_message text;
begin
  if auth.uid() is null then
    raise exception 'Vous devez être connecté.';
  end if;

  if p_response not in (
    'accepted',
    'rejected'
  ) then
    raise exception 'Réponse invalide.';
  end if;

  select *
  into v_proposal
  from public.clm_asso_calendar_proposals
  where id = p_proposal_id
  for update;

  if not found then
    raise exception 'Proposition introuvable.';
  end if;

  if v_proposal.status <> 'pending' then
    raise exception
      'Cette proposition a déjà reçu une réponse.';
  end if;

  if v_proposal.target_club_id <> p_club_id then
    raise exception
      'Seul le club destinataire peut répondre.';
  end if;

  if not public.clm_asso_can_message(
    p_club_id
  ) then
    raise exception 'Permission insuffisante.';
  end if;

  select club.name
  into v_proposer_club_name
  from public.clm_asso_clubs club
  where club.id =
    v_proposal.proposed_by_club_id;

  select club.name
  into v_target_club_name
  from public.clm_asso_clubs club
  where club.id =
    v_proposal.target_club_id;

  if p_response = 'accepted' then
    insert into public.clm_asso_events (
      club_id,
      team_id,
      title,
      event_type,
      starts_at,
      ends_at,
      location,
      description,
      created_by
    )
    values (
      v_proposal.proposed_by_club_id,
      null,
      v_proposal.title,
      'club',
      v_proposal.starts_at,
      v_proposal.ends_at,
      v_proposal.location,
      concat_ws(
        E'\n\n',
        v_proposal.description,
        'Événement interclubs avec ' ||
          coalesce(
            v_target_club_name,
            'le club destinataire'
          ) ||
          '.'
      ),
      v_proposal.proposed_by_user_id
    )
    returning id
    into v_proposer_event_id;

    insert into public.clm_asso_events (
      club_id,
      team_id,
      title,
      event_type,
      starts_at,
      ends_at,
      location,
      description,
      created_by
    )
    values (
      v_proposal.target_club_id,
      null,
      v_proposal.title,
      'club',
      v_proposal.starts_at,
      v_proposal.ends_at,
      v_proposal.location,
      concat_ws(
        E'\n\n',
        v_proposal.description,
        'Événement interclubs avec ' ||
          coalesce(
            v_proposer_club_name,
            'le club organisateur'
          ) ||
          '.'
      ),
      auth.uid()
    )
    returning id
    into v_target_event_id;

    v_system_message :=
      'Proposition acceptée et ajoutée aux deux calendriers.';
  else
    v_system_message :=
      'Proposition de calendrier refusée.';
  end if;

  update public.clm_asso_calendar_proposals
  set
    status = p_response,
    responded_by_user_id = auth.uid(),
    responded_at = now(),
    proposer_event_id = v_proposer_event_id,
    target_event_id = v_target_event_id,
    updated_at = now()
  where id = p_proposal_id;

  insert into public.clm_asso_messages (
    conversation_id,
    sender_club_id,
    sender_user_id,
    message_type,
    body
  )
  values (
    v_proposal.conversation_id,
    p_club_id,
    auth.uid(),
    'system',
    v_system_message
  );

  update public.clm_asso_conversations
  set
    last_message_at = now(),
    updated_at = now()
  where id = v_proposal.conversation_id;

  insert into public.clm_asso_conversation_reads (
    conversation_id,
    club_id,
    user_id,
    last_read_at
  )
  values (
    v_proposal.conversation_id,
    p_club_id,
    auth.uid(),
    now()
  )
  on conflict (
    conversation_id,
    user_id
  )
  do update set
    club_id = excluded.club_id,
    last_read_at = excluded.last_read_at;

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
    v_proposal.proposed_by_club_id,
    membership.user_id,
    'calendar',
    case
      when p_response = 'accepted'
      then 'Proposition de calendrier acceptée'
      else 'Proposition de calendrier refusée'
    end,
    v_system_message,
    '/app/messagerie?conversation=' ||
      v_proposal.conversation_id::text,
    'calendar-proposal-response:' ||
      v_proposal.id::text ||
      ':' ||
      membership.user_id::text
  from public.clm_asso_club_members membership
  where membership.club_id =
      v_proposal.proposed_by_club_id
    and membership.status = 'active'
    and membership.role = any(array[
      'owner'::public.clm_asso_club_role,
      'admin'::public.clm_asso_club_role,
      'manager'::public.clm_asso_club_role
    ])
    and membership.user_id is distinct from auth.uid()
  on conflict (
    user_id,
    dedupe_key
  )
  where dedupe_key is not null
  do nothing;
end;
$$;

revoke all on function public.clm_asso_respond_calendar_proposal (uuid, uuid, text)
from public;

grant
execute on function public.clm_asso_respond_calendar_proposal (uuid, uuid, text) to authenticated;

-- =========================================================
-- REALTIME
-- =========================================================

alter table public.clm_asso_messages replica identity full;

alter table public.clm_asso_calendar_proposals replica identity full;

do $$
begin
  alter publication supabase_realtime
    add table public.clm_asso_messages;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime
    add table public.clm_asso_calendar_proposals;
exception
  when duplicate_object then null;
end;
$$;

-- =========================================================
-- FIN DE LA MIGRATION
-- =========================================================