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
  canManageBilling: boolean;
  lastPaymentError: string | null;
}

export function subscriptionAllowsAppAccess(
  status: SubscriptionStatus | null | undefined,
) {
  return status === "active" || status === "trialing";
}
