import { createContext } from "react";

import type { SubscriptionPlanCode } from "../lib/subscriptionPlans";
import type { ClubSubscription } from "../types/billing";
import type {
  Club,
  ClubMembership,
} from "../types/club";

export interface CreateClubPayload {
  name: string;
  seasonLabel: string;
  planCode: SubscriptionPlanCode;
  declaredLicenseesCount: number;
}

export interface ClubContextValue {
  memberships: ClubMembership[];
  activeMembership: ClubMembership | null;
  activeClub: Club | null;

  loading: boolean;
  error: string | null;

  activeSubscription: ClubSubscription | null;
  subscriptionLoading: boolean;
  subscriptionError: string | null;

  selectClub: (clubId: string) => void;
  refreshMemberships: () => Promise<void>;
  refreshSubscription: () => Promise<void>;

  createClub: (
    payload: CreateClubPayload,
  ) => Promise<string>;
}

export const ClubContext =
  createContext<ClubContextValue | null>(null);
