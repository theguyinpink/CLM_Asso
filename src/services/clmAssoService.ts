import { supabase } from "../lib/supabase";
import type {
  Announcement,
  ClubDocument,
  ClubEvent,
  ClubMatch,
  ClubMember,
  ClubTask,
  Convocation,
  ConvocationRecipient,
  DashboardData,
  Team,
  ClubInvitation,
  InvitationDeliveryResult,
  ClubNotification,
  ActivityLog,
  DocumentVersion,
  TeamMember,
} from "../types/database";

const DOCUMENTS_BUCKET = "clm-asso-documents";
const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024;

const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "txt",
  "odt",
  "ods",
  "png",
  "jpg",
  "jpeg",
  "webp",
]);

const BLOCKED_DOCUMENT_MIME_TYPES = new Set([
  "text/html",
  "application/xhtml+xml",
  "image/svg+xml",
  "application/javascript",
  "text/javascript",
  "application/x-httpd-php",
  "application/x-sh",
  "application/x-msdownload",
  "application/x-executable",
]);

function validateDocumentFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = file.type.trim().toLowerCase();

  if (!file.name.trim() || file.name.length > 255) {
    throw new Error("Le nom du fichier est invalide.");
  }

  if (file.size <= 0) {
    throw new Error("Le fichier est vide.");
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error("Le fichier ne peut pas dépasser 20 Mo.");
  }

  if (!ALLOWED_DOCUMENT_EXTENSIONS.has(extension)) {
    throw new Error(
      "Ce format de fichier n’est pas autorisé. Utilisez un document, une image ou un tableur standard.",
    );
  }

  if (mimeType && BLOCKED_DOCUMENT_MIME_TYPES.has(mimeType)) {
    throw new Error(
      "Ce type de fichier est bloqué pour des raisons de sécurité.",
    );
  }
}

function throwIfError(error: { message: string } | null) {
  if (!error) return;

  const normalizedMessage = error.message.toLowerCase();

  if (
    normalizedMessage.includes("row-level security") ||
    normalizedMessage.includes("unauthorized")
  ) {
    throw new Error(
      "Cette action n’est pas autorisée avec votre offre actuelle ou vos permissions.",
    );
  }

  throw new Error(error.message);
}

export async function listMembers(clubId: string): Promise<ClubMember[]> {
  const [{ data, error }, { data: memberships, error: membershipError }] =
    await Promise.all([
      supabase
        .from("clm_asso_members")
        .select("*")
        .eq("club_id", clubId)
        .order("last_name")
        .order("first_name"),
      supabase
        .from("clm_asso_club_members")
        .select("user_id,role,status")
        .eq("club_id", clubId),
    ]);

  throwIfError(error);
  throwIfError(membershipError);

  const membershipByUser = new Map(
    (memberships ?? []).map((membership) => [membership.user_id, membership]),
  );

  return ((data ?? []) as ClubMember[]).map((member) => {
    const membership = member.user_id
      ? membershipByUser.get(member.user_id)
      : null;

    return {
      ...member,
      membership_role: membership?.role ?? null,
      membership_status: membership?.status ?? null,
    };
  });
}

export async function createMember(
  clubId: string,
  payload: Omit<
    ClubMember,
    "id" | "club_id" | "user_id" | "created_at" | "updated_at"
  >,
) {
  const { data, error } = await supabase
    .from("clm_asso_members")
    .insert({ club_id: clubId, ...payload })
    .select("*")
    .single();

  throwIfError(error);
  return data as ClubMember;
}

export async function updateMember(
  memberId: string,
  payload: Partial<
    Omit<ClubMember, "id" | "club_id" | "user_id" | "created_at" | "updated_at">
  >,
) {
  const { data, error } = await supabase
    .from("clm_asso_members")
    .update(payload)
    .eq("id", memberId)
    .select("*")
    .single();

  throwIfError(error);
  return data as ClubMember;
}

export async function deleteMember(memberId: string) {
  const { error } = await supabase
    .from("clm_asso_members")
    .delete()
    .eq("id", memberId);
  throwIfError(error);
}

