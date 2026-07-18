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
    audience: "Jusqu’à 100 licenciés",
    maximumLicensees: 100,
    documentsEnabled: false,
    storageLabel: "Sans espace Documents",
  },
  club: {
    code: "club",
    name: "Club",
    monthlyPrice: 39,
    audience: "Jusqu’à 300 licenciés",
    maximumLicensees: 300,
    documentsEnabled: true,
    storageLabel: "5 Go de documents",
  },
  grand_club: {
    code: "grand_club",
    name: "Grand Club",
    monthlyPrice: 49,
    audience: "Plus de 300 licenciés",
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

export function validatePlanForLicensees(
  planCode: SubscriptionPlanCode,
  licenseesCount: number,
) {
  const plan = SUBSCRIPTION_PLANS[planCode];

  if (
    plan.maximumLicensees !== null &&
    licenseesCount > plan.maximumLicensees
  ) {
    const minimumPlanCode =
      getMinimumPlanForLicensees(licenseesCount);

    return {
      valid: false as const,
      minimumPlanCode,
      message:
        `L’offre ${plan.name} est limitée à ` +
        `${plan.maximumLicensees} licenciés. ` +
        `Choisissez au minimum l’offre ` +
        `${SUBSCRIPTION_PLANS[minimumPlanCode].name}.`,
    };
  }

  return {
    valid: true as const,
    minimumPlanCode: planCode,
    message: "",
  };
}
