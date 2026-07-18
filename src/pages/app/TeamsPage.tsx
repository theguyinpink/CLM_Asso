import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Search, Trash2, UsersRound } from "lucide-react";
import { Link } from "react-router";

import Modal from "../../components/app/shared/Modal";
import PageHeader from "../../components/app/shared/PageHeader";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/app/shared/PageState";
import ConfirmDialog from "../../components/app/shared/ConfirmDialog";
import { useClub } from "../../hooks/useClub";
import { usePermissions } from "../../hooks/usePermissions";
import {
  createTeam,
  deleteTeam,
  listMembers,
  listTeams,
  updateTeam,
} from "../../services/clmAssoService";
import type { ClubMember, Team } from "../../types/database";
import "../../styles/data-pages.css";

interface TeamDraft {
  name: string;
  category: string;
  gender: Team["gender"];
  coach_member_id: string;
  description: string;
  color: string;
}

const emptyDraft: TeamDraft = {
  name: "",
  category: "Jeunes",
  gender: "mixte",
  coach_member_id: "",
  description: "",
  color: "#0875f5",
};

function TeamsPage() {
  const { activeClub } = useClub();
  const { canManageTeams } = usePermissions();
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [draft, setDraft] = useState<TeamDraft>(emptyDraft);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

  const [deletingTeam, setDeletingTeam] = useState(false);

  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    if (!activeClub) return;
    setLoading(true);
    setError("");
    try {
      const [nextTeams, nextMembers] = await Promise.all([
        listTeams(activeClub.id),
        listMembers(activeClub.id),
      ]);
      setTeams(nextTeams);
      setMembers(nextMembers);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de charger les équipes.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeClub]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return teams.filter(
      (team) =>
        !query ||
        team.name.toLowerCase().includes(query) ||
        team.category.toLowerCase().includes(query) ||
        team.coach?.last_name.toLowerCase().includes(query),
    );
  }, [search, teams]);

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(team: Team) {
    setEditing(team);
    setDraft({
      name: team.name,
      category: team.category,
      gender: team.gender,
      coach_member_id: team.coach_member_id ?? "",
      description: team.description ?? "",
      color: team.color,
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeClub) return;
    setSubmitting(true);
    setFormError("");
    try {
      if (editing) await updateTeam(editing.id, draft);
      else await createTeam(activeClub.id, draft);
      setModalOpen(false);
      await load();
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible d’enregistrer l’équipe.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function requestTeamDeletion(team: Team) {
    setDeleteError("");
    setTeamToDelete(team);
  }

  function closeDeleteDialog() {
    if (deletingTeam) {
      return;
    }

    setTeamToDelete(null);
    setDeleteError("");
  }

  async function confirmTeamDeletion() {
    if (!teamToDelete) {
      return;
    }

    setDeletingTeam(true);
    setDeleteError("");

    try {
      await deleteTeam(teamToDelete.id);

      setTeamToDelete(null);

      await load();
    } catch (caughtError) {
      setDeleteError(
        caughtError instanceof Error
          ? caughtError.message
          : "La suppression de l’équipe a échoué.",
      );
    } finally {
      setDeletingTeam(false);
    }
  }

  return (
    <div className="data-page">
      <PageHeader
        icon={UsersRound}
        title="Équipes"
        description="Créez les équipes du club et gérez leurs effectifs."
        actionLabel={canManageTeams ? "Ajouter une équipe" : undefined}
        onAction={canManageTeams ? openCreate : undefined}
      />

      <div className="data-toolbar">
        <label className="data-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une équipe…"
          />
        </label>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title={teams.length ? "Aucun résultat" : "Aucune équipe"}
          description={
            teams.length
              ? "Modifiez votre recherche."
              : "Ajoutez la première équipe du club."
          }
          actionLabel={!teams.length && canManageTeams ? "Ajouter une équipe" : undefined}
          onAction={!teams.length && canManageTeams ? openCreate : undefined}
        />
      ) : (
        <section className="data-grid">
          {filtered.map((team) => (
            <article
              className="data-card"
              key={team.id}
              style={{ borderTop: `4px solid ${team.color}` }}
            >
              <div className="data-card__header">
                <div>
                  <h2>{team.name}</h2>
                  <p>
                    {team.category} · {team.gender}
                  </p>
                </div>
                {canManageTeams && (
                  <div className="data-card__actions">
                    <button
                      className="data-button data-button--ghost"
                      type="button"
                      onClick={() => openEdit(team)}
                      aria-label="Modifier"
                    >
                      <Edit3 size={17} />
                    </button>
                    <button
                      className="data-button data-button--ghost"
                      type="button"
                      onClick={() => requestTeamDeletion(team)}
                      aria-label={`Supprimer ${team.name}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                )}
              </div>
              <div className="data-card__body">
                <div className="data-card__row">
                  <strong>Coach :</strong>{" "}
                  {team.coach
                    ? `${team.coach.first_name} ${team.coach.last_name}`
                    : "Non renseigné"}
                </div>
                <div className="data-card__row">
                  <strong>Effectif :</strong> {team.member_count ?? 0} membre(s)
                </div>
                {team.description && <p>{team.description}</p>}
              </div>
              <div className="data-card__footer">
                <span className="data-badge">{team.category}</span>
                <Link
                  className="data-button data-button--secondary"
                  to={`/app/equipes/${team.id}`}
                >
                  Ouvrir l’équipe
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}

      {modalOpen && (
        <Modal
          title={editing ? "Modifier l’équipe" : "Nouvelle équipe"}
          onClose={() => setModalOpen(false)}
        >
          <form className="data-form" onSubmit={handleSubmit}>
            <div className="data-form-grid">
              <label className="data-field">
                Nom
                <input
                  value={draft.name}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                  required
                />
              </label>
              <label className="data-field">
                Catégorie
                <input
                  value={draft.category}
                  onChange={(event) =>
                    setDraft({ ...draft, category: event.target.value })
                  }
                  required
                />
              </label>
              <label className="data-field">
                Genre
                <select
                  value={draft.gender}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      gender: event.target.value as Team["gender"],
                    })
                  }
                >
                  <option value="mixte">Mixte</option>
                  <option value="masculin">Masculin</option>
                  <option value="feminin">Féminin</option>
                </select>
              </label>
              <label className="data-field">
                Coach
                <select
                  value={draft.coach_member_id}
                  onChange={(event) =>
                    setDraft({ ...draft, coach_member_id: event.target.value })
                  }
                >
                  <option value="">Aucun coach</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="data-field">
                Couleur
                <input
                  type="color"
                  value={draft.color}
                  onChange={(event) =>
                    setDraft({ ...draft, color: event.target.value })
                  }
                />
              </label>
              <label className="data-field data-field--full">
                Description
                <textarea
                  value={draft.description}
                  onChange={(event) =>
                    setDraft({ ...draft, description: event.target.value })
                  }
                />
              </label>
            </div>
            {formError && <div className="data-form__error">{formError}</div>}
            <div className="data-form__actions">
              <button
                className="data-button data-button--secondary"
                type="button"
                onClick={() => setModalOpen(false)}
              >
                Annuler
              </button>
              <button
                className="data-button"
                disabled={submitting}
                type="submit"
              >
                {submitting ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {teamToDelete && (
        <ConfirmDialog
          title="Supprimer cette équipe ?"
          description={`L’équipe « ${teamToDelete.name} » sera définitivement supprimée. Les liens avec ses membres seront également retirés. Cette action est irréversible.`}
          confirmLabel="Supprimer l’équipe"
          loading={deletingTeam}
          error={deleteError}
          icon={Trash2}
          onCancel={closeDeleteDialog}
          onConfirm={() => void confirmTeamDeletion()}
        />
      )}
    </div>
  );
}

export default TeamsPage;
