import LegalPageLayout from "../components/legal/LegalPageLayout";
import { LEGAL_CONFIG } from "../legal/legalConfig";
import "../styles/legal.css";

function CookiesPolicyPage() {
  const document = LEGAL_CONFIG.documents.cookies;

  return (
    <LegalPageLayout
      document={document}
      introduction="Cette page décrit les cookies, stockages locaux et traceurs utilisés pour le fonctionnement de CLM Asso."
    >
      <section>
        <h2>1. Situation actuelle</h2>
        <p>
          CLM Asso n’utilise actuellement aucun traceur publicitaire ni outil de
          mesure d’audience nécessitant volontairement un consentement. Aucun cookie
          marketing n’est déposé par Maison CLM sur le site public.
        </p>
        <p>
          L’application utilise toutefois des mécanismes techniques indispensables,
          notamment le stockage local du navigateur et les éléments de session liés
          à l’authentification Supabase. Ils permettent de maintenir la connexion,
          sécuriser le compte et mémoriser temporairement certains choix nécessaires
          au parcours utilisateur.
        </p>
      </section>

      <section>
        <h2>2. Stockages strictement nécessaires</h2>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead><tr><th>Finalité</th><th>Exemple</th><th>Statut</th></tr></thead>
            <tbody>
              <tr><td>Authentification et sécurité</td><td>Session Supabase et renouvellement du jeton</td><td>Strictement nécessaire</td></tr>
              <tr><td>Parcours d’inscription</td><td>Offre choisie avant la création du club</td><td>Strictement nécessaire</td></tr>
              <tr><td>Préférences techniques</td><td>État temporaire d’une interface ou d’une redirection</td><td>Fonctionnel</td></tr>
              <tr><td>Paiement</td><td>Éléments techniques utilisés sur la page Stripe</td><td>Géré par Stripe</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>3. Services tiers</h2>
        <p>
          Lorsque vous ouvrez Stripe Checkout, WhatsApp ou un autre service externe,
          ce service peut utiliser ses propres cookies et traceurs selon sa politique.
          Maison CLM ne contrôle pas les traceurs déposés après votre navigation vers
          un domaine tiers.
        </p>
      </section>

      <section>
        <h2>4. Gestion depuis le navigateur</h2>
        <p>
          Vous pouvez supprimer les données du site depuis les réglages de votre
          navigateur. La suppression de la session vous déconnectera et certains
          choix devront être renseignés à nouveau. Le blocage complet des stockages
          strictement nécessaires peut empêcher l’application de fonctionner.
        </p>
      </section>

      <section>
        <h2>5. Ajout futur d’un outil d’analyse ou de marketing</h2>
        <p>
          Si CLM Asso ajoute ultérieurement des traceurs soumis au consentement, ils
          ne seront activés qu’après un choix libre et préalable. Une interface
          permettra d’accepter, refuser ou modifier les préférences avec une facilité
          comparable. La présente politique sera mise à jour.
        </p>
      </section>

      <section>
        <h2>6. Contact</h2>
        <p>
          Toute question concernant les traceurs peut être envoyée à{" "}
          <a href={`mailto:${LEGAL_CONFIG.email}`}>{LEGAL_CONFIG.email}</a>.
        </p>
      </section>
    </LegalPageLayout>
  );
}

export default CookiesPolicyPage;
