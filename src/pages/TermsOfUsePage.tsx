import LegalPageLayout from "../components/legal/LegalPageLayout";
import { LEGAL_CONFIG } from "../legal/legalConfig";
import "../styles/legal.css";

function TermsOfUsePage() {
  const document = LEGAL_CONFIG.documents.termsOfUse;

  return (
    <LegalPageLayout
      document={document}
      introduction="Les présentes CGU définissent les règles d’accès et d’utilisation de la plateforme CLM Asso par les clubs et leurs utilisateurs."
    >
      <section>
        <h2>1. Objet</h2>
        <p>
          CLM Asso est un service en ligne permettant aux clubs sportifs de
          centraliser leur organisation : équipes, membres, calendrier, matchs,
          convocations, annonces, tâches, documents et échanges interclubs.
        </p>
        <p>
          Les présentes conditions s’appliquent à toute personne qui crée un
          compte, rejoint un club ou utilise une fonctionnalité du service.
        </p>
      </section>

      <section>
        <h2>2. Public visé et capacité</h2>
        <p>
          Le service est destiné aux clubs, associations, structures sportives et
          personnes agissant dans le cadre de leur activité associative ou
          professionnelle. La personne qui crée un club ou souscrit un abonnement
          déclare disposer du pouvoir nécessaire pour représenter la structure.
        </p>
        <p>
          Le créateur d’un compte doit disposer de la capacité juridique requise
          ou agir sous l’autorité d’une personne habilitée. CLM Asso n’est pas
          destiné à la souscription personnelle d’un consommateur pour un usage
          privé sans lien avec un club.
        </p>
      </section>

      <section>
        <h2>3. Création et sécurité du compte</h2>
        <ul>
          <li>les informations communiquées doivent être exactes, actuelles et ne pas usurper l’identité d’un tiers ;</li>
          <li>chaque utilisateur doit conserver ses identifiants confidentiels et utiliser un mot de passe robuste ;</li>
          <li>le partage d’un compte entre plusieurs personnes est interdit ;</li>
          <li>toute compromission ou utilisation non autorisée doit être signalée rapidement à Maison CLM ;</li>
          <li>l’utilisateur reste responsable des actions réalisées depuis son compte jusqu’au signalement de l’incident.</li>
        </ul>
      </section>

      <section>
        <h2>4. Clubs, rôles et autorisations</h2>
        <p>
          Le propriétaire du club attribue les rôles et veille à ce que les accès
          correspondent aux missions réelles des utilisateurs. Les administrateurs,
          responsables et entraîneurs disposent de droits différents selon la
          configuration de CLM Asso.
        </p>
        <p>
          Le club est responsable de la gestion des départs, changements de fonction
          et retraits d’accès. Un accès devenu inutile doit être supprimé sans délai.
        </p>
      </section>

      <section>
        <h2>5. Utilisations interdites</h2>
        <p>Il est notamment interdit de :</p>
        <ul>
          <li>utiliser le service à des fins illicites, frauduleuses, discriminatoires, menaçantes ou portant atteinte aux droits d’autrui ;</li>
          <li>publier des contenus diffamatoires, haineux, violents, trompeurs ou contraires aux règles du sport ;</li>
          <li>tenter de contourner les permissions, les limites d’abonnement, les contrôles de sécurité ou la facturation ;</li>
          <li>extraire massivement des données, automatiser des accès non autorisés ou perturber le fonctionnement du service ;</li>
          <li>introduire un logiciel malveillant, un fichier dangereux ou un contenu portant atteinte à un droit de propriété intellectuelle ;</li>
          <li>utiliser la messagerie pour du démarchage abusif, du spam ou des communications sans rapport avec l’activité des clubs.</li>
        </ul>
      </section>

      <section>
        <h2>6. Contenus et données des clubs</h2>
        <p>
          Le club conserve ses droits sur les informations et documents qu’il
          dépose. Il accorde à Maison CLM les autorisations techniques strictement
          nécessaires à leur hébergement, sauvegarde, affichage et transmission aux
          utilisateurs autorisés.
        </p>
        <p>
          Le club garantit qu’il peut traiter et partager les données de ses membres,
          notamment celles des mineurs, et qu’il respecte ses obligations
          d’information, de sécurité, de confidentialité et de durée de conservation.
        </p>
      </section>

      <section>
        <h2>7. Messagerie, WhatsApp et téléphone</h2>
        <p>
          La messagerie interclubs doit rester courtoise et liée à l’organisation
          sportive. Les boutons WhatsApp et téléphone ouvrent des services externes.
          Les échanges réalisés hors de CLM Asso sont soumis aux conditions et aux
          pratiques de confidentialité de ces services tiers.
        </p>
        <p>
          CLM Asso ne constitue pas un service d’urgence. Les convocations et messages
          importants doivent être confirmés par les moyens appropriés au contexte.
        </p>
      </section>

      <section>
        <h2>8. Disponibilité, maintenance et évolutions</h2>
        <p>
          Maison CLM met en œuvre des moyens raisonnables pour assurer l’accès au
          service. Des interruptions peuvent intervenir pour maintenance, mise à jour,
          sécurité, incident technique ou indisponibilité d’un prestataire.
        </p>
        <p>
          Les fonctionnalités peuvent évoluer afin d’améliorer le service, corriger
          une faille ou respecter une obligation légale. Une modification substantielle
          des conditions d’utilisation pourra nécessiter une nouvelle acceptation.
        </p>
      </section>

      <section>
        <h2>9. Suspension et fermeture</h2>
        <p>
          Maison CLM peut suspendre un compte ou un club en cas de risque de sécurité,
          d’impayé, de violation des présentes conditions, d’usage illicite ou de
          demande d’une autorité compétente. Lorsque la situation le permet, le club
          est informé et invité à régulariser.
        </p>
      </section>

      <section>
        <h2>10. Propriété intellectuelle</h2>
        <p>
          L’abonnement confère uniquement un droit personnel, limité, non exclusif et
          non transférable d’utiliser CLM Asso pendant la durée d’accès. Il n’autorise
          ni la copie du code, ni la revente, ni l’ingénierie inverse, sauf exception
          impérative prévue par la loi.
        </p>
      </section>

      <section>
        <h2>11. Responsabilité</h2>
        <p>
          Le service est un outil d’organisation. Le club reste responsable de ses
          décisions sportives, administratives, disciplinaires et humaines, ainsi que
          de la vérification des informations importantes.
        </p>
        <p>
          Maison CLM n’est pas responsable d’un dommage provenant d’une information
          erronée saisie par un utilisateur, d’un accès laissé actif par le club, d’un
          service tiers, d’un équipement de l’utilisateur ou d’un cas de force majeure.
          Les limites complémentaires applicables à l’abonnement figurent dans les CGV.
        </p>
      </section>

      <section>
        <h2>12. Données personnelles</h2>
        <p>
          Les traitements de données sont détaillés dans la politique de
          confidentialité. Le club et Maison CLM coopèrent pour répondre aux demandes
          des personnes et gérer les incidents liés aux données du club.
        </p>
      </section>

      <section>
        <h2>13. Durée et résiliation</h2>
        <p>
          Les présentes CGU s’appliquent pendant toute la durée d’utilisation du
          service. La suppression d’un compte ou la résiliation de l’abonnement ne
          remet pas en cause les obligations qui doivent survivre, notamment en matière
          de confidentialité, de propriété intellectuelle et de responsabilité.
        </p>
      </section>

      <section>
        <h2>14. Droit applicable et contact</h2>
        <p>
          Les présentes CGU sont soumises au droit français. Les parties recherchent
          d’abord une solution amiable. À défaut, le litige relève de la juridiction
          compétente selon les règles de droit commun.
        </p>
        <p>
          Toute question peut être adressée à{" "}
          <a href={`mailto:${LEGAL_CONFIG.email}`}>{LEGAL_CONFIG.email}</a>.
        </p>
      </section>
    </LegalPageLayout>
  );
}

export default TermsOfUsePage;
