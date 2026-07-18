import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

import {
  buildCorsHeaders,
  jsonResponse,
  parseBearerToken,
  requireEnvironment,
} from "../_shared/http.ts";

type PortalAction = "home" | "payment_method" | "cancel" | "change_plan";

interface PortalRequestBody {
  clubId?: unknown;
  action?: unknown;
  targetPlanCode?: unknown;
}

interface MembershipRow {
  role: "owner" | "admin" | "manager" | "coach" | "member";
  status: "pending" | "active" | "suspended";
}

interface SubscriptionRow {
  id: string;
  club_id: string;
  plan_id: string;
  status: string;
  declared_licensees_count: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_portal_last_created_at: string | null;
}

interface PlanRow {
  id: string;
  code: string;
  name: string;
  maximum_licensees: number | null;
  stripe_monthly_price_id: string | null;
  is_active: boolean;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PLAN_CODE_PATTERN = /^[a-z][a-z0-9_]{1,49}$/;
const ALLOWED_ACTIONS = new Set<PortalAction>([
  "home",
  "payment_method",
  "cancel",
  "change_plan",
]);

function resolveAppUrl() {
  const raw = requireEnvironment("CLM_ASSO_APP_URL");
  const url = new URL(raw);

  if (
    url.protocol !== "https:" &&
    url.hostname !== "localhost" &&
    url.hostname !== "127.0.0.1"
  ) {
    throw new Error("CLM_ASSO_APP_URL doit utiliser HTTPS en production.");
  }

  return url.origin;
}

function readAction(value: unknown): PortalAction | null {
  if (typeof value !== "string") {
    return "home";
  }

  return ALLOWED_ACTIONS.has(value as PortalAction)
    ? (value as PortalAction)
    : null;
}

Deno.serve(async (request) => {
  const cors = buildCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: cors.allowed ? 204 : 403,
      headers: cors.headers,
    });
  }

  if (!cors.allowed) {
    return jsonResponse({ error: "Origine non autorisée." }, 403, cors.headers);
  }

  if (request.method !== "POST") {
    return jsonResponse(
      { error: "Méthode non autorisée." },
      405,
      cors.headers,
    );
  }

  try {
    const supabaseUrl = requireEnvironment("SUPABASE_URL");
    const supabaseAnonKey = requireEnvironment("SUPABASE_ANON_KEY");
    const serviceRoleKey = requireEnvironment("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = requireEnvironment("STRIPE_SECRET_KEY");
    const appUrl = resolveAppUrl();
    const token = parseBearerToken(request);

    if (!token) {
      return jsonResponse(
        { error: "Vous devez être connecté." },
        401,
        cors.headers,
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse(
        { error: "Session utilisateur invalide ou expirée." },
        401,
        cors.headers,
      );
    }

    let body: PortalRequestBody;

    try {
      body = (await request.json()) as PortalRequestBody;
    } catch {
      return jsonResponse(
        { error: "Corps de requête JSON invalide." },
        400,
        cors.headers,
      );
    }

    const clubId = typeof body.clubId === "string" ? body.clubId.trim() : "";
    const action = readAction(body.action);
    const targetPlanCode =
      typeof body.targetPlanCode === "string"
        ? body.targetPlanCode.trim()
        : "";

    if (!UUID_PATTERN.test(clubId)) {
      return jsonResponse(
        { error: "Identifiant de club invalide." },
        400,
        cors.headers,
      );
    }

    if (!action) {
      return jsonResponse(
        { error: "Action de facturation invalide." },
        400,
        cors.headers,
      );
    }

    if (
      action === "change_plan" &&
      !PLAN_CODE_PATTERN.test(targetPlanCode)
    ) {
      return jsonResponse(
        { error: "Offre cible invalide." },
        400,
        cors.headers,
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: membershipData, error: membershipError } = await adminClient
      .from("clm_asso_club_members")
      .select("role, status")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      throw membershipError;
    }

    const membership = membershipData as MembershipRow | null;

    if (
      !membership ||
      membership.status !== "active" ||
      !["owner", "admin"].includes(membership.role)
    ) {
      return jsonResponse(
        {
          error:
            "Seul le propriétaire ou un administrateur peut gérer l’abonnement.",
        },
        403,
        cors.headers,
      );
    }

    const { data: subscriptionData, error: subscriptionError } =
      await adminClient
        .from("clm_asso_club_subscriptions")
        .select(
          "id, club_id, plan_id, status, declared_licensees_count, stripe_customer_id, stripe_subscription_id, billing_portal_last_created_at",
        )
        .eq("club_id", clubId)
        .maybeSingle();

    if (subscriptionError) {
      throw subscriptionError;
    }

    const subscription = subscriptionData as SubscriptionRow | null;

    if (!subscription) {
      return jsonResponse(
        { error: "Aucun abonnement n’est rattaché à ce club." },
        404,
        cors.headers,
      );
    }

    if (!subscription.stripe_customer_id?.startsWith("cus_")) {
      return jsonResponse(
        {
          error:
            "Le portail Stripe sera disponible après la création du premier abonnement.",
        },
        409,
        cors.headers,
      );
    }

    const now = Date.now();

    if (
      subscription.billing_portal_last_created_at &&
      now - new Date(subscription.billing_portal_last_created_at).getTime() <
        3000
    ) {
      return jsonResponse(
        { error: "Patientez quelques secondes avant de réessayer." },
        429,
        cors.headers,
      );
    }

    if (
      ["cancel", "change_plan"].includes(action) &&
      !subscription.stripe_subscription_id?.startsWith("sub_")
    ) {
      return jsonResponse(
        { error: "Aucun abonnement Stripe modifiable n’a été trouvé." },
        409,
        cors.headers,
      );
    }

    const stripe = new Stripe(stripeSecretKey);
    const returnUrl = `${appUrl}/app/abonnement?portal=returned`;
    const createParams: Record<string, unknown> = {
      customer: subscription.stripe_customer_id,
      return_url: returnUrl,
      locale: "fr",
    };

    let targetPlan: PlanRow | null = null;

    if (action === "payment_method") {
      createParams.flow_data = {
        type: "payment_method_update",
        after_completion: {
          type: "redirect",
          redirect: { return_url: returnUrl },
        },
      };
    }

    if (action === "cancel") {
      createParams.flow_data = {
        type: "subscription_cancel",
        subscription_cancel: {
          subscription: subscription.stripe_subscription_id,
        },
        after_completion: {
          type: "redirect",
          redirect: { return_url: returnUrl },
        },
      };
    }

    if (action === "change_plan") {
      if (!["active", "trialing"].includes(subscription.status)) {
        return jsonResponse(
          {
            error:
              "Régularisez d’abord l’abonnement avant de changer d’offre.",
          },
          409,
          cors.headers,
        );
      }

      const { data: targetPlanData, error: targetPlanError } =
        await adminClient
          .from("clm_asso_subscription_plans")
          .select(
            "id, code, name, maximum_licensees, stripe_monthly_price_id, is_active",
          )
          .eq("code", targetPlanCode)
          .eq("is_active", true)
          .maybeSingle();

      if (targetPlanError) {
        throw targetPlanError;
      }

      targetPlan = targetPlanData as PlanRow | null;

      if (
        !targetPlan ||
        !targetPlan.stripe_monthly_price_id?.startsWith("price_")
      ) {
        return jsonResponse(
          { error: "L’offre demandée n’est pas disponible dans Stripe." },
          409,
          cors.headers,
        );
      }

      if (targetPlan.id === subscription.plan_id) {
        return jsonResponse(
          { error: "Cette offre est déjà active pour le club." },
          409,
          cors.headers,
        );
      }

      if (
        targetPlan.maximum_licensees !== null &&
        subscription.declared_licensees_count >
          targetPlan.maximum_licensees
      ) {
        return jsonResponse(
          {
            error:
              `L’offre ${targetPlan.name} est limitée à ` +
              `${targetPlan.maximum_licensees} licenciés.`,
          },
          409,
          cors.headers,
        );
      }

      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripe_subscription_id as string,
      );
      const subscriptionItem = stripeSubscription.items.data[0];

      if (
        stripeSubscription.items.data.length !== 1 ||
        !subscriptionItem
      ) {
        return jsonResponse(
          {
            error:
              "Cet abonnement Stripe ne peut pas être modifié automatiquement.",
          },
          409,
          cors.headers,
        );
      }

      createParams.flow_data = {
        type: "subscription_update_confirm",
        subscription_update_confirm: {
          subscription: subscription.stripe_subscription_id,
          items: [
            {
              id: subscriptionItem.id,
              price: targetPlan.stripe_monthly_price_id,
              quantity: 1,
            },
          ],
        },
        after_completion: {
          type: "redirect",
          redirect: { return_url: returnUrl },
        },
      };
    }

    const portalSession = await stripe.billingPortal.sessions.create(
      createParams as Parameters<
        typeof stripe.billingPortal.sessions.create
      >[0],
    );

    if (!portalSession.url?.startsWith("https://")) {
      throw new Error("Stripe n’a pas généré d’adresse de portail valide.");
    }

    const updatePayload: Record<string, unknown> = {
      billing_portal_last_created_at: new Date(now).toISOString(),
      billing_portal_last_created_by: user.id,
    };

    if (action === "change_plan" && targetPlan) {
      updatePayload.last_plan_change_requested_at = new Date(now).toISOString();
      updatePayload.last_plan_change_target_plan_id = targetPlan.id;
    }

    const { error: updateError } = await adminClient
      .from("clm_asso_club_subscriptions")
      .update(updatePayload)
      .eq("id", subscription.id);

    if (updateError) {
      console.warn("Impossible d’enregistrer l’ouverture du portail", updateError);
    }

    return jsonResponse(
      { url: portalSession.url, action },
      200,
      cors.headers,
    );
  } catch (error) {
    console.error("clm-asso-create-billing-portal", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible d’ouvrir le portail Stripe.",
      },
      500,
      cors.headers,
    );
  }
});
