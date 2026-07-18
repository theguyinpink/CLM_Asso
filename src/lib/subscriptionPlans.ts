export type SubscriptionPlanCode =
  | "essential"
  | "club"
  | "grand_club";

export interface SubscriptionPlanDefinition {
  code: SubscriptionPlanCode;
  name: string;
  monthlyPrice: number;
  audience: string;
  maximumLicensees: number | null;
  documentsEnabled: boolean;
  storageLabel: string;
}

export const SUBSCRIPTION_PLAN_STORAGE_KEY =
  "clm-asso-selected-subscription-plan";

export const SUBSCRIPTION_PLANS: Record<
  SubscriptionPlanCode,
  SubscriptionPlanDefinition
> = {
  essential: {
    code: "essential",
    name: "Essentiel",
    monthlyPrice: 19,
    audience: "Pour organiser simplement le quotidien du club",
    maximumLicensees: null,
    documentsEnabled: false,
    storageLabel: "Sans espace Documents",
  },
  club: {
    code: "club",
    name: "Club",
    monthlyPrice: 39,
    audience: "Pour centraliser aussi les documents du club",
    maximumLicensees: null,
    documentsEnabled: true,
    storageLabel: "5 Go de documents",
  },
  grand_club: {
    code: "grand_club",
    name: "Grand Club",
    monthlyPrice: 49,
    audience: "Pour les besoins documentaires plus importants",
    maximumLicensees: null,
    documentsEnabled: true,
    storageLabel: "20 Go de documents",
  },
};

export const SUBSCRIPTION_PLAN_LIST = [
  SUBSCRIPTION_PLANS.essential,
  SUBSCRIPTION_PLANS.club,
  SUBSCRIPTION_PLANS.grand_club,
] as const;

export function isSubscriptionPlanCode(
  value: string | null | undefined,
): value is SubscriptionPlanCode {
  return Boolean(
    value &&
      Object.prototype.hasOwnProperty.call(
        SUBSCRIPTION_PLANS,
        value,
      ),
  );
}

export function readStoredSubscriptionPlanCode():
  | SubscriptionPlanCode
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedValue = window.localStorage.getItem(
    SUBSCRIPTION_PLAN_STORAGE_KEY,
  );

  return isSubscriptionPlanCode(storedValue)
    ? storedValue
    : null;
}

export function storeSubscriptionPlanCode(
  planCode: SubscriptionPlanCode,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    SUBSCRIPTION_PLAN_STORAGE_KEY,
    planCode,
  );
}

export function clearStoredSubscriptionPlanCode() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(
    SUBSCRIPTION_PLAN_STORAGE_KEY,
  );
}

/**
 * Recommandation indicative uniquement : elle ne bloque jamais le choix.
 */
export function getMinimumPlanForLicensees(
  licenseesCount: number,
): SubscriptionPlanCode {
  if (licenseesCount <= 100) {
    return "essential";
  }

  if (licenseesCount <= 300) {
    return "club";
  }

  return "grand_club";
}

/**
 * Le nombre de licenciés sert uniquement d'information et ne bloque plus
 * le choix ou le changement d'une offre.
 */
export function validatePlanForLicensees(
  planCode: SubscriptionPlanCode,
  _licenseesCount: number,
) {
  return {
    valid: true as const,
    minimumPlanCode: planCode,
    message: "",
  };
}
