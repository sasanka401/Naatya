-- ============ MIGRATION V12 ============
-- FIX: "permission denied for table inventory / rehearsals / ..."
--
-- This error is NOT an RLS-policy problem. RLS decides WHICH ROWS you can see;
-- if a policy blocks you, you get an empty result, not an error. "permission
-- denied for table" means the Postgres ROLE (`authenticated` / `anon`) lacks
-- the basic table-level privilege (SELECT/INSERT/UPDATE/DELETE) entirely.
--
-- Supabase normally grants these automatically, but on some projects (or after
-- certain manual changes) the grant is missing on a few tables. This migration
-- re-grants privileges on every app table, so RLS policies can actually take
-- effect. Safe to run multiple times.

-- 1. Make sure both Supabase roles can reach the public schema at all.
grant usage on schema public to authenticated, anon;

-- 2. Grant table privileges. RLS still applies on top of these — these grants
--    just let the role "reach" the table; the policies decide the rest.
grant select, insert, update, delete on
  profiles,
  members,
  inventory,
  rehearsals,
  scripts,
  activity_log,
  productions,
  rehearsal_attendance,
  characters,
  notes,
  invite_codes
to authenticated;

-- 3. Sequences (needed for inserts on tables that use them).
grant usage, select on all sequences in schema public to authenticated;

-- 4. Tables that only exist after later migrations (v5/v9/v10). Guard each one
--    so this migration doesn't fail if a table isn't present yet.
do $$
begin
  if to_regclass('public.notifications') is not null then
    execute 'grant select, insert, update, delete on notifications to authenticated';
  end if;
  if to_regclass('public.script_room_invites') is not null then
    execute 'grant select, insert, update, delete on script_room_invites to authenticated';
  end if;
  if to_regclass('public.script_room_presence') is not null then
    execute 'grant select, insert, update, delete on script_room_presence to authenticated';
  end if;
  if to_regclass('public.script_room_otp') is not null then
    execute 'grant select, insert, update, delete on script_room_otp to authenticated';
  end if;
  if to_regclass('public.script_room_access') is not null then
    execute 'grant select, insert, update, delete on script_room_access to authenticated';
  end if;
  if to_regclass('public.security_alarms') is not null then
    execute 'grant select, insert, update, delete on security_alarms to authenticated';
  end if;
end $$;

-- 5. Make sure RLS is enabled on the two tables in the screenshot (so the
--    select policy below is the thing controlling access, not a missing one).
alter table inventory  enable row level security;
alter table rehearsals enable row level security;

-- 6. Re-assert the read policies in case they were dropped. "using (true)"
--    means any logged-in user can READ; writes are still Director-only via the
--    existing insert/update/delete policies from earlier migrations.
drop policy if exists "inventory_select" on inventory;
create policy "inventory_select" on inventory
  for select to authenticated using (true);

drop policy if exists "rehearsals_select" on rehearsals;
create policy "rehearsals_select" on rehearsals
  for select to authenticated using (true);
