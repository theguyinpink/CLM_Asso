import { useMemo } from "react";

import { useClub } from "./useClub";
import { roleHasPermission } from "../lib/permissions";

export function usePermissions() {
  const { activeMembership } = useClub();
  const role = activeMembership?.role ?? null;

  return useMemo(() => {
    const canManageClub = roleHasPermission(role, "manageClub");
    const canManageMessaging = roleHasPermission(
      role,
      "manageMessaging",
    );

    return {
      role,
      isOwner: role === "owner",
      isAdmin: role === "admin",
      isCoach: role === "coach",

      canManageClub,
      canManageRoles: roleHasPermission(role, "manageRoles"),
      canManageMembers: roleHasPermission(role, "manageMembers"),
      canManageTeams: roleHasPermission(role, "manageTeams"),
      canManageCalendar: roleHasPermission(role, "manageCalendar"),
      canManageMatches: roleHasPermission(role, "manageMatches"),
      canManageConvocations: roleHasPermission(
        role,
        "manageConvocations",
      ),
      canManageAnnouncements: roleHasPermission(
        role,
        "manageAnnouncements",
      ),
      canManageTasks: roleHasPermission(role, "manageTasks"),
      canManageDocuments: roleHasPermission(
        role,
        "manageDocuments",
      ),
      canManageMessaging,

      canAccessTasks: role !== null && role !== "coach",
      canAccessDocuments: role !== null && role !== "coach",
      canAccessMessaging: canManageMessaging,

      canRemoveMembers: role === "owner",
      canViewClubSettings: canManageClub,
    };
  }, [role]);
}