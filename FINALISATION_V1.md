# Finalisation fonctionnelle V1

Cette livraison traite les points restants de l'audit.

## 2. Invitations et accès réels

- invitation sécurisée par fonction Edge ;
- e-mail Supabase pour un nouveau compte ;
- e-mail Resend ou lien à copier pour un compte existant ;
- acceptation avec contrôle de l'adresse e-mail ;
- création du lien `clm_asso_club_members` ;
- création/synchronisation de la fiche d'annuaire ;
- choix d'un mot de passe pour un nouveau compte invité ;
- suspension et réactivation réelles de l'accès.

## 3. Rôles et permissions

- interface adaptée aux rôles owner, admin, manager, coach et member ;
- RLS détaillée par ressource ;
- changement de rôle sécurisé ;
- actions masquées lorsqu'elles ne sont pas autorisées ;
- les membres assignés peuvent uniquement changer le statut de leurs tâches.

## 4. Convocations

- brouillon, envoi, clôture et réouverture ;
- modification des destinataires ;
- réponse personnelle présent/absent/incertain ;
- commentaire personnel ;
- lecture RLS limitée à ses propres convocations pour un membre.

## 5. Notifications

- table personnelle ;
- compteur non lu ;
- menu dans le header ;
- lecture individuelle ou globale ;
- événements Realtime ;
- notifications pour annonces, convocations, tâches et adhésions.

## 6. Annonces programmées

- fonction SQL de publication ;
- planification pg_cron lorsque l'extension est disponible ;
- publication de secours lors du chargement des annonces.

## 7. Activité récente

- journal en base ;
- auteur, action, type d'entité, identifiant, date et métadonnées ;
- affichage réel dans le tableau de bord.

## 8. Documents

- stockage privé ;
- versions numérotées ;
- nom du fichier et note de version ;
- téléchargement de chaque version ;
- restauration créant une nouvelle version ;
- suppression de toutes les versions avec le document.

## 9. Dialogues et retours utilisateur

- plus aucun `window.confirm` ou `window.alert` ;
- confirmations CLM Asso ;
- toasts de succès et d'erreur.

## 10. Nettoyage

- suppression de `src/data` ;
- suppression de l'ancien IndexedDB ;
- suppression des composants vides et obsolètes ;
- aucune donnée de démonstration encore importée.

## 11. Mot de passe oublié

- demande d'e-mail de récupération ;
- route de retour ;
- choix du nouveau mot de passe commun Maison CLM.

## Vérifications effectuées

```bash
npm run lint
npm run build
```

Les routes sont chargées à la demande afin de réduire le bundle initial.
