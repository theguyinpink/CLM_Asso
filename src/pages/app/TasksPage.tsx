import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Edit3, ListChecks, Search, Trash2 } from "lucide-react";

import { useSearchParams } from "react-router";

import Modal from "../../components/app/shared/Modal";
import ConfirmDialog from "../../components/app/shared/ConfirmDialog";
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
  createTask,
  deleteTask,
  listMembers,
  listTasks,
  updateTask,
  updateTaskStatus,
} from "../../services/clmAssoService";
import type {
  ClubMember,
  ClubTask,
  TaskPriority,
  TaskStatus,
} from "../../types/database";
import "../../styles/data-pages.css";

interface Draft {
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_at: string;
  assignee_member_id: string;
}

const emptyDraft: Draft = {
  title: "",
  description: "",
  category: "Général",
  priority: "normal",
  status: "pending",
  due_at: "",
  assignee_member_id: "",
};
const statusLabels: Record<TaskStatus, string> = {
  pending: "En attente",
  in_progress: "En cours",
  completed: "Terminée",
};
const priorityLabels: Record<TaskPriority, string> = {
  low: "Faible",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
};

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function formatDate(value: string | null) {
  if (!value) return "Sans échéance";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { user } = useAuth();
  const { activeClub } = useClub();
  const { canManageTasks } = usePermissions();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<ClubTask[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClubTask | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [taskToDelete, setTaskToDelete] = useState<ClubTask | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    if (!activeClub) return;
    setLoading(true);
    setError("");
    try {
      const [nextTasks, nextMembers] = await Promise.all([
        listTasks(activeClub.id),
        listMembers(activeClub.id),
      ]);
      setTasks(nextTasks);
      setMembers(nextMembers);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de charger les tâches.",
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
    return tasks.filter(
      (task) =>
        (statusFilter === "all" || task.status === statusFilter) &&
        (!query ||
          task.title.toLowerCase().includes(query) ||
          (task.description ?? "").toLowerCase().includes(query) ||
          task.category.toLowerCase().includes(query)),
    );
  }, [search, statusFilter, tasks]);

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft);
    setFormError("");
    setModalOpen(true);
  }

  useEffect(() => {
    if (searchParams.get("new") !== "1") {
      return;
    }

    if (canManageTasks) openCreate();

    const nextSearchParams = new URLSearchParams(searchParams);

    nextSearchParams.delete("new");

    setSearchParams(nextSearchParams, {
      replace: true,
    });
  }, [canManageTasks, searchParams, setSearchParams]);
  function openEdit(task: ClubTask) {
    setEditing(task);
    setDraft({
      title: task.title,
      description: task.description ?? "",
      category: task.category,
      priority: task.priority,
      status: task.status,
      due_at: localDateTime(task.due_at),
      assignee_member_id: task.assignee_member_id ?? "",
    });
    setFormError("");
    setModalOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeClub || !user) return;
    setSubmitting(true);
    setFormError("");
    try {
      const payload = {
        ...draft,
        due_at: draft.due_at ? new Date(draft.due_at).toISOString() : null,
        assignee_member_id: draft.assignee_member_id || null,
      };
      if (editing) await updateTask(editing.id, payload);
      else await createTask(activeClub.id, user.id, payload);
      setModalOpen(false);
      await load();
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible d’enregistrer la tâche.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function setTaskStatus(task: ClubTask, status: TaskStatus) {
    try {
      await updateTaskStatus(task.id, status);
      await load();
      showToast("La tâche a été mise à jour.", "success");
    } catch (caughtError) {
      showToast(
        caughtError instanceof Error ? caughtError.message : "Mise à jour impossible.",
        "error",
      );
    }
  }

  async function confirmDelete() {
    if (!taskToDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteTask(taskToDelete.id);
      setTaskToDelete(null);
      showToast("La tâche a été supprimée.", "success");
      await load();
    } catch (caughtError) {
      setDeleteError(caughtError instanceof Error ? caughtError.message : "Suppression impossible.");
    } finally {
      setDeleting(false);
    }
  }

  const stats = {
    pending: tasks.filter((task) => task.status === "pending").length,
    progress: tasks.filter((task) => task.status === "in_progress").length,
    completed: tasks.filter((task) => task.status === "completed").length,
    overdue: tasks.filter(
      (task) =>
        task.status !== "completed" &&
        task.due_at &&
        new Date(task.due_at) < new Date(),
    ).length,
  };

  return (
    <div className="data-page">
      <PageHeader
        icon={ListChecks}
        title="Tâches"
        description="Répartissez les actions à réaliser dans le club."
        actionLabel={canManageTasks ? "Nouvelle tâche" : undefined}
        onAction={canManageTasks ? openCreate : undefined}
      />
      <section className="data-stats">
        <div className="data-stat">
          <span>En attente</span>
          <strong>{stats.pending}</strong>
        </div>
        <div className="data-stat">
          <span>En cours</span>
          <strong>{stats.progress}</strong>
        </div>
        <div className="data-stat">
          <span>Terminées</span>
          <strong>{stats.completed}</strong>
        </div>
        <div className="data-stat">
          <span>En retard</span>
          <strong>{stats.overdue}</strong>
        </div>
      </section>
      <div className="data-toolbar">
        <label className="data-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une tâche…"
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
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Aucune tâche"
          description="Créez la première tâche du club."
          actionLabel={canManageTasks ? "Créer une tâche" : undefined}
          onAction={canManageTasks ? openCreate : undefined}
        />
      ) : (
        <section className="data-list">
          {filtered.map((task) => (
            <article className="data-list-item" key={task.id}>
              <span className="data-list-item__main">
                <strong>{task.title}</strong>
                <span>
                  {task.category} ·{" "}
                  {task.assignee
                    ? `${task.assignee.first_name} ${task.assignee.last_name}`
                    : "Non assignée"}{" "}
                  · {formatDate(task.due_at)}
                </span>
                {task.description && <span>{task.description}</span>}
              </span>
              <div className="data-list-item__actions">
                <span
                  className={`data-badge ${task.priority === "urgent" ? "data-badge--red" : task.priority === "high" ? "data-badge--orange" : ""}`}
                >
                  {priorityLabels[task.priority]}
                </span>
                <select
                  value={task.status}
                  disabled={!canManageTasks && task.assignee?.user_id !== user?.id}
                  onChange={(event) =>
                    void setTaskStatus(task, event.target.value as TaskStatus)
                  }
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {canManageTasks && (
                  <>
                    <button
                      type="button"
                      className="data-button data-button--ghost"
                      onClick={() => openEdit(task)}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      type="button"
                      className="data-button data-button--ghost"
                      onClick={() => { setDeleteError(""); setTaskToDelete(task); }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
                {task.status !== "completed" &&
                  (canManageTasks || task.assignee?.user_id === user?.id) && (
                  <button
                    type="button"
                    className="data-button data-button--ghost"
                    title="Marquer terminée"
                    onClick={() => void setTaskStatus(task, "completed")}
                  >
                    <CheckCircle2 size={16} />
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
      {modalOpen && (
        <Modal
          title={editing ? "Modifier la tâche" : "Nouvelle tâche"}
          onClose={() => setModalOpen(false)}
        >
          <form className="data-form" onSubmit={save}>
            <div className="data-form-grid">
              <label className="data-field data-field--full">
                Titre
                <input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft({ ...draft, title: event.target.value })
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
                />
              </label>
              <label className="data-field">
                Responsable
                <select
                  value={draft.assignee_member_id}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      assignee_member_id: event.target.value,
                    })
                  }
                >
                  <option value="">Non assignée</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="data-field">
                Priorité
                <select
                  value={draft.priority}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      priority: event.target.value as TaskPriority,
                    })
                  }
                >
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="data-field">
                Statut
                <select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      status: event.target.value as TaskStatus,
                    })
                  }
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="data-field data-field--full">
                Échéance
                <input
                  type="datetime-local"
                  value={draft.due_at}
                  onChange={(event) =>
                    setDraft({ ...draft, due_at: event.target.value })
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
                type="button"
                className="data-button data-button--secondary"
                onClick={() => setModalOpen(false)}
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

      {taskToDelete && (
        <ConfirmDialog
          title="Supprimer cette tâche ?"
          description={`La tâche « ${taskToDelete.title} » sera définitivement supprimée.`}
          confirmLabel="Supprimer la tâche"
          loading={deleting}
          error={deleteError}
          icon={Trash2}
          onCancel={() => !deleting && setTaskToDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </div>
  );
}

export default TasksPage;
