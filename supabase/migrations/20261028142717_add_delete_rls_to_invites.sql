create policy "Leden kunnen uitnodigingen van hun trip intrekken"
  on public.trip_invites
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = trip_invites.trip_id
        and trip_members.user_id = auth.uid()
    )
  );