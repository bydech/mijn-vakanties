-- 1. Zorg dat trips.created_by standaard de ingelogde gebruiker pakt
alter table public.trips 
  alter column created_by set default auth.uid();

-- 2. Zorg dat de insert policy dit netjes toestaat
drop policy if exists "Authenticated users can create trips" on public.trips;
drop policy if exists "Users can create trips" on public.trips;

create policy "Authenticated users can create trips"
on public.trips for insert
to authenticated
with check (
  created_by = auth.uid()
);