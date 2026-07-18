import type { SubscriptionPlanCode } from "../lib/subscriptionPlans";
import { supabase } from "../lib/supabase";

interface CheckoutResponse {
  url?: unknown;
  reused?: unknown;
  error?: unknown;
}

interface PortalResponse {
  url?: unknown;
  action?: unknown;
  error?: unknown;
}

export type BillingPortalAction =
  | "home"
  | "payment_method"
  | "cancel"
  | "change_plan";

function readFunctionError(
  data: { error?: unknown } | null | undefined,
  fallback: string,
  invocationMessage?: string,
) {
  if (typeof data?.error === "string" && data.error.trim()) {
    return data.error;
  }

  return invocationMessage || fallback;
}

export async function createSubscriptionCheckout(clubId: string) {
  const { data, error } = await supabase.functions.invoke<CheckoutResponse>(
    "clm-asso-create-checkout",
    {
      body: {
        clubId,
      },
    },
  );

  if (error) {
    throw new Error(
      readFunctionError(
        data,
        "Impossible d’ouvrir le paiement Stripe.",
        error.message,
      ),
    );
  }

  if (typeof data?.url !== "string" || !data.url.startsWith("https://")) {
    throw new Error("Stripe n’a pas renvoyé d’adresse de paiement valide.");
  }

  return {
    url: data.url,
    reused: data.reused === true,
  };
}

export async function createBillingPortalSession(
  clubId: string,
  action: BillingPortalAction = "home",
  targetPlanCode?: SubscriptionPlanCode,
) {
  const { data, error } = await supabase.functions.invoke<PortalResponse>(
    "clm-asso-create-billing-portal",
    {
      body: {
        clubId,
        action,
        targetPlanCode,
      },
    },
  );

  if (error) {
    throw new Error(
      readFunctionError(
        data,
        "Impossible d’ouvrir le portail Stripe.",
        error.message,
      ),
    );
  }

  if (typeof data?.url !== "string" || !data.url.startsWith("https://")) {
    throw new Error("Stripe n’a pas renvoyé d’adresse de portail valide.");
  }

  return {
    url: data.url,
    action:
      typeof data.action === "string" ? data.action : action,
  };
}
