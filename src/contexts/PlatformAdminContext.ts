import { createContext } from "react";

export interface PlatformAdminContextValue {
  isPlatformAdmin: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const PlatformAdminContext =
  createContext<PlatformAdminContextValue | null>(null);
