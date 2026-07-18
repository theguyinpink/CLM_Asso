# Catalogue Stripe CLM Asso — mode test

Créer les produits dans **Stripe > Product catalog**, en activant d’abord le **mode test**.

## 1. CLM Asso Essentiel

- Nom : `CLM Asso Essentiel`
- Description : `Organisation complète pour les clubs jusqu’à 100 licenciés, sans espace Documents.`
- Modèle tarifaire : tarif fixe
- Prix : `19,00 EUR`
- Récurrence : mensuelle
- Lookup key recommandé : `clm_asso_essential_monthly`
- Métadonnée du produit : `clm_asso_plan_code = essential`

## 2. CLM Asso Club

- Nom : `CLM Asso Club`
- Description : `Offre complète pour les clubs jusqu’à 300 licenciés avec 5 Go de documents.`
- Modèle tarifaire : tarif fixe
- Prix : `39,00 EUR`
- Récurrence : mensuelle
- Lookup key recommandé : `clm_asso_club_monthly`
- Métadonnée du produit : `clm_asso_plan_code = club`

## 3. CLM Asso Grand Club

- Nom : `CLM Asso Grand Club`
- Description : `Offre complète pour les grands clubs avec 20 Go de documents.`
- Modèle tarifaire : tarif fixe
- Prix : `49,00 EUR`
- Récurrence : mensuelle
- Lookup key recommandé : `clm_asso_grand_club_monthly`
- Métadonnée du produit : `clm_asso_plan_code = grand_club`

## Identifiants à récupérer

Après la création, ouvrir chaque produit et copier :

- son identifiant `prod_...` ;
- l’identifiant du prix mensuel `price_...`.

Il y aura donc six identifiants à renseigner dans le modèle SQL `011_clm_asso_link_stripe_catalog_TEMPLATE.sql`.

Les identifiants du mode test sont différents des identifiants du mode production.
