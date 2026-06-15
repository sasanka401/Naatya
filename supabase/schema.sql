/*
  Naatya — Database Schema (v2)
  ------------------------------
  Run this entire file in the Supabase SQL Editor
  (Dashboard → SQL Editor → New Query → paste → Run)

  Creates:
    - profiles table (links auth users to a role: Director / Cast)
    - members table (Cast & Crew)
    - inventory table (Props)
    - rehearsals table (Schedule)
    - scripts table (Script Library metadata)
    - storage bucket "scripts" (private file storage)

  Role-Based Access:
    - Anyone signed in (Cast or Director) can VIEW everything.
    - Only Director can ADD / EDIT / DELETE members, inventory,
      rehearsals, and scripts.

  NOTE: If you already ran the v1 schema (members/inventory/rehearsals
  only), use supabase/migration_v2_rbac_scripts.sql instead — it adds
  the new pieces without re-creating tables you already have.
*/

-- ============ PROFILES ============
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'Cast' check (role in ('Director', 'Cast')),
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "profiles_select" on profiles
  for select to authenticated using (true);

-- Automatically create a profile row whenever a new user signs up
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'Cast');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Helper: is the current user a Director?
create or replace function is_director()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'Director'
  );
$$;

-- ============ MEMBERS ============
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  phone text not null,
  status text not null default 'Free' check (status in ('Free', 'Busy', 'On Leave')),
  created_at timestamptz default now()
);

alter table members enable row level security;

create policy "members_select" on members
  for select to authenticated using (true);

create policy "members_insert" on members
  for insert to authenticated with check (is_director());

create policy "members_update" on members
  for update to authenticated using (is_director()) with check (is_director());

create policy "members_delete" on members
  for delete to authenticated using (is_director());

-- Link profiles to a Cast & Crew record (must be after members exists)
alter table profiles add column if not exists member_id uuid references members(id) on delete set null;

drop policy if exists "profiles_update_director" on profiles;
create policy "profiles_update_director" on profiles
  for update to authenticated using (is_director()) with check (is_director());

-- ============ INVENTORY (PROPS) ============
create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quantity integer not null default 1 check (quantity >= 0),
  status text not null default 'Available' check (status in ('Available', 'In Use', 'Damaged')),
  created_at timestamptz default now()
);

alter table inventory enable row level security;

create policy "inventory_select" on inventory
  for select to authenticated using (true);

create policy "inventory_insert" on inventory
  for insert to authenticated with check (is_director());

create policy "inventory_update" on inventory
  for update to authenticated using (is_director()) with check (is_director());

create policy "inventory_delete" on inventory
  for delete to authenticated using (is_director());

-- ============ REHEARSALS ============
create table if not exists rehearsals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  rehearsal_date date not null,
  rehearsal_time time not null,
  venue text not null,
  created_at timestamptz default now()
);

alter table rehearsals enable row level security;

create policy "rehearsals_select" on rehearsals
  for select to authenticated using (true);

create policy "rehearsals_insert" on rehearsals
  for insert to authenticated with check (is_director());

create policy "rehearsals_update" on rehearsals
  for update to authenticated using (is_director()) with check (is_director());

create policy "rehearsals_delete" on rehearsals
  for delete to authenticated using (is_director());

-- ============ SCRIPTS (metadata) ============
create table if not exists scripts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  storage_path text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table scripts enable row level security;

create policy "scripts_select" on scripts
  for select to authenticated using (true);

create policy "scripts_insert" on scripts
  for insert to authenticated with check (is_director());

create policy "scripts_update" on scripts
  for update to authenticated using (is_director()) with check (is_director());

create policy "scripts_delete" on scripts
  for delete to authenticated using (is_director());

-- ============ SCRIPTS (file storage bucket) ============
insert into storage.buckets (id, name, public)
values ('scripts', 'scripts', false)
on conflict (id) do nothing;

create policy "scripts_storage_select" on storage.objects
  for select to authenticated using (bucket_id = 'scripts');

create policy "scripts_storage_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'scripts' and is_director());

create policy "scripts_storage_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'scripts' and is_director());

-- ============ ACTIVITY LOG ============
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  created_at timestamptz default now()
);

alter table activity_log enable row level security;

create policy "activity_log_select" on activity_log
  for select to authenticated using (true);

