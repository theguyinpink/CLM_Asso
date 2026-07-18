import { supabase } from "../lib/supabase";
import type { LegalDocumentKey } from "../legal/legalConfig";
import type { LegalAcceptanceInput, LegalStatus } from "../types/legal";

interface LegalStatusRpc {
  terms_of_use_accepted?: unknown;
  privacy_acknowledged?: unknown;
  terms_of_sale_accepted?: unknown;
  terms_of_use_version?: unknown;
  privacy_version?: unknown;
  terms_of_sale_version?: unknown;
}

function readBoolean(value: unknown) {
  return value === true;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function getLegalStatus(
  clubId: string | null = null,
): Promise<LegalStatus> {
  const { data, error } = await supabase.rpc("clm_asso_get_legal_status", {
    p_club_id: clubId,
  });

  if (error) {
    throw error;
  }

  const result = (data ?? {}) as LegalStatusRpc;

  return {
    termsOfUseAccepted: readBoolean(result.terms_of_use_accepted),
    privacyAcknowledged: readBoolean(result.privacy_acknowledged),
    termsOfSaleAccepted: readBoolean(result.terms_of_sale_accepted),
    termsOfUseVersion: readString(result.terms_of_use_version),
    privacyVersion: readString(result.privacy_version),
    termsOfSaleVersion: readString(result.terms_of_sale_version),
  };
}

export async function acceptLegalDocuments({
  documentKeys,
  clubId = null,
  context,
}: LegalAcceptanceInput) {
  const uniqueKeys = Array.from(new Set<LegalDocumentKey>(documentKeys));

  if (uniqueKeys.length === 0) {
    throw new Error("Aucun document juridique n’a été sélectionné.");
  }

  const { error } = await supabase.rpc("clm_asso_accept_legal_documents", {
    p_document_keys: uniqueKeys,
    p_club_id: clubId,
    p_context: context,
  });

  if (error) {
    throw error;
  }
}

export async function acceptAccountLegalDocuments() {
  await acceptLegalDocuments({
    documentKeys: ["terms_of_use", "privacy"],
    context: "first_access",
  });
}

export async function acceptBillingTerms(clubId: string) {
  await acceptLegalDocuments({
    documentKeys: ["terms_of_sale"],
    clubId,
    context: "checkout",
  });
}
