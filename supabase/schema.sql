-- supabase/schema.sql

-- 1. Enable extensies
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TRIP ROLES ENUM
DO $$ BEGIN
    CREATE TYPE trip_role AS ENUM ('admin', 'member', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABEL: TRIPS (Reizen)
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    destination TEXT,
    start_date DATE,
    end_date DATE,
    currency TEXT NOT NULL DEFAULT 'EUR',
    budget NUMERIC(10, 2) DEFAULT 0.00,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABEL: TRIP_MEMBERS (Deelnemers & Rollen & Gasten)
CREATE TABLE IF NOT EXISTS public.trip_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Null indien het een 'schaduw-/gast-lid' is
    display_name TEXT NOT NULL,
    role trip_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_per_trip UNIQUE(trip_id, user_id)
);

-- 5. TABEL: EXPENSES (Uitgaven & Inkomsten)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    paid_by_member_id UUID NOT NULL REFERENCES public.trip_members(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    category TEXT NOT NULL DEFAULT 'Overig',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_income BOOLEAN NOT NULL DEFAULT FALSE, -- True voor vakantiepot/giften
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS receipt_path TEXT;

-- 6. TABEL: EXPENSE_SPLITS (Wie deelt mee in deze uitgave?)
CREATE TABLE IF NOT EXISTS public.expense_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.trip_members(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL, -- Het specifieke deel van deze persoon
    CONSTRAINT unique_expense_split UNIQUE(expense_id, member_id)
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- Oude policies opschonen
DROP POLICY IF EXISTS "Deelnemers kunnen bonnetjes uploaden" ON storage.objects;
DROP POLICY IF EXISTS "Deelnemers kunnen bonnetjes inzien" ON storage.objects;
DROP POLICY IF EXISTS "Deelnemers kunnen eigen geuploade bonnetjes verwijderen" ON storage.objects;

-- 7. TRIGGER: Eigenaar van de trip automatisch als 'admin' lid toevoegen
CREATE OR REPLACE FUNCTION public.handle_new_trip_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.trip_members (trip_id, user_id, display_name, role)
  VALUES (
    NEW.id,
    NEW.created_by,
    COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = NEW.created_by), 'Organisator'),
    'admin'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_trip_created ON public.trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_trip_owner();

-- 8. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;

-- Helper functie: Controleer of gebruiker deelnemer is van een reis
CREATE OR REPLACE FUNCTION public.is_trip_member(trip_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_members.trip_id = $1
    AND trip_members.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies voor TRIPS
DROP POLICY IF EXISTS "Deelnemers kunnen hun trips inzien" ON public.trips;
CREATE POLICY "Deelnemers kunnen hun trips inzien"
  ON public.trips FOR SELECT
  USING (created_by = auth.uid() OR public.is_trip_member(id));

DROP POLICY IF EXISTS "Gebruikers kunnen een trip aanmaken" ON public.trips;
CREATE POLICY "Gebruikers kunnen een trip aanmaken"
  ON public.trips FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Trip beheerder kan trip aanpassen" ON public.trips;
CREATE POLICY "Trip beheerder kan trip aanpassen"
  ON public.trips FOR UPDATE
  USING (
    created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.trip_members 
      WHERE trip_members.trip_id = trips.id 
      AND trip_members.user_id = auth.uid() 
      AND trip_members.role = 'admin'
    )
  );

