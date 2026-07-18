import type { FormEvent } from "react";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  LoaderCircle,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router";

import Header from "../components/Header";
import { supabase } from "../lib/supabase";

import "../styles/home.css";
import "../styles/interest.css";

type MultiSelectField =
  | "currentTools"
  | "problems"
  | "desiredFeatures";

interface InterestFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;

  clubName: string;
  city: string;
  sport: string;
  licenseesCount: string;
  teamsCount: string;

  currentTools: string[];
  problems: string[];
  desiredFeatures: string[];

  mainProblem: string;
  interestLevel: string;
  contactPermission: boolean;

  // Champ invisible destiné à limiter certains envois automatisés.
  website: string;
}

const initialFormData: InterestFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "",

  clubName: "",
  city: "",
  sport: "Basketball",
  licenseesCount: "",
  teamsCount: "",

  currentTools: [],
  problems: [],
  desiredFeatures: [],

  mainProblem: "",
  interestLevel: "",
  contactPermission: false,

  website: "",
};

const currentToolsOptions = [
  "WhatsApp",
  "Messenger",
  "E-mails",
  "Appels et SMS",
  "Excel ou Google Sheets",
  "Google Agenda",
  "SportEasy",
  "HelloAsso",
  "Site internet du club",
  "Autre",
];

const problemsOptions = [
  "Retrouver les informations",
  "Contacter les autres clubs",
  "Organiser les matchs",
  "Suivre les convocations",
  "Connaître les présences",
  "Prévenir les joueurs ou les parents",
  "Organiser les déplacements",
  "Répartir les tâches",
  "Gérer plusieurs équipes",
  "Autre",
];

const desiredFeaturesOptions = [
  "Tableau de bord du club",
  "Calendrier général",
  "Calendrier par équipe",
  "Fiches de match",
  "Convocations",
  "Suivi des présences",
  "Annonces ciblées",
  "Suivi des tâches",
  "Organisation des déplacements",
  "Communication avec les autres clubs",
  "Gestion des bénévoles",
  "Autre",
];

