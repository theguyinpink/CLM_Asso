-- =========================================================
-- CLM ASSO — CORRECTION MESSAGERIE
-- Migration 006
-- Corrige l’erreur PostgreSQL :
-- column reference "conversation_id" is ambiguous
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
    on conflict on constraint
      clm_asso_conversation_reads_pkey
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