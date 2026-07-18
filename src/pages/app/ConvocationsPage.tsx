import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  Lock,
  MailCheck,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";

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
import { usePermissions } from "../../hooks/usePermissions";
import { useToast } from "../../hooks/useToast";
import {
  createConvocation,
  deleteConvocation,
  listConvocations,
  listMatches,
  listTeamMembers,
  listTeams,
  updateConvocation,
  updateConvocationResponse,
  updateConvocationStatus,
} from "../../services/clmAssoService";
import type {
  ClubMatch,
  Convocation,
  ConvocationResponse,
  ConvocationStatus,
  Team,
  TeamMember,
} from "../../types/database";
import "../../styles/data-pages.css";

interface Draft {
  title: string;
  message: string;
  team_id: string;
  match_id: string;
  response_deadline: string;
  status: ConvocationStatus;
}

const emptyDraft: Draft = {
  title: "",
  message: "",
  team_id: "",
  match_id: "",
  response_deadline: "",
  status: "sent",
};

const responseLabels: Record<ConvocationResponse, string> = {
  pending: "En attente",
  present: "Présent",
  absent: "Absent",
  maybe: "Incertain",
};

const statusLabels: Record<ConvocationStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  closed: "Clôturée",
};

function formatDate(value: string | null) {
  if (!value) return "Aucune échéance";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function ConvocationsPage() {
  const { user } = useAuth();
  const { activeClub } = useClub();
  const { canManageConvocations } = usePermissions();
  const { showToast } = useToast();

  const [convocations, setConvocations] = useState<Convocation[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<ClubMatch[]>([]);
  const [teamRoster, setTeamRoster] = useState<TeamMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editing, setEditing] = useState<Convocation | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [convocationToDelete, setConvocationToDelete] =
    useState<Convocation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [responseComments, setResponseComments] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!activeClub) return;
    setLoading(true);
    setError("");

    try {
      const [nextConvocations, nextTeams, nextMatches] = await Promise.all([
        listConvocations(activeClub.id),
        listTeams(activeClub.id),
        listMatches(activeClub.id),
      ]);
      setConvocations(nextConvocations);
      setTeams(nextTeams);
      setMatches(nextMatches);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de charger les convocations.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeClub]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    async function loadRoster() {
      if (!draft.team_id) {
        setTeamRoster([]);
        if (!editing) setSelectedMemberIds([]);
        return;
      }

      try {
        const roster = await listTeamMembers(draft.team_id);
        setTeamRoster(roster);
        if (!editing) {
          setSelectedMemberIds(
            roster
              .filter((link) => link.team_role === "player")
              .map((link) => link.member_id),
          );
        }
      } catch (caughtError) {
        setFormError(
          caughtError instanceof Error
            ? caughtError.message
            : "Impossible de charger l’effectif.",
        );
      }
    }

    void loadRoster();
  }, [draft.team_id, editing]);

  const visibleConvocations = useMemo(() => {
    if (canManageConvocations) return convocations;
    return convocations.filter((convocation) =>
      convocation.recipients?.some(
        (recipient) => recipient.member?.user_id === user?.id,
      ),
    );
  }, [canManageConvocations, convocations, user?.id]);

  const stats = useMemo(() => {
    const recipients = visibleConvocations.flatMap(
      (convocation) => convocation.recipients ?? [],
    );
    return {
      total: visibleConvocations.length,
      sent: visibleConvocations.filter((item) => item.status === "sent").length,
      present: recipients.filter((item) => item.response === "present").length,
      pending: recipients.filter((item) => item.response === "pending").length,
    };
  }, [visibleConvocations]);

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft);
    setTeamRoster([]);
    setSelectedMemberIds([]);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(convocation: Convocation) {
    setEditing(convocation);
    setDraft({
      title: convocation.title,
      message: convocation.message ?? "",
      team_id: convocation.team_id ?? "",
      match_id: convocation.match_id ?? "",
      response_deadline: toDateTimeLocal(convocation.response_deadline),
      status: convocation.status,
    });
    setSelectedMemberIds(
      (convocation.recipients ?? []).map((recipient) => recipient.member_id),
    );
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeClub || !user || !canManageConvocations) return;
    setSubmitting(true);
    setFormError("");

    const payload = {
      title: draft.title.trim(),
      message: draft.message.trim() || null,
      team_id: draft.team_id || null,
      match_id: draft.match_id || null,
      response_deadline: draft.response_deadline
        ? new Date(draft.response_deadline).toISOString()
        : null,
      status: draft.status,
    };

    try {
      if (editing) {
        await updateConvocation(editing.id, payload, selectedMemberIds);
      } else {
        await createConvocation(
          activeClub.id,
          user.id,
          payload,
          selectedMemberIds,
        );
      }
      setModalOpen(false);
      showToast(
        editing ? "La convocation a été mise à jour." : "La convocation a été créée.",
        "success",
      );
      await load();
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible d’enregistrer la convocation.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResponse(
    recipientId: string,
    response: ConvocationResponse,
  ) {
    try {
      await updateConvocationResponse(
        recipientId,
        response,
        responseComments[recipientId] ?? null,
      );
      showToast("Votre réponse a été enregistrée.", "success");
      await load();
    } catch (caughtError) {
      showToast(
        caughtError instanceof Error ? caughtError.message : "Mise à jour impossible.",
        "error",
      );
    }
  }

  async function changeStatus(
    convocation: Convocation,
    status: ConvocationStatus,
  ) {
    try {
      await updateConvocationStatus(convocation.id, status);
      showToast(`La convocation est maintenant « ${statusLabels[status]} » .`, "success");
      await load();
    } catch (caughtError) {
      showToast(
        caughtError instanceof Error ? caughtError.message : "Mise à jour impossible.",
        "error",
      );
    }
  }

  async function confirmDelete() {
    if (!convocationToDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteConvocation(convocationToDelete.id);
      setConvocationToDelete(null);
      showToast("La convocation a été supprimée.", "success");
      await load();
    } catch (caughtError) {
      setDeleteError(
        caughtError instanceof Error ? caughtError.message : "Suppression impossible.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="data-page">
      <PageHeader
        icon={ClipboardCheck}
        title="Convocations"
        description={
          canManageConvocations
            ? "Envoyez les convocations et suivez les réponses des membres."
            : "Consultez vos convocations et répondez directement."
        }
        actionLabel={canManageConvocations ? "Nouvelle convocation" : undefined}
        onAction={canManageConvocations ? openCreate : undefined}
      />

      <section className="data-stats">
        <div className="data-stat"><span>Total</span><strong>{stats.total}</strong></div>
        <div className="data-stat"><span>Envoyées</span><strong>{stats.sent}</strong></div>
        <div className="data-stat"><span>Présences</span><strong>{stats.present}</strong></div>
        <div className="data-stat"><span>En attente</span><strong>{stats.pending}</strong></div>
      </section>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : visibleConvocations.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Aucune convocation"
          description={
            canManageConvocations
              ? "Créez une convocation à partir d’une équipe ou d’un match."
              : "Vous n’avez aucune convocation pour le moment."
          }
          actionLabel={canManageConvocations ? "Créer une convocation" : undefined}
          onAction={canManageConvocations ? openCreate : undefined}
        />
      ) : (
        <section className="data-list">
          {visibleConvocations.map((convocation) => {
            const recipients = convocation.recipients ?? [];
            const ownRecipient = recipients.find(
              (recipient) => recipient.member?.user_id === user?.id,
            );

            return (
              <article className="data-card" key={convocation.id}>
                <div className="data-card__header">
                  <div>
                    <h2>{convocation.title}</h2>
                    <p>
                      {convocation.team?.name ?? "Tout le club"}
                      {convocation.match
                        ? ` · Match contre ${convocation.match.opponent_name}`
                        : ""}
                    </p>
                  </div>

                  <div className="data-card__actions">
                    <span className={`data-badge ${
                      convocation.status === "sent"
                        ? "data-badge--green"
                        : convocation.status === "closed"
                          ? "data-badge--grey"
                          : "data-badge--orange"
                    }`}>
                      {statusLabels[convocation.status]}
                    </span>

                    {canManageConvocations && (
                      <>
                        <button type="button" className="data-button data-button--ghost" onClick={() => openEdit(convocation)} aria-label="Modifier">
                          <Edit3 size={16} />
                        </button>
                        <button type="button" className="data-button data-button--ghost" onClick={() => setConvocationToDelete(convocation)} aria-label="Supprimer">
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {convocation.message && <p className="data-card__description">{convocation.message}</p>}
                <div className="data-card__row"><strong>Réponse avant :</strong> {formatDate(convocation.response_deadline)}</div>

                {!canManageConvocations && ownRecipient && (
                  <section className="convocation-self-response">
                    <div>
                      <strong>Ma réponse</strong>
                      <span>{responseLabels[ownRecipient.response]}</span>
                    </div>
                    <input
                      value={responseComments[ownRecipient.id] ?? ownRecipient.comment ?? ""}
                      onChange={(event) => setResponseComments((current) => ({ ...current, [ownRecipient.id]: event.target.value }))}
                      placeholder="Commentaire facultatif"
                      disabled={convocation.status === "closed"}
                    />
                    <div className="convocation-self-response__actions">
                      <button type="button" className="data-button data-button--success" disabled={convocation.status === "closed"} onClick={() => void handleResponse(ownRecipient.id, "present")}><CheckCircle2 size={15} />Présent</button>
                      <button type="button" className="data-button data-button--secondary" disabled={convocation.status === "closed"} onClick={() => void handleResponse(ownRecipient.id, "maybe")}><RefreshCw size={15} />Incertain</button>
                      <button type="button" className="data-button data-button--danger" disabled={convocation.status === "closed"} onClick={() => void handleResponse(ownRecipient.id, "absent")}><XCircle size={15} />Absent</button>
                    </div>
                  </section>
                )}

                {canManageConvocations && (
                  <>
                    <div className="convocation-management-actions">
                      {convocation.status === "draft" && <button type="button" className="data-button" onClick={() => void changeStatus(convocation, "sent")}><Send size={15} />Envoyer</button>}
                      {convocation.status === "sent" && <button type="button" className="data-button data-button--secondary" onClick={() => void changeStatus(convocation, "closed")}><Lock size={15} />Clôturer</button>}
                      {convocation.status === "closed" && <button type="button" className="data-button data-button--secondary" onClick={() => void changeStatus(convocation, "sent")}><MailCheck size={15} />Rouvrir</button>}
                    </div>

                    {recipients.length === 0 ? (
                      <div className="data-state data-state--compact"><p>Aucun destinataire.</p></div>
                    ) : (
                      <div className="data-table-wrap">
                        <table className="data-table">
                          <thead><tr><th>Membre</th><th>Réponse</th><th>Commentaire</th><th>Dernière réponse</th></tr></thead>
                          <tbody>
                            {recipients.map((recipient) => (
                              <tr key={recipient.id}>
                                <td><strong>{recipient.member?.first_name} {recipient.member?.last_name}</strong></td>
                                <td>
                                  <select value={recipient.response} onChange={(event) => void handleResponse(recipient.id, event.target.value as ConvocationResponse)} disabled={convocation.status === "closed"}>
                                    {Object.entries(responseLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                  </select>
                                </td>
                                <td>{recipient.comment || "—"}</td>
                                <td>{recipient.responded_at ? formatDate(recipient.responded_at) : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </section>
      )}

      {modalOpen && (
        <Modal title={editing ? "Modifier la convocation" : "Nouvelle convocation"} onClose={() => !submitting && setModalOpen(false)}>
          <form className="data-form" onSubmit={handleSubmit}>
            <div className="data-form-grid">
              <label className="data-field data-field--full">Titre<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required /></label>
              <label className="data-field">Équipe<select value={draft.team_id} onChange={(event) => setDraft({ ...draft, team_id: event.target.value })}><option value="">Aucune équipe</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
              <label className="data-field">Match<select value={draft.match_id} onChange={(event) => setDraft({ ...draft, match_id: event.target.value })}><option value="">Aucun match</option>{matches.map((match) => <option key={match.id} value={match.id}>{match.team?.name ?? "Club"} — {match.opponent_name}</option>)}</select></label>
              <label className="data-field">Date limite<input type="datetime-local" value={draft.response_deadline} onChange={(event) => setDraft({ ...draft, response_deadline: event.target.value })} /></label>
              <label className="data-field">Statut<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ConvocationStatus })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="data-field data-field--full">Message<textarea value={draft.message} onChange={(event) => setDraft({ ...draft, message: event.target.value })} /></label>

              <div className="data-field data-field--full">
                <span>Destinataires</span>
                {teamRoster.length === 0 ? (
                  <p>Sélectionnez une équipe pour charger son effectif.</p>
                ) : (
                  <div className="data-check-list">
                    {teamRoster.map((link) => (
                      <label key={link.member_id}>
                        <input
                          type="checkbox"
                          checked={selectedMemberIds.includes(link.member_id)}
                          onChange={(event) =>
                            setSelectedMemberIds((current) =>
                              event.target.checked
                                ? [...current, link.member_id]
                                : current.filter((id) => id !== link.member_id),
                            )
                          }
                        />
                        {link.member?.first_name} {link.member?.last_name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {formError && <div className="data-form__error">{formError}</div>}
            <div className="data-form__actions">
              <button type="button" className="data-button data-button--secondary" onClick={() => setModalOpen(false)} disabled={submitting}>Annuler</button>
              <button type="submit" className="data-button" disabled={submitting}>{submitting ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          </form>
        </Modal>
      )}

      {convocationToDelete && (
        <ConfirmDialog
          title="Supprimer cette convocation ?"
          description={`La convocation « ${convocationToDelete.title} » et toutes ses réponses seront supprimées.`}
          confirmLabel="Supprimer la convocation"
          loading={deleting}
          error={deleteError}
          icon={Trash2}
          onCancel={() => !deleting && setConvocationToDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </div>
  );
}

export default ConvocationsPage;
