import {
  CalendarDays,
  CheckSquare2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Megaphone,
  Trophy,
  UserCheck,
  UsersRound,
} from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Link, useNavigate } from "react-router";

import DashboardPanel from "../../components/app/DashboardPanel";
import DashboardStatCard from "../../components/app/DashboardStatCard";

import {
  ErrorState,
  LoadingState,
} from "../../components/app/shared/PageState";

import { useClub } from "../../hooks/useClub";
import { useProfile } from "../../hooks/useProfile";
import { usePermissions } from "../../hooks/usePermissions";
import { useToast } from "../../hooks/useToast";

import {
  getDashboardData,
  updateTaskStatus,
} from "../../services/clmAssoService";

import type {
  AnnouncementType,
  ClubTask,
  DashboardActivityKind,
  DashboardData,
  EventType,
  TaskPriority,
} from "../../types/database";

const weekDays = ["LUN.", "MAR.", "MER.", "JEU.", "VEN.", "SAM.", "DIM."];

const activityIcons = {
  announcement: Megaphone,
  task: CheckSquare2,
  event: CalendarDays,
  match: Trophy,
  convocation: ClipboardCheck,
  member: UserCheck,
} satisfies Record<DashboardActivityKind, typeof Megaphone>;

const activityTones = {
  announcement: "blue",
  task: "orange",
  event: "green",
  match: "purple",
  convocation: "blue",
  member: "green",
} satisfies Record<
  DashboardActivityKind,
  "blue" | "green" | "orange" | "purple"
>;

const eventDotTones: Record<EventType, "green" | "orange" | "blue" | "red"> = {
  training: "green",
  meeting: "orange",
  club: "blue",
  stage: "blue",
  other: "red",
};

const announcementTones: Record<
  AnnouncementType,
  "blue" | "green" | "orange" | "purple"
> = {
  important: "orange",
  event: "blue",
  club: "green",
  organization: "purple",
  information: "blue",
};