export async function listTeams(clubId: string): Promise<Team[]> {
  const { data: teamsData, error: teamsError } = await supabase
    .from("clm_asso_teams")
    .select("*, coach:clm_asso_members!clm_asso_teams_coach_member_id_fkey(*)")
    .eq("club_id", clubId)
    .order("name");
  throwIfError(teamsError);

  const teams = (teamsData ?? []) as Team[];
  if (teams.length === 0) return [];

  const { data: links, error: linksError } = await supabase
    .from("clm_asso_team_members")
    .select("team_id")
    .in(
      "team_id",
      teams.map((team) => team.id),
    );
  throwIfError(linksError);

  const counts = new Map<string, number>();
  for (const link of links ?? []) {
    counts.set(link.team_id, (counts.get(link.team_id) ?? 0) + 1);
  }

  return teams.map((team) => ({
    ...team,
    member_count: counts.get(team.id) ?? 0,
  }));
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const { data, error } = await supabase
    .from("clm_asso_teams")
    .select("*, coach:clm_asso_members!clm_asso_teams_coach_member_id_fkey(*)")
    .eq("id", teamId)
    .maybeSingle();
  throwIfError(error);
  return data as Team | null;
}

export async function createTeam(clubId: string, payload: Partial<Team>) {
  const { data, error } = await supabase
    .from("clm_asso_teams")
    .insert({
      club_id: clubId,
      name: payload.name,
      category: payload.category ?? "Autre",
      gender: payload.gender ?? "mixte",
      coach_member_id: payload.coach_member_id || null,
      description: payload.description || null,
      color: payload.color ?? "#0875f5",
    })
    .select("*")
    .single();
  throwIfError(error);
  return data as Team;
}

export async function updateTeam(teamId: string, payload: Partial<Team>) {
  const { data, error } = await supabase
    .from("clm_asso_teams")
    .update({
      name: payload.name,
      category: payload.category,
      gender: payload.gender,
      coach_member_id: payload.coach_member_id || null,
      description: payload.description || null,
      color: payload.color,
    })
    .eq("id", teamId)
    .select("*")
    .single();
  throwIfError(error);
  return data as Team;
}

export async function deleteTeam(teamId: string) {
  const { error } = await supabase
    .from("clm_asso_teams")
    .delete()
    .eq("id", teamId);
  throwIfError(error);
}

export async function listTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("clm_asso_team_members")
    .select("*, member:clm_asso_members(*)")
    .eq("team_id", teamId)
    .order("joined_at");
  throwIfError(error);
  return (data ?? []) as TeamMember[];
}

export async function addTeamMember(
  teamId: string,
  memberId: string,
  teamRole: TeamMember["team_role"] = "player",
  jerseyNumber: number | null = null,
  position: string | null = null,
) {
  const { error } = await supabase.from("clm_asso_team_members").upsert(
    {
      team_id: teamId,
      member_id: memberId,
      team_role: teamRole,
      jersey_number: jerseyNumber,
      position,
    },
    { onConflict: "team_id,member_id" },
  );
  throwIfError(error);
}

