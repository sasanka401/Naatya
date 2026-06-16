-- ============ MIGRATION V10 ============
-- IN-APP NOTIFICATION SYSTEM FOR NAATYA

-- 1. Create notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz default now()
);

-- 2. Enable Row-Level Security
alter table public.notifications enable row level security;

-- 3. RLS Policies
drop policy if exists "notifications_select" on public.notifications;
drop policy if exists "notifications_insert" on public.notifications;
drop policy if exists "notifications_update" on public.notifications;
drop policy if exists "notifications_delete" on public.notifications;

-- Allow users to select their own notifications
create policy "notifications_select" on public.notifications
  for select to authenticated
  using (profile_id = auth.uid());

-- Allow anyone authenticated to insert notifications (so directors can send to cast)
create policy "notifications_insert" on public.notifications
  for insert to authenticated
  with check (true);

-- Allow users to update their own notifications (e.g. mark as read)
create policy "notifications_update" on public.notifications
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Allow users to delete their own notifications
create policy "notifications_delete" on public.notifications
  for delete to authenticated
  using (profile_id = auth.uid());
