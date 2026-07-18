import LegalPageLayout from "../components/legal/LegalPageLayout";
import { LEGAL_CONFIG } from "../legal/legalConfig";
import "../styles/legal.css";

function TermsOfSalePage() {
  const document = LEGAL_CONFIG.documents.termsOfSale;

  return (
    <LegalPageLayout
      document={document}
      introduction="Les présentes CGV encadrent les abonnements mensuels CLM Asso souscrits par les clubs, associations et structures sportives."
    >
      <section>
        <h2>1. Prestataire</h2>
        <p>
          Les abonnements CLM Asso sont proposés par {LEGAL_CONFIG.legalName},
          {" "}nom commercial {LEGAL_CONFIG.tradeName}, SIRET {LEGAL_CONFIG.siret},
          joignable à {LEGAL_CONFIG.email}. {LEGAL_CONFIG.vatNotice}
        </p>
      </section>

      <section>
        <h2>2. Champ d’application</h2>
        <p>
          Les CGV s’appliquent aux abonnements souscrits pour les besoins d’un club,
          d’une association, d’une personne morale ou d’une activité professionnelle.
          La personne qui valide la commande déclare être habilitée à engager le club.
        </p>
        <p>
          CLM Asso ne propose pas d’abonnement destiné à l’usage privé d’un
          consommateur agissant sans lien avec une activité associative ou
          professionnelle.
        </p>
      </section>

      <section>
        <h2>3. Offres et prix</h2>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead><tr><th>Offre</th><th>Tarif mensuel</th><th>Limite principale</th><th>Documents</th></tr></thead>
            <tbody>
              <tr><td>CLM Asso Essentiel</td><td>19 €</td><td>Jusqu’à 100 licenciés</td><td>Non inclus</td></tr>
              <tr><td>CLM Asso Club</td><td>39 €</td><td>Jusqu’à 300 licenciés</td><td>5 Go</td></tr>
              <tr><td>CLM Asso Grand Club</td><td>49 €</td><td>Plus de 300 licenciés</td><td>20 Go</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          Les prix affichés sont ceux en vigueur au moment de la commande. En raison
          de la franchise en base de TVA applicable à Maison CLM, les prix ne
          comprennent pas de TVA collectée tant que ce régime reste applicable.
        </p>
      </section>

      <section>
        <h2>4. Choix de l’offre et nombre de licenciés</h2>
        <p>
          Le club déclare de bonne foi son nombre total de licenciés. Une offre
          supérieure peut être choisie volontairement. Une offre dont la limite est
          inférieure à l’effectif déclaré ne peut pas être souscrite.
        </p>
        <p>
          En cas de dépassement durable, le club doit passer à l’offre adaptée. Maison
          CLM peut demander une régularisation lorsqu’un écart manifeste est constaté.
        </p>
      </section>

      <section>
        <h2>5. Formation de la commande</h2>
        <p>La commande est formée lorsque le représentant du club :</p>
        <ol>
          <li>crée ou rejoint le compte du club ;</li>
          <li>sélectionne une offre et vérifie son prix ;</li>
          <li>accepte les présentes CGV dans leur version affichée ;</li>
          <li>valide le paiement sur la page Stripe ;</li>
          <li>reçoit la confirmation technique de l’activation de l’abonnement.</li>
        </ol>
        <p>
          Les versions acceptées, l’utilisateur, le club et la date d’acceptation sont
          enregistrés afin de conserver une preuve contractuelle.
        </p>
      </section>

      <section>
        <h2>6. Paiement</h2>
        <p>
          Le paiement est traité par Stripe. Le club autorise le prélèvement du prix
          mensuel sur le moyen de paiement enregistré. Le premier paiement intervient
          lors de la souscription, puis à chaque échéance mensuelle jusqu’à résiliation.
        </p>
        <p>
          Maison CLM n’accède pas au numéro complet de carte. Le club doit maintenir un
          moyen de paiement valide et des informations de facturation à jour.
        </p>
      </section>

      <section>
        <h2>7. Durée et renouvellement</h2>
        <p>
          L’abonnement est conclu pour une période d’un mois à compter de son
          activation. Il est renouvelé automatiquement pour des périodes mensuelles
          successives, sans engagement annuel, jusqu’à sa résiliation.
        </p>
      </section>

      <section>
        <h2>8. Factures</h2>
        <p>
          Les factures et justificatifs de paiement sont mis à disposition par Stripe
          ou transmis par voie électronique. Le club doit signaler rapidement toute
          erreur dans ses informations de facturation.
        </p>
      </section>

      <section>
        <h2>9. Paiement échoué ou retardé</h2>
        <p>
          En cas d’échec de paiement, Stripe peut renouveler la tentative selon la
          configuration de facturation. Maison CLM peut restreindre ou suspendre les
          fonctions payantes tant que la situation n’est pas régularisée.
        </p>
        <p>
          Les sommes dues restent exigibles. Lorsque les règles applicables le
          permettent, des pénalités ou frais prévus par la loi peuvent être réclamés
          aux clients professionnels après information appropriée.
        </p>
      </section>

      <section>
        <h2>10. Changement d’offre</h2>
        <p>
          Le club peut demander un changement d’offre depuis son espace de facturation
          ou en contactant Maison CLM. Les conditions de prise d’effet, de prorata ou de
          crédit sont celles affichées avant validation et appliquées par Stripe.
        </p>
      </section>

      <section>
        <h2>11. Résiliation</h2>
        <p>
          Le club peut résilier l’abonnement depuis le portail de facturation lorsqu’il
          est disponible ou en écrivant à {LEGAL_CONFIG.email}. Sauf indication
          contraire affichée au moment de la résiliation, celle-ci prend effet à la fin
          de la période mensuelle déjà payée.
        </p>
        <p>
          La résiliation n’entraîne pas le remboursement de la période commencée, sauf
          erreur de facturation, obligation légale ou accord commercial exprès.
        </p>
      </section>

      <section>
        <h2>12. Données après la fin de l’abonnement</h2>
        <p>
          À la fin de l’accès, le club doit récupérer les données et documents dont il
          souhaite conserver une copie. Maison CLM peut prévoir une période limitée de
          lecture, d’export ou de restauration avant suppression définitive, sous
          réserve des obligations légales et des sauvegardes techniques résiduelles.
        </p>
      </section>

      <section>
        <h2>13. Disponibilité et assistance</h2>
        <p>
          Maison CLM fournit le service avec une obligation de moyens. Les opérations
          de maintenance, incidents de réseau, mises à jour de sécurité et services
          tiers peuvent provoquer des interruptions temporaires. Aucune disponibilité
          permanente ou sans erreur n’est garantie en l’absence d’un engagement écrit
          spécifique.
        </p>
      </section>

      <section>
        <h2>14. Responsabilité</h2>
        <p>
          Chaque partie répond des dommages directs causés par ses manquements prouvés.
          Maison CLM ne répond pas des pertes indirectes, pertes de chance, pertes de
          revenus, conséquences sportives ou décisions prises à partir d’informations
          saisies par le club.
        </p>
        <p>
          Sauf disposition impérative contraire, faute lourde, dol, atteinte corporelle
          ou violation ne pouvant légalement être limitée, la responsabilité totale de
          Maison CLM au titre d’un abonnement est limitée au montant payé par le club au
          cours des douze mois précédant le fait générateur.
        </p>
      </section>

      <section>
        <h2>15. Force majeure</h2>
        <p>
          Aucune partie n’est responsable d’un retard ou d’une inexécution résultant
          d’un événement échappant raisonnablement à son contrôle et présentant les
          caractéristiques de la force majeure au sens du droit français.
        </p>
      </section>

      <section>
        <h2>16. Modification des prix ou des CGV</h2>
        <p>
          Une modification de prix applicable à un abonnement existant est annoncée
          avant son entrée en vigueur. Le club peut résilier avant la première échéance
          concernée. Une modification substantielle des CGV peut nécessiter une nouvelle
          acceptation.
        </p>
      </section>

      <section>
        <h2>17. Droit applicable et litiges</h2>
        <p>
          Les CGV sont soumises au droit français. En cas de difficulté, les parties
          recherchent une solution amiable avant toute action. À défaut, le litige est
          porté devant la juridiction compétente selon les règles de droit commun.
        </p>
      </section>
    </LegalPageLayout>
  );
}

export default TermsOfSalePage;
