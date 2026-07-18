import LegalPageLayout from "../components/legal/LegalPageLayout";
import { LEGAL_CONFIG } from "../legal/legalConfig";
import "../styles/legal.css";

function PrivacyPolicyPage() {
  const document = LEGAL_CONFIG.documents.privacy;

  return (
    <LegalPageLayout
      document={document}
      introduction="Cette politique explique quelles données sont utilisées par CLM Asso, pour quelles finalités, pendant combien de temps et comment exercer vos droits."
    >
      <section>
        <h2>1. Identité et rôles en matière de données</h2>
        <p>
          Pour les données nécessaires à la création des comptes, à la
          facturation, à la sécurité, à l’assistance et à la gestion commerciale,
          le responsable du traitement est {LEGAL_CONFIG.legalName}, sous le nom
          commercial {LEGAL_CONFIG.tradeName}.
        </p>
        <p>
          Pour les données que les clubs importent ou créent dans leur espace
          — membres, équipes, convocations, messages, documents et informations
          sportives — le club détermine généralement les finalités et agit comme
          responsable du traitement. Maison CLM agit alors comme sous-traitant
          technique, sur instruction du club, dans les limites du service.
        </p>
      </section>

      <section>
        <h2>2. Données traitées</h2>
        <ul>
          <li>identité et coordonnées des utilisateurs : prénom, nom, e-mail et téléphone lorsqu’il est renseigné ;</li>
          <li>données de compte : identifiant, rôles, adhésions, préférences et traces d’acceptation juridique ;</li>
          <li>données du club : nom, saison, coordonnées, nombre de licenciés et paramètres ;</li>
          <li>données de gestion sportive : équipes, membres, numéros de licence, matchs, événements, convocations et présences ;</li>
          <li>contenus déposés : annonces, tâches, messages, pièces jointes et documents ;</li>
          <li>données de facturation : offre choisie, statut d’abonnement, identifiants Stripe, historique des paiements et factures ;</li>
          <li>données techniques : adresse IP lorsque les prestataires la traitent, type de navigateur, journaux de sécurité, horodatages et erreurs techniques.</li>
        </ul>
        <p>
          Les numéros complets de carte bancaire ne sont pas collectés par CLM
          Asso. Ils sont traités directement par Stripe sur son interface de
          paiement sécurisée.
        </p>
      </section>

      <section>
        <h2>3. Finalités et bases légales</h2>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead><tr><th>Finalité</th><th>Base légale principale</th></tr></thead>
            <tbody>
              <tr><td>Créer le compte, fournir l’application et gérer l’abonnement</td><td>Exécution du contrat et mesures précontractuelles</td></tr>
              <tr><td>Traiter les paiements, factures et obligations comptables</td><td>Exécution du contrat et obligation légale</td></tr>
              <tr><td>Sécuriser les comptes, prévenir les abus et diagnostiquer les incidents</td><td>Intérêt légitime de Maison CLM et des clubs</td></tr>
              <tr><td>Répondre aux demandes d’assistance</td><td>Exécution du contrat et intérêt légitime</td></tr>
              <tr><td>Conserver la preuve des CGU et CGV acceptées</td><td>Exécution du contrat et intérêt légitime probatoire</td></tr>
              <tr><td>Envoyer des communications commerciales facultatives</td><td>Consentement lorsqu’il est requis</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          La prise de connaissance de cette politique ne constitue pas un
          consentement général au traitement. Les traitements nécessaires au
          service reposent principalement sur le contrat, les obligations légales
          et les intérêts légitimes décrits ci-dessus.
        </p>
      </section>

      <section>
        <h2>4. Destinataires et prestataires</h2>
        <p>
          Les données sont accessibles aux personnes habilitées de Maison CLM et,
          pour les espaces clubs, aux utilisateurs autorisés selon leur rôle.
          Elles peuvent être traitées par les prestataires suivants :
        </p>
        <ul>
          <li><strong>Supabase</strong> : authentification, base de données, stockage et fonctions serveur ;</li>
          <li><strong>Vercel</strong> : hébergement et diffusion de l’interface web ;</li>
          <li><strong>Stripe</strong> : paiements, abonnements, facturation et prévention de la fraude ;</li>
          <li><strong>Resend</strong> : envoi des e-mails transactionnels ;</li>
          <li>prestataires techniques strictement nécessaires à la sécurité, à la maintenance ou à l’assistance.</li>
        </ul>
        <p>
          Les données ne sont pas vendues à des annonceurs. Un prestataire ne
          reçoit que les informations nécessaires à sa mission et reste soumis à
          ses engagements contractuels et réglementaires.
        </p>
      </section>

      <section>
        <h2>5. Transferts hors de l’Espace économique européen</h2>
        <p>
          Certains prestataires peuvent traiter des données depuis des pays situés
          hors de l’Espace économique européen. Selon le service et la région
          technique configurée, ces transferts reposent sur une décision
          d’adéquation, le cadre de protection des données UE–États-Unis lorsqu’il
          est applicable, des clauses contractuelles types ou toute autre garantie
          reconnue par la réglementation.
        </p>
      </section>

      <section>
        <h2>6. Durées de conservation</h2>
        <ul>
          <li>compte et données du club : pendant la relation contractuelle, puis pendant une période de suppression ou de restitution techniquement nécessaire ;</li>
          <li>sauvegardes résiduelles : durée limitée liée aux cycles de sauvegarde du prestataire ;</li>
          <li>factures et pièces comptables : dix ans conformément aux obligations applicables aux entreprises ;</li>
          <li>journaux de sécurité : en principe entre six mois et un an, sauf incident, contentieux ou obligation particulière ;</li>
          <li>preuves d’acceptation contractuelle : pendant la durée du contrat puis pendant la durée utile à la défense des droits de Maison CLM ou du club ;</li>
          <li>demandes d’assistance : le temps nécessaire au traitement, puis archivage limité en cas de suivi ou de litige.</li>
        </ul>
        <p>
          Le club reste responsable de définir les durées adaptées aux données de
          ses propres membres et de supprimer celles qui ne sont plus nécessaires.
        </p>
      </section>

      <section>
        <h2>7. Données de mineurs et données sensibles</h2>
        <p>
          Les clubs sportifs peuvent gérer des informations relatives à des
          licenciés mineurs. Le club doit s’assurer qu’il dispose des informations,
          autorisations et bases légales nécessaires. CLM Asso ne doit pas être
          utilisé pour stocker des données de santé détaillées, des données
          biométriques, des antécédents judiciaires ou d’autres données sensibles,
          sauf cadre juridique approprié, nécessité démontrée et mesures de
          sécurité adaptées.
        </p>
      </section>

      <section>
        <h2>8. Sécurité</h2>
        <p>
          Maison CLM met en œuvre des mesures techniques et organisationnelles
          destinées à protéger les données : authentification, contrôle des accès
          par rôle, chiffrement des communications, règles de sécurité en base,
          journalisation et séparation des secrets serveur. Aucune mesure ne
          pouvant garantir un risque nul, les utilisateurs doivent protéger leurs
          identifiants et signaler rapidement toute anomalie.
        </p>
      </section>

      <section>
        <h2>9. Vos droits</h2>
        <p>
          Selon votre situation, vous disposez de droits d’accès, de rectification,
          d’effacement, de limitation, d’opposition et de portabilité, ainsi que du
          droit de retirer un consentement lorsque le traitement repose sur celui-ci.
          Vous pouvez également définir des directives relatives au sort de vos
          données après votre décès lorsque la loi le prévoit.
        </p>
        <p>
          Pour une donnée gérée directement par un club, contactez d’abord le club
          concerné. Pour une donnée gérée par Maison CLM, écrivez à{" "}
          <a href={`mailto:${LEGAL_CONFIG.email}`}>{LEGAL_CONFIG.email}</a> en
          précisant votre demande et l’adresse du compte concerné. Une preuve
          d’identité peut être demandée uniquement en cas de doute raisonnable.
        </p>
        <p>
          Vous pouvez introduire une réclamation auprès de la Commission nationale
          de l’informatique et des libertés (CNIL) si vous estimez que vos droits ne
          sont pas respectés.
        </p>
      </section>

      <section>
        <h2>10. Évolution de la politique</h2>
        <p>
          Cette politique peut être mise à jour pour refléter une évolution du
          service, des prestataires ou de la réglementation. La version et la date
          d’entrée en vigueur sont indiquées en haut de page. Une modification
          importante pourra faire l’objet d’une information dans l’application ou
          d’une nouvelle demande de prise de connaissance.
        </p>
      </section>
    </LegalPageLayout>
  );
}

export default PrivacyPolicyPage;
