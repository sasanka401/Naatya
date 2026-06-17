-- ============ MIGRATION V16 ============
-- ADMIN USER DELETION AND UPDATE RPCS
--
-- Adds a function to delete a user by an admin, checking if the caller is indeed an admin.
-- Run this in the Supabase SQL Editor. Safe to run multiple times.

create or replace function delete_user_by_admin(target_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  calling_user_is_admin boolean;
  linked_member_id uuid;
begin
  -- 1. Check if the calling user is an admin
  select is_admin into calling_user_is_admin
  from profiles
  where id = auth.uid();

  if calling_user_is_admin is not true then
    raise exception 'Unauthorized: Only administrators can delete users.';
  end if;

  -- 2. Get linked member_id before deleting the profile
  select member_id into linked_member_id 
  from profiles 
  where id = target_user_id;

  -- 3. Delete from auth.users (this will cascade to profiles and set member_id references to null)
  delete from auth.users where id = target_user_id;

  -- 4. If there was a linked member, delete it from members table
  if linked_member_id is not null then
    delete from members where id = linked_member_id;
  end if;
end;
$$;
