-- =========================================================
-- MODÈLE À COMPLÉTER — LIAISON DU CATALOGUE STRIPE
--
-- Ne pas exécuter avant d’avoir remplacé les six valeurs
-- REPLACE_WITH_... par les identifiants du mode Stripe utilisé.
-- =========================================================

begin;

do $$
begin
  if 'REPLACE_WITH_ESSENTIAL_PRODUCT_ID' not like 'prod_%'
    or 'REPLACE_WITH_ESSENTIAL_PRICE_ID' not like 'price_%'
    or 'REPLACE_WITH_CLUB_PRODUCT_ID' not like 'prod_%'
    or 'REPLACE_WITH_CLUB_PRICE_ID' not like 'price_%'
    or 'REPLACE_WITH_GRAND_CLUB_PRODUCT_ID' not like 'prod_%'
    or 'REPLACE_WITH_GRAND_CLUB_PRICE_ID' not like 'price_%'
  then
    raise exception
      'Remplacez les six valeurs REPLACE_WITH_... avant d’exécuter ce fichier.';
  end if;
end;
$$;

update public.clm_asso_subscription_plans
set
  stripe_product_id = 'REPLACE_WITH_ESSENTIAL_PRODUCT_ID',
  stripe_monthly_price_id = 'REPLACE_WITH_ESSENTIAL_PRICE_ID',
  updated_at = now()
where code = 'essential';

update public.clm_asso_subscription_plans
set
  stripe_product_id = 'REPLACE_WITH_CLUB_PRODUCT_ID',
  stripe_monthly_price_id = 'REPLACE_WITH_CLUB_PRICE_ID',
  updated_at = now()
where code = 'club';

update public.clm_asso_subscription_plans
set
  stripe_product_id = 'REPLACE_WITH_GRAND_CLUB_PRODUCT_ID',
  stripe_monthly_price_id = 'REPLACE_WITH_GRAND_CLUB_PRICE_ID',
  updated_at = now()
where code = 'grand_club';

commit;
