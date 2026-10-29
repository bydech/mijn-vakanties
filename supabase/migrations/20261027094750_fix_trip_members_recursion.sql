-- 1. Verwijder de recursieve policy
drop policy if exists "Members can view trip members" on public.trip_members;
drop policy if exists "Users can view trip members" on public.trip_members;

-- 2. Maak een helperfunctie met SECURITY DEFINER om de RLS-check te isoleren
create or replace function public.is_member_or_creator_of_trip(lookup_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.trips t
    where t.id = lookup_trip_id and t.created_by = auth.uid()
  )
  or exists (
    select 1 from public.trip_members tm
    where tm.trip_id = lookup_trip_id and tm.user_id = auth.uid()
  );
$$;

-- 3. Maak de niet-recursieve SELECT policy aan
create policy "Members and creators can view trip members"
on public.trip_members for select
to authenticated
using (
  -- Eigen record mag je altijd direct zien (snelste check, geen subquery)
  user_id = auth.uid()
  -- Alle andere groepsleden via de security definer functie (geen recursie)
  or public.is_member_or_creator_of_trip(trip_id)
);