export async function removeTeamMember(teamId: string, memberId: string) {
  const { error } = await supabase
    .from("clm_asso_team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("member_id", memberId);
  throwIfError(error);
}

export async function listEvents(clubId: string): Promise<ClubEvent[]> {
  const { data, error } = await supabase
    .from("clm_asso_events")
    .select("*, team:clm_asso_teams(id,name)")
    .eq("club_id", clubId)
    .order("starts_at");
  throwIfError(error);
  return (data ?? []) as ClubEvent[];
}

export async function createEvent(
  clubId: string,
  userId: string,
  payload: Partial<ClubEvent>,
) {
  const { data, error } = await supabase
    .from("clm_asso_events")
    .insert({
      club_id: clubId,
      team_id: payload.team_id || null,
      title: payload.title,
      event_type: payload.event_type ?? "club",
      starts_at: payload.starts_at,
      ends_at: payload.ends_at || null,
      location: payload.location || null,
      description: payload.description || null,
      created_by: userId,
    })
    .select("*")
    .single();
  throwIfError(error);
  return data as ClubEvent;
}

export async function updateEvent(
  eventId: string,
  payload: Partial<ClubEvent>,
) {
  const { data, error } = await supabase
    .from("clm_asso_events")
    .update({
      team_id: payload.team_id || null,
      title: payload.title,
      event_type: payload.event_type,
      starts_at: payload.starts_at,
      ends_at: payload.ends_at || null,
      location: payload.location || null,
      description: payload.description || null,
    })
    .eq("id", eventId)
    .select("*")
    .single();
  throwIfError(error);
  return data as ClubEvent;
}

export async function deleteEvent(eventId: string) {
  const { error } = await supabase
    .from("clm_asso_events")
    .delete()
    .eq("id", eventId);
  throwIfError(error);
}

export async function listMatches(clubId: string): Promise<ClubMatch[]> {
  const { data, error } = await supabase
    .from("clm_asso_matches")
    .select("*, team:clm_asso_teams(id,name)")
    .eq("club_id", clubId)
    .order("starts_at");
  throwIfError(error);
  return (data ?? []) as ClubMatch[];
}

export async function getMatch(matchId: string): Promise<ClubMatch | null> {
  const { data, error } = await supabase
    .from("clm_asso_matches")
    .select("*, team:clm_asso_teams(id,name)")
    .eq("id", matchId)
    .maybeSingle();
  throwIfError(error);
  return data as ClubMatch | null;
}

export async function createMatch(
  clubId: string,
  userId: string,
  payload: Partial<ClubMatch>,
) {
  const { data, error } = await supabase
    .from("clm_asso_matches")
    .insert({
      club_id: clubId,
      team_id: payload.team_id || null,
      opponent_name: payload.opponent_name,
      starts_at: payload.starts_at,
      location: payload.location || null,
      competition: payload.competition || null,
      is_home: payload.is_home ?? true,
      status: payload.status ?? "scheduled",
      score_home: payload.score_home ?? null,
      score_away: payload.score_away ?? null,
      notes: payload.notes || null,
      created_by: userId,
    })
    .select("*")
    .single();
  throwIfError(error);
  return data as ClubMatch;
}

export async function updateMatch(
  matchId: string,
  payload: Partial<ClubMatch>,
) {
  const { data, error } = await supabase
    .from("clm_asso_matches")
    .update({
      team_id: payload.team_id || null,
      opponent_name: payload.opponent_name,
      starts_at: payload.starts_at,
      location: payload.location || null,
      competition: payload.competition || null,
      is_home: payload.is_home,
      status: payload.status,
      score_home: payload.score_home ?? null,
      score_away: payload.score_away ?? null,
      notes: payload.notes || null,
    })
    .eq("id", matchId)
    .select("*")
    .single();
  throwIfError(error);
  return data as ClubMatch;
}

export async function deleteMatch(matchId: string) {
  const { error } = await supabase
    .from("clm_asso_matches")
    .delete()
    .eq("id", matchId);
  throwIfError(error);
}

export async function listConvocations(clubId: string): Promise<Convocation[]> {
  const { data, error } = await supabase
    .from("clm_asso_convocations")
    .select(
      `
      *,
      team:clm_asso_teams(id,name),
      match:clm_asso_matches(id,opponent_name,starts_at),
      recipients:clm_asso_convocation_recipients(*,member:clm_asso_members(*))
    `,
    )
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });
  throwIfError(error);
  return (data ?? []) as Convocation[];
}

export async function createConvocation(
  clubId: string,
  userId: string,
  payload: Partial<Convocation>,
  memberIds: string[],
) {
  const desiredStatus = payload.status ?? "draft";
  const { data, error } = await supabase
    .from("clm_asso_convocations")
    .insert({
      club_id: clubId,
      match_id: payload.match_id || null,
      team_id: payload.team_id || null,
      title: payload.title,
      message: payload.message || null,
      response_deadline: payload.response_deadline || null,
      status: "draft",
      created_by: userId,
    })
    .select("*")
    .single();
  throwIfError(error);

  const convocation = data as Convocation;
  if (memberIds.length > 0) {
    const { error: recipientError } = await supabase
      .from("clm_asso_convocation_recipients")
      .insert(
        memberIds.map((memberId) => ({
          convocation_id: convocation.id,
          member_id: memberId,
        })),
      );
    throwIfError(recipientError);
  }

  if (desiredStatus !== "draft") {
    await updateConvocationStatus(convocation.id, desiredStatus);
  }

  return { ...convocation, status: desiredStatus };
}

