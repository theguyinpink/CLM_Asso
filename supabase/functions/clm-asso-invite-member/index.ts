import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

const allowedRoles = new Set([
  "admin",
  "manager",
  "coach",
  "member",
]);

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const emailPattern =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getConfiguredAppUrl() {
  const value = Deno.env.get("CLM_ASSO_APP_URL")?.trim();

  if (!value) {
    throw new Error("CLM_ASSO_APP_URL est absente de la configuration serveur.");
  }

  const url = new URL(value);

  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      isLocalDevelopmentHost(url.hostname)
    )
  ) {
    throw new Error("CLM_ASSO_APP_URL doit utiliser HTTPS ou une adresse locale privée.");
  }

  return url;
}

function getAllowedOrigins(appUrl: URL) {
  const configuredOrigins =
    Deno.env
      .get("CLM_ASSO_ALLOWED_ORIGINS")
      ?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];

  return new Set([
    appUrl.origin,
    ...configuredOrigins,
  ]);
}

function getCorsHeaders(request: Request, appUrl: URL) {
  const origin = request.headers.get("Origin");
  const allowedOrigins = getAllowedOrigins(appUrl);

  if (origin && !allowedOrigins.has(origin)) {
    return null;
  }

  return {
    "Access-Control-Allow-Origin": origin ?? appUrl.origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

interface InvitationPayload {
  clubId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role:
    | "admin"
    | "manager"
    | "coach"
    | "member";
  redirectTo: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function json(
  body: unknown,
  status: number,
  corsHeaders: Record<string, string>,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

/**
 * Autorise uniquement :
 * - localhost ;
 * - 127.0.0.1 ;
 * - les adresses privées 10.x.x.x ;
 * - les adresses privées 172.16.x.x à 172.31.x.x ;
 * - les adresses privées 192.168.x.x.
 */
function isLocalDevelopmentHost(
  hostname: string,
) {
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  ) {
    return true;
  }

  const parts = hostname
    .split(".")
    .map(Number);

  if (
    parts.length !== 4 ||
    parts.some(
      (part) =>
        !Number.isInteger(part) ||
        part < 0 ||
        part > 255,
    )
  ) {
    return false;
  }

  const [first, second] = parts;

  return (
    first === 10 ||
    (
      first === 172 &&
      second >= 16 &&
      second <= 31
    ) ||
    (
      first === 192 &&
      second === 168
    )
  );
}

async function findUserByEmail(
  adminClient: SupabaseClient,
  email: string,
) {
  const normalizedEmail =
    email.trim().toLowerCase();

  for (
    let page = 1;
    page <= 20;
    page += 1
  ) {
    const {
      data,
      error,
    } =
      await adminClient.auth.admin.listUsers(
        {
          page,
          perPage: 1000,
        },
      );

    if (error) {
      throw error;
    }

    const user = data.users.find(
      (candidate) =>
        candidate.email?.toLowerCase() ===
        normalizedEmail,
    );

    if (user) {
      return user;
    }

    if (data.users.length < 1000) {
      return null;
    }
  }

  return null;
}

async function sendExistingUserEmail(
  payload: InvitationPayload,
  clubName: string,
  invitationUrl: string,
) {
  const apiKey =
    Deno.env.get("RESEND_API_KEY");

  const from =
    Deno.env.get("INVITE_FROM_EMAIL");

  if (!apiKey || !from) {
    return false;
  }

  const safeClubName =
    escapeHtml(clubName);

  const subjectClubName =
    clubName
      .replace(/[\r\n]+/g, " ")
      .trim();

  const safeEmail =
    escapeHtml(payload.email);

  const safeInvitationUrl =
    escapeHtml(invitationUrl);

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${apiKey}`,

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        from,
        to: [payload.email],

        subject:
          `Invitation à rejoindre ` +
          `${subjectClubName} sur CLM Asso`,

        html: `
          <!doctype html>
          <html lang="fr">
            <head>
              <meta charset="UTF-8" />

              <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
              />

              <title>
                Invitation CLM Asso
              </title>
            </head>

            <body
              style="
                margin: 0;
                padding: 0;
                background-color: #f4f7fb;
                font-family: Arial, Helvetica, sans-serif;
                color: #10213a;
              "
            >
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
              >
                <tr>
                  <td
                    align="center"
                    style="padding: 36px 16px;"
                  >
                    <table
                      role="presentation"
                      width="100%"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                      style="
                        width: 100%;
                        max-width: 580px;
                        overflow: hidden;
                        border: 1px solid #e1e7ef;
                        border-radius: 16px;
                        background-color: #ffffff;
                      "
                    >
                      <tr>
                        <td
                          align="center"
                          style="
                            padding: 30px;
                            background-color: #0b2345;
                            color: #ffffff;
                            font-size: 22px;
                            font-weight: 800;
                          "
                        >
                          Maison CLM
                        </td>
                      </tr>

                      <tr>
                        <td
                          style="padding: 34px;"
                        >
                          <p
                            style="
                              margin: 0 0 10px;
                              color: #0875f5;
                              font-size: 12px;
                              font-weight: 700;
                              text-transform: uppercase;
                            "
                          >
                            Invitation CLM Asso
                          </p>

                          <h1
                            style="
                              margin: 0 0 18px;
                              color: #10213a;
                              font-size: 25px;
                            "
                          >
                            Rejoignez ${safeClubName}
                          </h1>

                          <p
                            style="
                              margin: 0 0 24px;
                              color: #53657c;
                              font-size: 15px;
                              line-height: 1.65;
                            "
                          >
                            Vous avez été invité(e) à
                            rejoindre l’espace du club
                            <strong>${safeClubName}</strong>.
                          </p>

                          <p
                            style="
                              margin: 0 0 24px;
                              color: #53657c;
                              font-size: 15px;
                              line-height: 1.65;
                            "
                          >
                            Connectez-vous avec l’adresse
                            <strong>${safeEmail}</strong>,
                            puis acceptez l’invitation.
                          </p>

                          <p
                            style="
                              margin: 28px 0;
                              text-align: center;
                            "
                          >
                            <a
                              href="${safeInvitationUrl}"
                              style="
                                display: inline-block;
                                padding: 14px 24px;
                                border-radius: 9px;
                                background-color: #0875f5;
                                color: #ffffff;
                                font-weight: 700;
                                text-decoration: none;
                              "
                            >
                              Accepter l’invitation
                            </a>
                          </p>

                          <p
                            style="
                              margin: 24px 0 0;
                              color: #8290a3;
                              font-size: 12px;
                              line-height: 1.6;
                            "
                          >
                            Cette invitation expire dans
                            14 jours.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
      }),
    },
  );

  if (!response.ok) {
    const providerMessage = await response.text();

    console.error(
      "Erreur Resend lors de l’invitation :",
      response.status,
      providerMessage,
    );

    throw new Error("L’e-mail d’invitation n’a pas pu être envoyé.");
  }

  return true;
}

