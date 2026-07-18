import { createContext } from "react";

import type {
  UpdateProfilePayload,
  UserProfile,
} from "../types/profile";

export interface ProfileContextValue {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;

  refreshProfile: () => Promise<void>;

  updateProfile: (
    payload: UpdateProfilePayload,
  ) => Promise<void>;
}

export const ProfileContext =
  createContext<ProfileContextValue | null>(
    null,
  );