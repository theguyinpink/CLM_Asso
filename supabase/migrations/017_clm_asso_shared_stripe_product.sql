begin;

-- Autorise plusieurs offres CLM Asso à partager le même produit Stripe.
drop index if exists
  public.clm_asso_subscription_plans_stripe_product_unique;

-- On garde un index classique pour les recherches, sans unicité.
create index if not exists
  clm_asso_subscription_plans_stripe_product_idx
on public.clm_asso_subscription_plans (stripe_product_id)
where stripe_product_id is not null;

update public.clm_asso_subscription_plans
set
  stripe_product_id = 'prod_LIVE_CLM_ASSO',
  stripe_monthly_price_id = case code
    when 'essential' then 'price_LIVE_19'
    when 'club' then 'price_LIVE_39'
    when 'grand_club' then 'price_LIVE_49'
  end,
  updated_at = now()
where code in ('essential', 'club', 'grand_club');

commit;