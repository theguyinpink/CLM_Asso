# Fonctions Edge CLM Asso

## `clm-asso-invite-member`

Cette fonction :

- vérifie la session de l'utilisateur appelant ;
- vérifie la permission `manage_roles` ;
- crée une invitation temporaire de 14 jours ;
- invite les nouveaux comptes via Supabase Auth ;
- envoie un e-mail Maison CLM aux comptes existants lorsque Resend est configuré ;
- renvoie sinon un lien à copier depuis l'interface.

### Déploiement

```bash
supabase functions deploy clm-asso-invite-member
```

### Secret obligatoire en production

```bash
supabase secrets set CLM_ASSO_APP_URL=https://votre-domaine.fr
```

Supabase fournit automatiquement :

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### E-mails personnalisés pour les comptes existants

```bash
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set INVITE_FROM_EMAIL="Maison CLM <no-reply@votre-domaine.fr>"
```
