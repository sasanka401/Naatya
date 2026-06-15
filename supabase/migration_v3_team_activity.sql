/*
  Naatya — Migration v3: Team Management + Activity Feed
  ---------------------------------------------------------
  Run this in the Supabase SQL Editor after v1/v2 (schema.sql or
  migration_v2_rbac_scripts.sql) have already been applied.

  Adds:
    - profiles.member_id (link a login to a Cast & Crew record)
    - profiles update policy (Director can manage everyone's
      role + member link from the new "Team" page)
    - activity_log table (powers the real Dashboard activity feed)
*/

-- ============ PROFILES: link to a member record ============
alter table profiles add column if not exists member_id uuid references members(id) on delete set null;

drop policy if exists "profiles_update_director" on profiles;
create policy "profiles_update_director" on profiles
  for update to authenticated using (is_director()) with check (is_director());

-- ============ ACTIVITY LOG ============
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  created_at timestamptz default now()
);

alter table activity_log enable row level security;

drop policy if exists "activity_log_select" on activity_log;
drop policy if exists "activity_log_insert" on activity_log;

create policy "activity_log_select" on activity_log
  for select to authenticated using (true);

create policy "activity_log_insert" on activity_log
  for insert to authenticated with check (true);
