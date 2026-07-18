import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  Edit3,
  FileClock,
  FileText,
  History,
  RefreshCw,
  Search,
  Trash2,
  Upload,
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
  deleteDocument,
  downloadDocument,
  downloadDocumentVersion,
  listDocuments,
  listDocumentVersions,
  replaceDocument,
  restoreDocumentVersion,
  updateDocumentMetadata,
  uploadDocument,
} from "../../services/clmAssoService";
import type { ClubDocument, DocumentVersion } from "../../types/database";
import "../../styles/data-pages.css";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function DocumentsPage() {
  const { user } = useAuth();
  const { activeClub } = useClub();
  const { canManageDocuments } = usePermissions();
  const { showToast } = useToast();

  const [documents, setDocuments] = useState<ClubDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState("all");

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [folder, setFolder] = useState("Général");

  const [documentToEdit, setDocumentToEdit] = useState<ClubDocument | null>(null);
  const [editName, setEditName] = useState("");
  const [editFolder, setEditFolder] = useState("");

  const [documentToReplace, setDocumentToReplace] =
    useState<ClubDocument | null>(null);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [changeNote, setChangeNote] = useState("");

  const [historyDocument, setHistoryDocument] = useState<ClubDocument | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const [documentToDelete, setDocumentToDelete] =
    useState<ClubDocument | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    if (!activeClub) return;
    setLoading(true);
    setError("");
    try {
      setDocuments(await listDocuments(activeClub.id));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de charger les documents.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeClub]);

  useEffect(() => {
    void load();
  }, [load]);

  const folders = useMemo(
    () => Array.from(new Set(documents.map((document) => document.folder))).sort(),
    [documents],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return documents.filter(
      (document) =>
        (folderFilter === "all" || document.folder === folderFilter) &&
        (!query ||
          document.name.toLowerCase().includes(query) ||
          document.folder.toLowerCase().includes(query)),
    );
  }, [documents, folderFilter, search]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeClub || !user || !file || !canManageDocuments) return;
    setSubmitting(true);
    setFormError("");

    try {
      await uploadDocument(activeClub.id, user.id, file, folder);
      setUploadModalOpen(false);
      setFile(null);
      setFolder("Général");
      showToast("Le document a été ajouté.", "success");
      await load();
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error
          ? caughtError.message
          : "Téléversement impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(document: ClubDocument) {
    setDocumentToEdit(document);
    setEditName(document.name);
    setEditFolder(document.folder);
    setFormError("");
  }

  async function handleMetadata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!documentToEdit) return;
    setSubmitting(true);
    setFormError("");

    try {
      await updateDocumentMetadata(documentToEdit.id, {
        name: editName,
        folder: editFolder,
      });
      setDocumentToEdit(null);
      showToast("Le document a été renommé ou déplacé.", "success");
      await load();
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error ? caughtError.message : "Modification impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openReplace(document: ClubDocument) {
    setDocumentToReplace(document);
    setReplacementFile(null);
    setChangeNote("");
    setFormError("");
  }

  async function handleReplace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!documentToReplace || !replacementFile || !user) return;
    setSubmitting(true);
    setFormError("");

    try {
      await replaceDocument(documentToReplace, user.id, replacementFile, changeNote);
      setDocumentToReplace(null);
      showToast("Une nouvelle version du document a été ajoutée.", "success");
      await load();
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error ? caughtError.message : "Remplacement impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function openHistory(document: ClubDocument) {
    setHistoryDocument(document);
    setVersions([]);
    setVersionsLoading(true);
    try {
      setVersions(await listDocumentVersions(document.id));
    } catch (caughtError) {
      showToast(
        caughtError instanceof Error ? caughtError.message : "Historique inaccessible.",
        "error",
      );
    } finally {
      setVersionsLoading(false);
    }
  }

  async function restoreVersion(version: DocumentVersion) {
    if (!historyDocument || !user) return;
    setSubmitting(true);
    try {
      await restoreDocumentVersion(historyDocument, version, user.id);
      showToast(`La version ${version.version_number} a été restaurée.`, "success");
      setVersions(await listDocumentVersions(historyDocument.id));
      await load();
    } catch (caughtError) {
      showToast(
        caughtError instanceof Error ? caughtError.message : "Restauration impossible.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!documentToDelete) return;
    setSubmitting(true);
    setFormError("");
    try {
      await deleteDocument(documentToDelete);
      setDocumentToDelete(null);
      showToast("Le document et ses versions ont été supprimés.", "success");
      await load();
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error ? caughtError.message : "Suppression impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="data-page">
      <PageHeader
        icon={FileText}
        title="Documents"
        description="Stockage privé, historique des versions et classement des fichiers du club."
        actionLabel={canManageDocuments ? "Ajouter un document" : undefined}
        onAction={canManageDocuments ? () => { setFormError(""); setUploadModalOpen(true); } : undefined}
      />

      <div className="data-toolbar">
        <label className="data-search">
          <Search size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un document…" />
        </label>
        <select value={folderFilter} onChange={(event) => setFolderFilter(event.target.value)}>
          <option value="all">Tous les dossiers</option>
          {folders.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun document"
          description="Ajoutez le premier fichier du club dans le stockage privé."
          actionLabel={canManageDocuments ? "Ajouter un document" : undefined}
          onAction={canManageDocuments ? () => setUploadModalOpen(true) : undefined}
        />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Fichier</th><th>Dossier</th><th>Taille</th><th>Modifié le</th><th /></tr></thead>
            <tbody>
              {filtered.map((document) => (
                <tr key={document.id}>
                  <td><strong>{document.name}</strong><br /><small>{document.mime_type || "Type inconnu"}</small></td>
                  <td><span className="data-badge">{document.folder}</span></td>
                  <td>{formatSize(document.size_bytes)}</td>
                  <td>{formatDate(document.updated_at)}</td>
                  <td>
                    <div className="data-table__actions">
                      <button type="button" className="data-button data-button--ghost" onClick={() => void downloadDocument(document)} title="Télécharger"><Download size={16} /></button>
                      <button type="button" className="data-button data-button--ghost" onClick={() => void openHistory(document)} title="Historique"><History size={16} /></button>
                      {canManageDocuments && (
                        <>
                          <button type="button" className="data-button data-button--ghost" onClick={() => openEdit(document)} title="Renommer ou déplacer"><Edit3 size={16} /></button>
                          <button type="button" className="data-button data-button--ghost" onClick={() => openReplace(document)} title="Nouvelle version"><RefreshCw size={16} /></button>
                          <button type="button" className="data-button data-button--ghost" onClick={() => { setFormError(""); setDocumentToDelete(document); }} title="Supprimer"><Trash2 size={16} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {uploadModalOpen && (
        <Modal title="Ajouter un document" onClose={() => !submitting && setUploadModalOpen(false)}>
          <form className="data-form" onSubmit={handleUpload}>
            <div className="data-form-grid">
              <label className="data-field data-field--full">Fichier<input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required /></label>
              <label className="data-field data-field--full">Dossier<input value={folder} onChange={(event) => setFolder(event.target.value)} placeholder="Général, Licences, Administratif…" required /></label>
            </div>
            <p className="data-form__help">Taille maximale : 50 Mo. Le bucket est privé.</p>
            {formError && <div className="data-form__error">{formError}</div>}
            <div className="data-form__actions">
              <button type="button" className="data-button data-button--secondary" onClick={() => setUploadModalOpen(false)}>Annuler</button>
              <button type="submit" className="data-button" disabled={submitting || !file}><Upload size={17} />{submitting ? "Téléversement…" : "Téléverser"}</button>
            </div>
          </form>
        </Modal>
      )}

      {documentToEdit && (
        <Modal title="Renommer ou déplacer" onClose={() => !submitting && setDocumentToEdit(null)}>
          <form className="data-form" onSubmit={handleMetadata}>
            <div className="data-form-grid">
              <label className="data-field data-field--full">Nom du fichier<input value={editName} onChange={(event) => setEditName(event.target.value)} required /></label>
              <label className="data-field data-field--full">Dossier<input value={editFolder} onChange={(event) => setEditFolder(event.target.value)} required /></label>
            </div>
            {formError && <div className="data-form__error">{formError}</div>}
            <div className="data-form__actions">
              <button type="button" className="data-button data-button--secondary" onClick={() => setDocumentToEdit(null)}>Annuler</button>
              <button type="submit" className="data-button" disabled={submitting}>Enregistrer</button>
            </div>
          </form>
        </Modal>
      )}

      {documentToReplace && (
        <Modal title="Ajouter une nouvelle version" onClose={() => !submitting && setDocumentToReplace(null)}>
          <form className="data-form" onSubmit={handleReplace}>
            <div className="data-form-grid">
              <label className="data-field data-field--full">Nouveau fichier<input type="file" onChange={(event) => setReplacementFile(event.target.files?.[0] ?? null)} required /></label>
              <label className="data-field data-field--full">Note de version<input value={changeNote} onChange={(event) => setChangeNote(event.target.value)} placeholder="Mise à jour des licences…" /></label>
            </div>
            {formError && <div className="data-form__error">{formError}</div>}
            <div className="data-form__actions">
              <button type="button" className="data-button data-button--secondary" onClick={() => setDocumentToReplace(null)}>Annuler</button>
              <button type="submit" className="data-button" disabled={submitting || !replacementFile}><FileClock size={16} />Créer la version</button>
            </div>
          </form>
        </Modal>
      )}

      {historyDocument && (
        <Modal title={`Historique · ${historyDocument.name}`} onClose={() => setHistoryDocument(null)}>
          {versionsLoading ? (
            <LoadingState label="Chargement des versions…" />
          ) : versions.length === 0 ? (
            <EmptyState icon={History} title="Aucune version" description="Aucun historique n’est disponible." />
          ) : (
            <div className="document-version-list">
              {versions.map((version) => (
                <article key={version.id}>
                  <div>
                    <strong>Version {version.version_number}</strong>
                    <span>{version.change_note || "Sans note"}</span>
                    <small>{version.file_name || historyDocument.name} · {formatDate(version.created_at)} · {formatSize(version.size_bytes)}</small>
                  </div>
                  <div>
                    <button type="button" className="data-button data-button--ghost" onClick={() => void downloadDocumentVersion(version, version.file_name || historyDocument.name)} title="Télécharger"><Download size={15} /></button>
                    {canManageDocuments && version.storage_path !== historyDocument.storage_path && (
                      <button type="button" className="data-button data-button--secondary" disabled={submitting} onClick={() => void restoreVersion(version)}>Restaurer</button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </Modal>
      )}

      {documentToDelete && (
        <ConfirmDialog
          title="Supprimer ce document ?"
          description={`« ${documentToDelete.name} » et toutes ses versions seront définitivement supprimés.`}
          confirmLabel="Supprimer le document"
          loading={submitting}
          error={formError}
          icon={Trash2}
          onCancel={() => !submitting && setDocumentToDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </div>
  );
}

export default DocumentsPage;
