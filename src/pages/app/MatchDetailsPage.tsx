import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Save, Trophy } from "lucide-react";
import { Link, useParams } from "react-router";

import { EmptyState, ErrorState, LoadingState } from "../../components/app/shared/PageState";
import { getMatch, updateMatch } from "../../services/clmAssoService";
import { usePermissions } from "../../hooks/usePermissions";
import type { ClubMatch, MatchStatus } from "../../types/database";
import "../../styles/data-pages.css";

const statusLabels: Record<MatchStatus, string> = { scheduled: "Programmé", completed: "Terminé", cancelled: "Annulé", postponed: "Reporté" };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function MatchDetailsPage() {
  const { matchId } = useParams();
  const { canManageMatches } = usePermissions();
  const [match, setMatch] = useState<ClubMatch | null>(null);
  const [status, setStatus] = useState<MatchStatus>("scheduled");
  const [scoreHome, setScoreHome] = useState("");
  const [scoreAway, setScoreAway] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!matchId) return;
    setLoading(true); setError("");
    try {
      const nextMatch = await getMatch(matchId);
      setMatch(nextMatch);
      if (nextMatch) { setStatus(nextMatch.status); setScoreHome(nextMatch.score_home?.toString() ?? ""); setScoreAway(nextMatch.score_away?.toString() ?? ""); setNotes(nextMatch.notes ?? ""); }
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "Impossible de charger le match."); }
    finally { setLoading(false); }
  }, [matchId]);

  useEffect(() => { void load(); }, [load]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!match) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const updated = await updateMatch(match.id, { ...match, status, score_home: scoreHome === "" ? null : Number(scoreHome), score_away: scoreAway === "" ? null : Number(scoreAway), notes: notes || null });
      setMatch({ ...match, ...updated }); setMessage("Le match a été mis à jour.");
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  }

  if (loading) return <LoadingState label="Chargement du match…" />;
  if (error && !match) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!match) return <EmptyState icon={Trophy} title="Match introuvable" description="Cette rencontre n’existe plus." />;

  return <div className="data-page">
    <Link to="/app/matchs" className="data-button data-button--secondary" style={{ width: "fit-content" }}><ArrowLeft size={17} />Retour aux matchs</Link>
    <header className="data-page-header"><div className="data-page-header__identity"><span className="data-page-header__icon"><Trophy size={28} /></span><div><h1>{match.team?.name ?? "Club"} {match.is_home ? "vs" : "@"} {match.opponent_name}</h1><p>{formatDate(match.starts_at)} · {match.location || "Lieu à définir"}</p></div></div></header>
    <section className="data-grid"><article className="data-card"><div className="data-card__header"><div><h2>Informations</h2><p>Données de la rencontre.</p></div></div><div className="data-card__body"><div><strong>Compétition :</strong> {match.competition || "Non renseignée"}</div><div><strong>Lieu :</strong> {match.location || "Non renseigné"}</div><div><strong>Configuration :</strong> {match.is_home ? "Domicile" : "Extérieur"}</div></div></article>
    <article className="data-card"><div className="data-card__header"><div><h2>Résultat et statut</h2><p>Mettez à jour le match après la rencontre.</p></div></div><form className="data-form" style={{ padding: 0 }} onSubmit={handleSubmit}><div className="data-form-grid"><label className="data-field data-field--full">Statut<select value={status} onChange={(event) => setStatus(event.target.value as MatchStatus)} disabled={!canManageMatches}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="data-field">Score domicile<input type="number" min="0" value={scoreHome} onChange={(event) => setScoreHome(event.target.value)} disabled={!canManageMatches} /></label><label className="data-field">Score extérieur<input type="number" min="0" value={scoreAway} onChange={(event) => setScoreAway(event.target.value)} disabled={!canManageMatches} /></label><label className="data-field data-field--full">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={!canManageMatches} /></label></div>{error && <div className="data-form__error">{error}</div>}{message && <div className="auth-message auth-message--success">{message}</div>}{canManageMatches && <div className="data-form__actions"><button className="data-button" type="submit" disabled={saving}><Save size={17} />{saving ? "Enregistrement…" : "Enregistrer"}</button></div>}</form></article></section>
  </div>;
}

export default MatchDetailsPage;
