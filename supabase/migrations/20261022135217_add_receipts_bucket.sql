-- 1. Private bucket 'receipts' aanmaken
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  5242880, -- 5 MB limiet
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

-- 2. INSERT: Deelnemers van de specifieke reis mogen uploaden
CREATE POLICY "Deelnemers kunnen bonnetjes uploaden"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND public.is_trip_member((storage.foldername(name))[1]::uuid)
);

-- 3. SELECT: Alle reisgenoten mogen het bonnetje bekijken
CREATE POLICY "Deelnemers kunnen bonnetjes inzien"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'receipts'
  AND public.is_trip_member((storage.foldername(name))[1]::uuid)
);

-- 4. DELETE: Deelnemers mogen bonnetjes verwijderen
CREATE POLICY "Deelnemers kunnen eigen geuploade bonnetjes verwijderen"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'receipts'
  AND public.is_trip_member((storage.foldername(name))[1]::uuid)
);