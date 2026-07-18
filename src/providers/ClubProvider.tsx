import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ClubContext } from "../contexts/ClubContext";
import type { CreateClubPayload } from "../contexts/ClubContext";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import type {
  ClubSubscription,
  SubscriptionStatus,
} from "../types/billing";
import type {
  Club,
  ClubMembership,
  ClubRole,
  MembershipStatus,
} from "../types/club";

interface ClubProviderProps {
  children: ReactNode;
}

interface MembershipRow {
  id: string;
  club_id: string;
  user_id: string;
  role: ClubRole;
  status: MembershipStatus;
  joined_at: string | null;
}

interface ClubRow {
  id: string;
  name: string;
  slug: string;
  acronym: string | null;
  description: string | null;
  logo_url: string | null;
  season_label: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  timezone: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface SubscriptionRow {
  subscription_id: string;
  plan_code: string;
  plan_name: string;
  plan_description: string;
  audience_label: string;
  monthly_price_cents: number;
  currency: string;
  subscription_status: SubscriptionStatus;
  declared_licensees_count: number;
  documents_enabled: boolean;
  document_storage_limit_bytes: number | string;
  plan_features: Record<string, boolean> | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  payment_grace_period_ends_at: string | null;
  billing_portal_available: boolean;
  stripe_subscription_available: boolean;
  can_manage_billing: boolean;
  last_payment_error: string | null;
  last_payment_error_at: string | null;
}

const ACTIVE_CLUB_STORAGE_KEY = "clm-asso-active-club-id";

function mapClub(row: ClubRow): Club {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    acronym: row.acronym,
    description: row.description,
    logoUrl: row.logo_url,
    seasonLabel: row.season_label,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    website: row.website,
    address: row.address,
    postalCode: row.postal_code,
    city: row.city,
    timezone: row.timezone,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSubscription(row: SubscriptionRow): ClubSubscription {
  return {
    subscriptionId: row.subscription_id,
    planCode: row.plan_code,
    planName: row.plan_name,
    planDescription: row.plan_description,
    audienceLabel: row.audience_label,
    monthlyPriceCents: row.monthly_price_cents,
    currency: row.currency,
    status: row.subscription_status,
    declaredLicenseesCount: row.declared_licensees_count,
    documentsEnabled: row.documents_enabled,
    documentStorageLimitBytes: Number(row.document_storage_limit_bytes),
    planFeatures: row.plan_features ?? {},
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    trialEnd: row.trial_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    canceledAt: row.canceled_at,
    paymentGracePeriodEndsAt: row.payment_grace_period_ends_at,
    billingPortalAvailable: row.billing_portal_available,
    subscriptionManagementAvailable: row.stripe_subscription_available,
    canManageBilling: row.can_manage_billing,
    lastPaymentError: row.last_payment_error,
    lastPaymentErrorAt: row.last_payment_error_at,
  };
}

function ClubProvider({ children }: ClubProviderProps) {
  const { user, loading: authLoading } = useAuth();

  const [memberships, setMemberships] = useState<ClubMembership[]>([]);
  const [activeMembership, setActiveMembership] =
    useState<ClubMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeSubscription, setActiveSubscription] =
    useState<ClubSubscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] =
    useState<string | null>(null);

