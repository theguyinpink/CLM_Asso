import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Trash2, UserPlus, UsersRound } from "lucide-react";
import { Link, useParams } from "react-router";

import Modal from "../../components/app/shared/Modal";
import ConfirmDialog from "../../components/app/shared/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "../../components/app/shared/PageState";
import { useClub } from "../../hooks/useClub";
import { usePermissions } from "../../hooks/usePermissions";
import { useToast } from "../../hooks/useToast";
import {
  addTeamMember,
  getTeam,
  listEvents,
  listMatches,
  listMembers,
  listTeamMembers,
  removeTeamMember,
} from "../../services/clmAssoService";
import type { ClubEvent, ClubMatch, ClubMember, Team, TeamMember } from "../../types/database";
import "../../styles/data-pages.css";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function TeamDetailsPage() {
  const { teamId } = useParams();
  const { activeClub } = useClub();
  const { canManageTeams } = usePermissions();
  const { showToast } = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [roster, setRoster] = useState<TeamMember[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [matches, setMatches] = useState<ClubMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [teamRole, setTeamRole] = useState<TeamMember["team_role"]>("player");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [position, setPosition] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [linkToRemove, setLinkToRemove] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");

  const load = useCallback(async () => {
    if (!teamId || !activeClub) return;
    setLoading(true);
    setError("");
    try {
      const [nextTeam, nextRoster, nextMembers, allEvents, allMatches] = await Promise.all([
        getTeam(teamId),
        listTeamMembers(teamId),
        listMembers(activeClub.id),
        listEvents(activeClub.id),
        listMatches(activeClub.id),
      ]);
      setTeam(nextTeam);
      setRoster(nextRoster);
      setMembers(nextMembers);
      setEvents(allEvents.filter((event) => event.team_id === teamId));
      setMatches(allMatches.filter((match) => match.team_id === teamId));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Impossible de charger l’équipe.");
    } finally {
      setLoading(false);
    }
  }, [activeClub, teamId]);

  useEffect(() => { void load(); }, [load]);

  const availableMembers = useMemo(
    () => members.filter((member) => !roster.some((link) => link.member_id === member.id)),
    [members, roster],
  );

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teamId || !memberId) return;
    setSubmitting(true);
    setFormError("");
    try {
      await addTeamMember(teamId, memberId, teamRole, jerseyNumber ? Number(jerseyNumber) : null, position || null);
      setModalOpen(false);
      setMemberId("");
      setTeamRole("player");
      setJerseyNumber("");
      setPosition("");
      await load();
    } catch (caughtError) {
      setFormError(caughtError instanceof Error ? caughtError.message : "Impossible d’ajouter le membre.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmRemove() {
    if (!teamId || !linkToRemove) return;
    setRemoving(true);
    setRemoveError("");
    try {
      await removeTeamMember(teamId, linkToRemove.member_id);
      setLinkToRemove(null);
      showToast("Le membre a été retiré de l’équipe.", "success");
      await load();
    } catch (caughtError) {
      setRemoveError(
        caughtError instanceof Error ? caughtError.message : "Suppression impossible.",
      );
    } finally {
      setRemoving(false);
    }
  }

  if (loading) return <LoadingState label="Chargement de l’équipe…" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!team) return <EmptyState icon={UsersRound} title="Équipe introuvable" description="Cette équipe n’existe plus ou n’est pas accessible." />;

  const futureMatches = matches.filter((match) => new Date(match.starts_at) >= new Date()).slice(0, 5);
  const futureEvents = events.filter((event) => new Date(event.starts_at) >= new Date()).slice(0, 5);

  return (
    <div className="data-page">
      <Link to="/app/equipes" className="data-button data-button--secondary" style={{ width: "fit-content" }}><ArrowLeft size={17} />Retour aux équipes</Link>

      <header className="data-page-header">
        <div className="data-page-header__identity">
          <span className="data-page-header__icon" style={{ background: `${team.color}18`, color: team.color }}><UsersRound size={28} /></span>
          <div><h1>{team.name}</h1><p>{team.category} · {team.gender} · {roster.length} membre(s)</p></div>
        </div>
        {canManageTeams && (
          <button className="data-button" type="button" onClick={() => setModalOpen(true)} disabled={availableMembers.length === 0}><UserPlus size={18} />Ajouter un membre</button>
        )}
      </header>

      <section className="data-grid">
        <article className="data-card">
          <div className="data-card__header"><div><h2>Informations</h2><p>Données enregistrées pour cette équipe.</p></div></div>
          <div className="data-card__body">
            <div className="data-card__row"><strong>Coach :</strong> {team.coach ? `${team.coach.first_name} ${team.coach.last_name}` : "Non renseigné"}</div>
            <div className="data-card__row"><strong>Catégorie :</strong> {team.category}</div>
            <div className="data-card__row"><strong>Genre :</strong> {team.gender}</div>
            {team.description && <p>{team.description}</p>}
          </div>
        </article>

        <article className="data-card">
          <div className="data-card__header"><div><h2>Prochaines dates</h2><p>Matchs et événements de l’équipe.</p></div><CalendarDays size={20} /></div>
          {futureMatches.length + futureEvents.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Aucune date à venir" description="Ajoutez un événement ou un match pour cette équipe." />
          ) : (
            <div className="data-list">
              {futureMatches.map((match) => <Link key={match.id} to={`/app/matchs/${match.id}`} className="data-list-item"><span className="data-list-item__main"><strong>Match contre {match.opponent_name}</strong><span>{formatDate(match.starts_at)} · {match.location || "Lieu à définir"}</span></span><span className="data-badge">Match</span></Link>)}
              {futureEvents.map((event) => <div key={event.id} className="data-list-item"><span className="data-list-item__main"><strong>{event.title}</strong><span>{formatDate(event.starts_at)} · {event.location || "Lieu à définir"}</span></span><span className="data-badge data-badge--green">Événement</span></div>)}
            </div>
          )}
        </article>
      </section>

      <section className="data-section">
        <div className="data-section__heading"><h2>Effectif</h2><span className="data-badge">{roster.length} membre(s)</span></div>
        {roster.length === 0 ? (
          <EmptyState icon={UsersRound} title="Effectif vide" description="Ajoutez des membres depuis l’annuaire du club." actionLabel={availableMembers.length && canManageTeams ? "Ajouter un membre" : undefined} onAction={availableMembers.length && canManageTeams ? () => setModalOpen(true) : undefined} />
        ) : (
          <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Membre</th><th>Rôle</th><th>Numéro</th><th>Poste</th><th /></tr></thead><tbody>{roster.map((link) => <tr key={link.member_id}><td><strong>{link.member?.first_name} {link.member?.last_name}</strong><br /><small>{link.member?.email || ""}</small></td><td>{link.team_role}</td><td>{link.jersey_number ?? "—"}</td><td>{link.position || "—"}</td><td>{canManageTeams && <div className="data-table__actions"><button type="button" className="data-button data-button--ghost" onClick={() => { setRemoveError(""); setLinkToRemove(link); }} aria-label="Retirer"><Trash2 size={16} /></button></div>}</td></tr>)}</tbody></table></div>
        )}
      </section>

      {modalOpen && (
        <Modal title="Ajouter un membre à l’équipe" onClose={() => setModalOpen(false)}>
          <form className="data-form" onSubmit={handleAdd}>
            <div className="data-form-grid">
              <label className="data-field data-field--full">Membre<select value={memberId} onChange={(event) => setMemberId(event.target.value)} required><option value="">Choisir un membre</option>{availableMembers.map((member) => <option key={member.id} value={member.id}>{member.first_name} {member.last_name}</option>)}</select></label>
              <label className="data-field">Rôle<select value={teamRole} onChange={(event) => setTeamRole(event.target.value as TeamMember["team_role"])}><option value="player">Joueur / joueuse</option><option value="coach">Coach</option><option value="assistant">Assistant</option><option value="manager">Responsable</option></select></label>
              <label className="data-field">Numéro<input type="number" min="0" max="99" value={jerseyNumber} onChange={(event) => setJerseyNumber(event.target.value)} /></label>
              <label className="data-field data-field--full">Poste<input value={position} onChange={(event) => setPosition(event.target.value)} placeholder="Meneur, gardien, attaquant…" /></label>
            </div>
            {formError && <div className="data-form__error">{formError}</div>}
            <div className="data-form__actions"><button className="data-button data-button--secondary" type="button" onClick={() => setModalOpen(false)}>Annuler</button><button className="data-button" disabled={submitting} type="submit">{submitting ? "Ajout…" : "Ajouter"}</button></div>
          </form>
        </Modal>
      )}

      {linkToRemove && (
        <ConfirmDialog
          title="Retirer ce membre ?"
          description={`${linkToRemove.member?.first_name ?? "Ce membre"} ${linkToRemove.member?.last_name ?? ""} ne fera plus partie de l’effectif.`}
          confirmLabel="Retirer de l’équipe"
          loading={removing}
          error={removeError}
          icon={Trash2}
          onCancel={() => !removing && setLinkToRemove(null)}
          onConfirm={() => void confirmRemove()}
        />
      )}
    </div>
  );
}

export default TeamDetailsPage;
