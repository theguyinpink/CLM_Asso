import {
  Building2,
  CircleDollarSign,
  ExternalLink,
  LayoutDashboard,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router";

import { supabase } from "../../lib/supabase";

import "../../styles/admin.css";

type AdminTab =
  | "overview"
  | "clubs"
  | "requests"
  | "users";

type InterestStatus =
  | "new"
  | "in_progress"
  | "contacted"
  | "converted"
  | "rejected"
  | "archived";

interface AdminStats {
  total_users: number;
  total_clubs: number;
  active_subscriptions: number;
  past_due_subscriptions: number;
  canceled_subscriptions: number;
  mrr_cents: number;
  pending_interests: number;
}

interface AdminClub {
  id: string;
  name: string;
  city: string | null;
  created_at: string;
  owner_email: string | null;
  plan_code: string | null;
  plan_name: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  declared_licensees_count: number | null;
}

interface AdminInterest {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string;
  club_name: string;
  city: string;
  sport: string;
  licensees_count: number | null;
  teams_count: number | null;
  interest_level: string;
  main_problem: string | null;
  admin_status: InterestStatus;
  admin_notes: string | null;
  created_at: string;
  admin_updated_at: string;
}

interface AdminUser {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface AdminOverview {
  stats: AdminStats;
  clubs: AdminClub[];
  interests: AdminInterest[];
  users: AdminUser[];
}

interface RequestDraft {
  status: InterestStatus;
  notes: string;
}

const statusLabels: Record<
  InterestStatus,
  string
> = {
  new: "Nouvelle",
  in_progress: "En cours",
  contacted: "Contactée",
  converted: "Convertie",
  rejected: "Refusée",
  archived: "Archivée",
};

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(new Date(value));
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    },
  ).format(cents / 100);
}

function subscriptionLabel(
  status: string | null,
) {
  switch (status) {
    case "active":
      return "Actif";
    case "past_due":
      return "Paiement en retard";
    case "canceled":
      return "Annulé";
    case "unpaid":
      return "Impayé";
    case "paused":
      return "Suspendu";
    case "pending_payment":
      return "Paiement en attente";
    case "incomplete":
      return "Incomplet";
    case "trialing":
      return "Essai";
    default:
      return status || "Aucun abonnement";
  }
}

