-- Zorg dat leden en geauthenticeerde gebruikers de leden van hun reizen kunnen inzien
drop policy if exists "Members can view trip members" on public.trip_members;

create policy "Members can view trip members"
on public.trip_members for select
to authenticated
using (
  -- Je mag leden zien als je zelf lid bent van dezelfde reis, óf als je de maker bent van de reis
  exists (
    select 1 from public.trip_members tm
    where tm.trip_id = trip_members.trip_id
      and tm.user_id = auth.uid()
  )
  or exists (
    select 1 from public.trips t
    where t.id = trip_members.trip_id
      and t.created_by = auth.uid()
  )
);