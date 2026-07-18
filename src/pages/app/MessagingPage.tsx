import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock3,
  Edit3,
  MapPin,
  MessageCircle,
  MessagesSquare,
  PhoneCall,
  Plus,
  Search,
  Send,
  Trash2,
  UsersRound,
  X,
  XCircle,
} from "lucide-react";
import { Link, useSearchParams } from "react-router";

import ConfirmDialog from "../../components/app/shared/ConfirmDialog";
import Modal from "../../components/app/shared/Modal";
import PageHeader from "../../components/app/shared/PageHeader";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/app/shared/PageState";
import { useAuth } from "../../hooks/useAuth";
import { useClub } from "../../hooks/useClub";
import { useToast } from "../../hooks/useToast";
import { supabase } from "../../lib/supabase";
import {
  deleteInterclubMessage,
  listInterclubConversations,
  listInterclubMessages,
  listMessageableClubs,
  markInterclubConversationRead,
  respondToCalendarProposal,
  sendCalendarProposal,
  sendInterclubMessage,
  startInterclubConversations,
  updateInterclubMessage,
} from "../../services/messagingService";
import type {
  CalendarProposalPayload,
  InterclubConversation,
  InterclubMessage,
  MessageableClub,
} from "../../types/database";

import "../../styles/data-pages.css";
import "../../styles/messaging.css";

interface ProposalDraft {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
}

type ContactMode = "clm" | "whatsapp" | "phone";

const emptyProposalDraft: ProposalDraft = {
  title: "",
  date: "",
  startTime: "18:00",
  endTime: "20:00",
  location: "",
  description: "",
};