function AdminPage() {
  const [activeTab, setActiveTab] =
    useState<AdminTab>("overview");

  const [overview, setOverview] =
    useState<AdminOverview | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [requestDrafts, setRequestDrafts] =
    useState<
      Record<string, RequestDraft>
    >({});

  const [savingRequestId, setSavingRequestId] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error: overviewError } =
      await supabase.rpc(
        "clm_asso_admin_overview",
      );

    if (overviewError) {
      setError(overviewError.message);
      setLoading(false);
      return;
    }

    const nextOverview =
      data as AdminOverview;

    setOverview(nextOverview);

    setRequestDrafts(
      Object.fromEntries(
        nextOverview.interests.map(
          (interest) => [
            interest.id,
            {
              status:
                interest.admin_status,
              notes:
                interest.admin_notes ??
                "",
            },
          ],
        ),
      ),
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const normalizedSearch =
    search.trim().toLowerCase();

  const filteredClubs = useMemo(
    () =>
      (overview?.clubs ?? []).filter(
        (club) =>
          !normalizedSearch ||
          club.name
            .toLowerCase()
            .includes(
              normalizedSearch,
            ) ||
          (club.city ?? "")
            .toLowerCase()
            .includes(
              normalizedSearch,
            ) ||
          (club.owner_email ?? "")
            .toLowerCase()
            .includes(
              normalizedSearch,
            ),
      ),
    [
      normalizedSearch,
      overview?.clubs,
    ],
  );

  const filteredUsers = useMemo(
    () =>
      (overview?.users ?? []).filter(
        (user) => {
          if (!normalizedSearch) {
            return true;
          }

          return [
            user.email,
            user.first_name,
            user.last_name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(
              normalizedSearch,
            );
        },
      ),
    [
      normalizedSearch,
      overview?.users,
    ],
  );

  const filteredInterests = useMemo(
    () =>
      (overview?.interests ?? []).filter(
        (interest) => {
          if (!normalizedSearch) {
            return true;
          }

          return [
            interest.club_name,
            interest.first_name,
            interest.last_name,
            interest.email,
            interest.city,
            interest.sport,
          ]
            .join(" ")
            .toLowerCase()
            .includes(
              normalizedSearch,
            );
        },
      ),
    [
      normalizedSearch,
      overview?.interests,
    ],
  );

  async function saveInterest(
    interestId: string,
  ) {
    const draft =
      requestDrafts[interestId];

    if (!draft) {
      return;
    }

    setSavingRequestId(interestId);

    const { error: updateError } =
      await supabase.rpc(
        "clm_asso_admin_update_interest",
        {
          p_interest_id: interestId,
          p_status: draft.status,
          p_notes: draft.notes,
        },
      );

    if (updateError) {
      setError(updateError.message);
      setSavingRequestId(null);
      return;
    }

    await load();
    setSavingRequestId(null);
  }

  const stats = overview?.stats;

  return (
    <main className="platform-admin">
      <aside className="platform-admin__sidebar">
        <div className="platform-admin__brand">
          <span>
            <ShieldCheck size={22} />
          </span>

          <div>
            <strong>CLM Asso</strong>
            <small>
              Administration
            </small>
          </div>
        </div>

        <nav
          className="platform-admin__nav"
          aria-label="Navigation administration"
        >
          <button
            type="button"
            className={
              activeTab === "overview"
                ? "is-active"
                : ""
            }
            onClick={() =>
              setActiveTab("overview")
            }
          >
            <LayoutDashboard size={18} />
            Vue d’ensemble
          </button>

          <button
            type="button"
            className={
              activeTab === "clubs"
                ? "is-active"
                : ""
            }
            onClick={() =>
              setActiveTab("clubs")
            }
          >
            <Building2 size={18} />
            Clubs
          </button>

          <button
            type="button"
            className={
              activeTab === "requests"
                ? "is-active"
                : ""
            }
            onClick={() =>
              setActiveTab("requests")
            }
          >
            <Mail size={18} />
            Demandes
          </button>

          <button
            type="button"
            className={
              activeTab === "users"
                ? "is-active"
                : ""
            }
            onClick={() =>
              setActiveTab("users")
            }
          >
            <UsersRound size={18} />
            Utilisateurs
          </button>
        </nav>

        <div className="platform-admin__sidebar-actions">
          <Link
            to="/app/tableau-de-bord"
            className="platform-admin__club-link"
          >
            <ExternalLink size={17} />
            Ouvrir mon espace club
          </Link>

          <Link
            to="/"
            className="platform-admin__site-link"
          >
            Voir le site public
          </Link>
        </div>
      </aside>

      <section className="platform-admin__main">
        <header className="platform-admin__header">
          <div>
            <span className="platform-admin__eyebrow">
              Maison CLM · accès interne
            </span>

            <h1>
              Administration CLM Asso
            </h1>

            <p>
              Ton compte administrateur n’a
              pas besoin d’un abonnement
              actif pour accéder à l’espace
              club.
            </p>
          </div>

          <button
            type="button"
            className="platform-admin__refresh"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "is-spinning"
                  : ""
              }
            />
            Actualiser
          </button>
        </header>

        {error ? (
          <div
            className="platform-admin__error"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {loading && !overview ? (
          <div className="platform-admin__loading">
            Chargement de la plateforme…
          </div>
        ) : null}

        {overview ? (
          <>
            {activeTab ===
            "overview" ? (
              <>
                <div className="platform-admin__stats">
                  <article>
                    <UserRound size={21} />
                    <span>
                      Utilisateurs
                    </span>
                    <strong>
                      {stats?.total_users ??
                        0}
                    </strong>
                  </article>

                  <article>
                    <Building2 size={21} />
                    <span>Clubs</span>
                    <strong>
                      {stats?.total_clubs ??
                        0}
                    </strong>
                  </article>

                  <article>
                    <CircleDollarSign
                      size={21}
                    />
                    <span>
                      Abonnements actifs
                    </span>
                    <strong>
                      {stats
                        ?.active_subscriptions ??
                        0}
                    </strong>
                  </article>

                  <article>
                    <CircleDollarSign
                      size={21}
                    />
                    <span>
                      MRR estimé
                    </span>
                    <strong>
                      {formatMoney(
                        stats?.mrr_cents ??
                          0,
                      )}
                    </strong>
                  </article>

                  <article>
                    <Mail size={21} />
                    <span>
                      Demandes à traiter
                    </span>
                    <strong>
                      {stats
                        ?.pending_interests ??
                        0}
                    </strong>
                  </article>

                  <article>
                    <ShieldCheck size={21} />
                    <span>
                      Paiements en retard
                    </span>
                    <strong>
                      {stats
                        ?.past_due_subscriptions ??
                        0}
                    </strong>
                  </article>
                </div>

                <div className="platform-admin__overview-grid">
                  <section className="platform-admin__panel">
                    <div className="platform-admin__panel-title">
                      <div>
                        <h2>
                          Derniers clubs
                        </h2>
                        <p>
                          Les espaces créés
                          récemment.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveTab(
                            "clubs",
                          )
                        }
                      >
                        Voir tout
                      </button>
                    </div>

                    <div className="platform-admin__simple-list">
                      {overview.clubs
                        .slice(0, 6)
                        .map((club) => (
                          <div
                            key={club.id}
                          >
                            <span className="platform-admin__avatar">
                              {club.name
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>

                            <div>
                              <strong>
                                {club.name}
                              </strong>
                              <small>
                                {club.city ||
                                  "Ville non renseignée"}
                                {" · "}
                                {club.plan_name ||
                                  "Sans offre"}
                              </small>
                            </div>

                            <span
                              className={`platform-admin__badge platform-admin__badge--${
                                club.subscription_status ||
                                "none"
                              }`}
                            >
                              {subscriptionLabel(
                                club.subscription_status,
                              )}
                            </span>
                          </div>
                        ))}
                    </div>
                  </section>

                  <section className="platform-admin__panel">
                    <div className="platform-admin__panel-title">
                      <div>
                        <h2>
                          Dernières demandes
                        </h2>
                        <p>
                          Formulaire
                          « Manifester mon
                          intérêt ».
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveTab(
                            "requests",
                          )
                        }
                      >
                        Gérer
                      </button>
                    </div>

                    <div className="platform-admin__simple-list">
                      {overview.interests
                        .slice(0, 6)
                        .map(
                          (interest) => (
                            <div
                              key={
                                interest.id
                              }
                            >
                              <span className="platform-admin__avatar">
                                {interest.club_name
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </span>

                              <div>
                                <strong>
                                  {
                                    interest.club_name
                                  }
                                </strong>
                                <small>
                                  {
                                    interest.sport
                                  }
                                  {" · "}
                                  {
                                    interest.city
                                  }
                                </small>
                              </div>

                              <span className="platform-admin__badge">
                                {
                                  statusLabels[
                                    interest
                                      .admin_status
                                  ]
                                }
                              </span>
                            </div>
                          ),
                        )}
                    </div>
                  </section>
                </div>
              </>
            ) : null}

            {activeTab !==
            "overview" ? (
              <div className="platform-admin__toolbar">
                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder={
                    activeTab === "clubs"
                      ? "Rechercher un club, une ville ou un e-mail…"
                      : activeTab ===
                          "requests"
                        ? "Rechercher une demande…"
                        : "Rechercher un utilisateur…"
                  }
                  aria-label="Rechercher"
                />
              </div>
            ) : null}

            {activeTab === "clubs" ? (
              <section className="platform-admin__panel">
                <div className="platform-admin__panel-title">
                  <div>
                    <h2>
                      Clubs de la plateforme
                    </h2>
                    <p>
                      {
                        filteredClubs.length
                      }{" "}
                      résultat(s)
                    </p>
                  </div>
                </div>

                <div className="platform-admin__table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Club</th>
                        <th>
                          Propriétaire
                        </th>
                        <th>Offre</th>
                        <th>Statut</th>
                        <th>
                          Licenciés
                        </th>
                        <th>Créé le</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredClubs.map(
                        (club) => (
                          <tr key={club.id}>
                            <td>
                              <strong>
                                {club.name}
                              </strong>
                              <small>
                                {club.city ||
                                  "—"}
                              </small>
                            </td>
                            <td>
                              {club.owner_email ||
                                "—"}
                            </td>
                            <td>
                              {club.plan_name ||
                                "—"}
                            </td>
                            <td>
                              <span className="platform-admin__badge">
                                {subscriptionLabel(
                                  club.subscription_status,
                                )}
                              </span>
                            </td>
                            <td>
                              {club.declared_licensees_count ??
                                "—"}
                            </td>
                            <td>
                              {formatDate(
                                club.created_at,
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {activeTab ===
            "requests" ? (
              <div className="platform-admin__requests">
                {filteredInterests.map(
                  (interest) => {
                    const draft =
                      requestDrafts[
                        interest.id
                      ] ?? {
                        status:
                          interest.admin_status,
                        notes:
                          interest.admin_notes ??
                          "",
                      };

                    return (
                      <article
                        key={
                          interest.id
                        }
                        className="platform-admin__request-card"
                      >
                        <div className="platform-admin__request-head">
                          <div>
                            <span>
                              {interest.sport}
                              {" · "}
                              {interest.city}
                            </span>
                            <h2>
                              {
                                interest.club_name
                              }
                            </h2>
                            <p>
                              {
                                interest.first_name
                              }{" "}
                              {
                                interest.last_name
                              }{" "}
                              ·{" "}
                              <a
                                href={`mailto:${interest.email}`}
                              >
                                {
                                  interest.email
                                }
                              </a>
                            </p>
                          </div>

                          <time>
                            {formatDate(
                              interest.created_at,
                            )}
                          </time>
                        </div>

                        <div className="platform-admin__request-meta">
                          <span>
                            {
                              interest.licensees_count ??
                              "?"
                            }{" "}
                            licenciés
                          </span>
                          <span>
                            {
                              interest.teams_count ??
                              "?"
                            }{" "}
                            équipes
                          </span>
                          <span>
                            {
                              interest.role
                            }
                          </span>
                        </div>

                        {interest.main_problem ? (
                          <blockquote>
                            {
                              interest.main_problem
                            }
                          </blockquote>
                        ) : null}

                        <div className="platform-admin__request-form">
                          <label>
                            Statut
                            <select
                              value={
                                draft.status
                              }
                              onChange={(
                                event,
                              ) =>
                                setRequestDrafts(
                                  (
                                    current,
                                  ) => ({
                                    ...current,
                                    [
                                      interest.id
                                    ]: {
                                      ...draft,
                                      status:
                                        event
                                          .target
                                          .value as InterestStatus,
                                    },
                                  }),
                                )
                              }
                            >
                              {Object.entries(
                                statusLabels,
                              ).map(
                                ([
                                  value,
                                  label,
                                ]) => (
                                  <option
                                    key={
                                      value
                                    }
                                    value={
                                      value
                                    }
                                  >
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>

                          <label>
                            Notes internes
                            <textarea
                              value={
                                draft.notes
                              }
                              onChange={(
                                event,
                              ) =>
                                setRequestDrafts(
                                  (
                                    current,
                                  ) => ({
                                    ...current,
                                    [
                                      interest.id
                                    ]: {
                                      ...draft,
                                      notes:
                                        event
                                          .target
                                          .value,
                                    },
                                  }),
                                )
                              }
                              maxLength={
                                5000
                              }
                              rows={3}
                              placeholder="Notes de suivi, prochain contact, décision…"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              void saveInterest(
                                interest.id,
                              )
                            }
                            disabled={
                              savingRequestId ===
                              interest.id
                            }
                          >
                            {savingRequestId ===
                            interest.id
                              ? "Enregistrement…"
                              : "Enregistrer"}
                          </button>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            ) : null}

            {activeTab === "users" ? (
              <section className="platform-admin__panel">
                <div className="platform-admin__panel-title">
                  <div>
                    <h2>
                      Utilisateurs
                    </h2>
                    <p>
                      {
                        filteredUsers.length
                      }{" "}
                      résultat(s)
                    </p>
                  </div>
                </div>

                <div className="platform-admin__table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Utilisateur</th>
                        <th>E-mail</th>
                        <th>
                          E-mail confirmé
                        </th>
                        <th>
                          Dernière connexion
                        </th>
                        <th>
                          Inscription
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredUsers.map(
                        (user) => (
                          <tr key={user.id}>
                            <td>
                              <strong>
                                {[
                                  user.first_name,
                                  user.last_name,
                                ]
                                  .filter(
                                    Boolean,
                                  )
                                  .join(
                                    " ",
                                  ) ||
                                  "Profil à compléter"}
                              </strong>
                            </td>
                            <td>
                              {user.email ||
                                "—"}
                            </td>
                            <td>
                              {user.email_confirmed_at
                                ? "Oui"
                                : "Non"}
                            </td>
                            <td>
                              {formatDate(
                                user.last_sign_in_at,
                              )}
                            </td>
                            <td>
                              {formatDate(
                                user.created_at,
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
}

export default AdminPage;
