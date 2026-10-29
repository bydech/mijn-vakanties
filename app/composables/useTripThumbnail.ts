// composables/useTripThumbnail.ts
export function useTripThumbnail() {
  const supabase = useSupabaseClient();
  const { compressImage } = useReceiptAttachment();
  const isUploading = ref(false);

  /**
   * Comprimeert en uploadt een reis-thumbnail naar de 'trip-thumbnails' bucket
   */
  async function uploadThumbnail(file: File, tripId: string): Promise<string | null> {
    isUploading.value = true;
    try {
      // Schaal naar landscape formaat en comprimeer naar WebP (~40-60KB)
      const compressed = await compressImage(file, 1000, 600, 0.4);
      const filePath = `${tripId}/${Date.now()}.webp`;

      const { data, error } = await supabase.storage.from("trip-thumbnails").upload(filePath, compressed, {
        cacheControl: "86400",
        contentType: "image/webp",
        upsert: true,
      });

      if (error) throw error;
      return data.path;
    } catch (err) {
      console.error("Fout bij uploaden van thumbnail:", err);
      return null;
    } finally {
      isUploading.value = false;
    }
  }

  /**
   * Verwijdert een thumbnail uit storage
   */
  async function deleteThumbnail(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage.from("trip-thumbnails").remove([filePath]);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Fout bij verwijderen van thumbnail:", err);
      return false;
    }
  }

  /**
   * Haalt de directe publieke URL op van een thumbnail
   */
  function getThumbnailUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    const { data } = supabase.storage.from("trip-thumbnails").getPublicUrl(path);
    return data.publicUrl;
  }

  return {
    uploadThumbnail,
    deleteThumbnail,
    getThumbnailUrl,
    compressImage,
    isUploading,
  };
}
