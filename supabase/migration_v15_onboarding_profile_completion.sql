-- ============ MIGRATION V15 ============
-- ONBOARDING PROFILE COMPLETION
--
-- Adds address and stage_name to members, updates complete_onboarding
-- to create a member record automatically, and adjusts RLS to allow
-- users to update their own member details.
--
-- Run this in the Supabase SQL Editor. Safe to run multiple times.

-- 1. Add columns to members table if they don't exist
alter table members add column if not exists address text;
alter table members add column if not exists stage_name text;

-- 2. Update complete_onboarding function
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
  member_id_val uuid;
begin
  -- Validate that the user's current status is indeed 'pending_onboarding'
  if not exists (
    select 1 from profiles 
    where id = auth.uid() and approval_status = 'pending_onboarding'
  ) then
    raise exception 'Onboarding is already completed or not allowed';
  end if;

  -- Create member record if not exists
  select member_id into member_id_val from profiles where id = auth.uid();
  if member_id_val is null then
    insert into members (name, role, phone, status)
    values (
      coalesce(split_part(auth.jwt() ->> 'email', '@', 1), 'New Member'),
      chosen_role,
      '',
      'Free'
    )
    returning id into member_id_val;
  end if;

  -- Determine if it's a crew role
  is_crew := chosen_role in ('Director', 'Writer', 'Producer', 'Cameraman', 'Lighting Technician', 'Sound Engineer', 'Makeup Artist');

  if is_crew then
    update profiles
    set 
      member_id = member_id_val,
      detailed_role = chosen_role,
      role = case when chosen_role = 'Director' then 'Director' else 'Cast' end,
      portfolio_link = link,
      portfolio_path = path,
      approval_status = 'pending_admin'
    where id = auth.uid();
  else
    update profiles
    set 
      member_id = member_id_val,
      detailed_role = chosen_role,
      role = 'Cast',
      approval_status = 'approved'
    where id = auth.uid();
  end if;
end;
$$;

-- 3. Adjust members update policy to allow users to update their own member details
drop policy if exists "members_update" on members;
create policy "members_update" on members
  for update to authenticated
  using (is_director() or id = (select member_id from profiles where id = auth.uid()))
  with check (is_director() or id = (select member_id from profiles where id = auth.uid()));