Deno.serve(
  async (request) => {
    let appUrl: URL;

    try {
      appUrl = getConfiguredAppUrl();
    } catch (error) {
      console.error("Configuration URL CLM Asso invalide :", error);

      return new Response(
        JSON.stringify({ error: "Configuration serveur incomplète." }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const corsHeaders = getCorsHeaders(request, appUrl);

    if (!corsHeaders) {
      return new Response(
        JSON.stringify({ error: "Origine non autorisée." }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const respond = (body: unknown, status = 200) =>
      json(body, status, corsHeaders);

    if (request.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return respond(
        {
          error:
            "Méthode non autorisée.",
        },
        405,
      );
    }

    try {
      const supabaseUrl =
        Deno.env.get("SUPABASE_URL");

      const anonKey =
        Deno.env.get(
          "SUPABASE_ANON_KEY",
        );

      const serviceRoleKey =
        Deno.env.get(
          "SUPABASE_SERVICE_ROLE_KEY",
        );

      const authorization =
        request.headers.get(
          "Authorization",
        );

      if (
        !supabaseUrl ||
        !anonKey ||
        !serviceRoleKey ||
        !authorization
      ) {
        return respond(
          {
            error:
              "Configuration serveur incomplète.",
          },
          500,
        );
      }

      const callerClient =
        createClient(
          supabaseUrl,
          anonKey,
          {
            global: {
              headers: {
                Authorization:
                  authorization,
              },
            },
          },
        );

      const adminClient =
        createClient(
          supabaseUrl,
          serviceRoleKey,
          {
            auth: {
              autoRefreshToken:
                false,

              persistSession:
                false,
            },
          },
        );

      const {
        data: {
          user,
        },
        error: userError,
      } =
        await callerClient.auth.getUser();

      if (
        userError ||
        !user
      ) {
        return respond(
          {
            error:
              "Utilisateur non authentifié.",
          },
          401,
        );
      }

      let payload:
        InvitationPayload;

      try {
        payload =
          await request.json();
      } catch {
        return respond(
          {
            error:
              "Le contenu de la requête est invalide.",
          },
          400,
        );
      }

      const normalizedEmail =
        payload.email
          ?.trim()
          .toLowerCase();

      const firstName = payload.firstName?.trim() || "";
      const lastName = payload.lastName?.trim() || "";

      if (
        !uuidPattern.test(payload.clubId ?? "") ||
        !normalizedEmail ||
        normalizedEmail.length > 254 ||
        !emailPattern.test(normalizedEmail) ||
        firstName.length > 80 ||
        lastName.length > 80 ||
        !allowedRoles.has(payload.role)
      ) {
        return respond(
          { error: "Données d’invitation invalides." },
          400,
        );
      }

      const {
        data: canInvite,
        error: permissionError,
      } =
        await callerClient.rpc(
          "clm_asso_has_permission",
          {
            p_club_id:
              payload.clubId,

            p_permission:
              "manage_roles",
          },
        );

      if (permissionError) {
        throw permissionError;
      }

      if (!canInvite) {
        return respond(
          {
            error:
              "Vous n’avez pas le droit d’inviter des utilisateurs.",
          },
          403,
        );
      }

      const { error: rateLimitError } = await callerClient.rpc(
        "clm_asso_consume_invitation_rate_limit",
        { p_club_id: payload.clubId },
      );

      if (rateLimitError) {
        return respond(
          { error: rateLimitError.message },
          429,
        );
      }

      const {
        data: club,
        error: clubError,
      } =
        await adminClient
          .from(
            "clm_asso_clubs",
          )
          .select("id,name")
          .eq(
            "id",
            payload.clubId,
          )
          .single();

      if (clubError) {
        throw clubError;
      }

      const existingUser =
        await findUserByEmail(
          adminClient,
          normalizedEmail,
        );

      const redirectUrl = new URL("/invitation", appUrl);

      await adminClient
        .from(
          "clm_asso_invitations",
        )
        .update({
          status: "cancelled",
        })
        .eq(
          "club_id",
          payload.clubId,
        )
        .eq(
          "status",
          "pending",
        )
        .ilike(
          "email",
          normalizedEmail,
        );

      const {
        data: invitation,
        error: invitationError,
      } =
        await adminClient
          .from(
            "clm_asso_invitations",
          )
          .insert({
            club_id:
              payload.clubId,

            email:
              normalizedEmail,

            first_name: firstName || null,

            last_name: lastName || null,

            role:
              payload.role,

            invited_by:
              user.id,
          })
          .select(
            "id,token,expires_at",
          )
          .single();

      if (invitationError) {
        throw invitationError;
      }

      redirectUrl.searchParams.set(
        "token",
        invitation.token,
      );

      if (!existingUser) {
        redirectUrl.searchParams.set(
          "setup",
          "1",
        );
      }

      const invitationUrl =
        redirectUrl.toString();

      let emailSent = false;

      let deliveryMode:
        | "supabase"
        | "resend"
        | "link" =
        "link";

      if (!existingUser) {
        const {
          error: inviteError,
        } =
          await adminClient
            .auth
            .admin
            .inviteUserByEmail(
              normalizedEmail,
              {
                redirectTo:
                  invitationUrl,

                data: {
                  first_name: firstName || null,

                  last_name: lastName || null,

                  display_name:
                    [firstName, lastName]
                      .filter(Boolean)
                      .join(" ") || null,

                  clm_asso_invitation_token:
                    invitation.token,
                },
              },
            );

        if (inviteError) {
          throw inviteError;
        }

        emailSent = true;
        deliveryMode =
          "supabase";
      } else {
        emailSent =
          await sendExistingUserEmail(
            payload,
            club.name,
            invitationUrl,
          );

        deliveryMode =
          emailSent
            ? "resend"
            : "link";
      }

      return respond({
        invitationId:
          invitation.id,

        invitationUrl,

        expiresAt:
          invitation.expires_at,

        emailSent,

        deliveryMode,

        existingAccount:
          Boolean(existingUser),
      });
    } catch (error) {
      console.error(
        "Erreur invitation CLM Asso :",
        error,
      );

      const publicMessages = [
        "Trop de tentatives",
        "Permission insuffisante",
        "L’e-mail d’invitation n’a pas pu être envoyé",
      ];

      const rawMessage =
        error instanceof Error ? error.message : "";

      const isPublicMessage = publicMessages.some((message) =>
        rawMessage.startsWith(message),
      );

      return respond(
        {
          error: isPublicMessage
            ? rawMessage
            : "L’invitation n’a pas pu être créée.",
        },
        isPublicMessage && rawMessage.startsWith("Trop de tentatives")
          ? 429
          : 500,
      );
    }
  },
);