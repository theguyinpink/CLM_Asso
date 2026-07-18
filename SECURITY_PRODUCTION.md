# CLM Asso — vérifications avant mise en production

## Ordre d'installation

1. Déployer les migrations jusqu'à `008_clm_asso_security_hardening.sql`.
2. Redéployer l'Edge Function `clm-asso-invite-member`.
3. Configurer ses secrets :
   - `CLM_ASSO_APP_URL=https://votre-domaine.fr`
   - `CLM_ASSO_ALLOWED_ORIGINS=https://votre-domaine.fr`
   - `RESEND_API_KEY=...`
   - `INVITE_FROM_EMAIL=CLM Asso <invitation@votre-domaine.fr>`
4. Dans Supabase Auth, autoriser uniquement les URL de redirection réellement utilisées.
5. Activer la confirmation d'e-mail, la protection contre les mots de passe compromis et un CAPTCHA sur les écrans d'authentification publics.
6. Exécuter le Security Advisor et corriger toute alerte restante.

## Contrôles déjà ajoutés au projet

- RLS forcée sur les tables `clm_asso_*`.
- Révocation de la création d'objets dans le schéma `public` pour les rôles web.
- Révocation de l'exécution publique des fonctions internes.
- Limitation des messages, propositions, invitations et formulaires publics.
- Contraintes de taille et de format au niveau PostgreSQL.
- Formulaire d'intérêt transmis par RPC plutôt que par insertion publique directe.
- CORS de l'Edge Function limité aux origines configurées.
- URL d'invitation construite uniquement depuis `CLM_ASSO_APP_URL`.
- Blocage des documents exécutables, HTML, SVG et scripts.
- En-têtes HTTP de sécurité et règle SPA Apache dans `public/.htaccess`.

## Après la migration 008

Les contraintes sont créées avec `NOT VALID` pour ne pas bloquer une base possédant déjà d'anciennes données. Elles protègent immédiatement les nouvelles écritures. Après nettoyage des anciennes données, validez-les depuis PostgreSQL avec :

```sql
alter table public.nom_de_table validate constraint nom_de_contrainte;
```

## Sauvegardes et secrets

- Ne jamais placer une clé `service_role`, un secret Resend ou un mot de passe dans une variable `VITE_*`.
- Ne pas versionner `.env`, `.env.local` ou `supabase/.temp/`.
- Activer les sauvegardes Supabase adaptées au niveau de service choisi.
- Faire une sauvegarde avant chaque migration de production.
