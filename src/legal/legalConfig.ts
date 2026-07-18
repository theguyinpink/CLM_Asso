export type LegalDocumentKey =
  | "legal_notice"
  | "privacy"
  | "terms_of_use"
  | "terms_of_sale"
  | "cookies";

export interface LegalDocumentMeta {
  key: LegalDocumentKey;
  title: string;
  shortTitle: string;
  route: string;
  version: string;
  effectiveDate: string;
}

export const LEGAL_CONFIG = {
  serviceName: "CLM Asso",
  serviceUrl: "https://clmasso.maisonclm.fr",
  tradeName: "Maison CLM",
  legalName: "Clément Carré EI",
  ownerName: "Clément Carré",
  status: "Entrepreneur individuel — micro-entrepreneur",
  siren: "102 563 228",
  siret: "102 563 228 00018",
  registration: "Registre national des entreprises (RNE)",
  professionalAddress:
    "6 Place Père André Jarlan, 77380 Combs-la-Ville, France",
  email: "maison.clm.contact@gmail.com",
  publicationDirector: "Clément Carré",
  vatNotice: "TVA non applicable, article 293 B du Code général des impôts.",
  host: {
    name: "Vercel Inc.",
    address: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
    phone: "+1 559 288 7060",
    website: "https://vercel.com",
  },
  documents: {
    legalNotice: {
      key: "legal_notice",
      title: "Mentions légales",
      shortTitle: "Mentions légales",
      route: "/mentions-legales",
      version: "1.0",
      effectiveDate: "18 juillet 2026",
    },
    privacy: {
      key: "privacy",
      title: "Politique de confidentialité",
      shortTitle: "Confidentialité",
      route: "/confidentialite",
      version: "1.0",
      effectiveDate: "18 juillet 2026",
    },
    termsOfUse: {
      key: "terms_of_use",
      title: "Conditions générales d’utilisation",
      shortTitle: "CGU",
      route: "/cgu",
      version: "1.0",
      effectiveDate: "18 juillet 2026",
    },
    termsOfSale: {
      key: "terms_of_sale",
      title: "Conditions générales de vente",
      shortTitle: "CGV",
      route: "/cgv",
      version: "1.0",
      effectiveDate: "18 juillet 2026",
    },
    cookies: {
      key: "cookies",
      title: "Politique relative aux cookies et traceurs",
      shortTitle: "Cookies",
      route: "/cookies",
      version: "1.0",
      effectiveDate: "18 juillet 2026",
    },
  } satisfies Record<string, LegalDocumentMeta>,
} as const;

export const CURRENT_TERMS_OF_USE_VERSION =
  LEGAL_CONFIG.documents.termsOfUse.version;

export const CURRENT_PRIVACY_VERSION =
  LEGAL_CONFIG.documents.privacy.version;

export const CURRENT_TERMS_OF_SALE_VERSION =
  LEGAL_CONFIG.documents.termsOfSale.version;