function formatConversationTime(value: string) {
  const date = new Date(value);
  const today = new Date();

  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatProposalDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getClubInitials(name: string, acronym: string | null) {
  if (acronym?.trim()) {
    return acronym.trim().slice(0, 3).toUpperCase();
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

function toIsoDateTime(date: string, time: string) {
  return new Date(`${date}T${time}`).toISOString();
}

function normalizePhoneForCall(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const digits = trimmed.replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }

  if (digits.startsWith("00")) {
    return `+${digits.slice(2)}`;
  }

  return digits;
}

function normalizePhoneForWhatsApp(value: string) {
  const callablePhone = normalizePhoneForCall(value);

  if (!callablePhone) {
    return null;
  }

  const digits = callablePhone.replace(/\D/g, "");

  /*
   * Les clubs ciblés sont actuellement français.
   * Un numéro local de type 06/07 est donc converti
   * au format international attendu par WhatsApp.
   */
  if (!callablePhone.startsWith("+") && /^0\d{9}$/.test(digits)) {
    return `33${digits.slice(1)}`;
  }

  return digits;
}

function MessagingPage() {
  const { user } = useAuth();
  const { activeClub } = useClub();
  const { showToast } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();

  const [clubs, setClubs] = useState<MessageableClub[]>([]);

  const [conversations, setConversations] = useState<InterclubConversation[]>(
    [],
  );

  const [messages, setMessages] = useState<InterclubMessage[]>([]);

  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [error, setError] = useState("");
  const [conversationSearch, setConversationSearch] = useState("");

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(searchParams.get("conversation"));

  const [messageBody, setMessageBody] = useState("");

  const [sending, setSending] = useState(false);

  const [newConversationOpen, setNewConversationOpen] = useState(false);

  const [clubSearch, setClubSearch] = useState("");

  const [selectedTargetClubIds, setSelectedTargetClubIds] = useState<string[]>(
    [],
  );

  const [initialMessage, setInitialMessage] = useState("");

  const [contactMode, setContactMode] = useState<ContactMode>("clm");

  const [creatingConversation, setCreatingConversation] = useState(false);

  const [formError, setFormError] = useState("");

  const [messageToEdit, setMessageToEdit] = useState<InterclubMessage | null>(
    null,
  );

  const [editedBody, setEditedBody] = useState("");

  const [editingMessage, setEditingMessage] = useState(false);

  const [messageToDelete, setMessageToDelete] =
    useState<InterclubMessage | null>(null);

  const [deletingMessage, setDeletingMessage] = useState(false);

  const [deleteMessageError, setDeleteMessageError] = useState("");

  const [plusMenuOpen, setPlusMenuOpen] = useState(false);

  const [proposalModalOpen, setProposalModalOpen] = useState(false);

  const [proposalDraft, setProposalDraft] =
    useState<ProposalDraft>(emptyProposalDraft);

  const [sendingProposal, setSendingProposal] = useState(false);

  const [respondingProposalId, setRespondingProposalId] = useState<
    string | null
  >(null);

  const messageListRef = useRef<HTMLDivElement | null>(null);

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) =>
          conversation.conversation_id === selectedConversationId,
      ) ?? null,
    [conversations, selectedConversationId],
  );

  const selectedConversationClub = useMemo(
    () =>
      selectedConversation
        ? (clubs.find(
            (club) => club.id === selectedConversation.other_club_id,
          ) ?? null)
        : null,
    [clubs, selectedConversation],
  );

  const selectedConversationPhone =
    selectedConversationClub?.contact_phone?.trim() || null;

  const filteredConversations = useMemo(() => {
    const query = conversationSearch.trim().toLowerCase();

    if (!query) {
      return conversations;
    }

    return conversations.filter(
      (conversation) =>
        conversation.other_club_name.toLowerCase().includes(query) ||
        (conversation.other_club_acronym ?? "").toLowerCase().includes(query) ||
        (conversation.last_message_body ?? "").toLowerCase().includes(query),
    );
  }, [conversationSearch, conversations]);

  const filteredClubs = useMemo(() => {
    const query = clubSearch.trim().toLowerCase();

    if (!query) {
      return clubs;
    }

    return clubs.filter(
      (club) =>
        club.name.toLowerCase().includes(query) ||
        (club.acronym ?? "").toLowerCase().includes(query) ||
        (club.city ?? "").toLowerCase().includes(query),
    );
  }, [clubSearch, clubs]);

  const selectedTargetClub = useMemo(() => {
    if (selectedTargetClubIds.length !== 1) {
      return null;
    }

    return clubs.find((club) => club.id === selectedTargetClubIds[0]) ?? null;
  }, [clubs, selectedTargetClubIds]);

  const selectedTargetPhone = selectedTargetClub?.contact_phone?.trim() || null;

  const loadConversations = useCallback(async () => {
    if (!activeClub) {
      return;
    }

    const nextConversations = await listInterclubConversations(activeClub.id);

    setConversations(nextConversations);

    if (
      selectedConversationId &&
      !nextConversations.some(
        (conversation) =>
          conversation.conversation_id === selectedConversationId,
      )
    ) {
      setSelectedConversationId(null);
    }
  }, [activeClub, selectedConversationId]);

  const loadInitialData = useCallback(async () => {
    if (!activeClub) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [nextClubs, nextConversations] = await Promise.all([
        listMessageableClubs(activeClub.id),
        listInterclubConversations(activeClub.id),
      ]);

      setClubs(nextClubs);
      setConversations(nextConversations);

      const requestedConversation = searchParams.get("conversation");

      if (
        requestedConversation &&
        nextConversations.some(
          (conversation) =>
            conversation.conversation_id === requestedConversation,
        )
      ) {
        setSelectedConversationId(requestedConversation);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de charger la messagerie.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeClub, searchParams]);

  const loadMessages = useCallback(async () => {
    if (!activeClub || !selectedConversationId) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);

    try {
      const nextMessages = await listInterclubMessages(
        selectedConversationId,
        activeClub.id,
      );

      setMessages(nextMessages);

      await markInterclubConversationRead(
        selectedConversationId,
        activeClub.id,
      );

      setConversations((current) =>
        current.map((conversation) =>
          conversation.conversation_id === selectedConversationId
            ? {
                ...conversation,
                unread_count: 0,
              }
            : conversation,
        ),
      );
    } catch (caughtError) {
      showToast(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de charger les messages.",
        "error",
      );
    } finally {
      setMessagesLoading(false);
    }
  }, [activeClub, selectedConversationId, showToast]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!activeClub || !user) {
      return;
    }

    const channel = supabase
      .channel(`clm-asso-messaging-${activeClub.id}-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clm_asso_messages",
        },
        () => {
          void loadConversations();

          if (selectedConversationId) {
            void loadMessages();
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clm_asso_calendar_proposals",
        },
        () => {
          if (selectedConversationId) {
            void loadMessages();
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    activeClub,
    loadConversations,
    loadMessages,
    selectedConversationId,
    user,
  ]);

  useEffect(() => {
    if (!messageListRef.current) {
      return;
    }

    messageListRef.current.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function selectConversation(conversationId: string) {
    setSelectedConversationId(conversationId);

    setSearchParams(
      {
        conversation: conversationId,
      },
      {
        replace: true,
      },
    );

    setPlusMenuOpen(false);
  }

  function closeMobileConversation() {
    setSelectedConversationId(null);
    setSearchParams({}, { replace: true });
  }

  function openNewConversation() {
    setClubSearch("");
    setSelectedTargetClubIds([]);
    setInitialMessage("");
    setContactMode("clm");
    setFormError("");
    setNewConversationOpen(true);
  }

  function toggleTargetClub(clubId: string) {
    setSelectedTargetClubIds((current) => {
      const next = current.includes(clubId)
        ? current.filter((currentId) => currentId !== clubId)
        : [...current, clubId];

      if (next.length !== 1 && contactMode !== "clm") {
        setContactMode("clm");
      }

      return next;
    });
  }

  function toggleAllClubs() {
    setContactMode("clm");

    if (selectedTargetClubIds.length === clubs.length) {
      setSelectedTargetClubIds([]);
      return;
    }

    setSelectedTargetClubIds(clubs.map((club) => club.id));
  }

  async function handleCreateConversations(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeClub) {
      return;
    }

    setCreatingConversation(true);
    setFormError("");

    try {
      if (contactMode === "whatsapp" || contactMode === "phone") {
        if (!selectedTargetClub || !selectedTargetPhone) {
          throw new Error(
            "Sélectionnez un seul club disposant d’un numéro de téléphone.",
          );
        }

        if (contactMode === "whatsapp") {
          const whatsappPhone = normalizePhoneForWhatsApp(selectedTargetPhone);

          if (!whatsappPhone) {
            throw new Error("Le numéro WhatsApp du club est invalide.");
          }

          const defaultMessage = `Bonjour, je vous contacte au nom de ${activeClub.name} depuis CLM Asso.`;

          const message = initialMessage.trim() || defaultMessage;

          const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;

          window.open(whatsappUrl, "_blank", "noopener,noreferrer");

          setNewConversationOpen(false);
          showToast("WhatsApp va s’ouvrir avec le message préparé.", "success");
          return;
        }

        const callablePhone = normalizePhoneForCall(selectedTargetPhone);

        if (!callablePhone) {
          throw new Error("Le numéro de téléphone du club est invalide.");
        }

        window.location.href = `tel:${callablePhone}`;

        setNewConversationOpen(false);
        showToast("L’application téléphone va s’ouvrir.", "success");
        return;
      }

      const created = await startInterclubConversations({
        sourceClubId: activeClub.id,
        targetClubIds: selectedTargetClubIds,
        body: initialMessage,
      });

      if (created.length === 0) {
        throw new Error("Aucune conversation n’a été créée.");
      }

      setNewConversationOpen(false);

      await loadConversations();

      selectConversation(created[0].conversation_id);

      showToast(
        created.length === 1
          ? "Le message a été envoyé."
          : `Le message a été envoyé à ${created.length} clubs dans des conversations privées.`,
        "success",
      );
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de contacter le club.",
      );
    } finally {
      setCreatingConversation(false);
    }
  }

  function openSelectedConversationWhatsApp() {
    if (!activeClub) {
      return;
    }

    if (!selectedConversationPhone) {
      showToast("Ce club n’a pas renseigné de numéro de téléphone.", "info");
      return;
    }

    const whatsappPhone = normalizePhoneForWhatsApp(selectedConversationPhone);

    if (!whatsappPhone) {
      showToast("Le numéro WhatsApp du club est invalide.", "error");
      return;
    }

    const message = `Bonjour, je vous contacte au nom de ${activeClub.name} depuis CLM Asso.`;

    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  function callSelectedConversationClub() {
    if (!selectedConversationPhone) {
      showToast("Ce club n’a pas renseigné de numéro de téléphone.", "info");
      return;
    }

    const callablePhone = normalizePhoneForCall(selectedConversationPhone);

    if (!callablePhone) {
      showToast("Le numéro de téléphone du club est invalide.", "error");
      return;
    }

    window.location.href = `tel:${callablePhone}`;
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeClub || !selectedConversationId) {
      return;
    }

    const body = messageBody.trim();

    if (!body) {
      return;
    }

    setSending(true);

    try {
      await sendInterclubMessage({
        conversationId: selectedConversationId,
        senderClubId: activeClub.id,
        body,
      });

      setMessageBody("");
      setPlusMenuOpen(false);

      await Promise.all([loadMessages(), loadConversations()]);
    } catch (caughtError) {
      showToast(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible d’envoyer le message.",
        "error",
      );
    } finally {
      setSending(false);
    }
  }

  function openEditMessage(message: InterclubMessage) {
    setMessageToEdit(message);
    setEditedBody(message.body ?? "");
    setFormError("");
  }

  async function handleEditMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!messageToEdit) {
      return;
    }

    setEditingMessage(true);
    setFormError("");

    try {
      await updateInterclubMessage(messageToEdit.message_id, editedBody);

      setMessageToEdit(null);

      await Promise.all([loadMessages(), loadConversations()]);

      showToast("Le message a été modifié.", "success");
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de modifier le message.",
      );
    } finally {
      setEditingMessage(false);
    }
  }

  async function confirmDeleteMessage() {
    if (!messageToDelete) {
      return;
    }

    setDeletingMessage(true);
    setDeleteMessageError("");

    try {
      await deleteInterclubMessage(messageToDelete.message_id);

      setMessageToDelete(null);

      await Promise.all([loadMessages(), loadConversations()]);

      showToast("Le message a été supprimé.", "success");
    } catch (caughtError) {
      setDeleteMessageError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de supprimer le message.",
      );
    } finally {
      setDeletingMessage(false);
    }
  }

  function openProposalModal() {
    const today = new Date();

    setProposalDraft({
      ...emptyProposalDraft,
      date: [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-"),
    });

    setFormError("");
    setPlusMenuOpen(false);
    setProposalModalOpen(true);
  }

  async function handleSendProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeClub || !selectedConversationId) {
      return;
    }

    setSendingProposal(true);
    setFormError("");

    try {
      const proposal: CalendarProposalPayload = {
        title: proposalDraft.title.trim(),
        startsAt: toIsoDateTime(proposalDraft.date, proposalDraft.startTime),
        endsAt: proposalDraft.endTime
          ? toIsoDateTime(proposalDraft.date, proposalDraft.endTime)
          : null,
        location: proposalDraft.location.trim() || null,
        description: proposalDraft.description.trim() || null,
      };

      await sendCalendarProposal({
        conversationId: selectedConversationId,
        senderClubId: activeClub.id,
        proposal,
      });

      setProposalModalOpen(false);

      await Promise.all([loadMessages(), loadConversations()]);

      showToast("La proposition de calendrier a été envoyée.", "success");
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible d’envoyer la proposition.",
      );
    } finally {
      setSendingProposal(false);
    }
  }

  async function respondToProposal(
    proposalId: string,
    response: "accepted" | "rejected",
  ) {
    if (!activeClub) {
      return;
    }

    setRespondingProposalId(proposalId);

    try {
      await respondToCalendarProposal(proposalId, activeClub.id, response);

      await Promise.all([loadMessages(), loadConversations()]);

      showToast(
        response === "accepted"
          ? "La proposition a été acceptée et ajoutée aux deux calendriers."
          : "La proposition a été refusée.",
        response === "accepted" ? "success" : "info",
      );
    } catch (caughtError) {
      showToast(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de répondre à la proposition.",
        "error",
      );
    } finally {
      setRespondingProposalId(null);
    }
  }

  if (loading) {
    return <LoadingState label="Chargement de la messagerie…" />;
  }

  if (error) {
    return (
      <ErrorState message={error} onRetry={() => void loadInitialData()} />
    );
  }

  return (
    <div className="messaging-page">
      <PageHeader
        icon={MessagesSquare}
        title="Messagerie"
        description="Échangez avec les responsables des autres clubs CLM Asso."
      />

      <section
        className={[
          "messaging-layout",
          selectedConversationId ? "messaging-layout--conversation-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <aside className="messaging-conversations">
          <header className="messaging-conversations__header">
            <div>
              <strong>Conversations</strong>
              <span>
                {conversations.length} échange
                {conversations.length > 1 ? "s" : ""}
              </span>
            </div>

            <button
              type="button"
              onClick={openNewConversation}
              aria-label="Nouveau message"
            >
              <Plus size={18} />
            </button>
          </header>

          <label className="messaging-search">
            <Search size={17} />

            <input
              value={conversationSearch}
              onChange={(event) => setConversationSearch(event.target.value)}
              placeholder="Rechercher un club…"
            />
          </label>

          <div className="messaging-conversation-list">
            {filteredConversations.length === 0 ? (
              <div className="messaging-conversations-empty">
                <MessageCircle size={28} />

                <strong>Aucune conversation</strong>

                <span>Contactez un club pour démarrer un échange.</span>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <button
                  type="button"
                  key={conversation.conversation_id}
                  className={
                    conversation.conversation_id === selectedConversationId
                      ? "messaging-conversation messaging-conversation--active"
                      : "messaging-conversation"
                  }
                  onClick={() =>
                    selectConversation(conversation.conversation_id)
                  }
                >
                  <span className="messaging-club-avatar">
                    {getClubInitials(
                      conversation.other_club_name,
                      conversation.other_club_acronym,
                    )}
                  </span>

                  <span className="messaging-conversation__content">
                    <span className="messaging-conversation__top">
                      <strong>{conversation.other_club_name}</strong>

                      <time>
                        {formatConversationTime(conversation.last_message_at)}
                      </time>
                    </span>

                    <span className="messaging-conversation__bottom">
                      <span>
                        {conversation.last_message_body ||
                          "Nouvelle conversation"}
                      </span>

                      {conversation.unread_count > 0 && (
                        <strong className="messaging-unread-badge">
                          {conversation.unread_count > 9
                            ? "9+"
                            : conversation.unread_count}
                        </strong>
                      )}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <article className="messaging-thread">
          {!selectedConversation ? (
            <EmptyState
              icon={MessagesSquare}
              title="Sélectionnez une conversation"
              description="Choisissez un club dans la liste ou démarrez un nouveau message."
              actionLabel="Nouveau message"
              onAction={openNewConversation}
            />
          ) : (
            <>
              <header className="messaging-thread__header">
                <button
                  type="button"
                  className="messaging-mobile-back"
                  onClick={closeMobileConversation}
                  aria-label="Retour aux conversations"
                >
                  <ArrowLeft size={20} />
                </button>

                <span className="messaging-club-avatar">
                  {getClubInitials(
                    selectedConversation.other_club_name,
                    selectedConversation.other_club_acronym,
                  )}
                </span>

                <div className="messaging-thread__identity">
                  <strong>{selectedConversation.other_club_name}</strong>

                  <span>
                    {selectedConversation.other_club_city || "Club CLM Asso"}
                  </span>
                </div>

                <div className="messaging-thread__contact-actions">
                  <button
                    type="button"
                    className="messaging-thread__contact-button messaging-thread__contact-button--whatsapp"
                    onClick={openSelectedConversationWhatsApp}
                    disabled={!selectedConversationPhone}
                    aria-label={`Contacter ${selectedConversation.other_club_name} sur WhatsApp`}
                    title={
                      selectedConversationPhone
                        ? "Contacter sur WhatsApp"
                        : "Téléphone non renseigné"
                    }
                  >
                    <MessageCircle size={17} />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    className="messaging-thread__contact-button messaging-thread__contact-button--phone"
                    onClick={callSelectedConversationClub}
                    disabled={!selectedConversationPhone}
                    aria-label={`Appeler ${selectedConversation.other_club_name}`}
                    title={
                      selectedConversationPhone
                        ? `Appeler ${selectedConversationPhone}`
                        : "Téléphone non renseigné"
                    }
                  >
                    <PhoneCall size={17} />
                    <span>Appeler</span>
                  </button>
                </div>
              </header>

              <div className="messaging-message-list" ref={messageListRef}>
                {messagesLoading && messages.length === 0 ? (
                  <LoadingState label="Chargement des messages…" />
                ) : messages.length === 0 ? (
                  <div className="messaging-thread-empty">
                    <MessagesSquare size={36} />

                    <strong>Aucun message</strong>

                    <span>
                      Écrivez le premier message de cette conversation.
                    </span>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwnClub = message.sender_club_id === activeClub?.id;

                    const canManageOwnMessage =
                      message.sender_user_id === user?.id &&
                      !message.deleted_at;

                    const isProposalTarget =
                      message.proposal_target_club_id === activeClub?.id;

                    return (
                      <div
                        key={message.message_id}
                        className={[
                          "messaging-message-row",
                          isOwnClub ? "messaging-message-row--own" : "",
                          message.message_type === "system"
                            ? "messaging-message-row--system"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {message.message_type === "system" ? (
                          <div className="messaging-system-message">
                            {message.body}
                          </div>
                        ) : (
                          <article className="messaging-message">
                            <header>
                              <div>
                                <strong>{message.sender_club_name}</strong>

                                <span>{message.sender_display_name}</span>
                              </div>

                              {canManageOwnMessage && (
                                <div className="messaging-message__actions">
                                  {message.message_type === "text" && (
                                    <button
                                      type="button"
                                      onClick={() => openEditMessage(message)}
                                      aria-label="Modifier le message"
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeleteMessageError("");

                                      setMessageToDelete(message);
                                    }}
                                    aria-label="Supprimer le message"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </header>

                            {message.deleted_at ? (
                              <p className="messaging-message--deleted">
                                Ce message a été supprimé.
                              </p>
                            ) : message.message_type === "calendar_proposal" &&
                              message.proposal_id ? (
                              <div className="messaging-proposal-card">
                                <div className="messaging-proposal-card__heading">
                                  <span>
                                    <CalendarPlus size={18} />
                                  </span>

                                  <div>
                                    <small>Proposition de calendrier</small>

                                    <strong>{message.proposal_title}</strong>
                                  </div>
                                </div>

                                <div className="messaging-proposal-card__details">
                                  <span>
                                    <Clock3 size={14} />

                                    {message.proposal_starts_at
                                      ? formatProposalDate(
                                          message.proposal_starts_at,
                                        )
                                      : "Date non renseignée"}
                                  </span>

                                  {message.proposal_location && (
                                    <span>
                                      <MapPin size={14} />
                                      {message.proposal_location}
                                    </span>
                                  )}

                                  {message.proposal_description && (
                                    <p>{message.proposal_description}</p>
                                  )}
                                </div>

                                <div
                                  className={`messaging-proposal-status messaging-proposal-status--${message.proposal_status}`}
                                >
                                  {message.proposal_status === "pending" && (
                                    <>
                                      <Clock3 size={14} />
                                      En attente de réponse
                                    </>
                                  )}

                                  {message.proposal_status === "accepted" && (
                                    <>
                                      <CheckCircle2 size={14} />
                                      Acceptée et ajoutée aux deux calendriers
                                    </>
                                  )}

                                  {message.proposal_status === "rejected" && (
                                    <>
                                      <XCircle size={14} />
                                      Refusée
                                    </>
                                  )}

                                  {message.proposal_status === "cancelled" && (
                                    <>
                                      <XCircle size={14} />
                                      Annulée
                                    </>
                                  )}
                                </div>

                                {message.proposal_status === "pending" &&
                                  isProposalTarget && (
                                    <div className="messaging-proposal-actions">
                                      <button
                                        type="button"
                                        className="data-button data-button--secondary"
                                        disabled={
                                          respondingProposalId ===
                                          message.proposal_id
                                        }
                                        onClick={() =>
                                          void respondToProposal(
                                            message.proposal_id!,
                                            "rejected",
                                          )
                                        }
                                      >
                                        <X size={15} />
                                        Refuser
                                      </button>

                                      <button
                                        type="button"
                                        className="data-button"
                                        disabled={
                                          respondingProposalId ===
                                          message.proposal_id
                                        }
                                        onClick={() =>
                                          void respondToProposal(
                                            message.proposal_id!,
                                            "accepted",
                                          )
                                        }
                                      >
                                        <Check size={15} />
                                        Accepter
                                      </button>
                                    </div>
                                  )}

                                {message.proposal_status === "accepted" && (
                                  <Link
                                    to="/app/calendrier"
                                    className="messaging-calendar-link"
                                  >
                                    Ouvrir le calendrier
                                  </Link>
                                )}
                              </div>
                            ) : (
                              <p>{message.body}</p>
                            )}

                            <footer>
                              <time>
                                {formatMessageTime(message.created_at)}
                              </time>

                              {message.edited_at && <span>Modifié</span>}
                            </footer>
                          </article>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <form className="messaging-composer" onSubmit={handleSendMessage}>
                <div className="messaging-plus-wrapper">
                  <button
                    type="button"
                    className="messaging-plus-button"
                    onClick={() => setPlusMenuOpen((current) => !current)}
                    aria-label="Ajouter une action"
                    aria-expanded={plusMenuOpen}
                  >
                    <Plus size={20} />
                  </button>

                  {plusMenuOpen && (
                    <div className="messaging-plus-menu">
                      <button type="button" onClick={openProposalModal}>
                        <CalendarPlus size={18} />

                        <span>
                          <strong>Proposer un événement</strong>

                          <small>
                            À ajouter aux deux calendriers après acceptation
                          </small>
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                <textarea
                  value={messageBody}
                  onChange={(event) => setMessageBody(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();

                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder={`Écrire à ${selectedConversation.other_club_name}…`}
                  maxLength={5000}
                  disabled={sending}
                />

                <button
                  type="submit"
                  className="messaging-send-button"
                  disabled={sending || !messageBody.trim()}
                  aria-label="Envoyer le message"
                >
                  <Send size={18} />
                </button>
              </form>
            </>
          )}
        </article>
      </section>

      {newConversationOpen && (
        <Modal
          title="Nouveau message interclubs"
          onClose={() => {
            if (!creatingConversation) {
              setNewConversationOpen(false);
            }
          }}
        >
          <form className="data-form" onSubmit={handleCreateConversations}>
            <div className="messaging-recipient-toolbar">
              <label className="data-search">
                <Search size={17} />

                <input
                  value={clubSearch}
                  onChange={(event) => setClubSearch(event.target.value)}
                  placeholder="Rechercher un club…"
                />
              </label>

              <button
                type="button"
                className="data-button data-button--secondary"
                onClick={toggleAllClubs}
              >
                <UsersRound size={16} />

                {selectedTargetClubIds.length === clubs.length
                  ? "Tout désélectionner"
                  : "Tous les clubs"}
              </button>
            </div>

            <div className="messaging-recipient-summary">
              {selectedTargetClubIds.length} club
              {selectedTargetClubIds.length > 1 ? "s" : ""} sélectionné
              {selectedTargetClubIds.length > 1 ? "s" : ""}
            </div>

            <div className="messaging-contact-methods">
              <button
                type="button"
                className={
                  contactMode === "clm"
                    ? "messaging-contact-method messaging-contact-method--active"
                    : "messaging-contact-method"
                }
                onClick={() => {
                  setContactMode("clm");
                  setFormError("");
                }}
              >
                <MessagesSquare size={20} />

                <span>
                  <strong>CLM Asso</strong>
                  <small>Écrire directement dans la messagerie</small>
                </span>
              </button>

              <button
                type="button"
                className={
                  contactMode === "whatsapp"
                    ? "messaging-contact-method messaging-contact-method--active messaging-contact-method--whatsapp"
                    : "messaging-contact-method messaging-contact-method--whatsapp"
                }
                disabled={
                  selectedTargetClubIds.length !== 1 || !selectedTargetPhone
                }
                onClick={() => {
                  setContactMode("whatsapp");
                  setFormError("");
                }}
              >
                <MessageCircle size={20} />

                <span>
                  <strong>WhatsApp</strong>
                  <small>Ouvrir une discussion avec le club</small>
                </span>
              </button>

              <button
                type="button"
                className={
                  contactMode === "phone"
                    ? "messaging-contact-method messaging-contact-method--active"
                    : "messaging-contact-method"
                }
                disabled={
                  selectedTargetClubIds.length !== 1 || !selectedTargetPhone
                }
                onClick={() => {
                  setContactMode("phone");
                  setFormError("");
                }}
              >
                <PhoneCall size={20} />

                <span>
                  <strong>Appeler</strong>
                  <small>Ouvrir directement l’application téléphone</small>
                </span>
              </button>
            </div>

            {selectedTargetClubIds.length === 1 && !selectedTargetPhone && (
              <p className="messaging-contact-warning">
                Ce club n’a pas encore renseigné de numéro de téléphone. Le
                contact via CLM Asso reste disponible.
              </p>
            )}

            {selectedTargetClubIds.length > 1 && (
              <p className="messaging-contact-warning">
                WhatsApp et l’appel sont disponibles pour un seul club à la
                fois. L’envoi groupé reste possible via CLM Asso.
              </p>
            )}

            <div className="messaging-club-picker">
              {filteredClubs.length === 0 ? (
                <p>Aucun club ne correspond à cette recherche.</p>
              ) : (
                filteredClubs.map((club) => {
                  const selected = selectedTargetClubIds.includes(club.id);

                  return (
                    <button
                      type="button"
                      key={club.id}
                      className={
                        selected
                          ? "messaging-club-option messaging-club-option--selected"
                          : "messaging-club-option"
                      }
                      onClick={() => toggleTargetClub(club.id)}
                    >
                      <span className="messaging-club-avatar">
                        {getClubInitials(club.name, club.acronym)}
                      </span>

                      <span>
                        <strong>{club.name}</strong>

                        <small>{club.city || "Club CLM Asso"}</small>

                        <small>
                          {club.contact_phone || "Téléphone non renseigné"}
                        </small>
                      </span>

                      <i>{selected && <Check size={15} />}</i>
                    </button>
                  );
                })
              )}
            </div>

            {contactMode !== "phone" && (
              <label className="data-field">
                {contactMode === "whatsapp" ? "Message WhatsApp" : "Message"}
                <textarea
                  value={initialMessage}
                  onChange={(event) => setInitialMessage(event.target.value)}
                  placeholder={
                    contactMode === "whatsapp"
                      ? `Bonjour, je vous contacte au nom de ${activeClub?.name ?? "mon club"} depuis CLM Asso.`
                      : "Écrivez votre message…"
                  }
                  maxLength={5000}
                  required={contactMode === "clm"}
                />
              </label>
            )}

            {contactMode === "whatsapp" && (
              <p className="data-form__help">
                WhatsApp s’ouvrira avec ce texte préparé. Vous pourrez encore le
                modifier avant de l’envoyer.
              </p>
            )}

            {contactMode === "phone" && selectedTargetClub && (
              <p className="messaging-phone-summary">
                <PhoneCall size={17} />
                Appeler {selectedTargetClub.name}
                {selectedTargetPhone ? ` au ${selectedTargetPhone}` : ""}
              </p>
            )}

            {contactMode === "clm" && selectedTargetClubIds.length > 1 && (
              <p className="data-form__help">
                Chaque club recevra ce message dans une conversation privée
                distincte. Les clubs ne verront pas les autres destinataires.
              </p>
            )}

            {formError && <div className="data-form__error">{formError}</div>}

            <div className="data-form__actions">
              <button
                type="button"
                className="data-button data-button--secondary"
                onClick={() => setNewConversationOpen(false)}
                disabled={creatingConversation}
              >
                Annuler
              </button>

              <button
                type="submit"
                className={
                  contactMode === "whatsapp"
                    ? "data-button messaging-external-submit messaging-external-submit--whatsapp"
                    : "data-button messaging-external-submit"
                }
                disabled={
                  creatingConversation ||
                  selectedTargetClubIds.length === 0 ||
                  (contactMode === "clm" && !initialMessage.trim()) ||
                  (contactMode !== "clm" &&
                    (selectedTargetClubIds.length !== 1 ||
                      !selectedTargetPhone))
                }
              >
                {contactMode === "phone" ? (
                  <PhoneCall size={16} />
                ) : contactMode === "whatsapp" ? (
                  <MessageCircle size={16} />
                ) : (
                  <Send size={16} />
                )}

                {creatingConversation
                  ? "Ouverture…"
                  : contactMode === "phone"
                    ? "Appeler le club"
                    : contactMode === "whatsapp"
                      ? "Ouvrir WhatsApp"
                      : selectedTargetClubIds.length > 1
                        ? `Envoyer à ${selectedTargetClubIds.length} clubs`
                        : "Envoyer le message"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {messageToEdit && (
        <Modal
          title="Modifier le message"
          onClose={() => {
            if (!editingMessage) {
              setMessageToEdit(null);
            }
          }}
        >
          <form className="data-form" onSubmit={handleEditMessage}>
            <label className="data-field">
              Message
              <textarea
                value={editedBody}
                onChange={(event) => setEditedBody(event.target.value)}
                maxLength={5000}
                required
              />
            </label>

            {formError && <div className="data-form__error">{formError}</div>}

            <div className="data-form__actions">
              <button
                type="button"
                className="data-button data-button--secondary"
                onClick={() => setMessageToEdit(null)}
                disabled={editingMessage}
              >
                Annuler
              </button>

              <button
                type="submit"
                className="data-button"
                disabled={editingMessage || !editedBody.trim()}
              >
                {editingMessage ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {proposalModalOpen && (
        <Modal
          title="Proposer un événement"
          onClose={() => {
            if (!sendingProposal) {
              setProposalModalOpen(false);
            }
          }}
        >
          <form className="data-form" onSubmit={handleSendProposal}>
            <div className="data-form-grid">
              <label className="data-field data-field--full">
                Titre
                <input
                  value={proposalDraft.title}
                  onChange={(event) =>
                    setProposalDraft({
                      ...proposalDraft,
                      title: event.target.value,
                    })
                  }
                  placeholder="Match amical, réunion…"
                  required
                />
              </label>

              <label className="data-field">
                Date
                <input
                  type="date"
                  value={proposalDraft.date}
                  onChange={(event) =>
                    setProposalDraft({
                      ...proposalDraft,
                      date: event.target.value,
                    })
                  }
                  required
                />
              </label>

              <label className="data-field">
                Heure de début
                <input
                  type="time"
                  value={proposalDraft.startTime}
                  onChange={(event) =>
                    setProposalDraft({
                      ...proposalDraft,
                      startTime: event.target.value,
                    })
                  }
                  required
                />
              </label>

              <label className="data-field">
                Heure de fin
                <input
                  type="time"
                  value={proposalDraft.endTime}
                  onChange={(event) =>
                    setProposalDraft({
                      ...proposalDraft,
                      endTime: event.target.value,
                    })
                  }
                />
              </label>

              <label className="data-field">
                Lieu
                <input
                  value={proposalDraft.location}
                  onChange={(event) =>
                    setProposalDraft({
                      ...proposalDraft,
                      location: event.target.value,
                    })
                  }
                />
              </label>

              <label className="data-field data-field--full">
                Description
                <textarea
                  value={proposalDraft.description}
                  onChange={(event) =>
                    setProposalDraft({
                      ...proposalDraft,
                      description: event.target.value,
                    })
                  }
                />
              </label>
            </div>

            <p className="data-form__help">
              L’événement sera ajouté aux deux calendriers uniquement si le club
              destinataire l’accepte.
            </p>

            {formError && <div className="data-form__error">{formError}</div>}

            <div className="data-form__actions">
              <button
                type="button"
                className="data-button data-button--secondary"
                onClick={() => setProposalModalOpen(false)}
                disabled={sendingProposal}
              >
                Annuler
              </button>

              <button
                type="submit"
                className="data-button"
                disabled={sendingProposal}
              >
                <CalendarPlus size={16} />

                {sendingProposal ? "Envoi…" : "Envoyer la proposition"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {messageToDelete && (
        <ConfirmDialog
          title="Supprimer ce message ?"
          description={
            messageToDelete.message_type === "calendar_proposal"
              ? "Le message sera supprimé et la proposition en attente sera annulée."
              : "Le contenu sera remplacé par « Ce message a été supprimé »."
          }
          confirmLabel="Supprimer le message"
          loading={deletingMessage}
          error={deleteMessageError}
          icon={Trash2}
          onCancel={() => {
            if (!deletingMessage) {
              setMessageToDelete(null);
              setDeleteMessageError("");
            }
          }}
          onConfirm={() => void confirmDeleteMessage()}
        />
      )}
    </div>
  );
}

export default MessagingPage;
