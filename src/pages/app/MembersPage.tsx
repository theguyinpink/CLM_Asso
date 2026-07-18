import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  ClipboardCopy,
  Edit3,
  MailPlus,
  Plus,
  Search,
  Trash2,
  UsersRound,
} from "lucide-react";

import ConfirmDialog from "../../components/app/shared/ConfirmDialog";
import Modal from "../../components/app/shared/Modal";
import PageHeader from "../../components/app/shared/PageHeader";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/app/shared/PageState";
import { useClub } from "../../hooks/useClub";
import { usePermissions } from "../../hooks/usePermissions";
import { removeClubMember } from "../../services/memberAdminService";
import { useToast } from "../../hooks/useToast";
import {
  cancelInvitation,
  createMember,
  deleteMember,
  listInvitations,
  listMembers,
  sendClubInvitation,
  setMemberAccessStatus,
  setMemberRole,
  updateMember,
} from "../../services/clmAssoService";
import type { ClubRole } from "../../types/club";
import type {
  ClubInvitation,
  ClubMember,
  InvitationDeliveryResult,
} from "../../types/database";
import "../../styles/data-pages.css";

interface MemberDraft {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role_label: string;
  membership_role: ClubRole;
  status: ClubMember["status"];
  birth_date: string;
  license_number: string;
  notes: string;
}

interface InviteDraft {
  firstName: string;
  lastName: string;
  email: string;
  role: Exclude<ClubRole, "owner">;
}

const emptyMemberDraft: MemberDraft = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  role_label: "Membre",
  membership_role: "member",
  status: "active",
  birth_date: "",
  license_number: "",
  notes: "",
};

const emptyInviteDraft: InviteDraft = {
  firstName: "",
  lastName: "",
  email: "",
  role: "member",
};

const statusLabels: Record<ClubMember["status"], string> = {
  active: "Actif",
  inactive: "Inactif",
  pending: "En attente",
};