export async function updateConvocationResponse(
  recipientId: string,
  response: ConvocationRecipient["response"],
  comment: string | null = null,
) {
  const { error } = await supabase.rpc("clm_asso_respond_to_convocation", {
    p_recipient_id: recipientId,
    p_response: response,
    p_comment: comment,
  });
  throwIfError(error);
}

export async function updateConvocation(
  convocationId: string,
  payload: Partial<Convocation>,
  memberIds?: string[],
) {
  const { data, error } = await supabase
    .from("clm_asso_convocations")
    .update({
      match_id: payload.match_id || null,
      team_id: payload.team_id || null,
      title: payload.title,
      message: payload.message || null,
      response_deadline: payload.response_deadline || null,
    })
    .eq("id", convocationId)
    .select("*")
    .single();
  throwIfError(error);

  if (memberIds) {
    const { error: deleteError } = await supabase
      .from("clm_asso_convocation_recipients")
      .delete()
      .eq("convocation_id", convocationId);
    throwIfError(deleteError);

    if (memberIds.length > 0) {
      const { error: recipientError } = await supabase
        .from("clm_asso_convocation_recipients")
        .insert(
          memberIds.map((memberId) => ({
            convocation_id: convocationId,
            member_id: memberId,
          })),
        );
      throwIfError(recipientError);
    }
  }

  if (payload.status) {
    await updateConvocationStatus(convocationId, payload.status);
  }

  return {
    ...(data as Convocation),
    status: payload.status ?? (data as Convocation).status,
  };
}

export async function updateConvocationStatus(
  convocationId: string,
  status: Convocation["status"],
) {
  const { error } = await supabase
    .from("clm_asso_convocations")
    .update({ status })
    .eq("id", convocationId);
  throwIfError(error);
}

export async function deleteConvocation(convocationId: string) {
  const { error } = await supabase
    .from("clm_asso_convocations")
    .delete()
    .eq("id", convocationId);
  throwIfError(error);
}

export async function listAnnouncements(
  clubId: string,
): Promise<Announcement[]> {
  await supabase.rpc("clm_asso_publish_due_announcements");

  const { data, error } = await supabase
    .from("clm_asso_announcements")
    .select("*")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });
  throwIfError(error);
  return (data ?? []) as Announcement[];
}

export async function createAnnouncement(
  clubId: string,
  userId: string,
  payload: Partial<Announcement>,
) {
  const status = payload.status ?? "draft";
  const { data, error } = await supabase
    .from("clm_asso_announcements")
    .insert({
      club_id: clubId,
      title: payload.title,
      content: payload.content,
      announcement_type: payload.announcement_type ?? "information",
      audience: payload.audience || "Tout le club",
      priority: payload.priority ?? false,
      status,
      scheduled_at: payload.scheduled_at || null,
      published_at: status === "published" ? new Date().toISOString() : null,
      created_by: userId,
    })
    .select("*")
    .single();
  throwIfError(error);
  return data as Announcement;
}

export async function updateAnnouncement(
  id: string,
  payload: Partial<Announcement>,
) {
  const { data, error } = await supabase
    .from("clm_asso_announcements")
    .update({
      title: payload.title,
      content: payload.content,
      announcement_type: payload.announcement_type,
      audience: payload.audience,
      priority: payload.priority,
      status: payload.status,
      scheduled_at: payload.scheduled_at || null,
      published_at:
        payload.status === "published"
          ? payload.published_at || new Date().toISOString()
          : null,
    })
    .eq("id", id)
    .select("*")
    .single();
  throwIfError(error);
  return data as Announcement;
}

export async function deleteAnnouncement(id: string) {
  const { error } = await supabase
    .from("clm_asso_announcements")
    .delete()
    .eq("id", id);
  throwIfError(error);
}

export async function listTasks(clubId: string): Promise<ClubTask[]> {
  const { data, error } = await supabase
    .from("clm_asso_tasks")
    .select(
      "*, assignee:clm_asso_members!clm_asso_tasks_assignee_member_id_fkey(*)",
    )
    .eq("club_id", clubId)
    .order("due_at", { ascending: true, nullsFirst: false });
  throwIfError(error);
  return (data ?? []) as ClubTask[];
}