create policy "activity_log_insert" on activity_log
  for insert to authenticated with check (true);

-- ============ SEED DATA ============
insert into members (name, role, phone, status) values
  ('Arjun Mehta',   'Director',           '+91 98765 43210', 'Free'),
  ('Priya Sharma',  'Lead Actress',       '+91 87654 32109', 'Free'),
  ('Vikram Singh',  'Stage Manager',      '+91 76543 21098', 'Busy'),
  ('Neha Gupta',    'Costume Designer',   '+91 65432 10987', 'Free'),
  ('Rahul Joshi',   'Lighting Technician','+91 54321 09876', 'On Leave'),
  ('Ananya Reddy',  'Supporting Actress', '+91 43210 98765', 'Free'),
  ('Karan Patel',   'Sound Engineer',     '+91 32109 87654', 'Busy'),
  ('Deepika Nair',  'Makeup Artist',      '+91 21098 76543', 'Free');

insert into inventory (name, quantity, status) values
  ('Wooden Throne',       2, 'Available'),
  ('Silk Curtain (Red)',  4, 'Available'),
  ('Antique Sword Set',   6, 'In Use'),
  ('Golden Crown',        1, 'Damaged'),
  ('Crystal Chandelier',  2, 'Available'),
  ('Royal Scepter',       3, 'In Use'),
  ('Velvet Carpet (Blue)',1, 'Available'),
  ('Candelabra Set',      5, 'Damaged'),
  ('Wooden Shield',       4, 'Available'),
  ('Scroll Props',        8, 'In Use');

insert into rehearsals (title, rehearsal_date, rehearsal_time, venue) values
  ('Act I – The Opening',    '2026-06-15', '10:00', 'Main Stage'),
  ('Act II – The Conflict',  '2026-06-18', '14:00', 'Rehearsal Hall B'),
  ('Act III – The Banquet',  '2026-06-22', '11:00', 'Main Stage'),
  ('Dance Sequence Practice','2026-06-24', '09:00', 'Dance Studio'),
  ('Full Run-Through',       '2026-06-25', '09:00', 'Main Stage'),
  ('Costume Fitting Session','2026-06-27', '15:00', 'Costume Room'),
  ('Sound & Lighting Check', '2026-06-28', '16:00', 'Main Stage'),
  ('Dress Rehearsal',        '2026-06-30', '10:00', 'Main Stage');


