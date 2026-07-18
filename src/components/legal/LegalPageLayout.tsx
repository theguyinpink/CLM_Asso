import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowLeft, FileCheck2 } from "lucide-react";

import MarketingPageLayout from "../MarketingPageLayout";
import type { LegalDocumentMeta } from "../../legal/legalConfig";

interface LegalPageLayoutProps {
  document: LegalDocumentMeta;
  introduction: string;
  children: ReactNode;
  warning?: string;
}

function LegalPageLayout({
  document,
  introduction,
  children,
  warning,
}: LegalPageLayoutProps) {
  return (
    <MarketingPageLayout>
      <section className="legal-hero page-container">
        <Link to="/" className="legal-back-link">
          <ArrowLeft size={16} />
          Retour à l’accueil
        </Link>

        <div className="legal-hero__badge">
          <FileCheck2 size={16} />
          Document juridique
        </div>

        <h1>{document.title}</h1>
        <p>{introduction}</p>

        <div className="legal-meta">
          <span>Version {document.version}</span>
          <span>En vigueur depuis le {document.effectiveDate}</span>
        </div>

        {warning && <div className="legal-warning">{warning}</div>}
      </section>

      <article className="legal-document page-container">{children}</article>
    </MarketingPageLayout>
  );
}

export default LegalPageLayout;
