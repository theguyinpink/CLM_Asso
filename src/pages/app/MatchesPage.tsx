import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Search, Trash2, Trophy } from "lucide-react";
import { Link } from "react-router";

import Modal from "../../components/app/shared/Modal";
import ConfirmDialog from "../../components/app/shared/ConfirmDialog";
import PageHeader from "../../components/app/shared/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../../components/app/shared/PageState";
import { useAuth } from "../../hooks/useAuth";
import { useClub } from "../../hooks/useClub";
import { usePermissions } from "../../hooks/usePermissions";
import { useToast } from "../../hooks/useToast";
import { createMatch, deleteMatch, listMatches, listTeams, updateMatch } from "../../services/clmAssoService";
import type { ClubMatch, MatchStatus, Team } from "../../types/database";
import "../../styles/data-pages.css";

interface MatchDraft {
  team_id: string;
  opponent_name: string;
  date: string;
  time: string;
  location: string;
  competition: string;
  is_home: boolean;
  status: MatchStatus;
  score_home: string;
  score_away: string;
  notes: string;
}

function inputDate() { return new Date().toISOString().slice(0, 10); }
const emptyDraft: MatchDraft = { team_id: "", opponent_name: "", date: inputDate(), time: "15:00", location: "", competition: "", is_home: true, status: "scheduled", score_home: "", score_away: "", notes: "" };

