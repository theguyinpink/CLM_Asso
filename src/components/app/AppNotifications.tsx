import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCheck,
  ClipboardCheck,
  ListTodo,
  Megaphone,
  MessageCircle,
} from "lucide-react";
import { useNavigate } from "react-router";

import { useAuth } from "../../hooks/useAuth";
import { useClub } from "../../hooks/useClub";
import { useToast } from "../../hooks/useToast";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/clmAssoService";
import { supabase } from "../../lib/supabase";
import type { ClubNotification } from "../../types/database";

function formatRelativeTime(value: string) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000),
  );

  if (seconds < 60) return "À l’instant";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Il y a ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days} j`;

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

const icons = {
  announcement: Megaphone,
  convocation: ClipboardCheck,
  task: ListTodo,
  calendar: CalendarDays,
  membership: CheckCheck,
  message: MessageCircle,
};

function AppNotifications({ onOpen }: { onOpen?: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeClub } = useClub();
  const { showToast } = useToast();

  const [open, setOpen] = useState(false);

  const [notifications, setNotifications] = useState<ClubNotification[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      setNotifications(await listNotifications(activeClub?.id));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de charger les notifications.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeClub, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`clm-asso-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clm_asso_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, user]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications],
  );

  async function openNotification(notification: ClubNotification) {
    try {
      if (!notification.read_at) {
        await markNotificationRead(notification.id);

        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  read_at: new Date().toISOString(),
                }
              : item,
          ),
        );
      }

      setOpen(false);

      if (notification.href) {
        navigate(notification.href);
      }
    } catch (caughtError) {
      showToast(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible d’ouvrir la notification.",
        "error",
      );
    }
  }

  async function markAll() {
    try {
      await markAllNotificationsRead(activeClub?.id);

      const now = new Date().toISOString();

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          read_at: item.read_at ?? now,
        })),
      );
    } catch (caughtError) {
      showToast(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de marquer les notifications comme lues.",
        "error",
      );
    }
  }

  return (
    <div className="app-header__dropdown-wrapper">
      <button
        type="button"
        className="app-header__notification"
        aria-label={`Notifications${
          unreadCount ? `, ${unreadCount} non lue(s)` : ""
        }`}
        onClick={() => {
          const next = !open;

          setOpen(next);

          if (next) {
            onOpen?.();
            void load();
          }
        }}
        aria-expanded={open}
      >
        <Bell size={21} />

        {unreadCount > 0 && <span>{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <section className="app-header__dropdown app-notifications-menu">
          <header>
            <div>
              <strong>Notifications</strong>

              <span>
                {unreadCount} non lue
                {unreadCount > 1 ? "s" : ""}
              </span>
            </div>

            {unreadCount > 0 && (
              <button type="button" onClick={() => void markAll()}>
                <CheckCheck size={15} />
                Tout lire
              </button>
            )}
          </header>

          <div className="app-notifications-list">
            {error ? (
              <p className="app-notifications-empty">{error}</p>
            ) : loading && notifications.length === 0 ? (
              <p className="app-notifications-empty">Chargement…</p>
            ) : notifications.length === 0 ? (
              <p className="app-notifications-empty">
                Aucune notification pour le moment.
              </p>
            ) : (
              notifications.map((notification) => {
                const Icon =
                  icons[notification.notification_type as keyof typeof icons] ??
                  Bell;

                return (
                  <button
                    type="button"
                    key={notification.id}
                    className={`app-notification-item ${
                      notification.read_at
                        ? ""
                        : "app-notification-item--unread"
                    }`}
                    onClick={() => void openNotification(notification)}
                  >
                    <span className="app-notification-item__icon">
                      <Icon size={16} />
                    </span>

                    <span className="app-notification-item__content">
                      <strong>{notification.title}</strong>

                      {notification.body && <span>{notification.body}</span>}

                      <time>{formatRelativeTime(notification.created_at)}</time>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default AppNotifications;
