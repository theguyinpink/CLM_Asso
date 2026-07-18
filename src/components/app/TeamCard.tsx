import {
  ArrowRight,
  CalendarDays,
  MoreVertical,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router";

import type { Team } from "../../data/teamsData";

interface TeamCardProps {
  team: Team;
}

function TeamCard({ team }: TeamCardProps) {
  return (
    <article className="team-card">
      <header className="team-card__header">
        <h2>{team.name}</h2>

        <div className="team-card__header-actions">
          <span
            className={`team-category team-category--${team.categoryTone}`}
          >
            {team.category}
          </span>

          <button
            type="button"
            className="team-card__menu"
            aria-label={`Afficher les options de ${team.name}`}
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      <div className="team-card__metadata">
        <span>
          <UserRound size={14} />
          Coach : {team.coach}
        </span>

        <span>
          <UsersRound size={14} />
          {team.memberCount} {team.memberLabel}
        </span>
      </div>

      <div className="team-card__events">
        <article>
          <div className="team-event-icon team-event-icon--training">
            <CalendarDays size={17} />
          </div>

          <div>
            <span>Prochain entraînement</span>
            <strong>{team.nextTraining}</strong>
          </div>
        </article>

        <article>
          <div className="team-event-icon team-event-icon--match">
            <Trophy size={17} />
          </div>

          <div>
            <span>Prochain match</span>
            <strong>{team.nextMatchDate}</strong>
            <small>{team.nextOpponent}</small>
          </div>
        </article>
      </div>

      <div className="team-card__members">
        <div className="team-member-avatars">
          {team.memberInitials.map((initials, index) => (
            <span
              key={`${team.id}-${initials}-${index}`}
              className={`team-member-avatar team-member-avatar--${
                (index % 4) + 1
              }`}
            >
              {initials}
            </span>
          ))}
        </div>
      </div>

      <footer className="team-card__footer">
        <Link to={`/app/equipes/${team.id}`}>
          Voir l’équipe
          <ArrowRight size={15} />
        </Link>
      </footer>
    </article>
  );
}

export default TeamCard;