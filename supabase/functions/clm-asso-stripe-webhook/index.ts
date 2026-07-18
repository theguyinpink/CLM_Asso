import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

import {
  jsonResponse,
  requireEnvironment,
} from "../_shared/http.ts";

interface StripeApplyPayload {
  p_event_id: string;
  p_event_type: string;
  p_livemode: boolean;
  p_event_created_at: number;
  p_club_id: string | null;
  p_checkout_session_id: string | null;
  p_customer_id: string | null;
  p_subscription_id: string | null;
  p_price_id: string | null;
  p_status: string | null;
  p_current_period_start: string | null;
  p_current_period_end: string | null;
  p_trial_end: string | null;
  p_cancel_at_period_end: boolean | null;
  p_canceled_at: string | null;
  p_last_payment_error: string | null;
}

const SUPPORTED_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.expired",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
]);

function stripeId(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "id" in value &&
    typeof value.id === "string"
  ) {
    return value.id;
  }

  return null;
}

function unixDate(value: unknown): string | null {
  return typeof value === "number" && Number.isFinite(value)
    ? new Date(value * 1000).toISOString()
    : null;
}

function getSubscriptionPeriod(subscription: Record<string, unknown>) {
  const directStart = subscription.current_period_start;
  const directEnd = subscription.current_period_end;

  if (typeof directStart === "number" || typeof directEnd === "number") {
    return {
      start: unixDate(directStart),
      end: unixDate(directEnd),
    };
  }

  const items = subscription.items as
    | { data?: Array<Record<string, unknown>> }
    | undefined;
  const firstItem = items?.data?.[0];

  return {
    start: unixDate(firstItem?.current_period_start),
    end: unixDate(firstItem?.current_period_end),
  };
}

function mapSubscription(
  subscription: Stripe.Subscription,
): Partial<StripeApplyPayload> {
  const object = subscription as unknown as Record<string, unknown>;
  const period = getSubscriptionPeriod(object);
  const firstItem = subscription.items.data[0];

  return {
    p_club_id: subscription.metadata.club_id ?? null,
    p_customer_id: stripeId(subscription.customer),
    p_subscription_id: subscription.id,
    p_price_id: firstItem?.price?.id ?? null,
    p_status: subscription.status,
    p_current_period_start: period.start,
    p_current_period_end: period.end,
    p_trial_end: unixDate(subscription.trial_end),
    p_cancel_at_period_end: subscription.cancel_at_period_end,
    p_canceled_at: unixDate(subscription.canceled_at),
  };
}

function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const object = invoice as unknown as Record<string, unknown>;
  const direct = stripeId(object.subscription);

  if (direct) {
    return direct;
  }

  const parent = object.parent as Record<string, unknown> | undefined;
  const details = parent?.subscription_details as
    | Record<string, unknown>
    | undefined;

  return stripeId(details?.subscription);
}

async function buildApplyPayload(
  stripe: Stripe,
  event: Stripe.Event,
): Promise<StripeApplyPayload> {
  const base: StripeApplyPayload = {
    p_event_id: event.id,
    p_event_type: event.type,
    p_livemode: event.livemode,
    p_event_created_at: event.created,
    p_club_id: null,
    p_checkout_session_id: null,
    p_customer_id: null,
    p_subscription_id: null,
    p_price_id: null,
    p_status: null,
    p_current_period_start: null,
    p_current_period_end: null,
    p_trial_end: null,
    p_cancel_at_period_end: null,
    p_canceled_at: null,
    p_last_payment_error: null,
  };

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const subscriptionId = stripeId(session.subscription);
    let subscriptionData: Partial<StripeApplyPayload> = {};

    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      subscriptionData = mapSubscription(subscription);
    }

    return {
      ...base,
      ...subscriptionData,
      p_club_id:
        session.metadata?.club_id ??
        session.client_reference_id ??
        subscriptionData.p_club_id ??
        null,
      p_checkout_session_id: session.id,
      p_customer_id:
        stripeId(session.customer) ?? subscriptionData.p_customer_id ?? null,
      p_subscription_id:
        subscriptionId ?? subscriptionData.p_subscription_id ?? null,
    };
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;

    return {
      ...base,
      p_club_id: session.metadata?.club_id ?? session.client_reference_id,
      p_checkout_session_id: session.id,
      p_customer_id: stripeId(session.customer),
      p_subscription_id: stripeId(session.subscription),
      p_status: "pending_payment",
    };
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.paused"
  ) {
    return {
      ...base,
      ...mapSubscription(event.data.object as Stripe.Subscription),
    };
  }

  if (
    event.type === "invoice.paid" ||
    event.type === "invoice.payment_failed" ||
    event.type === "invoice.payment_action_required"
  ) {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = invoiceSubscriptionId(invoice);

    if (!subscriptionId) {
      return {
        ...base,
        p_customer_id: stripeId(invoice.customer),
        p_last_payment_error:
          event.type === "invoice.payment_failed"
            ? "Le paiement de la facture Stripe n’a pas abouti."
            : event.type === "invoice.payment_action_required"
              ? "Une authentification bancaire est nécessaire pour finaliser le paiement."
              : null,
      };
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const paymentError =
      event.type === "invoice.payment_failed"
        ? invoice.last_finalization_error?.message ??
          "Le paiement de la facture Stripe n’a pas abouti."
        : event.type === "invoice.payment_action_required"
          ? "Une authentification bancaire est nécessaire pour finaliser le paiement."
          : null;

    return {
      ...base,
      ...mapSubscription(subscription),
      p_last_payment_error: paymentError,
    };
  }

  return base;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée." }, 405);
  }

  try {
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return jsonResponse({ error: "Signature Stripe absente." }, 400);
    }

    const stripeSecretKey = requireEnvironment("STRIPE_SECRET_KEY");
    const webhookSecret = requireEnvironment("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = requireEnvironment("SUPABASE_URL");
    const serviceRoleKey = requireEnvironment("SUPABASE_SERVICE_ROLE_KEY");
    const stripe = new Stripe(stripeSecretKey);
    const cryptoProvider = Stripe.createSubtleCryptoProvider();
    const rawBody = await request.text();

    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
        webhookSecret,
        undefined,
        cryptoProvider,
      );
    } catch (error) {
      console.warn("Signature Stripe invalide", error);
      return jsonResponse({ error: "Signature Stripe invalide." }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const payload = SUPPORTED_EVENTS.has(event.type)
      ? await buildApplyPayload(stripe, event)
      : {
          p_event_id: event.id,
          p_event_type: event.type,
          p_livemode: event.livemode,
          p_event_created_at: event.created,
          p_club_id: null,
          p_checkout_session_id: null,
          p_customer_id: null,
          p_subscription_id: null,
          p_price_id: null,
          p_status: null,
          p_current_period_start: null,
          p_current_period_end: null,
          p_trial_end: null,
          p_cancel_at_period_end: null,
          p_canceled_at: null,
          p_last_payment_error: null,
        } satisfies StripeApplyPayload;

    const { data, error } = await adminClient.rpc(
      "clm_asso_apply_stripe_event",
      payload,
    );

    if (error) {
      throw error;
    }

    return jsonResponse(
      {
        received: true,
        processed: data === true,
        event: event.type,
      },
      200,
    );
  } catch (error) {
    console.error("clm-asso-stripe-webhook", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur interne du webhook Stripe.",
      },
      500,
    );
  }
});
