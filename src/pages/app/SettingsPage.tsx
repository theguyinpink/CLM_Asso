import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Building2, Save, Settings, UserRound } from "lucide-react";

import PageHeader from "../../components/app/shared/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { useClub } from "../../hooks/useClub";
import { useProfile } from "../../hooks/useProfile";
import { usePermissions } from "../../hooks/usePermissions";
import { updateClubSettings } from "../../services/clmAssoService";
import "../../styles/data-pages.css";

function SettingsPage() {
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { canManageClub, canViewClubSettings } = usePermissions();
  const { activeClub, refreshMemberships } = useClub();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [clubName, setClubName] = useState("");
  const [acronym, setAcronym] = useState("");
  const [description, setDescription] = useState("");
  const [season, setSeason] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingClub, setSavingClub] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [clubMessage, setClubMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setFirstName(profile?.firstName ?? "");
    setLastName(profile?.lastName ?? "");
    setPhone(profile?.phone ?? "");
    setBirthDate(profile?.birthDate ?? "");
  }, [profile]);

  useEffect(() => {
    if (!activeClub) return;
    setClubName(activeClub.name);
    setAcronym(activeClub.acronym ?? "");
    setDescription(activeClub.description ?? "");
    setSeason(activeClub.seasonLabel ?? "");
    setContactEmail(activeClub.contactEmail ?? "");
    setContactPhone(activeClub.contactPhone ?? "");
    setWebsite(activeClub.website ?? "");
    setAddress(activeClub.address ?? "");
    setPostalCode(activeClub.postalCode ?? "");
    setCity(activeClub.city ?? "");
    setTimezone(activeClub.timezone || "Europe/Paris");
  }, [activeClub]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    setError("");
    setProfileMessage("");
    try {
      await updateProfile({
        firstName,
        lastName,
        displayName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        phone,
        birthDate,
      });
      setProfileMessage(
        "Votre profil a été enregistré et synchronisé avec Maison CLM.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Enregistrement impossible.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveClub(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeClub || !canManageClub) return;
    setSavingClub(true);
    setError("");
    setClubMessage("");
    try {
      await updateClubSettings(activeClub.id, {
        name: clubName.trim(),
        acronym: acronym.trim() || null,
        description: description.trim() || null,
        season_label: season.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        website: website.trim() || null,
        address: address.trim() || null,
        postal_code: postalCode.trim() || null,
        city: city.trim() || null,
        timezone,
      });
      await refreshMemberships();
      setClubMessage("Les informations du club ont été enregistrées.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Enregistrement impossible.",
      );
    } finally {
      setSavingClub(false);
    }
  }

  return (
    <div className="data-page">
      <PageHeader
        icon={Settings}
        title="Paramètres"
        description={
          canViewClubSettings
            ? "Modifiez votre profil personnel et les informations du club."
            : "Modifiez les informations de votre profil personnel."
        }
      />
      {error && <div className="data-form__error">{error}</div>}
      <section className="data-grid settings-data-grid">
        <article className="data-card settings-profile-card">
          <div className="data-card__header">
            <div>
              <h2>Mon profil</h2>
              <p>
                Ces informations remplacent le début de l’adresse e-mail dans
                l’application.
              </p>
            </div>
            <UserRound size={22} />
          </div>
          <form
            className="data-form settings-profile-form"
            onSubmit={saveProfile}
          >
            <div className="data-form-grid">
              <label className="data-field">
                Prénom
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  maxLength={80}
                  autoComplete="given-name"
                  required
                />
              </label>
              <label className="data-field">
                Nom
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  maxLength={80}
                  autoComplete="family-name"
                  required
                />
              </label>
              <label className="data-field">
                E-mail
                <input value={user?.email ?? ""} disabled />
              </label>
              <label className="data-field">
                Téléphone
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  maxLength={32}
                  inputMode="tel"
                  autoComplete="tel"
                />
              </label>
              <label className="data-field">
                Date de naissance
                <input
                  type="date"
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                />
              </label>
            </div>
            {profileMessage && (
              <div className="auth-message auth-message--success">
                {profileMessage}
              </div>
            )}
            <div className="data-form__actions">
              <button
                className="data-button settings-profile-save-button"
                type="submit"
                disabled={savingProfile}
              >
                <Save size={17} />
                {savingProfile ? "Enregistrement…" : "Enregistrer mon profil"}
              </button>
            </div>
          </form>
        </article>
        {canViewClubSettings && (
          <article className="data-card">
            <div className="data-card__header">
              <div>
                <h2>Informations du club</h2>
                <p>Nom, saison et coordonnées affichés dans CLM Asso.</p>
              </div>
              <Building2 size={22} />
            </div>
            <form className="data-form settings-club-form" onSubmit={saveClub}>
              <div className="data-form-grid">
                <label className="data-field data-field--full">
                  Nom du club
                  <input
                    value={clubName}
                    onChange={(event) => setClubName(event.target.value)}
                    maxLength={160}
                    required
                    disabled={!canManageClub}
                  />
                </label>
                <label className="data-field">
                  Sigle
                  <input
                    value={acronym}
                    onChange={(event) => setAcronym(event.target.value)}
                    maxLength={20}
                    disabled={!canManageClub}
                  />
                </label>
                <label className="data-field">
                  Saison
                  <input
                    value={season}
                    onChange={(event) => setSeason(event.target.value)}
                    placeholder="2026 - 2027"
                    maxLength={40}
                    disabled={!canManageClub}
                  />
                </label>
                <label className="data-field">
                  E-mail du club
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    maxLength={254}
                    autoComplete="email"
                    disabled={!canManageClub}
                  />
                </label>
                <label className="data-field">
                  Téléphone du club
                  <input
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.target.value)}
                    maxLength={32}
                    inputMode="tel"
                    autoComplete="tel"
                    disabled={!canManageClub}
                  />
                </label>
                <label className="data-field data-field--full">
                  Site internet
                  <input
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                    maxLength={2048}
                    inputMode="url"
                    autoComplete="url"
                    disabled={!canManageClub}
                  />
                </label>
                <label className="data-field data-field--full">
                  Adresse
                  <input
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    maxLength={255}
                    autoComplete="street-address"
                    disabled={!canManageClub}
                  />
                </label>
                <label className="data-field">
                  Code postal
                  <input
                    value={postalCode}
                    onChange={(event) => setPostalCode(event.target.value)}
                    maxLength={20}
                    autoComplete="postal-code"
                    disabled={!canManageClub}
                  />
                </label>
                <label className="data-field">
                  Ville
                  <input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    maxLength={120}
                    autoComplete="address-level2"
                    disabled={!canManageClub}
                  />
                </label>
                <label className="data-field">
                  Fuseau horaire
                  <select
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                    disabled={!canManageClub}
                  >
                    <option value="Europe/Paris">Europe/Paris</option>
                    <option value="Europe/Brussels">Europe/Brussels</option>
                    <option value="Europe/Luxembourg">Europe/Luxembourg</option>
                    <option value="Europe/Zurich">Europe/Zurich</option>
                  </select>
                </label>
                <label className="data-field data-field--full">
                  Description
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={4000}
                    disabled={!canManageClub}
                  />
                </label>
              </div>
              {clubMessage && (
                <div className="auth-message auth-message--success">
                  {clubMessage}
                </div>
              )}
              {canManageClub ? (
                <div className="data-form__actions">
                  <button
                    className="data-button"
                    type="submit"
                    disabled={savingClub}
                  >
                    <Save size={17} />
                    {savingClub ? "Enregistrement…" : "Enregistrer le club"}
                  </button>
                </div>
              ) : (
                <div className="auth-message">
                  Vous disposez d’un accès en lecture seule aux informations du
                  club.
                </div>
              )}
            </form>
          </article>
        )}
      </section>
    </div>
  );
}

export default SettingsPage;
