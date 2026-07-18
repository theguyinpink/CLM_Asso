import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

import {
  buildCorsHeaders,
  jsonResponse,
  parseBearerToken,
  requireEnvironment,
} from "../_shared/http.ts";

interface CheckoutRequestBody {
  clubId?: unknown;
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
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_checkout_session_expires_at: string | null;
  last_checkout_created_at: string | null;
  metadata: Record<string, unknown> | null;
}

interface PlanRow {
  id: string;
  code: string;
  name: string;
  stripe_monthly_price_id: string | null;
  is_active: boolean;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

Deno.serve(async (request) => {
  const cors = buildCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: cors.allowed ? 204 : 403,
      headers: cors.headers,
    });
  }

  if (!cors.allowed) {
    return jsonResponse(
      { error: "Origine non autorisée." },
      403,
      cors.headers,
    );
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

    let body: CheckoutRequestBody;

    try {
      body = (await request.json()) as CheckoutRequestBody;
    } catch {
      return jsonResponse(
        { error: "Corps de requête JSON invalide." },
        400,
        cors.headers,
      );
    }

    const clubId = typeof body.clubId === "string" ? body.clubId.trim() : "";

    if (!UUID_PATTERN.test(clubId)) {
      return jsonResponse(
        { error: "Identifiant de club invalide." },
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
          "id, club_id, plan_id, status, stripe_customer_id, stripe_subscription_id, stripe_checkout_session_id, stripe_checkout_session_expires_at, last_checkout_created_at, metadata",
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

    if (["active", "trialing"].includes(subscription.status)) {
      return jsonResponse(
        { error: "L’abonnement de ce club est déjà actif." },
        409,
        cors.headers,
      );
    }

    if (
      subscription.stripe_subscription_id &&
      !["canceled", "incomplete_expired"].includes(subscription.status)
    ) {
      return jsonResponse(
        {
          error:
            "Un abonnement Stripe existe déjà. Actualisez le statut ou terminez le paiement en cours.",
        },
        409,
        cors.headers,
      );
    }

    const { data: planData, error: planError } = await adminClient
      .from("clm_asso_subscription_plans")
      .select("id, code, name, stripe_monthly_price_id, is_active")
      .eq("id", subscription.plan_id)
      .maybeSingle();

    if (planError) {
      throw planError;
    }

    const plan = planData as PlanRow | null;

    if (
      !plan ||
      !plan.is_active ||
      !plan.stripe_monthly_price_id?.startsWith("price_")
    ) {
      return jsonResponse(
        {
          error:
            "L’offre choisie n’est pas encore correctement reliée à Stripe.",
        },
        409,
        cors.headers,
      );
    }

    const stripe = new Stripe(stripeSecretKey);
    const now = Date.now();

    if (
      subscription.last_checkout_created_at &&
      now - new Date(subscription.last_checkout_created_at).getTime() < 5000
    ) {
      return jsonResponse(
        { error: "Patientez quelques secondes avant de réessayer." },
        429,
        cors.headers,
      );
    }

    if (
      subscription.stripe_checkout_session_id &&
      subscription.stripe_checkout_session_expires_at &&
      new Date(subscription.stripe_checkout_session_expires_at).getTime() > now
    ) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(
          subscription.stripe_checkout_session_id,
        );

        if (existingSession.status === "open" && existingSession.url) {
          return jsonResponse(
            { url: existingSession.url, reused: true },
            200,
            cors.headers,
          );
        }
      } catch {
        // Une ancienne session inaccessible ne doit pas empêcher une nouvelle tentative.
      }
    }

    const commonMetadata = {
      club_id: clubId,
      clm_asso_subscription_id: subscription.id,
      clm_asso_plan_code: plan.code,
      selected_by_user_id: user.id,
    };

    const createParams: Parameters<
      typeof stripe.checkout.sessions.create
    >[0] = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: plan.stripe_monthly_price_id,
          quantity: 1,
        },
      ],
      success_url:
        `${appUrl}/app/abonnement?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/app/abonnement?checkout=cancelled`,
      client_reference_id: clubId,
      customer_email: subscription.stripe_customer_id ? undefined : user.email,
      customer: subscription.stripe_customer_id ?? undefined,
      billing_address_collection: "required",
      allow_promotion_codes: false,
      locale: "fr",
      metadata: commonMetadata,
      subscription_data: {
        metadata: commonMetadata,
      },
    };

    const idempotencyBucket = Math.floor(now / 15000);
    const session = await stripe.checkout.sessions.create(createParams, {
      idempotencyKey: `clm-asso-${subscription.id}-${idempotencyBucket}`,
    });

    if (!session.url) {
      throw new Error("Stripe n’a pas généré d’adresse Checkout.");
    }

    const expiresAt = new Date(session.expires_at * 1000).toISOString();

    const { error: updateError } = await adminClient
      .from("clm_asso_club_subscriptions")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_checkout_session_expires_at: expiresAt,
        last_checkout_created_at: new Date(now).toISOString(),
        metadata: {
          ...(subscription.metadata ?? {}),
          checkout_plan_code: plan.code,
          checkout_created_by: user.id,
          checkout_created_at: new Date(now).toISOString(),
        },
      })
      .eq("id", subscription.id);

    if (updateError) {
      throw updateError;
    }

    return jsonResponse(
      { url: session.url, reused: false },
      200,
      cors.headers,
    );
  } catch (error) {
    console.error("clm-asso-create-checkout", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de créer la session Stripe.",
      },
      500,
      cors.headers,
    );
  }
});
