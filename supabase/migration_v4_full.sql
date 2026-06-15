/*
  Naatya — Migration v4: Full Feature Set
  ----------------------------------------
  Run this in the Supabase SQL Editor AFTER schema.sql (or after the
  v2 + v3 migrations) have been applied.

  Adds:
    - productions            (Multiple Productions support, #9)
    - production_id columns   on members, inventory, rehearsals, scripts
    - rehearsal_attendance    (RSVP, #2)
    - characters              (Role/Character assignment, #5)
    - inventory.act_scene     (link props to a scene, #5)
    - notes                   (internal notes/comments, #7)
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