const roleLabels: Record<ClubRole, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  manager: "Responsable",
  coach: "Entraîneur",
  member: "Membre",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function MembersPage() {
  const { activeClub } = useClub();
  const { canManageMembers, canManageRoles, canRemoveMembers } =
    usePermissions();
  const { showToast } = useToast();

  const [members, setMembers] = useState<ClubMember[]>([]);
  const [invitations, setInvitations] = useState<ClubInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClubMember | null>(null);
  const [memberDraft, setMemberDraft] = useState<MemberDraft>(emptyMemberDraft);
  const [inviteDraft, setInviteDraft] = useState<InviteDraft>(emptyInviteDraft);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deliveryResult, setDeliveryResult] =
    useState<InvitationDeliveryResult | null>(null);

  const [memberToDelete, setMemberToDelete] = useState<ClubMember | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<ClubMember | null>(null);
  const [invitationToCancel, setInvitationToCancel] =
    useState<ClubInvitation | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  const load = useCallback(async () => {
    if (!activeClub) return;
    setLoading(true);
    setError("");

    try {
      const [nextMembers, nextInvitations] = await Promise.all([
        listMembers(activeClub.id),
        canManageRoles ? listInvitations(activeClub.id) : Promise.resolve([]),
      ]);
      setMembers(nextMembers);
      setInvitations(nextInvitations);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de charger les membres.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeClub, canManageRoles]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return members.filter(
      (member) =>
        (statusFilter === "all" || member.status === statusFilter) &&
        (!query ||
          `${member.first_name} ${member.last_name}`
            .toLowerCase()
            .includes(query) ||
          (member.email ?? "").toLowerCase().includes(query) ||
          member.role_label.toLowerCase().includes(query)),
    );
  }, [members, search, statusFilter]);

  const pendingInvitations = invitations.filter(
    (invitation) => invitation.status === "pending",
  );

  function openCreateMember() {
    setEditing(null);
    setMemberDraft(emptyMemberDraft);
    setFormError("");
    setMemberModalOpen(true);
  }

  function openEdit(member: ClubMember) {
    setEditing(member);
    setMemberDraft({
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email ?? "",
      phone: member.phone ?? "",
      role_label: member.role_label,
      membership_role: member.membership_role ?? "member",
      status: member.status,
      birth_date: member.birth_date ?? "",
      license_number: member.license_number ?? "",
      notes: member.notes ?? "",
    });
    setFormError("");
    setMemberModalOpen(true);
  }

  function openInvite() {
    setInviteDraft(emptyInviteDraft);
    setDeliveryResult(null);
    setFormError("");
    setInviteModalOpen(true);
  }

  async function handleMemberSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeClub || !canManageMembers) return;

    setSubmitting(true);
    setFormError("");

    const payload = {
      first_name: memberDraft.first_name.trim(),
      last_name: memberDraft.last_name.trim(),
      email: memberDraft.email.trim() || null,
      phone: memberDraft.phone.trim() || null,
      role_label: memberDraft.role_label.trim() || "Membre",
      status: editing?.user_id ? editing.status : memberDraft.status,
      birth_date: memberDraft.birth_date || null,
      license_number: memberDraft.license_number.trim() || null,
      notes: memberDraft.notes.trim() || null,
    };

    try {
      if (editing) {
        await updateMember(editing.id, payload);

        if (
          editing.user_id &&
          canManageRoles &&
          editing.membership_role !== memberDraft.membership_role
        ) {
          await setMemberRole(
            activeClub.id,
            editing.user_id,
            memberDraft.membership_role,
          );
        }

        if (
          editing.user_id &&
          canManageRoles &&
          editing.status !== memberDraft.status
        ) {
          await setMemberAccessStatus(
            activeClub.id,
            editing.user_id,
            memberDraft.status === "active",
          );
        }
      } else {
        await createMember(activeClub.id, payload);
      }

      setMemberModalOpen(false);
      showToast(
        editing
          ? "Le membre a été mis à jour."
          : "La fiche membre a été créée.",
        "success",
      );
      await load();
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible d’enregistrer le membre.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeClub || !canManageRoles) return;

    setSubmitting(true);
    setFormError("");
    setDeliveryResult(null);

    try {
      const result = await sendClubInvitation({
        clubId: activeClub.id,
        email: inviteDraft.email.trim(),
        firstName: inviteDraft.firstName.trim(),
        lastName: inviteDraft.lastName.trim(),
        role: inviteDraft.role,
      });

      setDeliveryResult(result);
      showToast(
        result.emailSent
          ? "L’invitation a été envoyée par e-mail."
          : "L’invitation est créée. Copiez le lien pour l’envoyer.",
        "success",
      );
      await load();
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible d’envoyer l’invitation.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function copyInvitationLink(link: string) {
    await navigator.clipboard.writeText(link);
    showToast("Le lien d’invitation a été copié.", "success");
  }

  async function confirmMemberDeletion() {
    if (!memberToDelete) return;
    setConfirming(true);
    setConfirmError("");

    try {
      await deleteMember(memberToDelete.id);
      setMemberToDelete(null);
      showToast("La fiche membre a été supprimée.", "success");
      await load();
    } catch (caughtError) {
      setConfirmError(
        caughtError instanceof Error
          ? caughtError.message
          : "Suppression impossible.",
      );
    } finally {
      setConfirming(false);
    }
  }

  async function confirmMemberRemoval() {
    if (!activeClub || !memberToRemove?.user_id || !canRemoveMembers) {
      return;
    }

    setConfirming(true);
    setConfirmError("");

    try {
      await removeClubMember(activeClub.id, memberToRemove.user_id);

      setMemberToRemove(null);
      showToast("Le membre a été retiré du club.", "success");
      await load();
    } catch (caughtError) {
      setConfirmError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de retirer ce membre du club.",
      );
    } finally {
      setConfirming(false);
    }
  }

  async function confirmInvitationCancellation() {
    if (!invitationToCancel) return;
    setConfirming(true);
    setConfirmError("");

    try {
      await cancelInvitation(invitationToCancel.id);
      setInvitationToCancel(null);
      showToast("L’invitation a été annulée.", "success");
      await load();
    } catch (caughtError) {
      setConfirmError(
        caughtError instanceof Error
          ? caughtError.message
          : "Annulation impossible.",
      );
    } finally {
      setConfirming(false);
    }
  }

  const stats = {
    total: members.length,
    active: members.filter((member) => member.status === "active").length,
    pending: pendingInvitations.length,
    accounts: members.filter((member) => member.user_id).length,
  };

  return (
    <div className="data-page">
      <PageHeader
        icon={UsersRound}
        title="Membres"
        description="Gérez l’annuaire, les accès Maison CLM et les rôles du club."
        actionLabel={canManageRoles ? "Inviter un membre" : undefined}
        onAction={canManageRoles ? openInvite : undefined}
      />

      <section className="data-stats">
        <div className="data-stat">
          <span>Total</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="data-stat">
          <span>Actifs</span>
          <strong>{stats.active}</strong>
        </div>
        <div className="data-stat">
          <span>Invitations</span>
          <strong>{stats.pending}</strong>
        </div>
        <div className="data-stat">
          <span>Comptes liés</span>
          <strong>{stats.accounts}</strong>
        </div>
      </section>

      <div className="data-toolbar">
        <label className="data-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un membre…"
          />
        </label>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">Tous les statuts</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {canManageMembers && (
          <button
            type="button"
            className="data-button data-button--secondary"
            onClick={openCreateMember}
          >
            <Plus size={16} /> Ajouter une fiche
          </button>
        )}
      </div>

      {canManageRoles && pendingInvitations.length > 0 && (
        <section className="data-card">
          <div className="data-card__header">
            <div>
              <h2>Invitations en attente</h2>
              <p>
                Les destinataires doivent se connecter avec l’adresse invitée.
              </p>
            </div>
            <MailPlus size={21} />
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Adresse</th>
                  <th>Rôle</th>
                  <th>Expiration</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pendingInvitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td>
                      <strong>{invitation.email}</strong>
                      <br />
                      <small>
                        {[invitation.first_name, invitation.last_name]
                          .filter(Boolean)
                          .join(" ")}
                      </small>
                    </td>
                    <td>{roleLabels[invitation.role]}</td>
                    <td>{formatDate(invitation.expires_at)}</td>
                    <td>
                      <button
                        type="button"
                        className="data-button data-button--ghost"
                        onClick={() => setInvitationToCancel(invitation)}
                        aria-label="Annuler l’invitation"
                      >
                        <Ban size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Aucun membre"
          description="Ajoutez une fiche ou invitez un utilisateur Maison CLM."
          actionLabel={canManageMembers ? "Ajouter une fiche" : undefined}
          onAction={canManageMembers ? openCreateMember : undefined}
        />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Contact</th>
                <th>Fonction / rôle</th>
                <th>Statut</th>
                <th>Licence</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <tr key={member.id}>
                  <td>
                    <strong>
                      {member.first_name} {member.last_name}
                    </strong>
                    {member.user_id && (
                      <>
                        <br />
                        <small>Compte Maison CLM lié</small>
                      </>
                    )}
                  </td>
                  <td>
                    {member.email || "—"}
                    <br />
                    <small>{member.phone || ""}</small>
                  </td>
                  <td>
                    {member.membership_role
                      ? roleLabels[member.membership_role]
                      : member.role_label}
                  </td>
                  <td>
                    <span
                      className={`data-badge ${
                        member.status === "active"
                          ? "data-badge--green"
                          : member.status === "inactive"
                            ? "data-badge--grey"
                            : "data-badge--orange"
                      }`}
                    >
                      {statusLabels[member.status]}
                    </span>
                  </td>
                  <td>{member.license_number || "—"}</td>
                  <td>
                    {(canManageMembers || canRemoveMembers) && (
                      <div className="data-table__actions">
                        {canManageMembers && (
                          <button
                            type="button"
                            className="data-button data-button--ghost"
                            onClick={() => openEdit(member)}
                            aria-label="Modifier"
                            title="Modifier"
                          >
                            <Edit3 size={16} />
                          </button>
                        )}

                        {canManageMembers && !member.user_id && (
                          <button
                            type="button"
                            className="data-button data-button--ghost"
                            onClick={() => setMemberToDelete(member)}
                            aria-label="Supprimer la fiche"
                            title="Supprimer la fiche"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}

                        {canRemoveMembers &&
                          member.user_id &&
                          member.membership_role !== "owner" && (
                            <button
                              type="button"
                              className="data-button data-button--ghost"
                              onClick={() => setMemberToRemove(member)}
                              aria-label="Retirer du club"
                              title="Retirer du club"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {memberModalOpen && (
        <Modal
          title={editing ? "Modifier le membre" : "Nouvelle fiche membre"}
          onClose={() => !submitting && setMemberModalOpen(false)}
        >
          <form className="data-form" onSubmit={handleMemberSubmit}>
            <div className="data-form-grid">
              <label className="data-field">
                Prénom
                <input
                  value={memberDraft.first_name}
                  onChange={(event) =>
                    setMemberDraft({
                      ...memberDraft,
                      first_name: event.target.value,
                    })
                  }
                  required
                />
              </label>
              <label className="data-field">
                Nom
                <input
                  value={memberDraft.last_name}
                  onChange={(event) =>
                    setMemberDraft({
                      ...memberDraft,
                      last_name: event.target.value,
                    })
                  }
                  required
                />
              </label>
              <label className="data-field">
                E-mail
                <input
                  type="email"
                  value={memberDraft.email}
                  onChange={(event) =>
                    setMemberDraft({
                      ...memberDraft,
                      email: event.target.value,
                    })
                  }
                />
              </label>
              <label className="data-field">
                Téléphone
                <input
                  value={memberDraft.phone}
                  onChange={(event) =>
                    setMemberDraft({
                      ...memberDraft,
                      phone: event.target.value,
                    })
                  }
                />
              </label>

              {editing?.user_id && canManageRoles ? (
                <label className="data-field">
                  Rôle d’accès
                  <select
                    value={memberDraft.membership_role}
                    onChange={(event) =>
                      setMemberDraft({
                        ...memberDraft,
                        membership_role: event.target.value as ClubRole,
                      })
                    }
                    disabled={editing.membership_role === "owner"}
                  >
                    {editing.membership_role === "owner" && (
                      <option value="owner">Propriétaire</option>
                    )}
                    <option value="admin">Administrateur</option>
                    <option value="manager">Responsable</option>
                    <option value="coach">Entraîneur</option>
                    <option value="member">Membre</option>
                  </select>
                </label>
              ) : (
                <label className="data-field">
                  Fonction dans l’annuaire
                  <input
                    value={memberDraft.role_label}
                    onChange={(event) =>
                      setMemberDraft({
                        ...memberDraft,
                        role_label: event.target.value,
                      })
                    }
                    required
                  />
                </label>
              )}

              <label className="data-field">
                Statut
                <select
                  value={memberDraft.status}
                  onChange={(event) =>
                    setMemberDraft({
                      ...memberDraft,
                      status: event.target.value as ClubMember["status"],
                    })
                  }
                  disabled={Boolean(
                    editing?.user_id &&
                    (!canManageRoles || editing.membership_role === "owner"),
                  )}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="data-field">
                Date de naissance
                <input
                  type="date"
                  value={memberDraft.birth_date}
                  onChange={(event) =>
                    setMemberDraft({
                      ...memberDraft,
                      birth_date: event.target.value,
                    })
                  }
                />
              </label>
              <label className="data-field">
                Numéro de licence
                <input
                  value={memberDraft.license_number}
                  onChange={(event) =>
                    setMemberDraft({
                      ...memberDraft,
                      license_number: event.target.value,
                    })
                  }
                />
              </label>
              <label className="data-field data-field--full">
                Notes
                <textarea
                  value={memberDraft.notes}
                  onChange={(event) =>
                    setMemberDraft({
                      ...memberDraft,
                      notes: event.target.value,
                    })
                  }
                />
              </label>
            </div>
            {formError && <div className="data-form__error">{formError}</div>}
            <div className="data-form__actions">
              <button
                type="button"
                className="data-button data-button--secondary"
                onClick={() => setMemberModalOpen(false)}
                disabled={submitting}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="data-button"
                disabled={submitting}
              >
                {submitting ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {inviteModalOpen && (
        <Modal
          title="Inviter un membre"
          onClose={() => !submitting && setInviteModalOpen(false)}
        >
          <form className="data-form" onSubmit={handleInvite}>
            <div className="data-form-grid">
              <label className="data-field">
                Prénom
                <input
                  value={inviteDraft.firstName}
                  onChange={(event) =>
                    setInviteDraft({
                      ...inviteDraft,
                      firstName: event.target.value,
                    })
                  }
                />
              </label>
              <label className="data-field">
                Nom
                <input
                  value={inviteDraft.lastName}
                  onChange={(event) =>
                    setInviteDraft({
                      ...inviteDraft,
                      lastName: event.target.value,
                    })
                  }
                />
              </label>
              <label className="data-field data-field--full">
                Adresse Maison CLM
                <input
                  type="email"
                  value={inviteDraft.email}
                  onChange={(event) =>
                    setInviteDraft({
                      ...inviteDraft,
                      email: event.target.value,
                    })
                  }
                  required
                />
              </label>
              <label className="data-field data-field--full">
                Rôle
                <select
                  value={inviteDraft.role}
                  onChange={(event) =>
                    setInviteDraft({
                      ...inviteDraft,
                      role: event.target.value as InviteDraft["role"],
                    })
                  }
                >
                  <option value="admin">Administrateur</option>
                  <option value="manager">Responsable</option>
                  <option value="coach">Entraîneur</option>
                  <option value="member">Membre</option>
                </select>
              </label>
            </div>

            {deliveryResult && (
              <div className="auth-message auth-message--success">
                <strong>
                  {deliveryResult.emailSent
                    ? "Invitation envoyée."
                    : "Invitation créée."}
                </strong>
                {!deliveryResult.emailSent && (
                  <button
                    type="button"
                    className="data-button data-button--secondary invitation-copy-button"
                    onClick={() =>
                      void copyInvitationLink(deliveryResult.invitationUrl)
                    }
                  >
                    <ClipboardCopy size={15} /> Copier le lien
                  </button>
                )}
              </div>
            )}

            {formError && <div className="data-form__error">{formError}</div>}
            <div className="data-form__actions">
              <button
                type="button"
                className="data-button data-button--secondary"
                onClick={() => setInviteModalOpen(false)}
                disabled={submitting}
              >
                Fermer
              </button>
              <button
                type="submit"
                className="data-button"
                disabled={submitting}
              >
                <MailPlus size={16} />
                {submitting ? "Envoi…" : "Envoyer l’invitation"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {memberToDelete && (
        <ConfirmDialog
          title="Supprimer cette fiche ?"
          description={`La fiche de ${memberToDelete.first_name} ${memberToDelete.last_name} sera définitivement supprimée.`}
          confirmLabel="Supprimer la fiche"
          loading={confirming}
          error={confirmError}
          icon={Trash2}
          onCancel={() => !confirming && setMemberToDelete(null)}
          onConfirm={() => void confirmMemberDeletion()}
        />
      )}

      {memberToRemove && (
        <ConfirmDialog
          title="Retirer ce membre du club ?"
          description={`${memberToRemove.first_name} ${memberToRemove.last_name} perdra immédiatement son accès à ce club. Son compte CLM Asso ne sera pas supprimé.`}
          confirmLabel="Retirer du club"
          loading={confirming}
          error={confirmError}
          icon={Trash2}
          onCancel={() => !confirming && setMemberToRemove(null)}
          onConfirm={() => void confirmMemberRemoval()}
        />
      )}

      {invitationToCancel && (
        <ConfirmDialog
          title="Annuler cette invitation ?"
          description={`Le lien envoyé à ${invitationToCancel.email} ne pourra plus être utilisé.`}
          confirmLabel="Annuler l’invitation"
          loading={confirming}
          error={confirmError}
          icon={Ban}
          onCancel={() => !confirming && setInvitationToCancel(null)}
          onConfirm={() => void confirmInvitationCancellation()}
        />
      )}
    </div>
  );
}

export default MembersPage;
