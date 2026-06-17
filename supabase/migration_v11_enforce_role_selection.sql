-- ============ MIGRATION V11 ============
-- ENFORCE ROLE SELECTION ON SIGNUP (admin-safe version)
--
-- Problem: new users were landing with role = 'Cast' already set, which let
-- them slip past the mandatory role-selection screen. This migration makes
-- every new signup start UNASSIGNED (detailed_role = null) and in the
-- 'pending_onboarding' state, so the app always forces the role picker.
--
-- IMPORTANT: this version KEEPS the admin@naatya.com auto-creation logic from
-- migration v7, so the admin account still works.
--
-- Safe to run on an existing database. Run it AFTER v5, v6, and v7.

-- 1. Make sure the onboarding columns exist (in case v5 wasn't run).
alter table profiles add column if not exists detailed_role text;
alter table profiles add column if not exists approval_status text
  not null default 'pending_onboarding'
  check (approval_status in ('pending_onboarding', 'pending_admin', 'approved', 'rejected'));
alter table profiles add column if not exists portfolio_link text;
alter table profiles add column if not exists portfolio_path text;
alter table profiles add column if not exists is_admin boolean not null default false;

-- 2. Rewrite the new-user trigger:
--    - admin@naatya.com  -> auto Director + approved + is_admin (from v7)
--    - everyone else      -> unassigned (detailed_role null) + pending_onboarding
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  is_admin_user boolean;
begin
  is_admin_user := (lower(new.email) = 'admin@naatya.com');

  insert into public.profiles (id, email, role, detailed_role, approval_status, is_admin)
  values (
    new.id,
    new.email,
    case when is_admin_user then 'Director' else 'Cast' end,
    case when is_admin_user then 'Director' else null end,   -- null = forces role picker
    case when is_admin_user then 'approved' else 'pending_onboarding' end,
    is_admin_user
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 3. Make sure an existing admin@naatya.com is fully promoted (idempotent).
update profiles
set is_admin = true, role = 'Director', detailed_role = 'Director', approval_status = 'approved'
where lower(email) = 'admin@naatya.com';

-- 4. Fix any OTHER existing users who got auto-assigned 'Cast' but never chose
--    a role (detailed_role is null) and aren't admins. Push them back into
--    onboarding so they see the picker on next load.
update profiles
set approval_status = 'pending_onboarding'
where detailed_role is null
  and is_admin = false
  and approval_status = 'approved';