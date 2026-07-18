import { createContext } from "react";
import type {
  Session,
  User,
} from "@supabase/supabase-js";

export interface SignUpPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;

  signIn: (
    email: string,
    password: string,
  ) => Promise<void>;

  signUp: (
    payload: SignUpPayload,
  ) => Promise<{
    emailConfirmationRequired: boolean;
  }>;

  resetPassword: (email: string) => Promise<void>;

  updatePassword: (password: string) => Promise<void>;

  signOut: () => Promise<void>;
}

export const AuthContext =
  createContext<AuthContextValue | null>(null);