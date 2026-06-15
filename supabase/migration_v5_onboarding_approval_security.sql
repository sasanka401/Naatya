-- ============ MIGRATION V5 ============
-- ONBOARDING, APPROVALS, & SCRIPT ROOM SECURITY

-- 1. Alter profiles table
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add column if not exists detailed_role text;
alter table profiles add column if not exists approval_status text not null default 'pending_onboarding' check (approval_status in ('pending_onboarding', 'pending_admin', 'approved', 'rejected'));
alter table profiles add column if not exists portfolio_link text;
alter table profiles add column if not exists portfolio_path text;
alter table profiles add column if not exists is_admin boolean not null default false;

-- 2. Update new user trigger function to default to onboarding
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, approval_status, is_admin)
  values (
    new.id,
    new.email,
    'Cast',
    'pending_onboarding',
    false
  );
  return new;
end;
$$;

-- Helper to bootstrap first user as admin (run this after signing up your first user)
-- update profiles set is_admin = true where email = (select email from profiles order by created_at asc limit 1);

-- 3. Redefine security check helpers
create or replace function is_director()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from profiles 
    where id = auth.uid() 
      and (detailed_role = 'Director' or role = 'Director')
      and approval_status = 'approved'
  );
$$;

create or replace function is_writer()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from profiles 
    where id = auth.uid() 
      and detailed_role = 'Writer'
      and approval_status = 'approved'
  );
$$;

create or replace function is_editor()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from profiles 
    where id = auth.uid() 
      and (detailed_role in ('Director', 'Writer') or role = 'Director')
      and approval_status = 'approved'
  );
$$;

-- 4. Update scripts table policy to use is_editor()
drop policy if exists "scripts_insert" on scripts;
create policy "scripts_insert" on scripts
  for insert to authenticated with check (is_editor());

drop policy if exists "scripts_update" on scripts;
create policy "scripts_update" on scripts
  for update to authenticated using (is_editor()) with check (is_editor());

drop policy if exists "scripts_delete" on scripts;
create policy "scripts_delete" on scripts
  for delete to authenticated using (is_editor());


-- 5. Create Security & Invite Tables

-- script_room_invites (Phase 1 unique codes)
create table if not exists script_room_invites (
  id uuid primary key default gen_random_uuid(),
  production_id uuid references productions(id) on delete cascade,
  code text not null unique,
  recipient_email text not null,
  used boolean not null default false,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz default now()
);

alter table script_room_invites enable row level security;
drop policy if exists "invites_select" on script_room_invites;
drop policy if exists "invites_insert" on script_room_invites;
drop policy if exists "invites_delete" on script_room_invites;

create policy "invites_select" on script_room_invites for select to authenticated using (true);
create policy "invites_insert" on script_room_invites for insert to authenticated with check (is_director());
create policy "invites_delete" on script_room_invites for delete to authenticated using (is_director());


-- script_room_access (Who has unlocked / been kicked)
create table if not exists script_room_access (
  id uuid primary key default gen_random_uuid(),
  production_id uuid references productions(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'kicked')),
  joined_at timestamptz default now(),
  unique(production_id, profile_id)
);

alter table script_room_access enable row level security;
drop policy if exists "access_select" on script_room_access;
drop policy if exists "access_insert" on script_room_access;
drop policy if exists "access_update" on script_room_access;

create policy "access_select" on script_room_access for select to authenticated using (true);
create policy "access_insert" on script_room_access for insert to authenticated with check (true);
create policy "access_update" on script_room_access for update to authenticated using (is_director()) with check (is_director());


-- script_room_otp (Phase 2 subsequent logins)
create table if not exists script_room_otp (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  production_id uuid references productions(id) on delete cascade,
  code text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

alter table script_room_otp enable row level security;
drop policy if exists "otp_all" on script_room_otp;
create policy "otp_all" on script_room_otp for all to authenticated using (true) with check (true);


-- script_room_presence (Phase 3 live surveillance)
create table if not exists script_room_presence (
  id uuid primary key default gen_random_uuid(),
  production_id uuid references productions(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  entered_at timestamptz default now(),
  last_active timestamptz default now(),
  unique(production_id, profile_id)
);

alter table script_room_presence enable row level security;
drop policy if exists "presence_select" on script_room_presence;
drop policy if exists "presence_insert" on script_room_presence;
drop policy if exists "presence_delete" on script_room_presence;

create policy "presence_select" on script_room_presence for select to authenticated using (true);
create policy "presence_insert" on script_room_presence for insert to authenticated with check (profile_id = auth.uid());
create policy "presence_delete" on script_room_presence for delete to authenticated using (profile_id = auth.uid() or is_director());


-- security_alarms (Screenshot anti-leak triggers)
create table if not exists security_alarms (
  id uuid primary key default gen_random_uuid(),
  production_id uuid references productions(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  user_email text not null,
  action_attempted text not null,
  created_at timestamptz default now()
);

alter table security_alarms enable row level security;
drop policy if exists "alarms_select" on security_alarms;
drop policy if exists "alarms_insert" on security_alarms;

create policy "alarms_select" on security_alarms for select to authenticated using (true);
create policy "alarms_insert" on security_alarms for insert to authenticated with check (profile_id = auth.uid());


-- 6. Setup storage bucket portfolios
insert into storage.buckets (id, name, public)
values ('portfolios', 'portfolios', true)
on conflict (id) do nothing;

drop policy if exists "portfolios_select" on storage.objects;
drop policy if exists "portfolios_insert" on storage.objects;

create policy "portfolios_select" on storage.objects
  for select to authenticated using (bucket_id = 'portfolios');

create policy "portfolios_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'portfolios');
