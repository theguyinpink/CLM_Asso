export type ClubRole =
  | "owner"
  | "admin"
  | "manager"
  | "coach"
  | "member";

export type MembershipStatus =
  | "pending"
  | "active"
  | "suspended";

export interface Club {
  id: string;
  name: string;
  slug: string;

  acronym: string | null;
  description: string | null;
  logoUrl: string | null;
  seasonLabel: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  timezone: string;

  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClubMembership {
  id: string;
  clubId: string;
  userId: string;

  role: ClubRole;
  status: MembershipStatus;

  joinedAt: string | null;

  club: Club;
}