export async function createTask(
  clubId: string,
  userId: string,
  payload: Partial<ClubTask>,
) {
  const { data, error } = await supabase
    .from("clm_asso_tasks")
    .insert({
      club_id: clubId,
      title: payload.title,
      description: payload.description || null,
      category: payload.category || "Général",
      priority: payload.priority ?? "normal",
      status: payload.status ?? "pending",
      due_at: payload.due_at || null,
      assignee_member_id: payload.assignee_member_id || null,
      created_by: userId,
    })
    .select("*")
    .single();
  throwIfError(error);
  return data as ClubTask;
}

export async function updateTask(id: string, payload: Partial<ClubTask>) {
  const { data, error } = await supabase
    .from("clm_asso_tasks")
    .update({
      title: payload.title,
      description: payload.description || null,
      category: payload.category,
      priority: payload.priority,
      status: payload.status,
      due_at: payload.due_at || null,
      assignee_member_id: payload.assignee_member_id || null,
    })
    .eq("id", id)
    .select("*")
    .single();
  throwIfError(error);
  return data as ClubTask;
}

export async function updateTaskStatus(
  taskId: string,
  status: ClubTask["status"],
) {
  const { error } = await supabase.rpc("clm_asso_update_task_status", {
    p_task_id: taskId,
    p_status: status,
  });
  throwIfError(error);
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("clm_asso_tasks").delete().eq("id", id);
  throwIfError(error);
}

export async function listDocuments(clubId: string): Promise<ClubDocument[]> {
  const { data, error } = await supabase
    .from("clm_asso_documents")
    .select("*")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });
  throwIfError(error);
  return (data ?? []) as ClubDocument[];
}

interface DocumentStorageStatus {
  plan_code: string;
  plan_name: string;
  documents_enabled: boolean;
  used_bytes: number;
  limit_bytes: number;
  remaining_bytes: number;
  usage_percent: number;
}

async function assertDocumentUploadAllowed(clubId: string, fileSize: number) {
  const { data, error } = await supabase.rpc(
    "clm_asso_get_document_storage_status",
    {
      p_club_id: clubId,
    },
  );

  throwIfError(error);

  const status = (data?.[0] ?? null) as DocumentStorageStatus | null;

  if (!status) {
    throw new Error("Impossible de vérifier votre offre d’abonnement.");
  }

  if (!status.documents_enabled || status.limit_bytes <= 0) {
    throw new Error(
      "L’offre Essentiel n’inclut pas l’espace Documents. Passez à l’offre Club ou Grand Club pour importer ou créer des documents.",
    );
  }

  if (status.used_bytes + fileSize > status.limit_bytes) {
    const usedGb = (status.used_bytes / 1024 ** 3).toFixed(2);
    const limitGb = (status.limit_bytes / 1024 ** 3).toFixed(0);

    throw new Error(
      `Limite de stockage atteinte pour l’offre ${status.plan_name}. ${usedGb} Go utilisés sur ${limitGb} Go. Supprimez des documents ou passez à l’offre supérieure.`,
    );
  }
}

