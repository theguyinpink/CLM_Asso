export type SubscriptionStatus =
  | "pending_payment"
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

export interface ClubSubscription {
  subscriptionId: string;
  planCode: string;
  planName: string;
  planDescription: string;
  audienceLabel: string;
  monthlyPriceCents: number;
  currency: string;
  status: SubscriptionStatus;
  declaredLicenseesCount: number;
  documentsEnabled: boolean;
  documentStorageLimitBytes: number;
  planFeatures: Record<string, boolean>;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  paymentGracePeriodEndsAt: string | null;
  billingPortalAvailable: boolean;
  subscriptionManagementAvailable: boolean;
  canManageBilling: boolean;
  lastPaymentError: string | null;
  lastPaymentErrorAt: string | null;
}

export function subscriptionAllowsAppAccess(
  status: SubscriptionStatus | null | undefined,
  paymentGracePeriodEndsAt?: string | null,
) {
  if (status === "active" || status === "trialing") {
    return true;
  }

  if (status !== "past_due" || !paymentGracePeriodEndsAt) {
    return false;
  }

  const graceEnd = new Date(paymentGracePeriodEndsAt).getTime();
  return Number.isFinite(graceEnd) && graceEnd > Date.now();
}
