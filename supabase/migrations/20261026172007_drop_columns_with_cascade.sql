alter table public.trip_members
  drop column if exists status cascade,
  drop column if exists invited_by cascade,
  drop column if exists email cascade;