-- 1. Maak de categorieën tabel aan
create table public.trip_categories (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade not null,
  name text not null,
  icon text not null default 'i-lucide-tag',
  color text not null default '#3b82f6',
  created_at timestamptz default now()
);

-- Index voor snelle queries per reis
create index idx_trip_categories_trip_id on public.trip_categories(trip_id);

-- RLS inschakelen
alter table public.trip_categories enable row level security;

create policy "Gebruikers kunnen categorieën van eigen reizen beheren"
  on public.trip_categories
  for all
  using (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = trip_categories.trip_id
      and trip_members.user_id = auth.uid()
    )
  );

-- 2. Koppel category_id aan expenses
alter table public.expenses
  add column category_id uuid references public.trip_categories(id) on delete set null;

create index idx_expenses_category_id on public.expenses(category_id);

-- 3. Database functie om standaard categorieën aan te maken bij een nieuwe reis
create or replace function public.seed_default_trip_categories(target_trip_id uuid)
returns void as $$
begin
  insert into public.trip_categories (trip_id, name, icon, color) values
    (target_trip_id, 'Eten & Drinken', 'i-lucide-utensils', '#f97316'),
    (target_trip_id, 'Boodschappen', 'i-lucide-shopping-cart', '#10b981'),
    (target_trip_id, 'Vervoer', 'i-lucide-car', '#3b82f6'),
    (target_trip_id, 'Verblijf', 'i-lucide-bed', '#8b5cf6'),
    (target_trip_id, 'Activiteiten', 'i-lucide-ticket', '#ec4899'),
    (target_trip_id, 'Winkelen', 'i-lucide-shopping-bag', '#eab308'),
    (target_trip_id, 'Overig', 'i-lucide-receipt', '#6b7280');
end;
$$ language plpgsql security definer;

-- 4. Trigger die direct standaard categorieën toevoegt bij het aanmaken van een reis
create or replace function public.on_trip_created_seed_categories()
returns trigger as $$
begin
  perform public.seed_default_trip_categories(new.id);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger tr_seed_trip_categories
  after insert on public.trips
  for each row execute function public.on_trip_created_seed_categories();