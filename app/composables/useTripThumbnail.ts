// composables/useTripThumbnail.ts
export function useTripThumbnail() {
  const tripStore = useTripStore();
  const { compressImage } = useImageCompression();
  const isUploading = ref(false);

  async function uploadThumbnail(file: File, tripId: string): Promise<string | null> {
    isUploading.value = true;
    try {
      const compressed = await compressImage(file, 1000, 600, 0.4);
      const formData = new FormData();
      formData.append("thumbnail", compressed);

      const updated = await tripStore.updateTrip(tripId, formData);
      return updated.thumbnail || null;
    } catch (err) {
      console.error("Fout bij uploaden van thumbnail:", err);
      return null;
    } finally {
      isUploading.value = false;
    }
  }

  async function deleteThumbnail(tripId: string): Promise<boolean> {
    try {
      await tripStore.updateTrip(tripId, { thumbnail: "" });
      return true;
    } catch (err) {
      console.error("Fout bij verwijderen van thumbnail:", err);
      return false;
    }
  }

  return {
    compressImage,
    uploadThumbnail,
    deleteThumbnail,
    isUploading,
  };
}
