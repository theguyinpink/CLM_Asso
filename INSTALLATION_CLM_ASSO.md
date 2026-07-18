# Installation complète de CLM Asso

Cette version ne contient plus de données de démonstration. Les profils, clubs,
membres, équipes, matchs, calendriers, convocations, annonces, tâches,
documents, notifications et activités utilisent Supabase.

## 1. Prérequis

- Node.js `22.22.0` ou plus récent
- npm
- un projet Supabase
- Supabase CLI pour déployer la fonction d'invitation

## 2. Variables du site

Copier `.env.example` vers `.env.local` :

```bash
cp .env.example .env.local
```

Puis renseigner :

```env
VITE_SUPABASE_URL=https://VOTRE-PROJET.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=VOTRE_CLE_PUBLIQUE_SUPABASE
```

Ne jamais mettre la clé `service_role` dans `.env.local` ou dans le code React.

## 3. Migrations SQL

Les fichiers sont dans `supabase/migrations`.

### Base déjà configurée avec les migrations précédentes

Si `001_clm_asso_core.sql` et `002_clm_asso_production.sql` ont déjà été
exécutées, exécuter uniquement :

```text
003_clm_asso_v1_completion.sql
```

### Nouvelle base

Exécuter dans cet ordre :

```text
001_clm_asso_core.sql
002_clm_asso_production.sql
003_clm_asso_v1_completion.sql
```

La migration 003 ajoute notamment :

- les invitations de comptes Maison CLM ;
- les permissions détaillées par rôle et les politiques RLS associées ;
- l'activation et la suspension réelle de l'accès d'un membre ;
- les réponses personnelles et sécurisées aux convocations ;
- les notifications personnelles et leur lecture en temps réel ;
- la publication automatique des annonces programmées ;
- le journal d'activité avec l'auteur de l'action ;
- les versions et restaurations des documents ;
- les règles Storage privées par club.

La migration essaie d'activer `pg_cron`. Si le SQL Editor affiche seulement un
`NOTICE` indiquant que l'extension ne peut pas être activée, l'activer depuis
les extensions Supabase puis relancer la migration 003. Sans Cron, les annonces
échues sont quand même publiées lors du prochain chargement de la page Annonces.

## 4. Bucket de documents

La migration 002 crée normalement le bucket privé :

```text
clm-asso-documents
```

Vérifier dans Supabase Storage qu'il n'est pas public. Les politiques de la
migration 003 contrôlent la lecture et l'écriture selon le club et le rôle.

## 5. Déployer la fonction d'invitation

Depuis le dossier du projet :

```bash
supabase login
supabase link --project-ref VOTRE_PROJECT_REF
supabase functions deploy clm-asso-invite-member
```

Définir l'adresse publique de CLM Asso :

```bash
supabase secrets set CLM_ASSO_APP_URL=https://votre-domaine.fr
```

Pour envoyer un e-mail personnalisé aux comptes Maison CLM déjà existants :

```bash
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set INVITE_FROM_EMAIL="Maison CLM <no-reply@votre-domaine.fr>"
```

Sans Resend :

- un nouveau compte reçoit l'invitation gérée par Supabase Auth ;
- pour un compte existant, CLM Asso affiche un lien sécurisé à copier.

## 6. URL d'authentification Supabase

Dans `Authentication > URL Configuration`, ajouter au minimum en local :

```text
http://localhost:5173/creer-mon-club
http://localhost:5173/invitation
http://localhost:5173/nouveau-mot-de-passe
```

Et en production :

```text
https://votre-domaine.fr/creer-mon-club
https://votre-domaine.fr/invitation
https://votre-domaine.fr/nouveau-mot-de-passe
```

Configurer également la `Site URL` avec le domaine de production.

## 7. Installer et lancer

```bash
npm install
npm run dev
```

## 8. Vérifier la qualité du projet

```bash
npm run lint
npm run build
```

Les deux commandes doivent terminer sans erreur ni avertissement ESLint.

## 9. Test multi-utilisateur conseillé

Utiliser au moins deux adresses e-mail différentes :

1. le propriétaire invite un second utilisateur depuis `Membres` ;
2. le second utilisateur accepte le lien et rejoint le club ;
3. le propriétaire lui attribue successivement les rôles membre, coach,
   responsable et administrateur ;
4. vérifier que les boutons de gestion apparaissent uniquement avec les bons
   rôles ;
5. envoyer une convocation et répondre depuis le compte invité ;
6. assigner une tâche et vérifier la cloche de notifications ;
7. programmer une annonce à quelques minutes ;
8. ajouter plusieurs versions d'un document puis en restaurer une ;
9. suspendre puis réactiver l'accès du compte invité ;
10. tester « Mot de passe oublié ».

## 10. Compte déjà utilisé sur CLM Sportlink

CLM Sportlink et CLM Asso partagent Supabase Auth. L'utilisateur se connecte
avec les mêmes identifiants Maison CLM. Si son prénom ou son nom manque,
CLM Asso le redirige vers `/completer-profil` et synchronise ensuite :

- `auth.users.raw_user_meta_data` ;
- `clm_asso_profiles` ;
- les fiches d'annuaire liées dans `clm_asso_members`.