function InterestPage() {
  const [formData, setFormData] =
    useState<InterestFormData>(initialFormData);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function updateField<K extends keyof InterestFormData>(
    field: K,
    value: InterestFormData[K],
  ) {
    setFormData((currentFormData) => ({
      ...currentFormData,
      [field]: value,
    }));
  }

  function toggleSelection(
    field: MultiSelectField,
    value: string,
  ) {
    setFormData((currentFormData) => {
      const currentValues = currentFormData[field];

      const nextValues = currentValues.includes(value)
        ? currentValues.filter(
            (currentValue) => currentValue !== value,
          )
        : [...currentValues, value];

      return {
        ...currentFormData,
        [field]: nextValues,
      };
    });
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setErrorMessage("");

    /*
     * Si ce champ invisible est rempli, il s’agit probablement
     * d’un robot. On affiche une confirmation sans enregistrer
     * les données.
     */
    if (formData.website) {
      setIsSuccessful(true);
      return;
    }

    if (!formData.contactPermission) {
      setErrorMessage(
        "Vous devez accepter d’être recontacté pour envoyer le formulaire.",
      );
      return;
    }

    if (!formData.interestLevel) {
      setErrorMessage(
        "Veuillez indiquer votre niveau d’intérêt pour CLM Asso.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.rpc(
        "clm_asso_submit_interest",
        {
          p_first_name: formData.firstName.trim(),
          p_last_name: formData.lastName.trim(),
          p_email: formData.email.trim().toLowerCase(),
          p_phone: formData.phone.trim() || null,
          p_role: formData.role,

          p_club_name: formData.clubName.trim(),
          p_city: formData.city.trim(),
          p_sport: formData.sport.trim(),

          p_licensees_count: formData.licenseesCount
            ? Number(formData.licenseesCount)
            : null,

          p_teams_count: formData.teamsCount
            ? Number(formData.teamsCount)
            : null,

          p_current_tools: formData.currentTools,
          p_problems: formData.problems,
          p_desired_features: formData.desiredFeatures,

          p_main_problem: formData.mainProblem.trim() || null,
          p_interest_level: formData.interestLevel,
          p_contact_permission: formData.contactPermission,
        },
      );

      if (error) {
        throw error;
      }

      setFormData(initialFormData);
      setIsSuccessful(true);

      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(
        "Erreur lors de l’enregistrement du formulaire :",
        error,
      );

      setErrorMessage(
        "La réponse n’a pas pu être envoyée. Vérifiez les informations puis réessayez.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccessful) {
    return (
      <div className="interest-page">
        <Header />

        <main className="interest-success page-container">
          <div className="success-icon">
            <CheckCircle2 size={52} />
          </div>

          <span>Réponse enregistrée</span>

          <h1>
            Merci pour votre intérêt envers CLM Asso.
          </h1>

          <p>
            Votre réponse nous aidera à créer une application
            réellement adaptée au fonctionnement des clubs.
            Nous pourrons prochainement vous recontacter si
            vous avez accepté de participer au projet.
          </p>

          <Link
            to="/"
            className="success-home-button"
          >
            <ArrowLeft size={19} />
            Retourner à l’accueil
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="interest-page">
      <Header />

      <main className="interest-layout page-container">
        <aside className="interest-introduction">
          <div className="interest-intro-badge">
            <Sparkles size={16} />
            Projet en développement
          </div>

          <h1>
            Participez à la création de
            <span> CLM Asso.</span>
          </h1>

          <p className="interest-intro-description">
            Présentez-nous votre club et dites-nous ce qui
            pourrait réellement améliorer votre organisation.
          </p>

          <div className="interest-benefits">
            <article>
              <div>
                <MessageSquareText size={23} />
              </div>

              <section>
                <h2>Partagez votre expérience</h2>

                <p>
                  Expliquez-nous comment votre club fonctionne
                  actuellement.
                </p>
              </section>
            </article>

            <article>
              <div>
                <UsersRound size={23} />
              </div>

              <section>
                <h2>Devenez club pilote</h2>

                <p>
                  Testez les premières fonctionnalités et
                  participez directement aux décisions.
                </p>
              </section>
            </article>

            <article>
              <div>
                <ShieldCheck size={23} />
              </div>

              <section>
                <h2>Vos données sont protégées</h2>

                <p>
                  Elles serviront uniquement à étudier votre
                  intérêt et à vous recontacter.
                </p>
              </section>
            </article>
          </div>

          <div className="interest-intro-footer">
            <Check size={18} />
            Le formulaire prend environ trois minutes.
          </div>
        </aside>

        <form
          className="interest-form"
          onSubmit={handleSubmit}
        >
          <div className="form-heading">
            <span>Manifester mon intérêt</span>

            <h2>Parlez-nous de votre club</h2>

            <p>
              Les champs marqués d’un astérisque sont
              obligatoires.
            </p>
          </div>

          <input
            className="interest-honeypot"
            type="text"
            name="website"
            value={formData.website}
            onChange={(event) =>
              updateField("website", event.target.value)
            }
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          <fieldset className="form-section">
            <legend>
              <span>1</span>
              Vos informations
            </legend>

            <div className="form-grid form-grid-two">
              <label>
                Prénom *
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(event) =>
                    updateField(
                      "firstName",
                      event.target.value,
                    )
                  }
                  maxLength={80}
                  autoComplete="given-name"
                  required
                />
              </label>

              <label>
                Nom *
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(event) =>
                    updateField(
                      "lastName",
                      event.target.value,
                    )
                  }
                  maxLength={80}
                  autoComplete="family-name"
                  required
                />
              </label>

              <label>
                Adresse e-mail *
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) =>
                    updateField(
                      "email",
                      event.target.value,
                    )
                  }
                  maxLength={254}
                  autoComplete="email"
                  required
                />
              </label>

              <label>
                Téléphone
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(event) =>
                    updateField(
                      "phone",
                      event.target.value,
                    )
                  }
                  maxLength={30}
                  autoComplete="tel"
                />
              </label>

              <label className="form-full-width">
                Votre rôle dans le club *
                <select
                  value={formData.role}
                  onChange={(event) =>
                    updateField(
                      "role",
                      event.target.value,
                    )
                  }
                  required
                >
                  <option value="">
                    Sélectionnez votre rôle
                  </option>

                  <option value="president">
                    Président ou présidente
                  </option>

                  <option value="secretary">
                    Secrétaire
                  </option>

                  <option value="treasurer">
                    Trésorier ou trésorière
                  </option>

                  <option value="correspondent">
                    Correspondant ou correspondante
                  </option>

                  <option value="sport_manager">
                    Responsable sportif
                  </option>

                  <option value="administrative_manager">
                    Responsable administratif
                  </option>

                  <option value="coach">
                    Entraîneur ou entraîneuse
                  </option>

                  <option value="team_manager">
                    Responsable d’équipe
                  </option>

                  <option value="volunteer">
                    Bénévole
                  </option>

                  <option value="player">
                    Joueur ou joueuse
                  </option>

                  <option value="parent">
                    Parent
                  </option>

                  <option value="other">
                    Autre
                  </option>
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>
              <span>2</span>
              Votre club
            </legend>

            <div className="form-grid form-grid-two">
              <label>
                Nom du club *
                <input
                  type="text"
                  value={formData.clubName}
                  onChange={(event) =>
                    updateField(
                      "clubName",
                      event.target.value,
                    )
                  }
                  maxLength={160}
                  autoComplete="organization"
                  required
                />
              </label>

              <label>
                Ville *
                <input
                  type="text"
                  value={formData.city}
                  onChange={(event) =>
                    updateField(
                      "city",
                      event.target.value,
                    )
                  }
                  maxLength={120}
                  autoComplete="address-level2"
                  required
                />
              </label>

              <label>
                Sport *
                <input
                  type="text"
                  value={formData.sport}
                  onChange={(event) =>
                    updateField(
                      "sport",
                      event.target.value,
                    )
                  }
                  maxLength={80}
                  required
                />
              </label>

              <label>
                Nombre approximatif de licenciés
                <input
                  type="number"
                  min="0"
                  max="100000"
                  value={formData.licenseesCount}
                  onChange={(event) =>
                    updateField(
                      "licenseesCount",
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                Nombre approximatif d’équipes
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={formData.teamsCount}
                  onChange={(event) =>
                    updateField(
                      "teamsCount",
                      event.target.value,
                    )
                  }
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>
              <span>3</span>
              Votre organisation actuelle
            </legend>

            <p className="fieldset-description">
              Quels outils utilisez-vous actuellement ?
            </p>

            <div className="checkbox-options">
              {currentToolsOptions.map((option) => (
                <label
                  className="checkbox-option"
                  key={option}
                >
                  <input
                    type="checkbox"
                    checked={formData.currentTools.includes(
                      option,
                    )}
                    onChange={() =>
                      toggleSelection(
                        "currentTools",
                        option,
                      )
                    }
                  />

                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>
              <span>4</span>
              Les difficultés rencontrées
            </legend>

            <p className="fieldset-description">
              Qu’est-ce qui vous fait perdre le plus de temps ?
            </p>

            <div className="checkbox-options">
              {problemsOptions.map((option) => (
                <label
                  className="checkbox-option"
                  key={option}
                >
                  <input
                    type="checkbox"
                    checked={formData.problems.includes(
                      option,
                    )}
                    onChange={() =>
                      toggleSelection(
                        "problems",
                        option,
                      )
                    }
                  />

                  <span>{option}</span>
                </label>
              ))}
            </div>

            <label className="textarea-label">
              Quel est actuellement votre principal problème
              d’organisation ?

              <textarea
                rows={5}
                value={formData.mainProblem}
                onChange={(event) =>
                  updateField(
                    "mainProblem",
                    event.target.value,
                  )
                }
                maxLength={2000}
                placeholder="Décrivez librement le fonctionnement de votre club et les difficultés rencontrées..."
              />

              <small>
                {formData.mainProblem.length}/2000
              </small>
            </label>
          </fieldset>

          <fieldset className="form-section">
            <legend>
              <span>5</span>
              Les fonctionnalités souhaitées
            </legend>

            <p className="fieldset-description">
              Quelles fonctionnalités vous sembleraient les
              plus utiles ?
            </p>

            <div className="checkbox-options">
              {desiredFeaturesOptions.map((option) => (
                <label
                  className="checkbox-option"
                  key={option}
                >
                  <input
                    type="checkbox"
                    checked={formData.desiredFeatures.includes(
                      option,
                    )}
                    onChange={() =>
                      toggleSelection(
                        "desiredFeatures",
                        option,
                      )
                    }
                  />

                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>
              <span>6</span>
              Votre intérêt pour le projet
            </legend>

            <div className="radio-options">
              <label className="radio-option">
                <input
                  type="radio"
                  name="interestLevel"
                  value="club_pilot"
                  checked={
                    formData.interestLevel ===
                    "club_pilot"
                  }
                  onChange={(event) =>
                    updateField(
                      "interestLevel",
                      event.target.value,
                    )
                  }
                  required
                />

                <span>
                  <strong>
                    Je souhaite devenir club pilote
                  </strong>

                  <small>
                    Je souhaite participer aux premiers tests
                    et donner régulièrement mon avis.
                  </small>
                </span>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  name="interestLevel"
                  value="keep_informed"
                  checked={
                    formData.interestLevel ===
                    "keep_informed"
                  }
                  onChange={(event) =>
                    updateField(
                      "interestLevel",
                      event.target.value,
                    )
                  }
                />

                <span>
                  <strong>
                    Je souhaite être tenu informé
                  </strong>

                  <small>
                    Je souhaite suivre l’évolution du projet et
                    son futur lancement.
                  </small>
                </span>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  name="interestLevel"
                  value="need_more_information"
                  checked={
                    formData.interestLevel ===
                    "need_more_information"
                  }
                  onChange={(event) =>
                    updateField(
                      "interestLevel",
                      event.target.value,
                    )
                  }
                />

                <span>
                  <strong>
                    J’aimerais d’abord en savoir plus
                  </strong>

                  <small>
                    Je souhaite échanger au sujet du projet
                    avant de prendre une décision.
                  </small>
                </span>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  name="interestLevel"
                  value="opinion_only"
                  checked={
                    formData.interestLevel ===
                    "opinion_only"
                  }
                  onChange={(event) =>
                    updateField(
                      "interestLevel",
                      event.target.value,
                    )
                  }
                />

                <span>
                  <strong>
                    Je souhaite seulement donner mon avis
                  </strong>

                  <small>
                    Je ne souhaite pas forcément participer aux
                    tests pour le moment.
                  </small>
                </span>
              </label>
            </div>
          </fieldset>

          <div className="privacy-information">
            <ShieldCheck size={23} />

            <p>
              Les informations recueillies sont utilisées pour
              étudier les besoins des clubs et vous recontacter
              au sujet de CLM Asso. Vous pourrez demander
              l’accès, la modification ou la suppression de vos
              données en écrivant à{" "}
              <strong>maison.clm.contact@gmail.com</strong>.
            </p>
          </div>

          <label className="consent-option">
            <input
              type="checkbox"
              checked={formData.contactPermission}
              onChange={(event) =>
                updateField(
                  "contactPermission",
                  event.target.checked,
                )
              }
              required
            />

            <span>
              J’accepte que CLM Asso utilise les informations
              saisies pour me recontacter au sujet du projet et
              de ses tests. *
            </span>
          </label>

          {errorMessage && (
            <div
              className="form-error"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            className="interest-submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoaderCircle
                  className="submit-spinner"
                  size={21}
                />
                Envoi en cours…
              </>
            ) : (
              <>
                <UsersRound size={21} />
                Envoyer ma réponse
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}

export default InterestPage;