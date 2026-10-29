// composables/useReceiptAttachment.ts
export function useReceiptAttachment() {
  const supabase = useSupabaseClient();
  const isUploading = ref(false);

  /**
   * Comprimeert en schaalt een foto via HTML5 Canvas
   * Verkleint smartphoneshot van bijv. 6MB -> ~80-150KB WebP
   */
  async function compressImage(file: File, maxWidth = 1200, maxHeight = 1600, quality = 0.3): Promise<File> {
    // Als het geen afbeeldingsbestand is, sla over
    if (!file.type.startsWith("image/")) return file;

    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;

        // Proportioneel verkleinen
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
            const compressedFile = new File([blob], cleanName, {
              type: "image/webp",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/webp",
          quality,
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        // Fallback: stuur origineel als canvas faalt
        resolve(file);
      };

      img.src = objectUrl;
    });
  }

  /**
   * Uploadt het (reeds geoptimaliseerde) bestand naar Supabase Storage
   */
  async function uploadReceipt(file: File, tripId: string): Promise<string | null> {
    isUploading.value = true;
    try {
      // Zorg voor een dubbele check: comprimeer als het nog geen webp is
      const optimizedFile = file.type === "image/webp" ? file : await compressImage(file);
      const filePath = `${tripId}/${Date.now()}.webp`;

      const { data, error } = await supabase.storage.from("receipts").upload(filePath, optimizedFile, {
        cacheControl: "3600",
        contentType: "image/webp",
        upsert: true,
      });

      if (error) throw error;
      return data.path;
    } catch (err) {
      console.error("Fout bij uploaden van bonnetje:", err);
      return null;
    } finally {
      isUploading.value = false;
    }
  }

  async function getSignedUrl(filePath: string, expiresIn = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage.from("receipts").createSignedUrl(filePath, expiresIn);
      if (error) throw error;
      return data.signedUrl;
    } catch (err) {
      console.error("Fout bij ophalen van signed URL:", err);
      return null;
    }
  }

  async function deleteReceipt(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage.from("receipts").remove([filePath]);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Fout bij verwijderen van bonnetje:", err);
      return false;
    }
  }

  return {
    compressImage,
    uploadReceipt,
    getSignedUrl,
    deleteReceipt,
    isUploading,
  };
}
