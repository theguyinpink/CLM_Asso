import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Megaphone, Search, Trash2 } from "lucide-react";

import Modal from "../../components/app/shared/Modal";
import ConfirmDialog from "../../components/app/shared/ConfirmDialog";
import PageHeader from "../../components/app/shared/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../../components/app/shared/PageState";
import { useAuth } from "../../hooks/useAuth";
import { useClub } from "../../hooks/useClub";
import { usePermissions } from "../../hooks/usePermissions";
import { useToast } from "../../hooks/useToast";
import { createAnnouncement, deleteAnnouncement, listAnnouncements, updateAnnouncement } from "../../services/clmAssoService";
import type { Announcement, AnnouncementStatus, AnnouncementType } from "../../types/database";
import "../../styles/data-pages.css";

interface Draft {
  title: string;
  content: string;
  announcement_type: AnnouncementType;
  audience: string;
  priority: boolean;
  status: AnnouncementStatus;
  scheduled_at: string;
}

const emptyDraft: Draft = { title: "", content: "", announcement_type: "information", audience: "Tout le club", priority: false, status: "draft", scheduled_at: "" };
const typeLabels: Record<AnnouncementType, string> = { important: "Important", event: "Événement", club: "Club", organization: "Organisation", information: "Information" };
const statusLabels: Record<AnnouncementStatus, string> = { draft: "Brouillon", scheduled: "Programmée", published: "Publiée" };

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function formatDate(value: string | null) {
  if (!value) return "Non publiée";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function AnnouncementsPage() {
  const { user } = useAuth();
  const { activeClub } = useClub();
  const { canManageAnnouncements } = usePermissions();
  const { showToast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    if (!activeClub) return;
    setLoading(true); setError("");
    try { setAnnouncements(await listAnnouncements(activeClub.id)); }
    catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "Impossible de charger les annonces."); }
    finally { setLoading(false); }
  }, [activeClub]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return announcements.filter((item) => (statusFilter === "all" || item.status === statusFilter) && (!query || item.title.toLowerCase().includes(query) || item.content.toLowerCase().includes(query) || item.audience.toLowerCase().includes(query)));
  }, [announcements, search, statusFilter]);

  function openCreate() { setEditing(null); setDraft(emptyDraft); setFormError(""); setModalOpen(true); }
  function openEdit(item: Announcement) {
    setEditing(item);
    setDraft({ title: item.title, content: item.content, announcement_type: item.announcement_type, audience: item.audience, priority: item.priority, status: item.status, scheduled_at: localDateTime(item.scheduled_at) });
    setFormError(""); setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!activeClub || !user) return;
    setSubmitting(true); setFormError("");
    try {
      const payload = { ...draft, scheduled_at: draft.scheduled_at ? new Date(draft.scheduled_at).toISOString() : null };
      if (editing) await updateAnnouncement(editing.id, payload); else await createAnnouncement(activeClub.id, user.id, payload);
      setModalOpen(false); await load();
    } catch (caughtError) { setFormError(caughtError instanceof Error ? caughtError.message : "Impossible d’enregistrer l’annonce."); }
    finally { setSubmitting(false); }
  }

  async function confirmDelete() {
    if (!announcementToDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteAnnouncement(announcementToDelete.id);
      setAnnouncementToDelete(null);
      showToast("L’annonce a été supprimée.", "success");
      await load();
    } catch (caughtError) {
      setDeleteError(caughtError instanceof Error ? caughtError.message : "Suppression impossible.");
    } finally {
      setDeleting(false);
    }
  }

  const stats = { published: announcements.filter((item) => item.status === "published").length, draft: announcements.filter((item) => item.status === "draft").length, scheduled: announcements.filter((item) => item.status === "scheduled").length, priority: announcements.filter((item) => item.priority).length };

  return <div className="data-page">
    <PageHeader icon={Megaphone} title="Annonces" description="Diffusez les informations importantes du club." actionLabel={canManageAnnouncements ? "Nouvelle annonce" : undefined} onAction={canManageAnnouncements ? openCreate : undefined} />
    <section className="data-stats"><div className="data-stat"><span>Publiées</span><strong>{stats.published}</strong></div><div className="data-stat"><span>Brouillons</span><strong>{stats.draft}</strong></div><div className="data-stat"><span>Programmées</span><strong>{stats.scheduled}</strong></div><div className="data-stat"><span>Prioritaires</span><strong>{stats.priority}</strong></div></section>
    <div className="data-toolbar"><label className="data-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une annonce…" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Tous les statuts</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : filtered.length === 0 ? <EmptyState icon={Megaphone} title="Aucune annonce" description="Créez votre première communication." actionLabel={canManageAnnouncements ? "Créer une annonce" : undefined} onAction={canManageAnnouncements ? openCreate : undefined} /> : (
      <section className="data-grid">{filtered.map((item) => <article className="data-card" key={item.id}>
        <div className="data-card__header"><div><h2>{item.title}</h2><p>{item.audience} · {typeLabels[item.announcement_type]}</p></div>{canManageAnnouncements && <div className="data-card__actions"><button type="button" className="data-button data-button--ghost" onClick={() => openEdit(item)}><Edit3 size={16} /></button><button type="button" className="data-button data-button--ghost" onClick={() => { setDeleteError(""); setAnnouncementToDelete(item); }}><Trash2 size={16} /></button></div>}</div>
        <p style={{ margin: 0, color: "#586a80", fontSize: "11px", lineHeight: 1.65 }}>{item.content}</p>
        <div className="data-card__footer"><div style={{ display: "flex", gap: 6 }}><span className={`data-badge ${item.status === "published" ? "data-badge--green" : item.status === "scheduled" ? "data-badge--orange" : "data-badge--grey"}`}>{statusLabels[item.status]}</span>{item.priority && <span className="data-badge data-badge--red">Prioritaire</span>}</div><small>{formatDate(item.published_at ?? item.scheduled_at ?? item.created_at)}</small></div>
      </article>)}</section>
    )}
    {modalOpen && <Modal title={editing ? "Modifier l’annonce" : "Nouvelle annonce"} onClose={() => setModalOpen(false)}><form className="data-form" onSubmit={handleSubmit}><div className="data-form-grid">
      <label className="data-field data-field--full">Titre<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required /></label>
      <label className="data-field">Type<select value={draft.announcement_type} onChange={(event) => setDraft({ ...draft, announcement_type: event.target.value as AnnouncementType })}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="data-field">Audience<input value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })} required /></label>
      <label className="data-field">Statut<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as AnnouncementStatus })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="data-field">Programmation<input type="datetime-local" value={draft.scheduled_at} onChange={(event) => setDraft({ ...draft, scheduled_at: event.target.value })} disabled={draft.status !== "scheduled"} /></label>
      <label className="data-checkbox"><input type="checkbox" checked={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.checked })} />Annonce prioritaire</label>
      <label className="data-field data-field--full">Contenu<textarea value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} required /></label>
    </div>{formError && <div className="data-form__error">{formError}</div>}<div className="data-form__actions"><button type="button" className="data-button data-button--secondary" onClick={() => setModalOpen(false)}>Annuler</button><button type="submit" className="data-button" disabled={submitting}>{submitting ? "Enregistrement…" : "Enregistrer"}</button></div></form></Modal>}
    {announcementToDelete && <ConfirmDialog title="Supprimer cette annonce ?" description={`L’annonce « ${announcementToDelete.title} » sera définitivement supprimée.`} confirmLabel="Supprimer l’annonce" loading={deleting} error={deleteError} icon={Trash2} onCancel={() => !deleting && setAnnouncementToDelete(null)} onConfirm={() => void confirmDelete()} />}
  </div>;
}

export default AnnouncementsPage;
