-- 1. Maak de trip_invites tabel aan
create table if not exists public.trip_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'expired')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone default (now() + interval '14 days') not null
);

-- Index voor snelle lookups op e-mail en status in de layout/inbox
create index if not exists idx_trip_invites_email_status on public.trip_invites(lower(email), status);

-- 2. RLS Inschakelen
alter table public.trip_invites enable row level security;

-- Inzien: alleen als jij de afzender bent óf de ontvanger (op basis van je e-mailadres)
drop policy if exists "Users can view invites they sent or received" on public.trip_invites;
create policy "Users can view invites they sent or received"
on public.trip_invites for select
to authenticated
using (
  invited_by = auth.uid() 
  or lower(email) = lower(auth.jwt()->>'email')
);

-- Versturen: geauthenticeerde gebruikers
drop policy if exists "Authenticated users can create invites" on public.trip_invites;
create policy "Authenticated users can create invites"
on public.trip_invites for insert
to authenticated
with check (
  invited_by = auth.uid()
);

-- Updaten (weigeren): ontvanger of afzender
drop policy if exists "Users can update their received or sent invites" on public.trip_invites;
create policy "Users can update their received or sent invites"
on public.trip_invites for update
to authenticated
using (
  invited_by = auth.uid() 
  or lower(email) = lower(auth.jwt()->>'email')
);

-- 3. Databasefunctie voor atomair accepteren (maakt direct het lid aan)
create or replace function public.accept_trip_invite(invite_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_invite record;
  v_user_email text;
  v_user_name text;
begin
  -- Haal de huidige geauthenticeerde gebruiker op
  v_user_email := lower(auth.jwt()->>'email');
  v_user_name := coalesce(auth.jwt()->'user_metadata'->>'full_name', split_part(v_user_email, '@', 1));

  -- Haal de uitnodiging op
  select * into v_invite 
  from public.trip_invites 
  where id = invite_id and status = 'pending';

  if not found then
    raise exception 'Uitnodiging niet gevonden of al verwerkt.';
  end if;

  -- Controleer of de uitnodiging echt voor deze gebruiker bedoeld is
  if lower(v_invite.email) <> v_user_email then
    raise exception 'Deze uitnodiging is niet gericht aan jouw account.';
  end if;

  -- 1. Voeg toe aan trip_members
  insert into public.trip_members (trip_id, user_id, display_name, role)
  values (v_invite.trip_id, auth.uid(), v_user_name, v_invite.role)
  on conflict do nothing;

  -- 2. Zet status van de invite op accepted
  update public.trip_invites
  set status = 'accepted'
  where id = invite_id;

  return json_build_object('success', true, 'trip_id', v_invite.trip_id);
end;
$$;