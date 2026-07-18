import {
  CheckCircle2,
  Clock3,
  FolderKanban,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import MarketingPageLayout from "../components/MarketingPageLayout";
import { Link } from "react-router";

const benefits = [
  {
    title: "Une information centralisée",
    description:
      "Les informations importantes ne sont plus dispersées entre WhatsApp, les emails, les appels et les fichiers.",
    icon: FolderKanban,
    tone: "blue",
  },
  {
    title: "Moins de temps perdu",
    description:
      "Les responsables n’ont plus besoin de demander régulièrement où en est chaque démarche.",
    icon: Clock3,
    tone: "green",
  },
  {
    title: "Une meilleure communication",
    description:
      "Chaque membre reçoit les informations qui concernent son rôle et son équipe.",
    icon: MessagesSquare,
    tone: "orange",
  },
  {
    title: "Un club mieux coordonné",
    description:
      "Les dirigeants, entraîneurs, joueurs, parents et bénévoles travaillent avec les mêmes informations.",
    icon: UsersRound,
    tone: "purple",
  },
  {
    title: "Des données protégées",
    description:
      "Les rôles et autorisations permettent de limiter l’accès aux informations sensibles.",
    icon: ShieldCheck,
    tone: "cyan",
  },
  {
    title: "Une utilisation plus simple",
    description:
      "L’application est conçue comme un véritable outil de travail, accessible depuis un ordinateur ou un téléphone.",
    icon: Sparkles,
    tone: "yellow",
  },
];

function BenefitsPage() {
  return (
    <MarketingPageLayout>
      <section className="centered-marketing-hero page-container">
        <div className="marketing-eyebrow">Avantages</div>

        <h1>
          Moins de dispersion.
          <span> Plus de temps pour votre club.</span>
        </h1>

        <p>
          CLM Asso ne cherche pas seulement à ajouter un nouvel outil. Son
          objectif est de simplifier une organisation aujourd’hui répartie entre
          trop de personnes et trop de plateformes.
        </p>
      </section>

      <section className="marketing-section page-container">
        <div className="features-grid benefits-page-grid">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <article
                className={`marketing-card feature-card tone-${benefit.tone}`}
                key={benefit.title}
              >
                <div className="marketing-card-icon">
                  <Icon size={27} strokeWidth={2} />
                </div>

                <h2>{benefit.title}</h2>
                <p>{benefit.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="comparison-section page-container">
        <div className="comparison-heading">
          <span className="section-label">Avant et après</span>
          <h2>Une organisation beaucoup plus lisible</h2>
        </div>

        <div className="comparison-grid">
          <article className="comparison-card comparison-before">
            <div className="comparison-title">
              <X size={24} />
              <h3>Sans CLM Asso</h3>
            </div>

            <ul>
              <li>Plusieurs groupes WhatsApp différents</li>
              <li>Des informations difficiles à retrouver</li>
              <li>Des fichiers répartis entre plusieurs personnes</li>
              <li>Des responsabilités parfois mal définies</li>
              <li>Des changements transmis trop tardivement</li>
            </ul>
          </article>

          <article className="comparison-card comparison-after">
            <div className="comparison-title">
              <CheckCircle2 size={24} />
              <h3>Avec CLM Asso</h3>
            </div>

            <ul>
              <li>Un espace commun pour l’ensemble du club</li>
              <li>Une fiche claire pour chaque rencontre</li>
              <li>Des informations accessibles immédiatement</li>
              <li>Une personne désignée pour chaque tâche</li>
              <li>Une meilleure visibilité sur l’organisation</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="marketing-cta page-container">
        <div>
          <span>Une organisation plus simple</span>
          <h2>Découvrez ce que CLM Asso pourrait apporter à votre club.</h2>
        </div>

        <Link to="/manifester-mon-interet" className="marketing-primary-button">
          Montrer mon intérêt
        </Link>
      </section>
    </MarketingPageLayout>
  );
}

export default BenefitsPage;
