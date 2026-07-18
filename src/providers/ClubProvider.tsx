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

const ACTIVE_CLUB_STORAGE_KEY =
  "clm-asso-active-club-id";

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

function ClubProvider({
  children,
}: ClubProviderProps) {
  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [memberships, setMemberships] =
    useState<ClubMembership[]>([]);

  const [
    activeMembership,
    setActiveMembership,
  ] = useState<ClubMembership | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const refreshMemberships =
    useCallback(async () => {
      if (!user) {
        setMemberships([]);
        setActiveMembership(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const {
          data: membershipData,
          error: membershipError,
        } = await supabase
          .from("clm_asso_club_members")
          .select(
            `
              id,
              club_id,
              user_id,
              role,
              status,
              joined_at
            `,
          )
          .eq("user_id", user.id)
          .eq("status", "active");

        if (membershipError) {
          throw membershipError;
        }

        const membershipRows =
          (membershipData ??
            []) as MembershipRow[];

        if (membershipRows.length === 0) {
          setMemberships([]);
          setActiveMembership(null);
          setLoading(false);
          return;
        }

        const clubIds = membershipRows.map(
          (membership) =>
            membership.club_id,
        );

        const {
          data: clubData,
          error: clubError,
        } = await supabase
          .from("clm_asso_clubs")
          .select(
            `
              id,
              name,
              slug,
              acronym,
              description,
              logo_url,
              season_label,
              contact_email,
              contact_phone,
              website,
              address,
              postal_code,
              city,
              timezone,
              created_by,
              created_at,
              updated_at
            `,
          )
          .in("id", clubIds);

        if (clubError) {
          throw clubError;
        }

        const clubRows =
          (clubData ?? []) as ClubRow[];

        const clubsById = new Map(
          clubRows.map((clubRow) => [
            clubRow.id,
            mapClub(clubRow),
          ]),
        );

        const nextMemberships =
          membershipRows.flatMap(
            (membershipRow) => {
              const club = clubsById.get(
                membershipRow.club_id,
              );

              if (!club) {
                return [];
              }

              const membership: ClubMembership =
                {
                  id: membershipRow.id,
                  clubId:
                    membershipRow.club_id,
                  userId:
                    membershipRow.user_id,
                  role: membershipRow.role,
                  status:
                    membershipRow.status,
                  joinedAt:
                    membershipRow.joined_at,
                  club,
                };

              return [membership];
            },
          );

        const storedClubId =
          localStorage.getItem(
            ACTIVE_CLUB_STORAGE_KEY,
          );

        const nextActiveMembership =
          nextMemberships.find(
            (membership) =>
              membership.clubId ===
              storedClubId,
          ) ??
          nextMemberships[0] ??
          null;

        setMemberships(nextMemberships);
        setActiveMembership(
          nextActiveMembership,
        );

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
        setError(message);
      } finally {
        setLoading(false);
      }
    }, [user]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    void refreshMemberships();
  }, [
    authLoading,
    refreshMemberships,
  ]);

  const value = useMemo(
    () => ({
      memberships,
      activeMembership,
      activeClub:
        activeMembership?.club ?? null,
      loading,
      error,

      selectClub(clubId: string) {
        const membership =
          memberships.find(
            (item) =>
              item.clubId === clubId,
          );

        if (!membership) {
          return;
        }

        setActiveMembership(membership);

        localStorage.setItem(
          ACTIVE_CLUB_STORAGE_KEY,
          clubId,
        );
      },

      refreshMemberships,

      async createClub({
        name,
        seasonLabel,
      }: CreateClubPayload) {
        const {
          data,
          error: createError,
        } = await supabase.rpc(
          "clm_asso_create_club",
          {
            p_name: name.trim(),
            p_season_label:
              seasonLabel.trim(),
          },
        );

        if (createError) {
          throw createError;
        }

        if (
          typeof data !== "string" ||
          !data
        ) {
          throw new Error(
            "Le club a été créé mais son identifiant est introuvable.",
          );
        }

        localStorage.setItem(
          ACTIVE_CLUB_STORAGE_KEY,
          data,
        );

        await refreshMemberships();

        return data;
      },
    }),
    [
      activeMembership,
      error,
      loading,
      memberships,
      refreshMemberships,
    ],
  );

  return (
    <ClubContext.Provider value={value}>
      {children}
    </ClubContext.Provider>
  );
}

export default ClubProvider;