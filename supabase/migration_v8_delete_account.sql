-- ============ MIGRATION V8 ============
-- DELETE OWN ACCOUNT SECURE FUNCTION

create or replace function delete_own_account()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  linked_member_id uuid;
begin
  -- Get linked member_id before deleting the profile
  select member_id into linked_member_id 
  from profiles 
  where id = auth.uid();

  -- Delete from auth.users (this will cascade to profiles and set member_id references to null)
  delete from auth.users where id = auth.uid();

  -- If there was a linked member, delete it from members table
  if linked_member_id is not null then
    delete from members where id = linked_member_id;
  end if;
end;
$$;
