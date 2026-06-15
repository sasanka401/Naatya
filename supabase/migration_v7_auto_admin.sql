-- ============ MIGRATION V7 ============
-- AUTOMATIC ADMIN FOR admin@naatya.com

-- 1. Update the new user trigger function to automatically approve admin@naatya.com
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  is_admin_user boolean;
begin
  is_admin_user := (lower(new.email) = 'admin@naatya.com');
  
  insert into public.profiles (id, email, role, approval_status, is_admin)
  values (
    new.id,
    new.email,
    case when is_admin_user then 'Director' else 'Cast' end,
    case when is_admin_user then 'approved' else 'pending_onboarding' end,
    is_admin_user
  );
  return new;
end;
$$;

-- 2. If admin@naatya.com already exists, update its profile to be admin
update profiles 
set 
  is_admin = true, 
  role = 'Director', 
  approval_status = 'approved' 
where lower(email) = 'admin@naatya.com';
