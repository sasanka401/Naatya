-- ============ MIGRATION V9 ============
-- ADVANCED ONBOARDING, DYNAMIC WATERMARKING & DRAFT VERSIONING EXTENSIONS

-- 1. Add columns to script_room_invites
alter table script_room_invites add column if not exists role_name text;
alter table script_room_invites add column if not exists expires_at timestamptz default (now() + interval '24 hours');

-- 2. Add column to scripts
alter table scripts add column if not exists version integer not null default 1;

-- 3. If there are existing invites, populate their expires_at
update script_room_invites set expires_at = created_at + interval '24 hours' where expires_at is null;

-- 4. Add foreign key from scripts(uploaded_by) to profiles(id) to allow easy joins
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'scripts_uploaded_by_profiles_fkey'
  ) then
    alter table scripts
    add constraint scripts_uploaded_by_profiles_fkey
    foreign key (uploaded_by) references profiles(id)
    on delete set null;
  end if;
end $$;

