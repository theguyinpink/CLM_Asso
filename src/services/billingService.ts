import { supabase } from "../lib/supabase";

interface CheckoutResponse {
  url?: unknown;
  reused?: unknown;
  error?: unknown;
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
    const message =
      typeof data?.error === "string" && data.error.trim()
        ? data.error
        : error.message;

    throw new Error(message || "Impossible d’ouvrir le paiement Stripe.");
  }

  if (typeof data?.url !== "string" || !data.url.startsWith("https://")) {
    throw new Error("Stripe n’a pas renvoyé d’adresse de paiement valide.");
  }

  return {
    url: data.url,
    reused: data.reused === true,
  };
}
