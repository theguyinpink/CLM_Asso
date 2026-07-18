import { createContext } from "react";

import type {
  Club,
  ClubMembership,
} from "../types/club";

export interface CreateClubPayload {
  name: string;
  seasonLabel: string;
}

export interface ClubContextValue {
  memberships: ClubMembership[];

  activeMembership:
    | ClubMembership
    | null;

  activeClub: Club | null;

  loading: boolean;
  error: string | null;

  selectClub: (clubId: string) => void;

  refreshMemberships: () => Promise<void>;

  createClub: (
    payload: CreateClubPayload,
  ) => Promise<string>;
}

export const ClubContext =
  createContext<ClubContextValue | null>(null);