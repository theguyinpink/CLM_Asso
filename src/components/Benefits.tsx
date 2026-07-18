import {
  CalendarDays,
  Clock3,
  LockKeyhole,
  UsersRound,
} from "lucide-react";

const benefits = [
  {
    title: "Tout centraliser",
    description:
      "Équipes, matchs, documents, informations importantes... Tout est au même endroit.",
    icon: CalendarDays,
    className: "benefit-blue",
  },
  {
    title: "Gagner du temps",
    description:
      "Fini les messages éparpillés et les informations perdues. Concentrez-vous sur l’essentiel.",
    icon: Clock3,
    className: "benefit-green",
  },
  {
    title: "Fédérer le club",
    description:
      "Dirigeants, entraîneurs, joueurs, parents et bénévoles ont les bonnes informations au bon moment.",
    icon: UsersRound,
    className: "benefit-orange",
    id: "pour-qui",
  },
  {
    title: "Simple et sécurisé",
    description:
      "Accessible partout, fiable et sécurisé. Les données de votre club sont protégées.",
    icon: LockKeyhole,
    className: "benefit-purple",
  },
];

function Benefits() {
  return (
    <section
      className="benefits page-container"
      id="avantages"
      aria-label="Avantages de CLM Asso"
    >
      {benefits.map((benefit) => {
        const Icon = benefit.icon;

        return (
          <article
            className={`benefit-card ${benefit.className}`}
            id={benefit.id}
            key={benefit.title}
          >
            <div className="benefit-icon">
              <Icon size={30} strokeWidth={2.2} />
            </div>

            <div>
              <h2>{benefit.title}</h2>
              <p>{benefit.description}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export default Benefits;