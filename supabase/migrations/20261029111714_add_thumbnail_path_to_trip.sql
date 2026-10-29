-- 1. Kolom toevoegen aan trips
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS thumbnail_path text NULL;

-- 2. Storage bucket aanmaken (public zodat covers direct laden)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trip-thumbnails',
  'trip-thumbnails',
  true,
  2097152, -- max 2MB (ruim voldoende na WebP-compressie)
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. RLS Storage policies voor trip-thumbnails
CREATE POLICY "Iedereen kan reis-thumbnails bekijken"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'trip-thumbnails');

CREATE POLICY "Ingelogde gebruikers kunnen reis-thumbnails uploaden"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'trip-thumbnails');

CREATE POLICY "Ingelogde gebruikers kunnen reis-thumbnails updaten"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'trip-thumbnails');

CREATE POLICY "Ingelogde gebruikers kunnen reis-thumbnails verwijderen"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'trip-thumbnails');