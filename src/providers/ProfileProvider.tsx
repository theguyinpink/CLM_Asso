import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ProfileContext } from "../contexts/ProfileContext";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import type { UpdateProfilePayload, UserProfile } from "../types/profile";

interface ProfileProviderProps {
  children: ReactNode;
}

interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  birth_date: string | null;
  created_at: string;
  updated_at: string;
}

function clean(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function mapProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    phone: row.phone,
    birthDate: row.birth_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function ProfileProvider({ children }: ProfileProviderProps) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: profileError } = await supabase
        .from("clm_asso_profiles")
        .select("id,first_name,last_name,display_name,avatar_url,phone,birth_date,created_at,updated_at")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (data) {
        setProfile(mapProfile(data as ProfileRow));
        return;
      }

      const metadata = user.user_metadata as Record<string, unknown>;
      const firstName = clean(metadata.first_name);
      const lastName = clean(metadata.last_name);
      const displayName =
        clean(metadata.display_name) ||
        ([firstName, lastName].filter(Boolean).join(" ") || null);

      const { data: inserted, error: insertError } = await supabase
        .from("clm_asso_profiles")
        .upsert(
          {
            id: user.id,
            first_name: firstName,
            last_name: lastName,
            display_name: displayName,
            avatar_url: clean(metadata.avatar_url),
          },
          { onConflict: "id" },
        )
        .select("id,first_name,last_name,display_name,avatar_url,phone,birth_date,created_at,updated_at")
        .single();

      if (insertError) throw insertError;
      setProfile(mapProfile(inserted as ProfileRow));
    } catch (caughtError) {
      setProfile(null);
      setError(caughtError instanceof Error ? caughtError.message : "Impossible de charger le profil.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) void refreshProfile();
  }, [authLoading, refreshProfile]);

  const value = useMemo(
    () => ({
      profile,
      loading,
      error,
      refreshProfile,
      async updateProfile(payload: UpdateProfilePayload) {
        if (!user) throw new Error("Aucun utilisateur connecté.");

        const firstName = payload.firstName !== undefined ? clean(payload.firstName) : profile?.firstName ?? null;
        const lastName = payload.lastName !== undefined ? clean(payload.lastName) : profile?.lastName ?? null;
        const computedDisplayName = [firstName, lastName].filter(Boolean).join(" ") || null;
        const displayName = payload.displayName !== undefined ? clean(payload.displayName) : computedDisplayName;
        const avatarUrl = payload.avatarUrl !== undefined ? clean(payload.avatarUrl) : profile?.avatarUrl ?? null;
        const phone = payload.phone !== undefined ? clean(payload.phone) : profile?.phone ?? null;
        const birthDate = payload.birthDate !== undefined ? clean(payload.birthDate) : profile?.birthDate ?? null;

        const { error: authError } = await supabase.auth.updateUser({
          data: {
            first_name: firstName,
            last_name: lastName,
            display_name: displayName,
            avatar_url: avatarUrl,
          },
        });
        if (authError) throw authError;

        const { error: updateError } = await supabase
          .from("clm_asso_profiles")
          .upsert(
            {
              id: user.id,
              first_name: firstName,
              last_name: lastName,
              display_name: displayName,
              avatar_url: avatarUrl,
              phone,
              birth_date: birthDate,
            },
            { onConflict: "id" },
          );
        if (updateError) throw updateError;

        await refreshProfile();
      },
    }),
    [error, loading, profile, refreshProfile, user],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export default ProfileProvider;