function parts(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

const statusLabels: Record<MatchStatus, string> = { scheduled: "Programmé", completed: "Terminé", cancelled: "Annulé", postponed: "Reporté" };

function MatchesPage() {
  const { user } = useAuth();
  const { activeClub } = useClub();
  const { canManageMatches } = usePermissions();
  const { showToast } = useToast();
  const [matches, setMatches] = useState<ClubMatch[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClubMatch | null>(null);
  const [draft, setDraft] = useState<MatchDraft>(emptyDraft);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [matchToDelete, setMatchToDelete] = useState<ClubMatch | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    if (!activeClub) return;
    setLoading(true); setError("");
    try {
      const [nextMatches, nextTeams] = await Promise.all([listMatches(activeClub.id), listTeams(activeClub.id)]);
      setMatches(nextMatches); setTeams(nextTeams);
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "Impossible de charger les matchs."); }
    finally { setLoading(false); }
  }, [activeClub]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return matches.filter((match) => (statusFilter === "all" || match.status === statusFilter) && (!query || match.opponent_name.toLowerCase().includes(query) || (match.team?.name ?? "").toLowerCase().includes(query) || (match.competition ?? "").toLowerCase().includes(query)));
  }, [matches, search, statusFilter]);

  function openCreate() { setEditing(null); setDraft(emptyDraft); setFormError(""); setModalOpen(true); }
  function openEdit(match: ClubMatch) {
    const dateParts = parts(match.starts_at);
    setEditing(match);
    setDraft({ team_id: match.team_id ?? "", opponent_name: match.opponent_name, date: dateParts.date, time: dateParts.time, location: match.location ?? "", competition: match.competition ?? "", is_home: match.is_home, status: match.status, score_home: match.score_home?.toString() ?? "", score_away: match.score_away?.toString() ?? "", notes: match.notes ?? "" });
    setFormError(""); setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!activeClub || !user) return;
    setSubmitting(true); setFormError("");
    try {
      const payload = { team_id: draft.team_id || null, opponent_name: draft.opponent_name, starts_at: new Date(`${draft.date}T${draft.time}`).toISOString(), location: draft.location || null, competition: draft.competition || null, is_home: draft.is_home, status: draft.status, score_home: draft.score_home === "" ? null : Number(draft.score_home), score_away: draft.score_away === "" ? null : Number(draft.score_away), notes: draft.notes || null };
      if (editing) await updateMatch(editing.id, payload); else await createMatch(activeClub.id, user.id, payload);
      setModalOpen(false); await load();
    } catch (caughtError) { setFormError(caughtError instanceof Error ? caughtError.message : "Impossible d’enregistrer le match."); }
    finally { setSubmitting(false); }
  }

  async function confirmDelete() {
    if (!matchToDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteMatch(matchToDelete.id);
      setMatchToDelete(null);
      showToast("Le match a été supprimé.", "success");
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
      <PageHeader icon={Trophy} title="Matchs" description="Programmez les rencontres et renseignez les résultats." actionLabel={canManageMatches ? "Ajouter un match" : undefined} onAction={canManageMatches ? openCreate : undefined} />
      <div className="data-toolbar"><label className="data-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un adversaire ou une équipe…" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Tous les statuts</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : filtered.length === 0 ? <EmptyState icon={Trophy} title="Aucun match" description="Ajoutez la première rencontre du club." actionLabel={canManageMatches ? "Ajouter un match" : undefined} onAction={canManageMatches ? openCreate : undefined} /> : (
        <section className="data-grid">{filtered.map((match) => (
          <article className="data-card" key={match.id}>
            <div className="data-card__header"><div><h2>{match.team?.name ?? "Club"} {match.is_home ? "vs" : "@"} {match.opponent_name}</h2><p>{match.competition || "Compétition non renseignée"}</p></div>{canManageMatches && <div className="data-card__actions"><button type="button" className="data-button data-button--ghost" onClick={() => openEdit(match)}><Edit3 size={16} /></button><button type="button" className="data-button data-button--ghost" onClick={() => { setDeleteError(""); setMatchToDelete(match); }}><Trash2 size={16} /></button></div>}</div>
            <div className="data-card__body"><div>{formatDate(match.starts_at)}</div><div>{match.location || "Lieu à définir"}</div>{match.status === "completed" && <strong>Score : {match.score_home ?? 0} - {match.score_away ?? 0}</strong>}</div>
            <div className="data-card__footer"><span className={`data-badge ${match.status === "completed" ? "data-badge--green" : match.status === "cancelled" ? "data-badge--red" : match.status === "postponed" ? "data-badge--orange" : ""}`}>{statusLabels[match.status]}</span><Link className="data-button data-button--secondary" to={`/app/matchs/${match.id}`}>Voir le détail</Link></div>
          </article>
        ))}</section>
      )}

      {modalOpen && <Modal title={editing ? "Modifier le match" : "Nouveau match"} onClose={() => setModalOpen(false)}><form className="data-form" onSubmit={handleSubmit}><div className="data-form-grid">
        <label className="data-field">Équipe<select value={draft.team_id} onChange={(event) => setDraft({ ...draft, team_id: event.target.value })}><option value="">Équipe non précisée</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
        <label className="data-field">Adversaire<input value={draft.opponent_name} onChange={(event) => setDraft({ ...draft, opponent_name: event.target.value })} required /></label>
        <label className="data-field">Date<input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} required /></label>
        <label className="data-field">Heure<input type="time" value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} required /></label>
        <label className="data-field">Lieu<input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label>
        <label className="data-field">Compétition<input value={draft.competition} onChange={(event) => setDraft({ ...draft, competition: event.target.value })} /></label>
        <label className="data-field">Statut<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as MatchStatus })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="data-checkbox"><input type="checkbox" checked={draft.is_home} onChange={(event) => setDraft({ ...draft, is_home: event.target.checked })} />Match à domicile</label>
        <label className="data-field">Score domicile<input type="number" min="0" value={draft.score_home} onChange={(event) => setDraft({ ...draft, score_home: event.target.value })} /></label>
        <label className="data-field">Score extérieur<input type="number" min="0" value={draft.score_away} onChange={(event) => setDraft({ ...draft, score_away: event.target.value })} /></label>
        <label className="data-field data-field--full">Notes<textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
      </div>{formError && <div className="data-form__error">{formError}</div>}<div className="data-form__actions"><button type="button" className="data-button data-button--secondary" onClick={() => setModalOpen(false)}>Annuler</button><button type="submit" className="data-button" disabled={submitting}>{submitting ? "Enregistrement…" : "Enregistrer"}</button></div></form></Modal>}

      {matchToDelete && (
        <ConfirmDialog
          title="Supprimer ce match ?"
          description={`La rencontre contre ${matchToDelete.opponent_name} sera définitivement supprimée.`}
          confirmLabel="Supprimer le match"
          loading={deleting}
          error={deleteError}
          icon={Trash2}
          onCancel={() => !deleting && setMatchToDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </div>
  );
}

export default MatchesPage;
