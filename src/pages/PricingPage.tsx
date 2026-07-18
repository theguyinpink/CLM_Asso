import {
  ArrowRight,
  CalendarDays,
  Check,
  FileText,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { Link } from "react-router";

import MarketingPageLayout from "../components/MarketingPageLayout";
import "../styles/pricing.css";

interface PricingFeature {
  label: string;
  included: boolean;
  detail?: string;
}

interface PricingPlan {
  code: "essential" | "club" | "grand_club";
  name: string;
  price: number;
  audience: string;
  description: string;
  badge?: string;
  storage: string;
  highlighted?: boolean;
  features: PricingFeature[];
}

const plans: PricingPlan[] = [
  {
    code: "essential",
    name: "Essentiel",
    price: 19,
    audience: "Jusqu’à 100 licenciés",
    description:
      "L’essentiel pour organiser un petit club sans multiplier les outils.",
    storage: "Sans espace Documents",
    features: [
      { label: "Tableau de bord", included: true },
      { label: "Équipes et membres", included: true },
      { label: "Calendrier et matchs", included: true },
      { label: "Convocations, annonces et tâches", included: true },
      { label: "Messagerie interclubs", included: true },
      { label: "WhatsApp et appel rapide", included: true },
      {
        label: "Documents du club",
        included: false,
        detail: "Disponible à partir de l’offre Club",
      },
    ],
  },
  {
    code: "club",
    name: "Club",
    price: 39,
    audience: "De 101 à 300 licenciés",
    description:
      "L’offre complète pour centraliser l’organisation et les documents du club.",
    badge: "La plus populaire",
    storage: "5 Go de documents",
    highlighted: true,
    features: [
      { label: "Toutes les fonctions Essentiel", included: true },
      { label: "Documents du club", included: true },
      { label: "Historique des versions", included: true },
      { label: "Restauration de documents", included: true },
      { label: "5 Go de stockage", included: true },
      { label: "Messagerie interclubs", included: true },
      { label: "WhatsApp et appel rapide", included: true },
    ],
  },
  {
    code: "grand_club",
    name: "Grand Club",
    price: 49,
    audience: "Plus de 300 licenciés",
    description:
      "Toute la puissance de CLM Asso pour les structures aux volumes plus importants.",
    storage: "20 Go de documents",
    features: [
      { label: "Toutes les fonctions Club", included: true },
      { label: "Nombre de licenciés illimité", included: true },
      { label: "Documents du club", included: true },
      { label: "Historique des versions", included: true },
      { label: "Restauration de documents", included: true },
      { label: "20 Go de stockage", included: true },
      { label: "Messagerie interclubs", included: true },
    ],
  },
];

const sharedBenefits = [
  {
    icon: CalendarDays,
    title: "Toute l’organisation centralisée",
    description:
      "Calendrier, matchs, convocations, tâches et annonces restent réunis dans un même espace.",
  },
  {
    icon: MessageSquareText,
    title: "Messagerie incluse",
    description:
      "Tous les abonnements donnent accès aux échanges interclubs, à WhatsApp et à l’appel rapide.",
  },
  {
    icon: ShieldCheck,
    title: "Accès par rôle",
    description:
      "Chaque dirigeant, responsable ou entraîneur retrouve uniquement les outils correspondant à son rôle.",
  },
];

const questions = [
  {
    title: "Un petit club peut-il choisir l’offre Club ?",
    answer:
      "Oui. Un club de moins de 100 licenciés peut choisir l’offre Club pour profiter de l’espace Documents et de ses 5 Go de stockage.",
  },
  {
    title: "Que se passe-t-il si le club dépasse sa tranche ?",
    answer:
      "Le club devra passer à l’offre correspondant à sa nouvelle taille. Les données restent conservées pendant le changement d’abonnement.",
  },
  {
    title: "La messagerie est-elle réservée aux offres supérieures ?",
    answer:
      "Non. La messagerie interclubs, WhatsApp et l’appel rapide sont inclus dans les trois abonnements.",
  },
  {
    title: "Puis-je changer d’offre plus tard ?",
    answer:
      "Oui. Le changement d’abonnement sera accessible depuis les paramètres de facturation du club.",
  },
];

function PricingPage() {
  return (
    <MarketingPageLayout>
      <section className="pricing-hero page-container">
        <div className="pricing-eyebrow">
          <Sparkles size={16} />
          Tarifs CLM Asso
        </div>

        <h1>
          Un abonnement adapté à
          <span> la taille de votre club.</span>
        </h1>

        <p>
          Toutes les fonctions essentielles restent accessibles. Les offres se
          différencient principalement par le nombre de licenciés et l’espace
          Documents.
        </p>

        <div className="pricing-hero-points" aria-label="Avantages des offres">
          <span>
            <Check size={16} /> Facturation mensuelle
          </span>
          <span>
            <Check size={16} /> Sans engagement annuel
          </span>
          <span>
            <Check size={16} /> Données conservées en cas de changement
          </span>
        </div>
      </section>

      <section className="pricing-section page-container" aria-label="Offres CLM Asso">
        <div className="pricing-grid">
          {plans.map((plan) => (
            <article
              className={`pricing-card ${plan.highlighted ? "pricing-card--highlighted" : ""}`}
              key={plan.code}
            >
              {plan.badge && <span className="pricing-card__badge">{plan.badge}</span>}

              <div className="pricing-card__heading">
                <span>CLM Asso</span>
                <h2>{plan.name}</h2>
                <p>{plan.description}</p>
              </div>

              <div className="pricing-card__price">
                <strong>{plan.price} €</strong>
                <span>/ mois</span>
              </div>

              <div className="pricing-card__audience">
                <UsersRound size={18} />
                <div>
                  <strong>{plan.audience}</strong>
                  <span>{plan.storage}</span>
                </div>
              </div>

              <ul className="pricing-card__features">
                {plan.features.map((feature) => (
                  <li
                    className={feature.included ? "" : "pricing-feature--disabled"}
                    key={feature.label}
                  >
                    <span>
                      {feature.included ? <Check size={15} /> : <X size={15} />}
                    </span>
                    <div>
                      <strong>{feature.label}</strong>
                      {feature.detail && <small>{feature.detail}</small>}
                    </div>
                  </li>
                ))}
              </ul>

              <Link
                className={
                  plan.highlighted
                    ? "pricing-card__button pricing-card__button--primary"
                    : "pricing-card__button"
                }
                to={`/inscription?plan=${plan.code}`}
              >
                Choisir {plan.name}
                <ArrowRight size={17} />
              </Link>
            </article>
          ))}
        </div>

        <p className="pricing-note">
          Le nombre de licenciés correspond à l’effectif total déclaré par le
          club. Le choix de l’offre sera confirmé avant le paiement.
        </p>
      </section>

      <section className="pricing-benefits page-container">
        <div className="section-heading">
          <span>Inclus dans chaque formule</span>
          <h2>Les fonctions importantes ne sont pas réservées aux grands clubs</h2>
          <p>
            Même l’offre Essentiel conserve les outils nécessaires au travail
            quotidien des dirigeants et responsables.
          </p>
        </div>

        <div className="pricing-benefits-grid">
          {sharedBenefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <article key={benefit.title}>
                <span>
                  <Icon size={23} />
                </span>
                <div>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="pricing-documents page-container">
        <div className="pricing-documents__icon">
          <FileText size={29} />
        </div>

        <div>
          <span>La différence principale</span>
          <h2>Un espace Documents pour les clubs qui en ont besoin</h2>
          <p>
            L’offre Essentiel reste volontairement légère. Les offres Club et
            Grand Club ajoutent le stockage, l’historique des versions et la
            restauration des anciens fichiers.
          </p>
        </div>

        <Link to="/fonctionnalites" className="pricing-documents__link">
          Découvrir les fonctionnalités
          <ArrowRight size={17} />
        </Link>
      </section>

      <section className="pricing-faq page-container">
        <div className="section-heading">
          <span>Questions fréquentes</span>
          <h2>Tout comprendre avant de choisir</h2>
        </div>

        <div className="pricing-faq-grid">
          {questions.map((question) => (
            <article key={question.title}>
              <h3>{question.title}</h3>
              <p>{question.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pricing-cta page-container">
        <div>
          <span>Prêt à centraliser votre club ?</span>
          <h2>Créez votre espace CLM Asso.</h2>
          <p>
            Vous choisirez votre abonnement avant l’activation définitive du
            club.
          </p>
        </div>

        <Link to="/inscription" className="marketing-primary-button">
          Créer mon compte
          <ArrowRight size={18} />
        </Link>
      </section>
    </MarketingPageLayout>
  );
}

export default PricingPage;
