-- Verwijder overtollige kolommen uit trip_members
alter table public.trip_members
  drop column if exists status,
  drop column if exists invited_by,
  drop column if exists email;