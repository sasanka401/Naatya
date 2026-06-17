-- ============ MIGRATION V13 ============
-- ADMIN ACCESS + EASY "PROMOTE TO DIRECTOR"
--
-- Two things this fixes:
--
-- (A) The screenshot error:
--     "new row violates row-level security policy for table script_room_invites"
--     That happens because generating an invite is Director-only
--     (RLS: with check (is_director())), and the logged-in user was still
--     PENDING (not an approved Director). The fix is to make that user an
--     approved Director (or use the admin account).
--
-- (B) Guarantee the admin@naatya.com account is a real, approved admin.
--
-- Safe to run multiple times.

-- 1. Make sure admin@naatya.com (if it already signed up) is fully promoted.
update profiles
set is_admin = true,
    role = 'Director',
    detailed_role = 'Director',
    approval_status = 'approved'
where lower(email) = 'admin@naatya.com';

-- 2. Helper you can call from the SQL editor to promote ANY user to an approved
--    Director by email. After this, that user can generate invite codes.
--
--    Usage (run in SQL editor, change the email):
--      select promote_to_director('talukdarsasanka348@gmail.com');
--
create or replace function promote_to_director(target_email text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update profiles
  set role = 'Director',
      detailed_role = 'Director',
      approval_status = 'approved'
  where lower(email) = lower(target_email);

  if not found then
    raise exception 'No profile found for email %', target_email;
  end if;
end;
$$;

-- 3. (Optional convenience) Promote the user from the screenshot right now so
--    they can generate invites. Comment this out or change the email as needed.
update profiles
set role = 'Director',
    detailed_role = 'Director',
    approval_status = 'approved'
where lower(email) = 'talukdarsasanka348@gmail.com';