-- ============================================================
-- v4 FEATURES (productions, attendance, characters, notes,
-- invite codes). Included here so a fresh install gets it all.
-- ============================================================

    - invite_codes + redeem_invite()  (Invite-only signup, #6)
*/

-- ============ PRODUCTIONS (#9) ============
create table if not exists productions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

alter table productions enable row level security;

drop policy if exists "productions_select" on productions;
drop policy if exists "productions_insert" on productions;
drop policy if exists "productions_update" on productions;
drop policy if exists "productions_delete" on productions;

create policy "productions_select" on productions
  for select to authenticated using (true);
create policy "productions_insert" on productions
  for insert to authenticated with check (is_director());
create policy "productions_update" on productions
  for update to authenticated using (is_director()) with check (is_director());
create policy "productions_delete" on productions
  for delete to authenticated using (is_director());

-- Add production_id to the core tables (nullable so old rows keep working)
alter table members    add column if not exists production_id uuid references productions(id) on delete cascade;
alter table inventory  add column if not exists production_id uuid references productions(id) on delete cascade;
alter table rehearsals add column if not exists production_id uuid references productions(id) on delete cascade;
alter table scripts    add column if not exists production_id uuid references productions(id) on delete cascade;

-- Seed a default production and attach all existing rows to it
do $$
declare
  default_prod uuid;
begin
  select id into default_prod from productions limit 1;
  if default_prod is null then
    insert into productions (name) values ('Main Production') returning id into default_prod;
  end if;

  update members    set production_id = default_prod where production_id is null;
  update inventory  set production_id = default_prod where production_id is null;
  update rehearsals set production_id = default_prod where production_id is null;
  update scripts    set production_id = default_prod where production_id is null;
end $$;

-- Let a user update the member record linked to their own profile
-- (so Cast members can change their own availability status)
drop policy if exists "members_update_own" on members;
create policy "members_update_own" on members
  for update to authenticated
  using (id = (select member_id from profiles where id = auth.uid()))
  with check (id = (select member_id from profiles where id = auth.uid()));

-- ============ REHEARSAL ATTENDANCE / RSVP (#2) ============
create table if not exists rehearsal_attendance (
  id uuid primary key default gen_random_uuid(),
  rehearsal_id uuid not null references rehearsals(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'Attending' check (status in ('Attending', 'Not Attending', 'Maybe')),
  created_at timestamptz default now(),
  unique (rehearsal_id, profile_id)
);

alter table rehearsal_attendance enable row level security;

drop policy if exists "attendance_select" on rehearsal_attendance;
drop policy if exists "attendance_upsert" on rehearsal_attendance;
drop policy if exists "attendance_update" on rehearsal_attendance;
drop policy if exists "attendance_delete" on rehearsal_attendance;

create policy "attendance_select" on rehearsal_attendance
  for select to authenticated using (true);
-- Each user manages only their own RSVP
create policy "attendance_upsert" on rehearsal_attendance
  for insert to authenticated with check (profile_id = auth.uid());
create policy "attendance_update" on rehearsal_attendance
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "attendance_delete" on rehearsal_attendance
  for delete to authenticated using (profile_id = auth.uid());

-- ============ CHARACTERS (#5) ============
create table if not exists characters (
  id uuid primary key default gen_random_uuid(),
  production_id uuid references productions(id) on delete cascade,
  name text not null,
  description text,
  member_id uuid references members(id) on delete set null,
  created_at timestamptz default now()
);

alter table characters enable row level security;

drop policy if exists "characters_select" on characters;
drop policy if exists "characters_insert" on characters;
drop policy if exists "characters_update" on characters;
drop policy if exists "characters_delete" on characters;

create policy "characters_select" on characters
  for select to authenticated using (true);
create policy "characters_insert" on characters
  for insert to authenticated with check (is_director());
create policy "characters_update" on characters
  for update to authenticated using (is_director()) with check (is_director());
create policy "characters_delete" on characters
  for delete to authenticated using (is_director());

-- Link a prop to a specific act/scene (#5)
alter table inventory add column if not exists act_scene text;

-- ============ NOTES / COMMENTS (#7) ============
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('member', 'prop', 'rehearsal')),
  entity_id uuid not null,
  body text not null,
  author_email text,
  created_at timestamptz default now()
);

alter table notes enable row level security;

drop policy if exists "notes_select" on notes;
drop policy if exists "notes_insert" on notes;
drop policy if exists "notes_delete" on notes;

create policy "notes_select" on notes
  for select to authenticated using (true);
create policy "notes_insert" on notes
  for insert to authenticated with check (true);
create policy "notes_delete" on notes
  for delete to authenticated using (is_director());

-- ============ INVITE-ONLY SIGNUP (#6) ============
create table if not exists invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  role text not null default 'Cast' check (role in ('Director', 'Cast')),
  used boolean not null default false,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz default now()
);

alter table invite_codes enable row level security;

drop policy if exists "invite_select_anon" on invite_codes;
drop policy if exists "invite_manage_director" on invite_codes;

-- Anyone (even not-yet-signed-up) can check whether a code is valid
create policy "invite_select_anon" on invite_codes
  for select to anon, authenticated using (true);
-- Only a Director can create/delete invite codes
create policy "invite_manage_director" on invite_codes
  for all to authenticated using (is_director()) with check (is_director());

/*
  redeem_invite(): called by a freshly-signed-up user. Validates the
  code, applies its role to the caller's profile, and marks the code
  used. SECURITY DEFINER lets it bypass the Director-only profile
  update policy for this one controlled action.
*/
create or replace function redeem_invite(invite_code text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  rec invite_codes%rowtype;
begin
  select * into rec from invite_codes where code = invite_code and used = false;
  if rec.id is null then
    raise exception 'Invalid or already-used invite code';
  end if;

  update profiles set role = rec.role where id = auth.uid();
  update invite_codes
    set used = true, used_by = auth.uid(), used_at = now()
    where id = rec.id;

  return rec.role;
end;
$$;

-- Seed one Director invite code to bootstrap the first admin.
-- (Use this code when you first sign up, then you're a Director.)
insert into invite_codes (code, role)
values ('DIRECTOR-START', 'Director')
on conflict (code) do nothing;
