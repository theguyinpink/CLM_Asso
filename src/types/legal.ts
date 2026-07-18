import type { LegalDocumentKey } from "../legal/legalConfig";

export interface LegalStatus {
  termsOfUseAccepted: boolean;
  privacyAcknowledged: boolean;
  termsOfSaleAccepted: boolean;
  termsOfUseVersion: string;
  privacyVersion: string;
  termsOfSaleVersion: string;
}

export interface LegalAcceptanceInput {
  documentKeys: LegalDocumentKey[];
  clubId?: string | null;
  context: "first_access" | "checkout" | "manual";
}
