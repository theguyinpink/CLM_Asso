import {
  HeartHandshake,
  Lightbulb,
  Rocket,
  ShieldCheck,
  Target,
  UsersRound,
} from "lucide-react";
import MarketingPageLayout from "../components/MarketingPageLayout";
import { Link } from "react-router";

const values = [
  {
    title: "Simplicité",
    description:
      "Une application doit aider les bénévoles du club, et non leur imposer une nouvelle complexité.",
    icon: Lightbulb,
    tone: "yellow",
  },
  {
    title: "Utilité",
    description:
      "Chaque fonctionnalité doit répondre à un problème réellement rencontré par les clubs.",
    icon: Target,
    tone: "blue",
  },
  {
    title: "Collaboration",
    description:
      "CLM Asso est imaginé avec les dirigeants, entraîneurs et membres qui utiliseront l’application.",
    icon: UsersRound,
    tone: "green",
  },
  {
    title: "Confiance",
    description:
      "Les informations du club doivent être accessibles aux bonnes personnes et correctement protégées.",
    icon: ShieldCheck,
    tone: "purple",
  },
];

function AboutPage() {
  return (
    <MarketingPageLayout>
      <section className="marketing-hero page-container about-hero">
        <div className="marketing-hero-content">
          <div className="marketing-eyebrow">À propos</div>

          <h1>
            Une idée née de la vie
            <span> quotidienne des clubs.</span>
          </h1>

          <p>
            CLM Asso part d’un constat simple : dans de nombreuses associations,
            l’organisation dépend de discussions dispersées et de quelques
            personnes qui détiennent une grande partie des informations.
          </p>
        </div>

        <div className="about-hero-visual">
          <div className="about-main-icon">
            <HeartHandshake size={72} strokeWidth={1.5} />
          </div>

          <span className="about-orbit about-orbit-one">
            <UsersRound size={25} />
          </span>

          <span className="about-orbit about-orbit-two">
            <Target size={25} />
          </span>

          <span className="about-orbit about-orbit-three">
            <Rocket size={25} />
          </span>
        </div>
      </section>

      <section className="about-story page-container">
        <div className="about-story-heading">
          <span className="section-label">Le constat de départ</span>
          <h2>Quand les informations reposent sur quelques personnes</h2>
        </div>

        <div className="about-story-content">
          <p>
            Dans le club à l’origine de cette réflexion, plusieurs membres
            importants de l’organisation appartenaient à la même famille. La
            présidence, la comptabilité et la correspondance communiquaient donc
            naturellement entre elles.
          </p>

          <p>
            Mais dans un autre club, les responsables ne sont pas nécessairement
            aussi proches. Il devient alors fréquent de devoir demander qui a
            contacté l’adversaire, qui a confirmé le gymnase ou qui doit
            prévenir les joueurs.
          </p>

          <p>
            CLM Asso a pour objectif de rendre ces informations accessibles dans
            un espace commun, même lorsqu’une personne est absente ou quitte ses
            responsabilités.
          </p>
        </div>
      </section>

      <section className="marketing-section page-container">
        <div className="section-heading">
          <span>Nos principes</span>
          <h2>Une application construite autour des clubs</h2>
        </div>

        <div className="values-grid">
          {values.map((value) => {
            const Icon = value.icon;

            return (
              <article
                className={`value-card tone-${value.tone}`}
                key={value.title}
              >
                <div className="marketing-card-icon">
                  <Icon size={27} strokeWidth={2} />
                </div>

                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="roadmap-section page-container">
        <div className="roadmap-heading">
          <span className="section-label">Le projet</span>
          <h2>Les prochaines étapes de CLM Asso</h2>
        </div>

        <div className="roadmap-list">
          <article>
            <span>01</span>
            <div>
              <h3>Présenter le projet</h3>
              <p>
                Faire découvrir CLM Asso aux clubs et recueillir leurs premiers
                avis.
              </p>
            </div>
          </article>

          <article>
            <span>02</span>
            <div>
              <h3>Sélectionner les clubs pilotes</h3>
              <p>
                Échanger avec des clubs souhaitant participer aux premiers
                tests.
              </p>
            </div>
          </article>

          <article>
            <span>03</span>
            <div>
              <h3>Développer la première version</h3>
              <p>
                Construire les fonctionnalités essentielles pour la rentrée
                sportive.
              </p>
            </div>
          </article>

          <article>
            <span>04</span>
            <div>
              <h3>Tester et améliorer</h3>
              <p>
                Corriger l’application à partir de son utilisation dans des
                conditions réelles.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="marketing-cta page-container">
        <div>
          <span>Participez à l’aventure</span>
          <h2>Votre expérience peut directement améliorer CLM Asso.</h2>
        </div>

        <Link to="/manifester-mon-interet" className="marketing-primary-button">
          Montrer mon intérêt
        </Link>
      </section>
    </MarketingPageLayout>
  );
}

export default AboutPage;
