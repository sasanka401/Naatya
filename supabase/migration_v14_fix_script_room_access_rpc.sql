-- ============ MIGRATION V14 ============
-- FIX: "Access config failed: duplicate key value violates unique constraint" & RLS update errors.
--
-- When a cast member has been kicked, they have an existing row in `script_room_access`
-- with status = 'kicked'. If they try to rejoin using a new invite code:
-- 1. A plain INSERT fails due to the unique constraint on (production_id, profile_id).
-- 2. An UPDATE/UPSERT fails due to Row Level Security (RLS) policies which restrict
--    updates to Directors only.
--
-- This migration defines a secure `redeem_script_room_invite` function with `SECURITY DEFINER`.
-- It handles the entire verification, auto-casting, invite redemption, and access upsert
-- atomically and securely in a single database transaction under admin privileges.
--
-- Safe to run multiple times.

create or replace function redeem_script_room_invite(invite_code text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  invite_rec record;
  member_id_val uuid;
  existing_char_id uuid;
begin
  -- 1. Find the invite code details
  select * into invite_rec from script_room_invites
  where code = invite_code and used = false;
  
  if invite_rec.id is null then
    raise exception 'Invalid or already-used invite code';
  end if;

  if invite_rec.expires_at is not null and invite_rec.expires_at < now() then
    raise exception 'Invite code has expired';
  end if;

  -- 2. Mark the invite code as used
  update script_room_invites
  set used = true,
      used_by = auth.uid(),
      used_at = now()
  where id = invite_rec.id;

  -- 3. Get or create the member record
  select member_id into member_id_val from profiles where id = auth.uid();
  if member_id_val is null then
    insert into members (name, role, phone, status, production_id)
    values (coalesce(split_part(auth.jwt() ->> 'email', '@', 1), 'Cast Member'), 'Cast', '', 'Free', invite_rec.production_id)
    returning id into member_id_val;

    update profiles set member_id = member_id_val where id = auth.uid();
  end if;

  -- 4. Cast the member as the invited character role
  if invite_rec.role_name is not null and member_id_val is not null then
    select id into existing_char_id from characters
    where production_id = invite_rec.production_id and name = invite_rec.role_name
    limit 1;

    if existing_char_id is not null then
      update characters set member_id = member_id_val where id = existing_char_id;
    else
      insert into characters (production_id, name, description, member_id)
      values (invite_rec.production_id, invite_rec.role_name, 'Cast via Invite Code', member_id_val);
    end if;
  end if;

  -- 5. Upsert access permission (updates existing status from kicked to active, or inserts new)
  insert into script_room_access (production_id, profile_id, status)
  values (invite_rec.production_id, auth.uid(), 'active')
  on conflict (production_id, profile_id)
  do update set status = 'active', joined_at = now();

  return invite_rec.production_id::text;
end;
$$;

-- Grant execution permission to authenticated users
grant execute on function redeem_script_room_invite(text) to authenticated;

-- Grant delete policy for directors on script_room_access so they can permanently remove a user's access
drop policy if exists "access_delete" on script_room_access;
create policy "access_delete" on script_room_access for delete to authenticated using (is_director());