const priorityLabels: Record<TaskPriority, string> = {
  low: "Basse",
  normal: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

function toDateKey(date: Date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatMatchDate(value: string) {
  const date = new Date(value);

  return {
    weekDay: new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
    })
      .format(date)
      .replace(".", "")
      .toUpperCase(),

    day: new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
    }).format(date),

    month: new Intl.DateTimeFormat("fr-FR", {
      month: "short",
    })
      .format(date)
      .replace(".", "")
      .toUpperCase(),

    time: new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatRelativeTime(value: string) {
  const difference = Date.now() - new Date(value).getTime();

  const minutes = Math.max(0, Math.floor(difference / 60_000));

  if (minutes < 1) {
    return "À l’instant";
  }

  if (minutes < 60) {
    return `Il y a ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `Il y a ${hours} h`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `Il y a ${days} j`;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function getCalendarDays(visibleMonth: Date) {
  const year = visibleMonth.getFullYear();

  const month = visibleMonth.getMonth();

  const firstDay = new Date(year, month, 1);

  const mondayOffset = (firstDay.getDay() + 6) % 7;

  const gridStart = new Date(year, month, 1 - mondayOffset);

  return Array.from(
    {
      length: 42,
    },
    (_, index) => {
      const date = new Date(gridStart);

      date.setDate(gridStart.getDate() + index);

      return date;
    },
  );
}

function DashboardEmpty({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
}: {
  icon: typeof Trophy;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
}) {
  return (
    <div className="dashboard-empty">
      <span className="dashboard-empty__icon">
        <Icon size={25} />
      </span>

      <strong>{title}</strong>

      <p>{description}</p>

      {actionLabel && actionTo ? (
        <Link to={actionTo}>{actionLabel}</Link>
      ) : null}
    </div>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const { canManageTasks } = usePermissions();
  const { showToast } = useToast();

  const { activeClub } = useClub();

  const { profile } = useProfile();

  const [data, setData] = useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeClub) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      setData(await getDashboardData(activeClub.id));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de charger le tableau de bord.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeClub]);

  useEffect(() => {
    void load();
  }, [load]);

  const calendarDays = useMemo(
    () => getCalendarDays(visibleMonth),
    [visibleMonth],
  );

  const calendarIndicators = useMemo(() => {
    const indicators = new Map<
      string,
      Array<"green" | "orange" | "blue" | "red">
    >();

    function addIndicator(
      dateValue: string,
      tone: "green" | "orange" | "blue" | "red",
    ) {
      const key = toDateKey(new Date(dateValue));

      const current = indicators.get(key) ?? [];

      if (!current.includes(tone) && current.length < 3) {
        indicators.set(key, [...current, tone]);
      }
    }

    data?.calendarEvents.forEach((event) => {
      addIndicator(event.starts_at, eventDotTones[event.event_type]);
    });

    data?.calendarMatches.forEach((match) => {
      addIndicator(match.starts_at, "red");
    });

    return indicators;
  }, [data]);

  const firstName =
    profile?.firstName?.trim() ||
    profile?.displayName?.trim().split(" ")[0] ||
    "membre";

  if (loading) {
    return <LoadingState label="Chargement du tableau de bord…" />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  if (!data || !activeClub) {
    return null;
  }

  const stats = [
    {
      label: "Équipes",
      value: data.teamsCount,
      detail:
        `${data.teamsCount} enregistrée` + `${data.teamsCount > 1 ? "s" : ""}`,
      tone: "blue" as const,
      icon: UsersRound,
    },
    {
      label: "Matchs à venir",
      value: data.upcomingMatchesCount,
      detail: "Rencontres programmées",
      tone: "green" as const,
      icon: Trophy,
    },
    {
      label: "Tâches en attente",
      value: data.openTasksCount,
      detail: "Actions à traiter",
      tone: "orange" as const,
      icon: CheckSquare2,
    },
    {
      label: "Convocations",
      value: data.convocationsCount,
      detail: "En attente de réponses",
      tone: "purple" as const,
      icon: ClipboardCheck,
    },
    {
      label: "Annonces",
      value: data.announcementsCount,
      detail: "Informations publiées",
      tone: "blue" as const,
      icon: Megaphone,
    },
    {
      label: "Membres",
      value: data.membersCount,
      detail: "Membres actifs",
      tone: "green" as const,
      icon: UserCheck,
    },
  ];

  async function completeTask(task: ClubTask) {
    setUpdatingTaskId(task.id);

    try {
      await updateTaskStatus(task.id, "completed");

      await load();
      showToast("La tâche est terminée.", "success");
    } catch (caughtError) {
      showToast(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de terminer la tâche.",
        "error",
      );
    } finally {
      setUpdatingTaskId(null);
    }
  }

  const monthTitle = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);

  const todayKey = toDateKey(new Date());

  return (
    <div className="dashboard-page">
      <section className="dashboard-welcome">
        <h1>Bonjour {firstName} 👋</h1>

        <p>Voici ce qui se passe chez {activeClub.name} aujourd’hui.</p>
      </section>

      <section className="dashboard-stats" aria-label="Statistiques du club">
        {stats.map((stat) => (
          <DashboardStatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="dashboard-grid">
        <DashboardPanel
          title="Prochains matchs"
          actionLabel="Voir tout"
          actionTo="/app/matchs"
        >
          {data.upcomingMatches.length === 0 ? (
            <DashboardEmpty
              icon={Trophy}
              title="Aucun match à venir"
              description="Ajoutez une rencontre depuis la page Matchs."
              actionLabel="Ajouter un match"
              actionTo="/app/matchs"
            />
          ) : (
            data.upcomingMatches.slice(0, 3).map((match) => {
              const date = formatMatchDate(match.starts_at);

              return (
                <Link
                  className="match-row"
                  key={match.id}
                  to={`/app/matchs/${match.id}`}
                >
                  <span className="match-row__date">
                    <small>{date.weekDay}</small>

                    <strong>{date.day}</strong>

                    <span>{date.month}</span>
                  </span>

                  <span className="match-row__details">
                    <strong>{match.team?.name ?? "Équipe du club"}</strong>

                    <span>vs {match.opponent_name}</span>

                    <small>{match.location || "Lieu à définir"}</small>
                  </span>

                  <span className="match-row__time">
                    <strong>{date.time}</strong>

                    <span
                      className={
                        `match-venue ` +
                        `${
                          match.is_home
                            ? "match-venue--home"
                            : "match-venue--away"
                        }`
                      }
                    >
                      {match.is_home ? "Domicile" : "Extérieur"}
                    </span>
                  </span>
                </Link>
              );
            })
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Dernières annonces"
          actionLabel="Voir tout"
          actionTo="/app/annonces"
        >
          {data.latestAnnouncements.length === 0 ? (
            <DashboardEmpty
              icon={Megaphone}
              title="Aucune annonce"
              description="Les annonces publiées apparaîtront ici."
              actionLabel="Créer une annonce"
              actionTo="/app/annonces"
            />
          ) : (
            data.latestAnnouncements.slice(0, 3).map((announcement) => {
              const tone = announcementTones[announcement.announcement_type];

              return (
                <Link
                  className="announcement-row"
                  key={announcement.id}
                  to="/app/annonces"
                >
                  <span
                    className={
                      `dashboard-list-icon ` + `dashboard-list-icon--${tone}`
                    }
                  >
                    <Megaphone size={18} />
                  </span>

                  <span className="announcement-row__content">
                    <strong>{announcement.title}</strong>

                    <p>{announcement.content}</p>
                  </span>

                  <time>
                    {formatRelativeTime(
                      announcement.published_at ?? announcement.created_at,
                    )}
                  </time>
                </Link>
              );
            })
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Calendrier"
          actionLabel="Voir le calendrier"
          actionTo="/app/calendrier"
        >
          <div className="mini-calendar">
            <div className="mini-calendar__header">
              <button
                type="button"
                onClick={() =>
                  setVisibleMonth(
                    (currentMonth) =>
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() - 1,
                        1,
                      ),
                  )
                }
                aria-label="Mois précédent"
              >
                <ChevronLeft size={18} />
              </button>

              <strong>{monthTitle}</strong>

              <button
                type="button"
                onClick={() =>
                  setVisibleMonth(
                    (currentMonth) =>
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() + 1,
                        1,
                      ),
                  )
                }
                aria-label="Mois suivant"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="mini-calendar__weekdays">
              {weekDays.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="mini-calendar__days">
              {calendarDays.map((date) => {
                const key = toDateKey(date);

                const isCurrentMonth =
                  date.getMonth() === visibleMonth.getMonth();

                const isToday = key === todayKey;

                const indicators = calendarIndicators.get(key) ?? [];

                return (
                  <button
                    type="button"
                    key={key}
                    className={[
                      "mini-calendar__day",

                      !isCurrentMonth ? "mini-calendar__day--muted" : "",

                      isToday ? "mini-calendar__day--active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => navigate(`/app/calendrier?date=${key}`)}
                  >
                    <span>{date.getDate()}</span>

                    {indicators.length > 0 ? (
                      <span className="calendar-event-dots">
                        {indicators.map((tone, index) => (
                          <span
                            className={
                              `calendar-dot ` + `calendar-dot--${tone}`
                            }
                            key={`${tone}-${index}`}
                          />
                        ))}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <p className="mini-calendar__hint">
              Cliquez sur une date pour consulter la journée.
            </p>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Tâches à faire"
          actionLabel="Voir tout"
          actionTo="/app/taches"
        >
          {data.openTasks.length === 0 ? (
            <DashboardEmpty
              icon={CheckSquare2}
              title="Aucune tâche ouverte"
              description="Tout est à jour pour le moment."
            />
          ) : (
            data.openTasks.slice(0, 3).map((task) => (
              <div className="task-row" key={task.id}>
                <input
                  type="checkbox"
                  checked={false}
                  disabled={
                    (!canManageTasks &&
                      task.assignee?.user_id !== profile?.id) ||
                    updatingTaskId === task.id
                  }
                  aria-label={`Terminer ${task.title}`}
                  onChange={() => void completeTask(task)}
                />

                <div>
                  <strong>{task.title}</strong>

                  <span>
                    {task.assignee
                      ? `${task.assignee.first_name} ${task.assignee.last_name}`
                      : task.category}

                    {task.due_at ? ` · ${formatShortDate(task.due_at)}` : ""}
                  </span>
                </div>

                <span
                  className={
                    `task-priority ` +
                    `${
                      task.priority === "urgent" || task.priority === "high"
                        ? "task-priority--red"
                        : task.priority === "normal"
                          ? "task-priority--blue"
                          : "task-priority--green"
                    }`
                  }
                >
                  {priorityLabels[task.priority]}
                </span>
              </div>
            ))
          )}

          {canManageTasks && (
            <Link className="dashboard-add-button" to="/app/taches?new=1">
              + Ajouter une tâche
            </Link>
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Convocations en attente"
          actionLabel="Voir tout"
          actionTo="/app/convocations"
        >
          {data.pendingConvocations.length === 0 ? (
            <DashboardEmpty
              icon={ClipboardCheck}
              title="Aucune convocation en attente"
              description="Les convocations envoyées apparaîtront ici."
              actionLabel="Créer une convocation"
              actionTo="/app/convocations"
            />
          ) : (
            data.pendingConvocations.slice(0, 3).map((convocation) => {
              const recipients = convocation.recipients ?? [];

              const answered = recipients.filter(
                (recipient) => recipient.response !== "pending",
              ).length;

              const dateValue =
                convocation.match?.starts_at ??
                convocation.response_deadline ??
                convocation.created_at;

              return (
                <Link
                  className="invitation-row"
                  key={convocation.id}
                  to="/app/convocations"
                >
                  <span className="dashboard-list-icon dashboard-list-icon--purple">
                    <ClipboardCheck size={18} />
                  </span>

                  <span className="invitation-row__content">
                    <strong>{convocation.title}</strong>

                    <span>
                      {formatShortDate(dateValue)}

                      {convocation.team?.name
                        ? ` · ${convocation.team.name}`
                        : ""}
                    </span>
                  </span>

                  <span className="invitation-row__responses">
                    <strong>
                      {answered} / {recipients.length}
                    </strong>

                    <small>réponses</small>
                  </span>
                </Link>
              );
            })
          )}
        </DashboardPanel>

        <DashboardPanel title="Activité récente">
          {data.recentActivity.length === 0 ? (
            <DashboardEmpty
              icon={UserCheck}
              title="Aucune activité récente"
              description="Les nouvelles actions du club apparaîtront ici."
            />
          ) : (
            data.recentActivity.slice(0, 4).map((activity) => {
              const Icon = activityIcons[activity.kind];

              const tone = activityTones[activity.kind];

              return (
                <Link
                  className="activity-row"
                  key={activity.id}
                  to={activity.href}
                >
                  <span
                    className={
                      `dashboard-list-icon ` + `dashboard-list-icon--${tone}`
                    }
                  >
                    <Icon size={18} />
                  </span>

                  <span className="activity-row__content">
                    <strong>{activity.title}</strong>

                    <span>{activity.description}</span>
                  </span>

                  <time>{formatRelativeTime(activity.occurredAt)}</time>
                </Link>
              );
            })
          )}
        </DashboardPanel>
      </section>
    </div>
  );
}

export default DashboardPage;
