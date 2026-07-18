# CLM Asso — Installation de l’amélioration visuelle et du durcissement sécurité

## Avant toute modification

1. Faites une sauvegarde du projet actuel.
2. Faites une sauvegarde de la base Supabase avant la migration 008.
3. Utilisez Node.js 22.22.0 ou une version plus récente.
4. Ne placez jamais de clé `service_role`, de secret Resend ou de mot de passe dans un fichier `VITE_*`.

## Méthode recommandée

Le ZIP complet sécurisé est prêt à remplacer votre projet actuel. Conservez votre fichier `.env.local` séparément : il n’est volontairement pas inclus.

Après remplacement du projet :

```powershell
npm install
npm run lint
npm run build
npm run dev -- --host 0.0.0.0
```

## Méthode avec les fichiers modifiés uniquement

Copiez les fichiers de ce dossier dans votre projet en conservant exactement leurs chemins. Acceptez le remplacement des fichiers existants.

La dépendance suivante est ajoutée automatiquement par `package.json` et `package-lock.json` :

```text
@fontsource-variable/manrope
```

Installez ensuite les dépendances :

```powershell
npm install
```

## Migration Supabase 008

Dans le projet Supabase CLM Asso :

```text
SQL Editor → New query
```

Copiez et exécutez entièrement :

```text
supabase/migrations/008_clm_asso_security_hardening.sql
```

Cette migration doit être exécutée après la migration 007.

Elle ajoute notamment :

- des limitations de débit pour les messages, propositions, invitations et formulaires publics ;
- des contraintes PostgreSQL sur la longueur et le format des données ;
- le durcissement des permissions, de la RLS et des fonctions `SECURITY DEFINER` ;
- une RPC sécurisée pour le formulaire d’intérêt public ;
- la révocation de permissions publiques inutiles.

Les contraintes sont ajoutées avec `NOT VALID` afin de ne pas bloquer la migration à cause d’anciennes données. Elles protègent immédiatement les nouvelles écritures. Les anciennes données devront être nettoyées puis les contraintes validées avant la production définitive.

## Redéployer l’Edge Function

Depuis le dossier du projet, avec le CLI Supabase connecté :

```powershell
supabase functions deploy clm-asso-invite-member
```

Configurez ensuite les secrets serveur :

```powershell
supabase secrets set CLM_ASSO_APP_URL=https://votre-domaine.fr
supabase secrets set CLM_ASSO_ALLOWED_ORIGINS=https://votre-domaine.fr
supabase secrets set RESEND_API_KEY=VOTRE_CLE_RESEND
supabase secrets set INVITE_FROM_EMAIL="CLM Asso <invitation@votre-domaine.fr>"
```

`CLM_ASSO_APP_URL` doit être l’adresse réelle de CLM Asso. Pour plusieurs origines autorisées, séparez-les par des virgules dans `CLM_ASSO_ALLOWED_ORIGINS`.

## Réglages Supabase Auth à vérifier dans le tableau de bord

Le fichier `supabase/config.toml` documente les réglages attendus, mais il ne modifie pas automatiquement un projet Supabase hébergé déjà existant. Vérifiez manuellement :

- longueur minimale des mots de passe : 10 caractères ;
- lettres minuscules, majuscules et chiffres obligatoires ;
- confirmation d’adresse e-mail activée ;
- changement sécurisé du mot de passe activé ;
- protection contre les mots de passe compromis activée ;
- CAPTCHA activé sur les formulaires publics d’authentification ;
- URL du site et URL de redirection limitées aux domaines réellement utilisés.

## Hébergement OVH / Apache

Le fichier `public/.htaccess` ajoute :

- la réécriture nécessaire à React Router ;
- une politique CSP ;
- HSTS ;
- la protection contre l’intégration en iframe ;
- des restrictions sur les permissions du navigateur.

La CSP autorise les domaines `*.supabase.co`. En cas de domaine Supabase personnalisé, ajoutez ce domaine aux directives `connect-src` et `img-src` avant le déploiement.

## Contrôles réalisés sur cette version

- `npm ci` : réussi ;
- compilation TypeScript et Vite : réussie ;
- ESLint : réussi ;
- `npm audit` : aucune vulnérabilité signalée ;
- vérification de types de l’Edge Function : réussie ;
- analyse syntaxique de la migration SQL 008 : réussie.

La migration n’a pas été exécutée sur votre base Supabase distante depuis cet environnement. Faites donc la sauvegarde puis exécutez-la dans le SQL Editor du bon projet.
