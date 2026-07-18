import LegalPageLayout from "../components/legal/LegalPageLayout";
import { LEGAL_CONFIG } from "../legal/legalConfig";
import "../styles/legal.css";

function LegalNoticePage() {
  const document = LEGAL_CONFIG.documents.legalNotice;

  return (
    <LegalPageLayout
      document={document}
      introduction="Les présentes mentions identifient l’éditeur, le responsable de publication et l’hébergeur du service CLM Asso."
      warning="L’adresse professionnelle de l’éditeur doit être remplacée dans src/legal/legalConfig.ts avant toute commercialisation publique."
    >
      <section>
        <h2>1. Éditeur du service</h2>
        <dl className="legal-definition-list">
          <div><dt>Service</dt><dd>{LEGAL_CONFIG.serviceName}</dd></div>
          <div><dt>Nom commercial</dt><dd>{LEGAL_CONFIG.tradeName}</dd></div>
          <div><dt>Éditeur</dt><dd>{LEGAL_CONFIG.legalName}</dd></div>
          <div><dt>Statut</dt><dd>{LEGAL_CONFIG.status}</dd></div>
          <div><dt>SIREN</dt><dd>{LEGAL_CONFIG.siren}</dd></div>
          <div><dt>SIRET</dt><dd>{LEGAL_CONFIG.siret}</dd></div>
          <div><dt>Immatriculation</dt><dd>{LEGAL_CONFIG.registration}</dd></div>
          <div><dt>Adresse professionnelle</dt><dd>{LEGAL_CONFIG.professionalAddress}</dd></div>
          <div>
            <dt>Adresse électronique</dt>
            <dd><a href={`mailto:${LEGAL_CONFIG.email}`}>{LEGAL_CONFIG.email}</a></dd>
          </div>
          <div><dt>TVA</dt><dd>{LEGAL_CONFIG.vatNotice}</dd></div>
        </dl>
      </section>

      <section>
        <h2>2. Direction de la publication</h2>
        <p>
          Le directeur de la publication est {LEGAL_CONFIG.publicationDirector},
          entrepreneur individuel exploitant le nom commercial Maison CLM.
        </p>
      </section>

      <section>
        <h2>3. Hébergement</h2>
        <p>Le site et l’interface web sont hébergés par :</p>
        <dl className="legal-definition-list">
          <div><dt>Hébergeur</dt><dd>{LEGAL_CONFIG.host.name}</dd></div>
          <div><dt>Adresse</dt><dd>{LEGAL_CONFIG.host.address}</dd></div>
          <div><dt>Téléphone</dt><dd>{LEGAL_CONFIG.host.phone}</dd></div>
          <div>
            <dt>Site</dt>
            <dd>
              <a href={LEGAL_CONFIG.host.website} target="_blank" rel="noreferrer">
                {LEGAL_CONFIG.host.website}
              </a>
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h2>4. Propriété intellectuelle</h2>
        <p>
          La structure, les textes, les interfaces, les éléments graphiques, le
          nom CLM Asso, les logos, les bases de données et les composants propres
          au service sont protégés par le droit de la propriété intellectuelle.
          Toute reproduction, représentation, extraction ou réutilisation non
          autorisée, totale ou partielle, est interdite, sauf accord écrit
          préalable de Maison CLM ou exception prévue par la loi.
        </p>
        <p>
          Les marques, logos et contenus appartenant aux clubs restent la
          propriété de leurs titulaires respectifs. Leur mise en ligne dans CLM
          Asso ne transfère aucun droit de propriété à Maison CLM.
        </p>
      </section>

      <section>
        <h2>5. Responsabilité</h2>
        <p>
          Maison CLM s’efforce de fournir des informations exactes et un service
          disponible, sans garantir l’absence totale d’erreurs, d’interruptions ou
          d’indisponibilités. Les contenus saisis par les clubs et utilisateurs
          relèvent de leur responsabilité.
        </p>
        <p>
          Les liens vers des services tiers, notamment Stripe, WhatsApp ou des
          sites de clubs, sont proposés pour faciliter l’utilisation. Maison CLM
          ne contrôle pas leurs contenus ni leurs conditions de fonctionnement.
        </p>
      </section>

      <section>
        <h2>6. Données personnelles</h2>
        <p>
          Les traitements de données personnelles sont décrits dans la politique
          de confidentialité de CLM Asso. Toute demande peut être adressée à
          Maison CLM à l’adresse {LEGAL_CONFIG.email}.
        </p>
      </section>

      <section>
        <h2>7. Contact</h2>
        <p>
          Pour signaler un contenu illicite, une atteinte à des droits ou une
          difficulté liée au service, écrivez à{" "}
          <a href={`mailto:${LEGAL_CONFIG.email}`}>{LEGAL_CONFIG.email}</a> en
          précisant l’adresse de la page concernée et les éléments utiles à
          l’analyse de la demande.
        </p>
      </section>
    </LegalPageLayout>
  );
}

export default LegalNoticePage;
