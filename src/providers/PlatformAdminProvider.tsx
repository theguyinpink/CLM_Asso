import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { PlatformAdminContext } from "../contexts/PlatformAdminContext";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

interface PlatformAdminProviderProps {
  children: ReactNode;
}

function PlatformAdminProvider({
  children,
}: PlatformAdminProviderProps) {
  const { user, loading: authLoading } = useAuth();

  const [isPlatformAdmin, setIsPlatformAdmin] =
    useState(false);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setIsPlatformAdmin(false);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: adminError } =
      await supabase.rpc(
        "clm_asso_is_platform_admin",
      );

    if (adminError) {
      setIsPlatformAdmin(false);
      setError(adminError.message);
      setLoading(false);
      return;
    }

    setIsPlatformAdmin(data === true);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    void refresh();
  }, [authLoading, refresh]);

  const value = useMemo(
    () => ({
      isPlatformAdmin,
      loading:
        authLoading || loading,
      error,
      refresh,
    }),
    [
      authLoading,
      error,
      isPlatformAdmin,
      loading,
      refresh,
    ],
  );

  return (
    <PlatformAdminContext.Provider
      value={value}
    >
      {children}
    </PlatformAdminContext.Provider>
  );
}

export default PlatformAdminProvider;
