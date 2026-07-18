import { supabase } from "../lib/supabase";
import type {
  CalendarProposalPayload,
  InterclubConversation,
  InterclubMessage,
  MessageableClub,
  StartedConversation,
} from "../types/database";

function throwIfError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

export async function listMessageableClubs(
  sourceClubId: string,
): Promise<MessageableClub[]> {
  const { data, error } = await supabase.rpc(
    "clm_asso_list_messageable_clubs",
    {
      p_source_club_id: sourceClubId,
    },
  );

  throwIfError(error);

  return (data ?? []) as MessageableClub[];
}

export async function listInterclubConversations(
  clubId: string,
): Promise<InterclubConversation[]> {
  const { data, error } = await supabase.rpc(
    "clm_asso_list_conversations",
    {
      p_club_id: clubId,
    },
  );

  throwIfError(error);

  return ((data ?? []) as InterclubConversation[]).map(
    (conversation) => ({
      ...conversation,
      unread_count: Number(conversation.unread_count ?? 0),
    }),
  );
}

export async function listInterclubMessages(
  conversationId: string,
  clubId: string,
): Promise<InterclubMessage[]> {
  const { data, error } = await supabase.rpc(
    "clm_asso_list_messages",
    {
      p_conversation_id: conversationId,
      p_club_id: clubId,
    },
  );

  throwIfError(error);

  return (data ?? []) as InterclubMessage[];
}

export async function startInterclubConversations(payload: {
  sourceClubId: string;
  targetClubIds: string[];
  body: string;
}): Promise<StartedConversation[]> {
  const { data, error } = await supabase.rpc(
    "clm_asso_start_conversations",
    {
      p_source_club_id: payload.sourceClubId,
      p_target_club_ids: payload.targetClubIds,
      p_body: payload.body,
    },
  );

  throwIfError(error);

  return (data ?? []) as StartedConversation[];
}

export async function sendInterclubMessage(payload: {
  conversationId: string;
  senderClubId: string;
  body: string;
}) {
  const { data, error } = await supabase.rpc(
    "clm_asso_send_message",
    {
      p_conversation_id: payload.conversationId,
      p_sender_club_id: payload.senderClubId,
      p_body: payload.body,
    },
  );

  throwIfError(error);

  return data as string;
}

export async function updateInterclubMessage(
  messageId: string,
  body: string,
) {
  const { error } = await supabase.rpc(
    "clm_asso_update_message",
    {
      p_message_id: messageId,
      p_body: body,
    },
  );

  throwIfError(error);
}

export async function deleteInterclubMessage(
  messageId: string,
) {
  const { error } = await supabase.rpc(
    "clm_asso_delete_message",
    {
      p_message_id: messageId,
    },
  );

  throwIfError(error);
}

export async function markInterclubConversationRead(
  conversationId: string,
  clubId: string,
) {
  const { error } = await supabase.rpc(
    "clm_asso_mark_conversation_read",
    {
      p_conversation_id: conversationId,
      p_club_id: clubId,
    },
  );

  throwIfError(error);
}

export async function sendCalendarProposal(payload: {
  conversationId: string;
  senderClubId: string;
  proposal: CalendarProposalPayload;
}) {
  const { data, error } = await supabase.rpc(
    "clm_asso_send_calendar_proposal",
    {
      p_conversation_id: payload.conversationId,
      p_sender_club_id: payload.senderClubId,
      p_title: payload.proposal.title,
      p_starts_at: payload.proposal.startsAt,
      p_ends_at: payload.proposal.endsAt,
      p_location: payload.proposal.location,
      p_description: payload.proposal.description,
    },
  );

  throwIfError(error);

  return data as string;
}

export async function respondToCalendarProposal(
  proposalId: string,
  clubId: string,
  response: "accepted" | "rejected",
) {
  const { error } = await supabase.rpc(
    "clm_asso_respond_calendar_proposal",
    {
      p_proposal_id: proposalId,
      p_club_id: clubId,
      p_response: response,
    },
  );

  throwIfError(error);
}