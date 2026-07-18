-- CLM Asso - permissions, accès entraîneur et retrait des membres
-- À exécuter après 003_clm_asso_v1_completion.sql.

-- =========================================================
-- 1. PERMISSIONS PAR RÔLE
-- =========================================================

create or replace function public.clm_asso_has_permission(
  p_club_id uuid,
  p_permission text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clm_asso_club_members membership
    where membership.club_id = p_club_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role = 'owner'
        or (
          membership.role = 'admin'
          and p_permission = any(array[
            'manage_club',
            'manage_roles',
            'manage_members',
            'manage_teams',
            'manage_calendar',
            'manage_matches',
            'manage_convocations',
            'manage_announcements',
            'manage_tasks',
            'manage_documents'
          ])
        )
        or (
          membership.role = 'manager'
          and p_permission = any(array[
            'manage_club',
            'manage_members',
            'manage_teams',
            'manage_calendar',
            'manage_matches',
            'manage_convocations',
            'manage_announcements',
            'manage_tasks',
            'manage_documents'
          ])
        )
        or (
          membership.role = 'coach'
          and p_permission = any(array[
            'manage_teams',
            'manage_calendar',
            'manage_matches',
            'manage_convocations'
          ])
        )
      )
  );
$$;

revoke all
on function public.clm_asso_has_permission(uuid, text)
from public;

grant execute
on function public.clm_asso_has_permission(uuid, text)
to authenticated;

-- =========================================================
-- 2. ACCÈS EN LECTURE AUX TÂCHES ET DOCUMENTS
-- =========================================================

create or replace function public.clm_asso_can_access_resource(
  p_club_id uuid,
  p_resource text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clm_asso_club_members membership
    where membership.club_id = p_club_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        p_resource not in ('tasks', 'documents')
        or membership.role <> 'coach'
      )
  );
$$;

revoke all
on function public.clm_asso_can_access_resource(uuid, text)
from public;

grant execute
on function public.clm_asso_can_access_resource(uuid, text)
to authenticated;

drop policy if exists "clm_asso_tasks_select"
on public.clm_asso_tasks;

create policy "clm_asso_tasks_select"
on public.clm_asso_tasks
for select
to authenticated
using (
  public.clm_asso_can_access_resource(
    club_id,
    'tasks'
  )
);

drop policy if exists "clm_asso_documents_select"
on public.clm_asso_documents;

create policy "clm_asso_documents_select"
on public.clm_asso_documents
for select
to authenticated
using (
  public.clm_asso_can_access_resource(
    club_id,
    'documents'
  )
);

drop policy if exists "clm_asso_storage_select"
on storage.objects;

create policy "clm_asso_storage_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'clm-asso-documents'
  and public.clm_asso_can_access_resource(
    ((storage.foldername(name))[1])::uuid,
    'documents'
  )
);

-- =========================================================
-- 3. RETRAIT SÉCURISÉ D'UN MEMBRE
-- =========================================================

create or replace function public.clm_asso_remove_club_member(
  p_club_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_role public.clm_asso_club_role;
begin
  if auth.uid() is null then
    raise exception 'Vous devez être connecté.';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Vous ne pouvez pas vous retirer vous-même du club.';
  end if;

  -- "remove_members" n'est accordée à aucun rôle dans les listes
  -- ci-dessus. Le propriétaire la possède tout de même, car le
  -- rôle owner dispose de toutes les permissions.
  if not public.clm_asso_has_permission(
    p_club_id,
    'remove_members'
  ) then
    raise exception 'Seul le propriétaire peut retirer un membre.';
  end if;

  select membership.role
  into v_target_role
  from public.clm_asso_club_members membership
  where membership.club_id = p_club_id
    and membership.user_id = p_user_id;

  if not found then
    raise exception 'Ce membre ne fait pas partie du club.';
  end if;

  if v_target_role = 'owner' then
    raise exception 'Le propriétaire du club ne peut pas être retiré.';
  end if;

  delete from public.clm_asso_club_members
  where club_id = p_club_id
    and user_id = p_user_id;

  delete from public.clm_asso_members
  where club_id = p_club_id
    and user_id = p_user_id;
end;
$$;

revoke all
on function public.clm_asso_remove_club_member(uuid, uuid)
from public;

grant execute
on function public.clm_asso_remove_club_member(uuid, uuid)
to authenticated;

-- Empêche un administrateur de contourner la fonction RPC
-- avec une suppression directe de l'adhésion.
drop policy if exists "clm_asso_club_members_delete_manage"
on public.clm_asso_club_members;

create policy "clm_asso_club_members_delete_manage"
on public.clm_asso_club_members
for delete
to authenticated
using (
  public.clm_asso_has_permission(
    club_id,
    'remove_members'
  )
  and role <> 'owner'
  and user_id <> (select auth.uid())
);