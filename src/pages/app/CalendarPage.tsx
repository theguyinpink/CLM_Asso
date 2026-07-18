import type { FormEvent } from "react";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit3,
  GraduationCap,
  MapPin,
  Plus,
  Search,
  Trash2,
  Trophy,
  UsersRound,
} from "lucide-react";

import { Link, useSearchParams } from "react-router";

import ConfirmDialog from "../../components/app/shared/ConfirmDialog";
import Modal from "../../components/app/shared/Modal";
import PageHeader from "../../components/app/shared/PageHeader";

import {
  ErrorState,
  LoadingState,
} from "../../components/app/shared/PageState";

import { useAuth } from "../../hooks/useAuth";
import { useClub } from "../../hooks/useClub";
import { usePermissions } from "../../hooks/usePermissions";

import {
  createEvent,
  deleteEvent,
  listEvents,
  listMatches,
  listTeams,
  updateEvent,
} from "../../services/clmAssoService";

import type {
  ClubEvent,
  ClubMatch,
  EventType,
  Team,
} from "../../types/database";

import "../../styles/data-pages.css";
import "../../styles/calendar.css";

interface EventDraft {
  title: string;
  event_type: EventType;
  date: string;
  time: string;
  end_time: string;
  team_id: string;
  location: string;
  description: string;
}

type CalendarItem =
  | {
      kind: "event";
      id: string;
      title: string;
      startsAt: string;
      location: string | null;
      type: EventType;
      teamName: string;
      event: ClubEvent;
    }
  | {
      kind: "match";
      id: string;
      title: string;
      startsAt: string;
      location: string | null;
      type: "match";
      teamName: string;
      match: ClubMatch;
    };

interface CalendarCell {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
}

const weekdayLabels = ["LUN.", "MAR.", "MER.", "JEU.", "VEN.", "SAM.", "DIM."];

const typeLabels: Record<EventType, string> = {
  training: "Entraînement",
  meeting: "Réunion",
  club: "Événement du club",
  stage: "Stage / formation",
  other: "Autre",
};

