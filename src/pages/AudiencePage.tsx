import {
  Baby,
  BriefcaseBusiness,
  ClipboardList,
  HandHeart,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import MarketingPageLayout from "../components/MarketingPageLayout";
import { Link } from "react-router";

const audiences = [
  {
    title: "Dirigeants du club",
    subtitle: "Présidence, secrétariat et bureau",
    description:
      "Obtenez une vision générale du club et vérifiez rapidement que les différentes équipes disposent des bonnes informations.",
    icon: BriefcaseBusiness,
    tone: "blue",
  },
  {
    title: "Correspondants",
    subtitle: "Organisation des rencontres",
    description:
      "Suivez les échanges avec les autres clubs, les horaires confirmés, les gymnases et les démarches restantes.",
    icon: ClipboardList,
    tone: "orange",
  },
  {
    title: "Entraîneurs",
    subtitle: "Gestion quotidienne de l’équipe",
    description:
      "Préparez les matchs, envoyez les convocations, suivez les présences et transmettez les informations utiles.",
    icon: UserRoundCog,
    tone: "green",
  },
  {
    title: "Joueurs et joueuses",
    subtitle: "Toutes les informations sportives",
    description:
      "Consultez votre calendrier, vos convocations, les horaires de rendez-vous et les adresses des rencontres.",
    icon: UsersRound,
    tone: "purple",
  },
  {
    title: "Parents",
    subtitle: "Suivi des équipes de jeunes",
    description:
      "Confirmez la présence de votre enfant et retrouvez les informations concernant les matchs et les déplacements.",
    icon: Baby,
    tone: "cyan",
  },
  {
    title: "Bénévoles",
    subtitle: "Participation à la vie du club",
    description:
      "Consultez les besoins du club et inscrivez-vous pour la buvette, la table de marque ou l’organisation d’un événement.",
    icon: HandHeart,
    tone: "yellow",
  },
];

function AudiencePage() {
  return (
    <MarketingPageLayout>
      <section className="centered-marketing-hero page-container">
        <div className="marketing-eyebrow">Pour qui ?</div>

        <h1>
          Une seule application,
          <span> adaptée à chaque membre du club.</span>
        </h1>

        <p>
          Chaque utilisateur dispose d’un accès adapté à son rôle. Il retrouve
          les informations dont il a besoin sans être encombré par celles qui ne
          le concernent pas.
        </p>
      </section>

      <section className="marketing-section page-container">
        <div className="audience-grid">
          {audiences.map((audience) => {
            const Icon = audience.icon;

            return (
              <article
                className={`audience-card tone-${audience.tone}`}
                key={audience.title}
              >
                <div className="audience-card-icon">
                  <Icon size={30} strokeWidth={2} />
                </div>

                <div>
                  <span>{audience.subtitle}</span>
                  <h2>{audience.title}</h2>
                  <p>{audience.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="permissions-section page-container">
        <div className="permissions-visual">
          <div className="permissions-circle">
            <ShieldCheck size={52} strokeWidth={1.7} />
          </div>

          <div className="permission-chip permission-chip-one">Dirigeants</div>

          <div className="permission-chip permission-chip-two">Entraîneurs</div>

          <div className="permission-chip permission-chip-three">Joueurs</div>

          <div className="permission-chip permission-chip-four">Parents</div>
        </div>

        <div className="permissions-content">
          <span className="section-label">Rôles et autorisations</span>

          <h2>Chacun accède uniquement à ce qui le concerne.</h2>

          <p>
            Les dirigeants peuvent superviser tout le club, tandis que les
            joueurs, parents ou bénévoles disposent d’un accès plus ciblé.
          </p>

          <ul className="check-list">
            <li>Informations adaptées au rôle de l’utilisateur</li>
            <li>Espaces séparés pour chaque équipe</li>
            <li>Données importantes mieux protégées</li>
            <li>Interface plus claire pour tous les membres</li>
          </ul>
        </div>
      </section>

      <section className="marketing-cta page-container">
        <div>
          <span>Votre club est concerné ?</span>
          <h2>Aidez-nous à créer une application adaptée à vos membres.</h2>
        </div>

        <Link to="/manifester-mon-interet" className="marketing-primary-button">
          Montrer mon intérêt
        </Link>
      </section>
    </MarketingPageLayout>
  );
}

export default AudiencePage;
