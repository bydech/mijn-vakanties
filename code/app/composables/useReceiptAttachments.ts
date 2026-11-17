// composables/useReceiptAttachment.ts
import type { ExpenseRecord } from "~/types/pocketbase.types";

export function useReceiptAttachment() {
  const { $pb } = useNuxtApp();
  const isUploading = ref(false);

  const { compressImage } = useImageCompression();

  /**
   * Uploadt (of vervangt) een bonnetje direct op een bestaande expense record
   */
  async function uploadReceipt(expenseId: string, file: File): Promise<string | null> {
    isUploading.value = true;
    try {
      const optimizedFile = file.type === "image/webp" ? file : await compressImage(file);

      const formData = new FormData();
      formData.append("receipt", optimizedFile);

      const updated = await $pb.collection("expenses").update<ExpenseRecord>(expenseId, formData);
      return updated.receipt || null;
    } catch (err) {
      console.error("Fout bij uploaden van bonnetje naar PocketBase:", err);
      return null;
    } finally {
      isUploading.value = false;
    }
  }

  /**
   * Haalt de URL op van het bonnetje (synchroon via PocketBase Files API)
   */
  function getReceiptUrl(expense: ExpenseRecord): string | null {
    if (!expense?.receipt) return null;
    return $pb.files.getURL(expense, expense.receipt);
  }

  /**
   * Verwijdert het bonnetje van een expense record
   * (In PocketBase zet je het bestand-veld op null/leeg om het fysieke bestand te wissen)
   */
  async function deleteReceipt(expenseId: string): Promise<boolean> {
    try {
      await $pb.collection("expenses").update(expenseId, {
        receipt: null,
      });
      return true;
    } catch (err) {
      console.error("Fout bij verwijderen van bonnetje:", err);
      return false;
    }
  }

  return {
    compressImage,
    uploadReceipt,
    getReceiptUrl,
    deleteReceipt,
    isUploading,
  };
}