function formatDateKey(date: Date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function dateInputValue(date = new Date()) {
  return formatDateKey(date);
}

function createEmptyDraft(date = dateInputValue()): EventDraft {
  return {
    title: "",
    event_type: "training",
    date,
    time: "18:00",
    end_time: "19:30",
    team_id: "",
    location: "",
    description: "",
  };
}

function toLocalParts(value: string) {
  const date = new Date(value);

  return {
    date: formatDateKey(date),
    time: `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes(),
    ).padStart(2, "0")}`,
  };
}

function getMonthCells(displayedMonth: Date): CalendarCell[] {
  const year = displayedMonth.getFullYear();

  const month = displayedMonth.getMonth();

  const firstDay = new Date(year, month, 1);

  const mondayOffset = (firstDay.getDay() + 6) % 7;

  const firstCell = new Date(year, month, 1 - mondayOffset);

  return Array.from(
    {
      length: 42,
    },
    (_, index) => {
      const date = new Date(firstCell);

      date.setDate(firstCell.getDate() + index);

      return {
        date,
        dateKey: formatDateKey(date),

        isCurrentMonth: date.getMonth() === month,
      };
    },
  );
}

function formatMonthTitle(date: Date) {
  const title = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(date);

  return title.charAt(0).toUpperCase() + title.slice(1);
}

function formatSelectedDate(dateKey: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseDateKey(dateKey));
}

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { user } = useAuth();
  const { activeClub } = useClub();
  const { canManageCalendar } = usePermissions();

  const [events, setEvents] = useState<ClubEvent[]>([]);

  const [matches, setMatches] = useState<ClubMatch[]>([]);

  const [teams, setTeams] = useState<Team[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [teamFilter, setTeamFilter] = useState("all");

  const [typeFilter, setTypeFilter] = useState("all");

  const [displayedMonth, setDisplayedMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  const [selectedDate, setSelectedDate] = useState(() => dateInputValue());

  const [modalOpen, setModalOpen] = useState(false);

  const [editing, setEditing] = useState<ClubEvent | null>(null);

  const [draft, setDraft] = useState<EventDraft>(createEmptyDraft());

  const [submitting, setSubmitting] = useState(false);

  const [formError, setFormError] = useState("");

  const [eventToDelete, setEventToDelete] = useState<ClubEvent | null>(null);

  const [deletingEvent, setDeletingEvent] = useState(false);

  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    if (!activeClub) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [nextEvents, nextMatches, nextTeams] = await Promise.all([
        listEvents(activeClub.id),
        listMatches(activeClub.id),
        listTeams(activeClub.id),
      ]);

      setEvents(nextEvents);
      setMatches(nextMatches);
      setTeams(nextTeams);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de charger le calendrier.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeClub]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = useCallback((requestedDate = selectedDate) => {
    setEditing(null);
    setDraft(createEmptyDraft(requestedDate));
    setSelectedDate(requestedDate);
    setFormError("");
    setModalOpen(true);
  }, [selectedDate]);

  useEffect(() => {
    const shouldCreateEvent = searchParams.get("new") === "1";
    const requestedDate = searchParams.get("date");

    const hasValidRequestedDate = Boolean(
      requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate),
    );

    if (!shouldCreateEvent && !hasValidRequestedDate) {
      return;
    }

    const validDate = hasValidRequestedDate
      ? requestedDate!
      : dateInputValue();

    const date = parseDateKey(validDate);

    setSelectedDate(validDate);
    setDisplayedMonth(new Date(date.getFullYear(), date.getMonth(), 1));

    /*
     * Une date seule sélectionne simplement la journée.
     * Le formulaire de création ne s'ouvre que lorsque
     * le paramètre ?new=1 est explicitement présent.
     */
    if (shouldCreateEvent) {
      openCreate(validDate);
    }

    const nextParams = new URLSearchParams(searchParams);

    nextParams.delete("new");
    nextParams.delete("date");

    setSearchParams(nextParams, {
      replace: true,
    });
  }, [openCreate, searchParams, setSearchParams]);

  const allItems = useMemo<CalendarItem[]>(() => {
    const eventItems: CalendarItem[] = events.map((event) => ({
      kind: "event",
      id: event.id,
      title: event.title,
      startsAt: event.starts_at,
      location: event.location,
      type: event.event_type,
      teamName: event.team?.name ?? "Tout le club",
      event,
    }));

    const matchItems: CalendarItem[] = matches.map((match) => ({
      kind: "match",
      id: match.id,
      title: `${match.team?.name ?? "Club"} — ` + match.opponent_name,
      startsAt: match.starts_at,
      location: match.location,
      type: "match",
      teamName: match.team?.name ?? "Équipe non renseignée",
      match,
    }));

    return [...eventItems, ...matchItems];
  }, [events, matches]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return allItems.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.teamName.toLowerCase().includes(normalizedSearch) ||
        (item.location ?? "").toLowerCase().includes(normalizedSearch);

      const matchesType = typeFilter === "all" || item.type === typeFilter;

      const matchesTeam =
        teamFilter === "all" ||
        (item.kind === "event" ? item.event.team_id : item.match.team_id) ===
          teamFilter;

      return matchesSearch && matchesType && matchesTeam;
    });
  }, [allItems, search, teamFilter, typeFilter]);

  const itemsByDate = useMemo(() => {
    const result = new Map<string, CalendarItem[]>();

    filteredItems.forEach((item) => {
      const dateKey = formatDateKey(new Date(item.startsAt));

      const current = result.get(dateKey) ?? [];

      result.set(dateKey, [...current, item]);
    });

    result.forEach((items, dateKey) => {
      result.set(
        dateKey,
        [...items].sort((firstItem, secondItem) =>
          firstItem.startsAt.localeCompare(secondItem.startsAt),
        ),
      );
    });

    return result;
  }, [filteredItems]);

  const monthCells = useMemo(
    () => getMonthCells(displayedMonth),
    [displayedMonth],
  );

  const selectedDayItems = itemsByDate.get(selectedDate) ?? [];

  function goToPreviousMonth() {
    setDisplayedMonth(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  }

  function goToNextMonth() {
    setDisplayedMonth(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  }

  function goToToday() {
    const today = new Date();
    const todayKey = formatDateKey(today);

    setSelectedDate(todayKey);

    setDisplayedMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  function selectDate(dateKey: string) {
    setSelectedDate(dateKey);

    const date = parseDateKey(dateKey);

    if (
      date.getMonth() !== displayedMonth.getMonth() ||
      date.getFullYear() !== displayedMonth.getFullYear()
    ) {
      setDisplayedMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }

  function openEdit(clubEvent: ClubEvent) {
    const start = toLocalParts(clubEvent.starts_at);

    const end = clubEvent.ends_at
      ? toLocalParts(clubEvent.ends_at)
      : {
          time: "",
        };

    setEditing(clubEvent);

    setDraft({
      title: clubEvent.title,
      event_type: clubEvent.event_type,
      date: start.date,
      time: start.time,
      end_time: end.time,
      team_id: clubEvent.team_id ?? "",
      location: clubEvent.location ?? "",
      description: clubEvent.description ?? "",
    });

    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();

    if (!activeClub || !user) {
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const startsAt = new Date(`${draft.date}T${draft.time}`).toISOString();

      const endsAt = draft.end_time
        ? new Date(`${draft.date}T${draft.end_time}`).toISOString()
        : null;

      const payload = {
        title: draft.title.trim(),

        event_type: draft.event_type,

        starts_at: startsAt,

        ends_at: endsAt,

        team_id: draft.team_id || null,

        location: draft.location.trim() || null,

        description: draft.description.trim() || null,
      };

      if (editing) {
        await updateEvent(editing.id, payload);
      } else {
        await createEvent(activeClub.id, user.id, payload);
      }

      const eventDate = parseDateKey(draft.date);

      setSelectedDate(draft.date);

      setDisplayedMonth(
        new Date(eventDate.getFullYear(), eventDate.getMonth(), 1),
      );

      setModalOpen(false);

      await load();
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible d’enregistrer l’événement.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function requestEventDeletion(clubEvent: ClubEvent) {
    setDeleteError("");
    setEventToDelete(clubEvent);
  }

  async function confirmEventDeletion() {
    if (!eventToDelete) {
      return;
    }

    setDeletingEvent(true);
    setDeleteError("");

    try {
      await deleteEvent(eventToDelete.id);

      setEventToDelete(null);
      setModalOpen(false);

      await load();
    } catch (caughtError) {
      setDeleteError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de supprimer l’événement.",
      );
    } finally {
      setDeletingEvent(false);
    }
  }

  function getItemIcon(item: CalendarItem) {
    if (item.kind === "match") {
      return Trophy;
    }

    switch (item.type) {
      case "training":
        return CalendarClock;

      case "meeting":
        return UsersRound;

      case "stage":
        return GraduationCap;

      case "club":
      case "other":
        return CalendarDays;
    }
  }

  if (loading) {
    return <LoadingState label="Chargement du calendrier…" />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <div className="calendar-page">
      <PageHeader
        icon={CalendarDays}
        title="Calendrier"
        description="Tous les entraînements, réunions, événements et matchs du club."
        actionLabel={canManageCalendar ? "Nouvel événement" : undefined}
        onAction={canManageCalendar ? () => openCreate() : undefined}
      />

      <section className="calendar-toolbar">
        <label className="calendar-search">
          <Search size={18} />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un événement…"
          />
        </label>

        <label className="calendar-filter">
          <select
            value={teamFilter}
            onChange={(event) => setTeamFilter(event.target.value)}
          >
            <option value="all">Toutes les équipes</option>

            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>

        <label className="calendar-filter">
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="all">Tous les types</option>

            <option value="match">Match</option>

            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="calendar-layout">
        <article className="calendar-main-panel">
          <header className="calendar-navigation">
            <div>
              <button
                type="button"
                onClick={goToPreviousMonth}
                aria-label="Mois précédent"
              >
                <ChevronLeft size={19} />
              </button>

              <button
                type="button"
                onClick={goToNextMonth}
                aria-label="Mois suivant"
              >
                <ChevronRight size={19} />
              </button>
            </div>

            <h2>{formatMonthTitle(displayedMonth)}</h2>

            <button
              type="button"
              className="calendar-today-button"
              onClick={goToToday}
            >
              Aujourd’hui
            </button>
          </header>

          <div className="calendar-month-view">
            <div className="calendar-weekdays">
              {weekdayLabels.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>

            <div className="calendar-month-grid">
              {monthCells.map((cell) => {
                const dayItems = itemsByDate.get(cell.dateKey) ?? [];

                const isToday = cell.dateKey === dateInputValue();

                return (
                  <div
                    key={cell.dateKey}
                    className={[
                      "calendar-month-cell",

                      !cell.isCurrentMonth ? "calendar-month-cell--muted" : "",

                      selectedDate === cell.dateKey
                        ? "calendar-month-cell--selected"
                        : "",

                      isToday ? "calendar-month-cell--today" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => selectDate(cell.dateKey)}
                  >
                    <button
                      type="button"
                      className="calendar-day-number"
                      onClick={(event) => {
                        event.stopPropagation();

                        selectDate(cell.dateKey);
                      }}
                    >
                      {cell.date.getDate()}
                    </button>

                    <div className="calendar-cell-events">
                      {dayItems.slice(0, 3).map((item) => {
                        const Icon = getItemIcon(item);

                        if (item.kind === "match") {
                          return (
                            <Link
                              key={`match-${item.id}`}
                              className="calendar-event-chip calendar-event-chip--match"
                              to={`/app/matchs/${item.id}`}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <Icon size={12} />

                              <span>{formatEventTime(item.startsAt)}</span>

                              <strong>{item.title}</strong>
                            </Link>
                          );
                        }

                        return (
                          <button
                            type="button"
                            key={`event-${item.id}`}
                            className={`calendar-event-chip calendar-event-chip--${item.type}`}
                            onClick={(event) => {
                              event.stopPropagation();

                              if (canManageCalendar) {
                                openEdit(item.event);
                              }
                            }}
                            disabled={!canManageCalendar}
                          >
                            <Icon size={12} />

                            <span>{formatEventTime(item.startsAt)}</span>

                            <strong>{item.title}</strong>
                          </button>
                        );
                      })}

                      {dayItems.length > 3 && (
                        <span className="calendar-more-events">
                          +{dayItems.length - 3} autre
                          {dayItems.length - 3 > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {canManageCalendar && (
                    <button
                      type="button"
                      className="calendar-cell-add"
                      onClick={(event) => {
                        event.stopPropagation();

                        openCreate(cell.dateKey);
                      }}
                      aria-label={`Ajouter un événement le ${cell.date.getDate()}`}
                    >
                      <Plus size={13} />
                    </button>
                    )}
                  </div>
                );
              })}
            </div>

            <footer className="calendar-legend">
              <span>
                <i className="calendar-legend-dot calendar-legend-dot--match" />
                Match
              </span>

              {Object.entries(typeLabels).map(([type, label]) => (
                <span key={type}>
                  <i
                    className={`calendar-legend-dot calendar-legend-dot--${type}`}
                  />

                  {label}
                </span>
              ))}
            </footer>
          </div>
        </article>

        <aside className="calendar-side-panel">
          <header>
            <div>
              <span>Journée sélectionnée</span>

              <h2>{formatSelectedDate(selectedDate)}</h2>
            </div>

            {canManageCalendar && (
              <button
                type="button"
                onClick={() => openCreate(selectedDate)}
                aria-label="Ajouter un événement à cette date"
              >
                <Plus size={18} />
              </button>
            )}
          </header>

          {selectedDayItems.length === 0 ? (
            <div className="calendar-day-empty">
              <CalendarDays size={30} />

              <strong>Rien de prévu</strong>

              <p>Aucun événement ni match n’est enregistré à cette date.</p>

              {canManageCalendar && (
                <button type="button" onClick={() => openCreate(selectedDate)}>
                  <Plus size={16} />
                  Ajouter un événement
                </button>
              )}
            </div>
          ) : (
            <div className="calendar-day-list">
              {selectedDayItems.map((item) => {
                const Icon = getItemIcon(item);

                return (
                  <article
                    className={`calendar-day-event calendar-day-event--${item.type}`}
                    key={`${item.kind}-${item.id}`}
                  >
                    <div className="calendar-day-event__icon">
                      <Icon size={18} />
                    </div>

                    <div className="calendar-day-event__content">
                      <span>{formatEventTime(item.startsAt)}</span>

                      <strong>{item.title}</strong>

                      <small>{item.teamName}</small>

                      {item.location && (
                        <small>
                          <MapPin size={12} />
                          {item.location}
                        </small>
                      )}
                    </div>

                    {item.kind === "match" ? (
                      <Link
                        to={`/app/matchs/${item.id}`}
                        aria-label="Ouvrir le match"
                      >
                        Ouvrir
                      </Link>
                    ) : canManageCalendar ? (
                      <button
                        type="button"
                        onClick={() => openEdit(item.event)}
                        aria-label="Modifier l’événement"
                      >
                        <Edit3 size={16} />
                      </button>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </aside>
      </section>

      {modalOpen && (
        <Modal
          title={editing ? "Modifier l’événement" : "Nouvel événement"}
          onClose={() => {
            if (!submitting) {
              setModalOpen(false);
            }
          }}
        >
          <form className="data-form" onSubmit={handleSubmit}>
            <div className="data-form-grid">
              <label className="data-field data-field--full">
                Titre
                <input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      title: event.target.value,
                    })
                  }
                  required
                />
              </label>

              <label className="data-field">
                Type
                <select
                  value={draft.event_type}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      event_type: event.target.value as EventType,
                    })
                  }
                >
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="data-field">
                Équipe
                <select
                  value={draft.team_id}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      team_id: event.target.value,
                    })
                  }
                >
                  <option value="">Tout le club</option>

                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="data-field">
                Date
                <input
                  type="date"
                  value={draft.date}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      date: event.target.value,
                    })
                  }
                  required
                />
              </label>

              <label className="data-field">
                Début
                <input
                  type="time"
                  value={draft.time}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      time: event.target.value,
                    })
                  }
                  required
                />
              </label>

              <label className="data-field">
                Fin
                <input
                  type="time"
                  value={draft.end_time}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      end_time: event.target.value,
                    })
                  }
                />
              </label>

              <label className="data-field data-field--full">
                Lieu
                <input
                  value={draft.location}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      location: event.target.value,
                    })
                  }
                />
              </label>

              <label className="data-field data-field--full">
                Description
                <textarea
                  value={draft.description}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      description: event.target.value,
                    })
                  }
                />
              </label>
            </div>

            {formError && <div className="data-form__error">{formError}</div>}

            <div className="data-form__actions data-form__actions--between">
              <div>
                {editing && canManageCalendar && (
                  <button
                    type="button"
                    className="data-button data-button--danger"
                    onClick={() => requestEventDeletion(editing)}
                    disabled={submitting}
                  >
                    <Trash2 size={16} />
                    Supprimer
                  </button>
                )}
              </div>

              <div className="data-form__actions-group">
                <button
                  type="button"
                  className="data-button data-button--secondary"
                  onClick={() => setModalOpen(false)}
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
            </div>
          </form>
        </Modal>
      )}

      {eventToDelete && (
        <ConfirmDialog
          title="Supprimer cet événement ?"
          description={`L’événement « ${eventToDelete.title} » sera définitivement supprimé du calendrier.`}
          confirmLabel="Supprimer l’événement"
          loading={deletingEvent}
          error={deleteError}
          icon={Trash2}
          onCancel={() => {
            if (!deletingEvent) {
              setEventToDelete(null);
              setDeleteError("");
            }
          }}
          onConfirm={() => void confirmEventDeletion()}
        />
      )}
    </div>
  );
}

export default CalendarPage;