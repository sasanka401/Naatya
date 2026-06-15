/*
  Naatya — Migration v2: RBAC + Script Library
  ---------------------------------------------
  Run this if you ALREADY ran the original schema.sql (which created
  members, inventory, rehearsals without roles). This migration adds:
    - profiles table (Director / Cast roles)
    - is_director() helper + auto-profile trigger on signup
    - tightens members/inventory/rehearsals write access to Director only
    - scripts table + private storage bucket for the Script Library

  Run this entire file in the Supabase SQL Editor.
*/

-- ============ PROFILES ============
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'Cast' check (role in ('Director', 'Cast')),
  created_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles
  for select to authenticated using (true);

-- Backfill profiles for any users who signed up before this migration
insert into profiles (id, email, role)
select id, email, 'Cast' from auth.users
on conflict (id) do nothing;

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

-- ============ TIGHTEN EXISTING POLICIES (Director-only writes) ============
drop policy if exists "members_insert" on members;
drop policy if exists "members_update" on members;
drop policy if exists "members_delete" on members;

create policy "members_insert" on members
  for insert to authenticated with check (is_director());
create policy "members_update" on members
  for update to authenticated using (is_director()) with check (is_director());
create policy "members_delete" on members
  for delete to authenticated using (is_director());

drop policy if exists "inventory_insert" on inventory;
drop policy if exists "inventory_update" on inventory;
drop policy if exists "inventory_delete" on inventory;

create policy "inventory_insert" on inventory
  for insert to authenticated with check (is_director());
create policy "inventory_update" on inventory
  for update to authenticated using (is_director()) with check (is_director());
create policy "inventory_delete" on inventory
  for delete to authenticated using (is_director());

drop policy if exists "rehearsals_insert" on rehearsals;
drop policy if exists "rehearsals_update" on rehearsals;
drop policy if exists "rehearsals_delete" on rehearsals;

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

drop policy if exists "scripts_select" on scripts;
drop policy if exists "scripts_insert" on scripts;
drop policy if exists "scripts_update" on scripts;
drop policy if exists "scripts_delete" on scripts;

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

drop policy if exists "scripts_storage_select" on storage.objects;
drop policy if exists "scripts_storage_insert" on storage.objects;
drop policy if exists "scripts_storage_delete" on storage.objects;

create policy "scripts_storage_select" on storage.objects
  for select to authenticated using (bucket_id = 'scripts');
create policy "scripts_storage_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'scripts' and is_director());
create policy "scripts_storage_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'scripts' and is_director());

-- ============ MAKE YOURSELF DIRECTOR ============
-- Replace the email below with the account you log in with, then run
-- this line separately:
--
-- update profiles set role = 'Director' where email = 'your@email.com';
