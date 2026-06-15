-- ============ MIGRATION V6 ============
-- SECURE ONBOARDING RPC FUNCTION

create or replace function complete_onboarding(
  chosen_role text,
  link text,
  path text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  is_crew boolean;
begin
  -- Validate that the user's current status is indeed 'pending_onboarding'
  if not exists (
    select 1 from profiles 
    where id = auth.uid() and approval_status = 'pending_onboarding'
  ) then
    raise exception 'Onboarding is already completed or not allowed';
  end if;

  -- Determine if it's a crew role
  is_crew := chosen_role in ('Director', 'Writer', 'Producer', 'Cameraman', 'Lighting Technician', 'Sound Engineer', 'Makeup Artist');

  if is_crew then
    update profiles
    set 
      detailed_role = chosen_role,
      role = case when chosen_role = 'Director' then 'Director' else 'Cast' end,
      portfolio_link = link,
      portfolio_path = path,
      approval_status = 'pending_admin'
    where id = auth.uid();
  else
    update profiles
    set 
      detailed_role = chosen_role,
      role = 'Cast',
      approval_status = 'approved'
    where id = auth.uid();
  end if;
end;
$$;

create or replace function reapply_onboarding()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  -- Validate that the user's current status is indeed 'rejected'
  if not exists (
    select 1 from profiles 
    where id = auth.uid() and approval_status = 'rejected'
  ) then
    raise exception 'User is not rejected or not allowed to reapply';
  end if;

  update profiles
  set 
    approval_status = 'pending_onboarding'
  where id = auth.uid();
end;
$$;