export async function uploadDocument(
  clubId: string,
  userId: string,
  file: File,
  folder: string,
) {
  await assertDocumentUploadAllowed(clubId, file.size);

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const storagePath = `${clubId}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      upsert: false,
      contentType: file.type || undefined,
    });
  throwIfError(uploadError);

  const { data, error } = await supabase
    .from("clm_asso_documents")
    .insert({
      club_id: clubId,
      name: file.name,
      folder: folder.trim() || "Général",
      mime_type: file.type || null,
      size_bytes: file.size,
      storage_path: storagePath,
      uploaded_by: userId,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    throwIfError(error);
  }

  const document = data as ClubDocument;

  const { error: versionError } = await supabase
    .from("clm_asso_document_versions")
    .insert({
      document_id: document.id,
      version_number: 1,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: userId,
      change_note: "Version initiale",
    });

  if (versionError) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    await supabase.from("clm_asso_documents").delete().eq("id", document.id);
    throwIfError(versionError);
  }

  return document;
}

export async function downloadDocument(document: ClubDocument) {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .download(document.storage_path);
  throwIfError(error);

  if (!data) {
    throw new Error("Le fichier téléchargé est vide.");
  }

  const url = URL.createObjectURL(data);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = document.name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function deleteDocument(document: ClubDocument) {
  const versions = await listDocumentVersions(document.id);
  const paths = Array.from(
    new Set([
      document.storage_path,
      ...versions.map((version) => version.storage_path),
    ]),
  );

  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .remove(paths);
    throwIfError(storageError);
  }

  const { error } = await supabase
    .from("clm_asso_documents")
    .delete()
    .eq("id", document.id);
  throwIfError(error);
}

export async function getDashboardData(clubId: string): Promise<DashboardData> {
  const now = new Date();
  const nowIso = now.toISOString();

  const calendarStart = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
    0,
    0,
    0,
    0,
  ).toISOString();

  const calendarEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 13,
    0,
    23,
    59,
    59,
    999,
  ).toISOString();

  const [
    membersResult,
    teamsResult,
    upcomingMatchesResult,
    calendarMatchesResult,
    tasksResult,
    eventsResult,
    announcementsResult,
    convocationsResult,
  ] = await Promise.all([
    supabase
      .from("clm_asso_members")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("club_id", clubId)
      .eq("status", "active"),

    supabase
      .from("clm_asso_teams")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("club_id", clubId),

    supabase
      .from("clm_asso_matches")
      .select("*, team:clm_asso_teams(id,name)", {
        count: "exact",
      })
      .eq("club_id", clubId)
      .gte("starts_at", nowIso)
      .eq("status", "scheduled")
      .order("starts_at")
      .limit(5),

    supabase
      .from("clm_asso_matches")
      .select("*, team:clm_asso_teams(id,name)")
      .eq("club_id", clubId)
      .gte("starts_at", calendarStart)
      .lte("starts_at", calendarEnd)
      .order("starts_at")
      .limit(250),

    supabase
      .from("clm_asso_tasks")
      .select(
        `
          *,
          assignee:clm_asso_members!
          clm_asso_tasks_assignee_member_id_fkey(*)
        `,
        {
          count: "exact",
        },
      )
      .eq("club_id", clubId)
      .neq("status", "completed")
      .order("due_at", {
        ascending: true,
        nullsFirst: false,
      })
      .limit(5),

    supabase
      .from("clm_asso_events")
      .select("*, team:clm_asso_teams(id,name)")
      .eq("club_id", clubId)
      .gte("starts_at", calendarStart)
      .lte("starts_at", calendarEnd)
      .order("starts_at")
      .limit(250),

    supabase
      .from("clm_asso_announcements")
      .select("*", {
        count: "exact",
      })
      .eq("club_id", clubId)
      .eq("status", "published")
      .order("published_at", {
        ascending: false,
        nullsFirst: false,
      })
      .limit(5),

    supabase
      .from("clm_asso_convocations")
      .select(
        `
          *,
          team:clm_asso_teams(id,name),
          match:clm_asso_matches(
            id,
            opponent_name,
            starts_at
          ),
          recipients:clm_asso_convocation_recipients(
            id,
            convocation_id,
            member_id,
            response,
            comment,
            responded_at
          )
        `,
        {
          count: "exact",
        },
      )
      .eq("club_id", clubId)
      .eq("status", "sent")
      .order("created_at", {
        ascending: false,
      })
      .limit(5),
  ]);

  for (const result of [
    membersResult,
    teamsResult,
    upcomingMatchesResult,
    calendarMatchesResult,
    tasksResult,
    eventsResult,
    announcementsResult,
    convocationsResult,
  ]) {
    throwIfError(result.error);
  }

  const upcomingMatches = (upcomingMatchesResult.data ?? []) as ClubMatch[];

  const calendarMatches = (calendarMatchesResult.data ?? []) as ClubMatch[];

  const calendarEvents = (eventsResult.data ?? []) as ClubEvent[];

  const latestAnnouncements = (announcementsResult.data ??
    []) as Announcement[];

  const openTasks = (tasksResult.data ?? []) as ClubTask[];

  const pendingConvocations = (convocationsResult.data ?? []) as Convocation[];

  const activityLogs = await listActivityLogs(clubId, 5);

  const recentActivity: DashboardData["recentActivity"] = activityLogs.map(
    (activity) => {
      const entityType = activity.entity_type;
      const kind =
        entityType === "announcements"
          ? ("announcement" as const)
          : entityType === "tasks"
            ? ("task" as const)
            : entityType === "matches"
              ? ("match" as const)
              : entityType === "convocations"
                ? ("convocation" as const)
                : entityType === "members" || entityType === "club_members"
                  ? ("member" as const)
                  : ("event" as const);

      const actionLabel =
        activity.action === "insert"
          ? "Ajout"
          : activity.action === "delete"
            ? "Suppression"
            : "Modification";

      const href =
        entityType === "matches" && activity.entity_id
          ? `/app/matchs/${activity.entity_id}`
          : entityType === "announcements"
            ? "/app/annonces"
            : entityType === "tasks"
              ? "/app/taches"
              : entityType === "convocations"
                ? "/app/convocations"
                : entityType === "teams"
                  ? "/app/equipes"
                  : entityType === "members" || entityType === "club_members"
                    ? "/app/membres"
                    : entityType === "documents"
                      ? "/app/documents"
                      : "/app/calendrier";

      return {
        id: activity.id,
        kind,
        title: `${actionLabel} · ${activity.title}`,
        description: `${activity.actor_display_name ?? "Action automatique"} · ${entityType.replaceAll("_", " ")}`,
        occurredAt: activity.created_at,
        href,
      };
    },
  );

  return {
    membersCount: membersResult.count ?? 0,

    teamsCount: teamsResult.count ?? 0,

    upcomingMatchesCount: upcomingMatchesResult.count ?? 0,

    openTasksCount: tasksResult.count ?? 0,

    convocationsCount: convocationsResult.count ?? 0,

    announcementsCount: announcementsResult.count ?? 0,

    upcomingMatches,
    calendarMatches,
    calendarEvents,
    latestAnnouncements,
    openTasks,
    pendingConvocations,
    recentActivity,
  };
}

export interface ClubSettingsPayload {
  name: string;
  acronym: string | null;
  description: string | null;
  season_label: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  timezone: string;
}

export async function updateClubSettings(
  clubId: string,
  payload: ClubSettingsPayload,
) {
  const { error } = await supabase
    .from("clm_asso_clubs")
    .update(payload)
    .eq("id", clubId);
  throwIfError(error);
}

export async function listInvitations(
  clubId: string,
): Promise<ClubInvitation[]> {
  const { data, error } = await supabase
    .from("clm_asso_invitations")
    .select("*")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });
  throwIfError(error);
  return (data ?? []) as ClubInvitation[];
}

export async function sendClubInvitation(payload: {
  clubId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: Exclude<import("../types/club").ClubRole, "owner">;
}) {
  const { data, error } = await supabase.functions.invoke(
    "clm-asso-invite-member",
    {
      body: {
        ...payload,
        redirectTo: `${window.location.origin}/invitation`,
      },
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  if (data?.error) {
    throw new Error(String(data.error));
  }

  return data as InvitationDeliveryResult;
}

export async function cancelInvitation(invitationId: string) {
  const { error } = await supabase
    .from("clm_asso_invitations")
    .update({ status: "cancelled" })
    .eq("id", invitationId);
  throwIfError(error);
}

export async function acceptInvitation(token: string) {
  const { data, error } = await supabase.rpc("clm_asso_accept_invitation", {
    p_token: token,
  });
  throwIfError(error);
  return data as string;
}

export async function setMemberRole(
  clubId: string,
  userId: string,
  role: import("../types/club").ClubRole,
) {
  const { error } = await supabase.rpc("clm_asso_set_member_role", {
    p_club_id: clubId,
    p_user_id: userId,
    p_role: role,
  });
  throwIfError(error);
}

export async function setMemberAccessStatus(
  clubId: string,
  userId: string,
  active: boolean,
) {
  const { error } = await supabase.rpc("clm_asso_set_member_access_status", {
    p_club_id: clubId,
    p_user_id: userId,
    p_active: active,
  });
  throwIfError(error);
}

export async function listNotifications(
  clubId?: string | null,
): Promise<ClubNotification[]> {
  let query = supabase
    .from("clm_asso_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);

  if (clubId) {
    query = query.or(`club_id.eq.${clubId},club_id.is.null`);
  }

  const { data, error } = await query;
  throwIfError(error);
  return (data ?? []) as ClubNotification[];
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase.rpc("clm_asso_mark_notification_read", {
    p_notification_id: notificationId,
  });
  throwIfError(error);
}

export async function markAllNotificationsRead(clubId?: string | null) {
  const { error } = await supabase.rpc("clm_asso_mark_all_notifications_read", {
    p_club_id: clubId ?? null,
  });
  throwIfError(error);
}

export async function listActivityLogs(clubId: string, limit = 20) {
  const { data, error } = await supabase
    .from("clm_asso_activity_logs")
    .select("*")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })
    .limit(limit);
  throwIfError(error);

  const logs = (data ?? []) as ActivityLog[];
  const actorIds = Array.from(
    new Set(
      logs
        .map((log) => log.actor_user_id)
        .filter((actorId): actorId is string => Boolean(actorId)),
    ),
  );

  if (actorIds.length === 0) {
    return logs.map((log) => ({ ...log, actor_display_name: null }));
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("clm_asso_profiles")
    .select("id,display_name,first_name,last_name")
    .in("id", actorIds);
  throwIfError(profilesError);

  const actorNames = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      profile.display_name ||
        [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
        "Membre du club",
    ]),
  );

  return logs.map((log) => ({
    ...log,
    actor_display_name: log.actor_user_id
      ? (actorNames.get(log.actor_user_id) ?? "Membre du club")
      : "Action automatique",
  }));
}

export async function listDocumentVersions(documentId: string) {
  const { data, error } = await supabase
    .from("clm_asso_document_versions")
    .select("*")
    .eq("document_id", documentId)
    .order("version_number", { ascending: false });
  throwIfError(error);
  return (data ?? []) as DocumentVersion[];
}

export async function replaceDocument(
  document: ClubDocument,
  userId: string,
  file: File,
  changeNote: string,
) {
  validateDocumentFile(file);

  await assertDocumentUploadAllowed(document.club_id, file.size);
  const versions = await listDocumentVersions(document.id);
  const nextVersion = (versions[0]?.version_number ?? 0) + 1;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const storagePath = `${document.club_id}/${document.id}/v${nextVersion}-${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      upsert: false,
      contentType: file.type || undefined,
    });
  throwIfError(uploadError);

  const { error: versionError } = await supabase
    .from("clm_asso_document_versions")
    .insert({
      document_id: document.id,
      version_number: nextVersion,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: userId,
      change_note: changeNote.trim() || `Version ${nextVersion}`,
    });

  if (versionError) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    throwIfError(versionError);
  }

  const { error: documentError } = await supabase
    .from("clm_asso_documents")
    .update({
      name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      storage_path: storagePath,
    })
    .eq("id", document.id);
  throwIfError(documentError);
}

