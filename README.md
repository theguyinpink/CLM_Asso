# CLM Asso

Application de gestion de club sportif construite avec React, TypeScript, Vite
et Supabase.

## Fonctionnalités

- authentification Maison CLM et récupération du mot de passe ;
- profils utilisateurs synchronisés ;
- espaces clubs et rôles sécurisés ;
- invitations par e-mail ou lien ;
- annuaire des membres et suspension d'accès ;
- équipes et effectifs ;
- calendrier mensuel ;
- matchs et résultats ;
- convocations avec réponse personnelle ;
- annonces immédiates ou programmées ;
- tâches assignées ;
- documents privés avec historique de versions ;
- notifications personnelles en temps réel ;
- journal d'activité du club ;
- tableau de bord alimenté par les données Supabase.

## Structure

```text
src/
  components/     interface réutilisable
  contexts/       états Auth, Club, Profil et Toast
  hooks/          accès aux contextes et permissions
  lib/            client Supabase et règles de permissions
  pages/          pages publiques, authentification et application
  providers/      providers React
  services/       opérations Supabase
  styles/         styles de l'application
  types/          types métier
supabase/
  functions/      fonction Edge d'invitation
  migrations/     schéma, RLS, triggers et automatisations
```

## Installation

Suivre [`INSTALLATION_CLM_ASSO.md`](./INSTALLATION_CLM_ASSO.md).

## Commandes

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## Sécurité

Le navigateur utilise uniquement la clé publique Supabase. La clé
`service_role` reste dans l'environnement de la fonction Edge. Les données sont
isolées par `club_id` et protégées par les politiques Row Level Security.
