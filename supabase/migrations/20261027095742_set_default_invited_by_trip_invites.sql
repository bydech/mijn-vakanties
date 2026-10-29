-- 1. Stel de default waarde in op de huidige ingelogde user
alter table public.trip_invites 
  alter column invited_by set default auth.uid();

-- 2. Zorg dat de insert policy dit toestaat
drop policy if exists "Authenticated users can create invites" on public.trip_invites;

create policy "Authenticated users can create invites"
on public.trip_invites for insert
to authenticated
with check (
  -- Controleer of invited_by overeenkomt met de verstuurder
  invited_by = auth.uid()
);