export async function updateDocumentMetadata(
  documentId: string,
  payload: { name: string; folder: string },
) {
  const { error } = await supabase
    .from("clm_asso_documents")
    .update({
      name: payload.name.trim(),
      folder: payload.folder.trim() || "Général",
    })
    .eq("id", documentId);
  throwIfError(error);
}

export async function restoreDocumentVersion(
  document: ClubDocument,
  version: DocumentVersion,
  userId: string,
) {
  const versions = await listDocumentVersions(document.id);
  const nextVersion = (versions[0]?.version_number ?? 0) + 1;

  const { error: versionError } = await supabase
    .from("clm_asso_document_versions")
    .insert({
      document_id: document.id,
      version_number: nextVersion,
      storage_path: version.storage_path,
      file_name: version.file_name ?? document.name,
      mime_type: version.mime_type,
      size_bytes: version.size_bytes,
      uploaded_by: userId,
      change_note: `Restauration de la version ${version.version_number}`,
    });
  throwIfError(versionError);

  const { error } = await supabase
    .from("clm_asso_documents")
    .update({
      name: version.file_name ?? document.name,
      storage_path: version.storage_path,
      mime_type: version.mime_type,
      size_bytes: version.size_bytes,
    })
    .eq("id", document.id);
  throwIfError(error);
}

export async function downloadDocumentVersion(
  version: DocumentVersion,
  fileName: string,
) {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .download(version.storage_path);
  throwIfError(error);

  if (!data) throw new Error("Le fichier téléchargé est vide.");

  const url = URL.createObjectURL(data);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
