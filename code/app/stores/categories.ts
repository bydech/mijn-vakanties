// stores/categories.ts
import { defineStore } from "pinia";
import type { TripCategoryRecord } from "~/types/pocketbase.types";

export const useCategoryStore = defineStore("categories", () => {
  const { $pb } = useNuxtApp();

  const categories = ref<TripCategoryRecord[]>([]);
  const isLoading = ref(false);

  /**
   * Categorieën ophalen voor een specifieke reis (alfabetisch gesorteerd)
   */
  async function fetchByTripId(tripId: string) {
    isLoading.value = true;
    try {
      const records = await $pb.collection("trip_categories").getFullList<TripCategoryRecord>({
        filter: `trip = "${tripId}"`,
        sort: "name",
      });

      categories.value = records;
      return categories.value;
    } catch (err) {
      console.error("Fout bij ophalen van categorieën:", err);
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Nieuwe categorie toevoegen
   */
  async function createCategory(payload: Partial<TripCategoryRecord>) {
    isLoading.value = true;
    try {
      const data = await $pb.collection("trip_categories").create<TripCategoryRecord>(payload);

      categories.value.push(data);
      categories.value.sort((a, b) => a.name.localeCompare(b.name));
      return data;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Categorie bijwerken
   */
  async function updateCategory(id: string, payload: Partial<TripCategoryRecord>) {
    isLoading.value = true;
    try {
      const data = await $pb.collection("trip_categories").update<TripCategoryRecord>(id, payload);

      const idx = categories.value.findIndex((c) => c.id === id);
      if (idx !== -1) {
        categories.value[idx] = data;
        categories.value.sort((a, b) => a.name.localeCompare(b.name));
      }

      return data;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Categorie verwijderen (met check op bestaande uitgaven)
   */
  async function deleteCategory(id: string) {
    isLoading.value = true;
    try {
      // Controleer of er nog uitgaven zijn gekoppeld aan deze categorie
      const linkedExpenses = await $pb.collection("expenses").getList(1, 1, {
        filter: `category = "${id}"`,
      });

      if (linkedExpenses.totalItems > 0) {
        throw new Error(`Deze categorie kan niet worden verwijderd omdat er nog ${linkedExpenses.totalItems} uitgave(n) aan zijn gekoppeld.`);
      }

      await $pb.collection("trip_categories").delete(id);
      categories.value = categories.value.filter((c) => c.id !== id);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    categories,
    isLoading,
    fetchByTripId,
    createCategory,
    updateCategory,
    deleteCategory,
  };
});
