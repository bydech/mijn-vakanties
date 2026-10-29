// stores/trips.ts
import { defineStore } from "pinia";
import type { Database, Tables, TablesInsert, TablesUpdate } from "~/types/database.types";

export const useTripStore = defineStore("trips", () => {
  const supabase = useSupabaseClient<Database>();

  const trips = ref<Tables<"trips">[]>([]);
  const isLoading = ref(false);

  async function fetchAll() {
    isLoading.value = true;
    try {
      const { data, error } = await supabase.from("trips").select("*").order("start_date", { ascending: false });

      if (error) throw error;
      trips.value = data || [];
      return trips.value;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchById(id: string) {
    const existing = trips.value.find((t) => t.id === id);

    if (existing) {
      return existing;
    }

    isLoading.value = true;

    try {
      const { data, error } = await supabase.from("trips").select("*").eq("id", id).single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("Reis niet gevonden");
      }

      trips.value.push(data);

      return data;
    } finally {
      isLoading.value = false;
    }
  }

  async function createTrip(payload: TablesInsert<"trips">) {
    isLoading.value = true;

    try {
      const { data, error } = await supabase.from("trips").insert(payload).select().single();

      if (error) {
        throw error;
      }

      trips.value.unshift(data);

      return data;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateTrip(id: string, payload: TablesUpdate<"trips">) {
    isLoading.value = true;
    try {
      const { data, error } = await supabase
        .from("trips")
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const idx = trips.value.findIndex((t) => t.id === id);

      if (idx !== -1) {
        trips.value[idx] = data;
      }

      return data;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteTrip(id: string) {
    isLoading.value = true;
    try {
      const { error } = await supabase.from("trips").delete().eq("id", id);

      if (error) {
        throw error;
      }

      trips.value = trips.value.filter((t) => t.id !== id);
    } finally {
      isLoading.value = false;
    }
  }

  async function toggleArchive(id: string, archiveState: boolean) {
    return await updateTrip(id, { is_archived: archiveState });
  }

  const activeTrips = computed(() => trips.value.filter((t) => !t.is_archived));

  const archivedTrips = computed(() => trips.value.filter((t) => t.is_archived));

  return {
    trips,
    activeTrips,
    archivedTrips,
    isLoading,
    fetchAll,
    fetchById,
    createTrip,
    updateTrip,
    deleteTrip,
    toggleArchive,
  };
});
