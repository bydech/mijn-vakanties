-- 1. Status enum voor uitnodigingen
DO $$ BEGIN
    CREATE TYPE trip_member_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Voeg kolommen toe aan trip_members
ALTER TABLE public.trip_members
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS status trip_member_status NOT NULL DEFAULT 'accepted',
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Zorg dat gastleden of directe makers op 'accepted' staan
UPDATE public.trip_members SET status = 'accepted' WHERE status IS NULL;

-- 4. RLS Beleid bijwerken zodat uitgenodigde gebruikers hun uitnodigingen kunnen inzien en updaten
DROP POLICY IF EXISTS "Gebruikers kunnen eigen uitnodigingen zien" ON public.trip_members;
CREATE POLICY "Gebruikers kunnen eigen uitnodigingen zien"
  ON public.trip_members FOR SELECT
  USING (
    user_id = auth.uid() 
    OR lower(email) = lower(auth.jwt()->>'email')
  );

DROP POLICY IF EXISTS "Gebruikers kunnen eigen uitnodiging accepteren of weigeren" ON public.trip_members;
CREATE POLICY "Gebruikers kunnen eigen uitnodiging accepteren of weigeren"
  ON public.trip_members FOR UPDATE
  USING (
    user_id = auth.uid() 
    OR lower(email) = lower(auth.jwt()->>'email')
  );