import {
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  ListTodo,
  Megaphone,
  Trophy,
  UsersRound,
} from "lucide-react";
import MarketingPageLayout from "../components/MarketingPageLayout";
import { Link } from "react-router";

const features = [
  {
    title: "Tableau de bord",
    description:
      "Retrouvez les prochaines rencontres, les annonces importantes et les tâches à terminer dès votre connexion.",
    icon: LayoutDashboard,
    tone: "blue",
  },
  {
    title: "Gestion des équipes",
    description:
      "Créez un espace pour chaque équipe avec ses joueurs, ses entraîneurs, son calendrier et ses informations.",
    icon: UsersRound,
    tone: "green",
  },
  {
    title: "Calendrier centralisé",
    description:
      "Réunissez les matchs, entraînements, réunions, tournois et événements dans un calendrier commun.",
    icon: CalendarDays,
    tone: "orange",
  },
  {
    title: "Fiches de match",
    description:
      "Centralisez l’adversaire, le gymnase, les horaires, les convocations, le déplacement et les responsabilités.",
    icon: Trophy,
    tone: "purple",
  },
  {
    title: "Convocations et présences",
    description:
      "Suivez les joueurs présents, absents ou en attente de réponse sans rechercher les informations dans plusieurs discussions.",
    icon: ClipboardCheck,
    tone: "cyan",
  },
  {
    title: "Annonces ciblées",
    description:
      "Publiez une information pour tout le club, une équipe, les entraîneurs, les parents ou un groupe précis.",
    icon: Megaphone,
    tone: "yellow",
  },
  {
    title: "Tâches d’organisation",
    description:
      "Attribuez chaque tâche à une personne et suivez clairement ce qui reste à faire avant une rencontre.",
    icon: ListTodo,
    tone: "red",
  },
];

function FeaturesPage() {
  return (
    <MarketingPageLayout>
      <section className="marketing-hero page-container">
        <div className="marketing-hero-content">
          <div className="marketing-eyebrow">Fonctionnalités</div>

          <h1>
            Tous les outils du club,
            <span> regroupés au même endroit.</span>
          </h1>

          <p>
            CLM Asso centralise les informations nécessaires à l’organisation
            quotidienne de votre club. Chaque membre retrouve les données
            correspondant à son équipe et à son rôle.
          </p>

          <a href="/#interet" className="marketing-primary-button">
            Montrer mon intérêt
          </a>
        </div>

        <div className="marketing-preview-card">
          <div className="marketing-preview-header">
            <span />
            <span />
            <span />
          </div>

          <img
            src="/dashboard-preview.png"
            alt="Aperçu du tableau de bord CLM Asso"
          />
        </div>
      </section>

      <section className="marketing-section page-container">
        <div className="section-heading">
          <span>Une application complète</span>
          <h2>Les fonctionnalités essentielles de CLM Asso</h2>
          <p>
            Une première version simple et utile, conçue autour des besoins
            concrets des clubs amateurs.
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                className={`marketing-card feature-card tone-${feature.tone}`}
                key={feature.title}
              >
                <div className="marketing-card-icon">
                  <Icon size={27} strokeWidth={2} />
                </div>

                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="marketing-cta page-container">
        <div>
          <span>CLM Asso est en développement</span>
          <h2>Participez à la création des prochaines fonctionnalités.</h2>
          <p>
            Les retours des clubs pilotes permettront de déterminer les
            fonctions réellement prioritaires.
          </p>
        </div>

        <Link to="/manifester-mon-interet" className="marketing-primary-button">
          Montrer mon intérêt
        </Link>
      </section>
    </MarketingPageLayout>
  );
}

export default FeaturesPage;
