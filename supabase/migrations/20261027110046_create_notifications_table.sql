-- 1. Maak de notifications tabel aan
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null default 'general',
  title text not null,
  message text not null,
  link text,
  data jsonb default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 2. RLS Inschakelen
alter table public.notifications enable row level security;

-- 3. RLS Policies
create policy "Users can view their own notifications"
on public.notifications for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can update their own notifications (e.g. mark as read)"
on public.notifications for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own notifications"
on public.notifications for delete
to authenticated
using (auth.uid() = user_id);

-- System/Authenticated insert policy
create policy "Users or system can create notifications"
on public.notifications for insert
to authenticated
with check (true);