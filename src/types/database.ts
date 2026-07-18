export type DashboardTone = "blue" | "green" | "orange" | "purple" | "red";

export interface ClubMember {
  id: string;
  club_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role_label: string;
  status: "active" | "inactive" | "pending";
  birth_date: string | null;
  license_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  membership_role?: import("./club").ClubRole | null;
  membership_status?: import("./club").MembershipStatus | null;
}

export interface Team {
  id: string;
  club_id: string;
  name: string;
  category: string;
  gender: "masculin" | "feminin" | "mixte";
  coach_member_id: string | null;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
  coach?: ClubMember | null;
  member_count?: number;
}

export interface TeamMember {
  team_id: string;
  member_id: string;
  team_role: "player" | "coach" | "assistant" | "manager";
  jersey_number: number | null;
  position: string | null;
  joined_at: string;
  member?: ClubMember;
}

export type EventType = "training" | "meeting" | "club" | "stage" | "other";

export interface ClubEvent {
  id: string;
  club_id: string;
  team_id: string | null;
  title: string;
  event_type: EventType;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  team?: Pick<Team, "id" | "name"> | null;
}

export type MatchStatus = "scheduled" | "completed" | "cancelled" | "postponed";

export interface ClubMatch {
  id: string;
  club_id: string;
  team_id: string | null;
  opponent_name: string;
  starts_at: string;
  location: string | null;
  competition: string | null;
  is_home: boolean;
  status: MatchStatus;
  score_home: number | null;
  score_away: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  team?: Pick<Team, "id" | "name"> | null;
}

export type ConvocationStatus = "draft" | "sent" | "closed";
export type ConvocationResponse = "pending" | "present" | "absent" | "maybe";

export interface ConvocationRecipient {
  id: string;
  convocation_id: string;
  member_id: string;
  response: ConvocationResponse;
  comment: string | null;
  responded_at: string | null;
  member?: ClubMember;
}

export interface Convocation {
  id: string;
  club_id: string;
  match_id: string | null;
  team_id: string | null;
  title: string;
  message: string | null;
  response_deadline: string | null;
  status: ConvocationStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  team?: Pick<Team, "id" | "name"> | null;
  match?: Pick<ClubMatch, "id" | "opponent_name" | "starts_at"> | null;
  recipients?: ConvocationRecipient[];
}

export type AnnouncementStatus = "draft" | "scheduled" | "published";
export type AnnouncementType =
  | "important"
  | "event"
  | "club"
  | "organization"
  | "information";

export interface Announcement {
  id: string;
  club_id: string;
  title: string;
  content: string;
  announcement_type: AnnouncementType;
  audience: string;
  priority: boolean;
  status: AnnouncementStatus;
  scheduled_at: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "normal" | "high" | "urgent";

export interface ClubTask {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_at: string | null;
  assignee_member_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assignee?: ClubMember | null;
}

export interface ClubDocument {
  id: string;
  club_id: string;
  name: string;
  folder: string;
  mime_type: string | null;
  size_bytes: number;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export type DashboardActivityKind =
  | "announcement"
  | "task"
  | "event"
  | "match"
  | "convocation"
  | "member";

export interface DashboardActivity {
  id: string;
  kind: DashboardActivityKind;
  title: string;
  description: string;
  occurredAt: string;
  href: string;
}

export interface DashboardData {
  membersCount: number;
  teamsCount: number;
  upcomingMatchesCount: number;
  openTasksCount: number;
  convocationsCount: number;
  announcementsCount: number;

  upcomingMatches: ClubMatch[];
  calendarMatches: ClubMatch[];
  calendarEvents: ClubEvent[];

  latestAnnouncements: Announcement[];
  openTasks: ClubTask[];
  pendingConvocations: Convocation[];

  recentActivity: DashboardActivity[];
}
export type InvitationStatus = "pending" | "accepted" | "cancelled" | "expired";

export interface ClubInvitation {
  id: string;
  club_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: import("./club").ClubRole;
  token: string;
  status: InvitationStatus;
  invited_by: string | null;
  accepted_by: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface InvitationDeliveryResult {
  invitationId: string;
  invitationUrl: string;
  expiresAt: string;
  emailSent: boolean;
  deliveryMode: "supabase" | "resend" | "link";
  existingAccount: boolean;
}

export interface ClubNotification {
  id: string;
  club_id: string | null;
  user_id: string;
  notification_type: string;
  title: string;
  body: string | null;
  href: string | null;
  dedupe_key: string | null;
  read_at: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  club_id: string;
  actor_user_id: string | null;
  actor_display_name?: string | null;
  action: "insert" | "update" | "delete" | string;
  entity_type: string;
  entity_id: string | null;
  title: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number;
  uploaded_by: string | null;
  change_note: string | null;
  created_at: string;
}

export interface MessageableClub {
  id: string;
  name: string;
  acronym: string | null;
  logo_url: string | null;
  city: string | null;
  contact_phone: string | null;
}

export type InterclubMessageType = "text" | "calendar_proposal" | "system";

export type CalendarProposalStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled";

export interface InterclubConversation {
  conversation_id: string;
  other_club_id: string;
  other_club_name: string;
  other_club_acronym: string | null;
  other_club_logo_url: string | null;
  other_club_city: string | null;
  last_message_id: string | null;
  last_message_body: string | null;
  last_message_type: InterclubMessageType | null;
  last_message_at: string;
  last_sender_club_id: string | null;
  unread_count: number;
}

export interface InterclubMessage {
  message_id: string;
  conversation_id: string;
  sender_club_id: string;
  sender_club_name: string;
  sender_user_id: string | null;
  sender_display_name: string;
  message_type: InterclubMessageType;
  body: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;

  proposal_id: string | null;
  proposal_title: string | null;
  proposal_starts_at: string | null;
  proposal_ends_at: string | null;
  proposal_location: string | null;
  proposal_description: string | null;
  proposal_status: CalendarProposalStatus | null;
  proposal_proposed_by_club_id: string | null;
  proposal_target_club_id: string | null;
  proposal_responded_at: string | null;
  proposer_event_id: string | null;
  target_event_id: string | null;
}

export interface StartedConversation {
  conversation_id: string;
  target_club_id: string;
}

export interface CalendarProposalPayload {
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  description: string | null;
}
