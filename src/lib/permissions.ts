import type { ClubRole } from "../types/club";

export type ClubPermission =
  | "manageClub"
  | "manageRoles"
  | "manageMembers"
  | "manageTeams"
  | "manageCalendar"
  | "manageMatches"
  | "manageConvocations"
  | "manageAnnouncements"
  | "manageTasks"
  | "manageDocuments"
  | "manageMessaging";

const permissionsByRole: Record<
  ClubRole,
  ReadonlySet<ClubPermission>
> = {
  owner: new Set([
    "manageClub",
    "manageRoles",
    "manageMembers",
    "manageTeams",
    "manageCalendar",
    "manageMatches",
    "manageConvocations",
    "manageAnnouncements",
    "manageTasks",
    "manageDocuments",
    "manageMessaging",
  ]),

  admin: new Set([
    "manageClub",
    "manageRoles",
    "manageMembers",
    "manageTeams",
    "manageCalendar",
    "manageMatches",
    "manageConvocations",
    "manageAnnouncements",
    "manageTasks",
    "manageDocuments",
    "manageMessaging",
  ]),

  manager: new Set([
    "manageClub",
    "manageMembers",
    "manageTeams",
    "manageCalendar",
    "manageMatches",
    "manageConvocations",
    "manageAnnouncements",
    "manageTasks",
    "manageDocuments",
    "manageMessaging",
  ]),

  coach: new Set([
    "manageTeams",
    "manageCalendar",
    "manageMatches",
    "manageConvocations",
  ]),

  member: new Set(),
};

export function roleHasPermission(
  role: ClubRole | null | undefined,
  permission: ClubPermission,
) {
  return role
    ? permissionsByRole[role].has(permission)
    : false;
}