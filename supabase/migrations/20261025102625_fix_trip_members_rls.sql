-- 1. Helper functie om na te gaan of de huidige gebruiker een admin is van de reis
CREATE OR REPLACE FUNCTION public.is_trip_admin(trip_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_members.trip_id = $1
    AND trip_members.user_id = auth.uid()
    AND trip_members.role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = $1
    AND trips.created_by = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Beleid opschonen
DROP POLICY IF EXISTS "Trip beheerder kan leden toevoegen" ON public.trip_members;
DROP POLICY IF EXISTS "Gebruikers kunnen zichzelf toevoegen via link" ON public.trip_members;
DROP POLICY IF EXISTS "Trip beheerder kan leden verwijderen" ON public.trip_members;
DROP POLICY IF EXISTS "Leden en genodigden kunnen record inzien" ON public.trip_members;
DROP POLICY IF EXISTS "Deelnemers kunnen leden zien" ON public.trip_members;

-- 3. INSERT POLICY:
-- Beheerders van de reis mogen nieuwe leden of gasten inserten, 
-- OF een ingelogde gebruiker mag zichzelf via de join-link toevoegen.
CREATE POLICY "Leden toevoegen aan trip"
ON public.trip_members FOR INSERT TO authenticated
WITH CHECK (
  public.is_trip_admin(trip_id)
  OR auth.uid() = user_id
);

-- 4. SELECT POLICY:
-- Zichtbaar voor alle deelnemers van dezelfde reis, 
-- OF voor iemand wiens e-mailadres is uitgenodigd (zodat de uitnodigingsbanner werkt).
CREATE POLICY "Leden inzien van trip"
ON public.trip_members FOR SELECT TO authenticated
USING (
  public.is_trip_member(trip_id)
  OR user_id = auth.uid()
  OR lower(email) = lower(auth.jwt()->>'email')
);

-- 5. UPDATE POLICY:
-- Beheerders mogen leden updaten, EN uitgenodigde gebruikers mogen hun eigen invite accepteren/wijzigen.
DROP POLICY IF EXISTS "Gebruikers kunnen eigen uitnodiging accepteren of weigeren" ON public.trip_members;
CREATE POLICY "Leden en uitnodigingen updaten"
ON public.trip_members FOR UPDATE TO authenticated
USING (
  public.is_trip_admin(trip_id)
  OR user_id = auth.uid()
  OR lower(email) = lower(auth.jwt()->>'email')
)
WITH CHECK (
  public.is_trip_admin(trip_id)
  OR user_id = auth.uid()
  OR lower(email) = lower(auth.jwt()->>'email')
);

-- 6. DELETE POLICY:
-- Alleen de beheerder van de reis mag leden verwijderen (of iemand mag zichzelf uitschrijven).
CREATE POLICY "Leden verwijderen uit trip"
ON public.trip_members FOR DELETE TO authenticated
USING (
  public.is_trip_admin(trip_id)
  OR user_id = auth.uid()
);