  const refreshMemberships = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setActiveMembership(null);
      setActiveSubscription(null);
      setError(null);
      setSubscriptionError(null);
      setLoading(false);
      setSubscriptionLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: membershipData, error: membershipError } = await supabase
        .from("clm_asso_club_members")
        .select("id, club_id, user_id, role, status, joined_at")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (membershipError) {
        throw membershipError;
      }

      const membershipRows = (membershipData ?? []) as MembershipRow[];

      if (membershipRows.length === 0) {
        setMemberships([]);
        setActiveMembership(null);
        setActiveSubscription(null);
        return;
      }

      const clubIds = membershipRows.map((membership) => membership.club_id);

      const { data: clubData, error: clubError } = await supabase
        .from("clm_asso_clubs")
        .select(
          "id, name, slug, acronym, description, logo_url, season_label, contact_email, contact_phone, website, address, postal_code, city, timezone, created_by, created_at, updated_at",
        )
        .in("id", clubIds);

      if (clubError) {
        throw clubError;
      }

      const clubRows = (clubData ?? []) as ClubRow[];
      const clubsById = new Map(
        clubRows.map((clubRow) => [clubRow.id, mapClub(clubRow)]),
      );

      const nextMemberships = membershipRows.flatMap((membershipRow) => {
        const club = clubsById.get(membershipRow.club_id);

        if (!club) {
          return [];
        }

        return [
          {
            id: membershipRow.id,
            clubId: membershipRow.club_id,
            userId: membershipRow.user_id,
            role: membershipRow.role,
            status: membershipRow.status,
            joinedAt: membershipRow.joined_at,
            club,
          } satisfies ClubMembership,
        ];
      });

      const storedClubId = localStorage.getItem(ACTIVE_CLUB_STORAGE_KEY);
      const nextActiveMembership =
        nextMemberships.find(
          (membership) => membership.clubId === storedClubId,
        ) ??
        nextMemberships[0] ??
        null;

      setMemberships(nextMemberships);
      setActiveMembership(nextActiveMembership);

      if (nextActiveMembership) {
        localStorage.setItem(
          ACTIVE_CLUB_STORAGE_KEY,
          nextActiveMembership.clubId,
        );
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de charger les clubs.";

      setMemberships([]);
      setActiveMembership(null);
      setActiveSubscription(null);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadSubscription = useCallback(async (clubId: string | null) => {
    if (!clubId) {
      setActiveSubscription(null);
      setSubscriptionError(null);
      setSubscriptionLoading(false);
      return;
    }

    setSubscriptionLoading(true);
    setSubscriptionError(null);

    try {
      const { data, error: subscriptionQueryError } = await supabase.rpc(
        "clm_asso_get_club_subscription",
        {
          p_club_id: clubId,
        },
      );

      if (subscriptionQueryError) {
        throw subscriptionQueryError;
      }

      const rows = (data ?? []) as SubscriptionRow[];
      const row = rows[0];

      if (!row) {
        throw new Error("Aucun abonnement n’est rattaché à ce club.");
      }

      setActiveSubscription(mapSubscription(row));
    } catch (caughtError) {
      setActiveSubscription(null);
      setSubscriptionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de charger l’abonnement.",
      );
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    await loadSubscription(activeMembership?.clubId ?? null);
  }, [activeMembership?.clubId, loadSubscription]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    void refreshMemberships();
  }, [authLoading, refreshMemberships]);

  useEffect(() => {
    void loadSubscription(activeMembership?.clubId ?? null);
  }, [activeMembership?.clubId, loadSubscription]);

  const value = useMemo(
    () => ({
      memberships,
      activeMembership,
      activeClub: activeMembership?.club ?? null,
      loading,
      error,
      activeSubscription,
      subscriptionLoading,
      subscriptionError,

      selectClub(clubId: string) {
        const membership = memberships.find(
          (item) => item.clubId === clubId,
        );

        if (!membership) {
          return;
        }

        setActiveSubscription(null);
        setSubscriptionError(null);
        setActiveMembership(membership);
        localStorage.setItem(ACTIVE_CLUB_STORAGE_KEY, clubId);
      },

      refreshMemberships,
      refreshSubscription,

      async createClub({
        name,
        seasonLabel,
        planCode,
        declaredLicenseesCount,
      }: CreateClubPayload) {
        const { data, error: createError } = await supabase.rpc(
          "clm_asso_create_club",
          {
            p_name: name.trim(),
            p_season_label: seasonLabel.trim(),
            p_plan_code: planCode,
            p_declared_licensees_count: declaredLicenseesCount,
          },
        );

        if (createError) {
          throw createError;
        }

        if (typeof data !== "string" || !data) {
          throw new Error(
            "Le club a été créé mais son identifiant est introuvable.",
          );
        }

        localStorage.setItem(ACTIVE_CLUB_STORAGE_KEY, data);
        await refreshMemberships();

        return data;
      },
    }),
    [
      activeMembership,
      activeSubscription,
      error,
      loading,
      memberships,
      refreshMemberships,
      refreshSubscription,
      subscriptionError,
      subscriptionLoading,
    ],
  );

  return (
    <ClubContext.Provider value={value}>{children}</ClubContext.Provider>
  );
}

export default ClubProvider;
