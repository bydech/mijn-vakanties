// stores/categories.ts
import { defineStore } from "pinia";
import type { Database, Tables, TablesInsert, TablesUpdate } from "~/types/database.types";

export const useCategoryStore = defineStore("categories", () => {
  const supabase = useSupabaseClient<Database>();

  const categories = ref<Tables<"trip_categories">[]>([]);
  const isLoading = ref(false);

  async function fetchByTripId(tripId: string) {
    isLoading.value = true;
    try {
      const { data, error } = await supabase.from("trip_categories").select("*").eq("trip_id", tripId).order("name", { ascending: true });

      if (error) throw error;
      categories.value = data || [];
      return categories.value;
    } finally {
      isLoading.value = false;
    }
  }

  async function createCategory(payload: TablesInsert<"trip_categories">) {
    isLoading.value = true;
    try {
      const { data, error } = await supabase.from("trip_categories").insert(payload).select().single();

      if (error) throw error;
      categories.value.push(data);
      // Houd netjes alfabetisch gesorteerd
      categories.value.sort((a, b) => a.name.localeCompare(b.name));
      return data;
    } finally {
      isLoading.value = false;
    }
  }

  // stores/categories.ts
  async function updateCategory(id: string, payload: TablesUpdate<"trip_categories">) {
    isLoading.value = true;
    try {
      const { data, error } = await supabase.from("trip_categories").update(payload).eq("id", id).select().single();

      if (error) throw error;

      const idx = categories.value.findIndex((c) => c.id === id);
      if (idx !== -1) {
        categories.value[idx] = data;
        // Houd netjes alfabetisch gesorteerd
        categories.value.sort((a, b) => a.name.localeCompare(b.name));
      }

      return data;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteCategory(id: string) {
    isLoading.value = true;
    try {
      // Optioneel: check of er nog uitgaven zijn gekoppeld
      const { count, error: countErr } = await supabase.from("expenses").select("*", { count: "exact", head: true }).eq("category_id", id);

      if (countErr) throw countErr;
      if (count && count > 0) {
        throw new Error(`Deze categorie kan niet worden verwijderd omdat er nog ${count} uitgave(n) aan zijn gekoppeld.`);
      }

      const { error } = await supabase.from("trip_categories").delete().eq("id", id);

      if (error) throw error;
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
