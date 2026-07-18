-- =========================================================
-- CLM ASSO — WHATSAPP ET APPEL DEPUIS LA MESSAGERIE
-- Migration 007
--
-- Cette migration réutilise clm_asso_clubs.contact_phone.
-- Le numéro n'est exposé qu'aux utilisateurs autorisés à
-- utiliser la messagerie (owner, admin, manager), grâce à
-- clm_asso_can_message().
-- =========================================================

begin;

drop function if exists
public.clm_asso_list_messageable_clubs(uuid);

create function
public.clm_asso_list_messageable_clubs(
  p_source_club_id uuid
)
returns table (
  id uuid,
  name text,
  acronym text,
  logo_url text,
  city text,
  contact_phone text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.clm_asso_can_message(
    p_source_club_id
  ) then
    raise exception
      'Vous ne pouvez pas accéder à la messagerie de ce club.';
  end if;

  return query
  select
    club.id,
    club.name,
    club.acronym,
    club.logo_url,
    club.city,
    nullif(btrim(club.contact_phone), '')
      as contact_phone
  from public.clm_asso_clubs club
  where club.id <> p_source_club_id
  order by
    lower(club.name),
    club.created_at;
end;
$$;

revoke all on function
public.clm_asso_list_messageable_clubs(uuid)
from public;

grant execute on function
public.clm_asso_list_messageable_clubs(uuid)
to authenticated;

commit;
