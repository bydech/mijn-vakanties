// stores/trips.ts
import { defineStore } from "pinia";
import type { Database, Tables, TablesInsert, TablesUpdate } from "~/types/database.types";

export const useTripStore = defineStore("trips", () => {
  const supabase = useSupabaseClient<Database>();
  const supabaseUser = useSupabaseUser();

  const trips = ref<Tables<"trips">[]>([]);
  const currentTrip = ref<Tables<"trips"> | null>(null);
  const isLoading = ref(false);

  // Lookup map: { [tripId]: tripObject }
  const tripMap = computed<Record<string, Tables<"trips">>>(() => {
    const map: Record<string, Tables<"trips">> = {};
    for (const trip of trips.value) {
      map[trip.id] = trip;
    }
    return map;
  });

  // Actieve reizen vs gearchiveerde reizen
  const activeTrips = computed(() => trips.value.filter((t) => !t.is_archived));
  const archivedTrips = computed(() => trips.value.filter((t) => t.is_archived));

  // Alle reizen ophalen waar de gebruiker toegang toe heeft
  async function fetchAll() {
    isLoading.value = true;
    try {
      const { data, error } = await supabase.from("trips").select("*").order("start_date", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });

      if (error) throw error;
      trips.value = data || [];
    } finally {
      isLoading.value = false;
    }
  }

  // Enkele reis ophalen
  async function fetchById(id: string) {
    isLoading.value = true;
    try {
      const { data, error } = await supabase.from("trips").select("*").eq("id", id).single();

      if (error) throw error;

      currentTrip.value = data;
      const idx = trips.value.findIndex((t) => t.id === id);
      if (idx !== -1) {
        trips.value[idx] = data;
      } else {
        trips.value.push(data);
      }
      return data;
    } finally {
      isLoading.value = false;
    }
  }

  // Nieuwe reis aanmaken (created_by wordt automatisch ingevuld door de trigger/RLS)
  async function createTrip(payload: Omit<TablesInsert<"trips">, "created_by">) {
    if (!supabaseUser.value) throw new Error("Geen actieve sessie");

    isLoading.value = true;
    try {
      const { data, error } = await supabase
        .from("trips")
        .insert({
          ...payload,
          created_by: supabaseUser.value.id,
        })
        .select()
        .single();

      if (error) throw error;
      trips.value.unshift(data);
      return data;
    } finally {
      isLoading.value = false;
    }
  }

  // Reis bijwerken
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

      if (error) throw error;
      const idx = trips.value.findIndex((t) => t.id === id);
      if (idx !== -1) trips.value[idx] = data;
      if (currentTrip.value?.id === id) currentTrip.value = data;
      return data;
    } finally {
      isLoading.value = false;
    }
  }

  // Reis verwijderen
  async function deleteTrip(id: string) {
    isLoading.value = true;
    try {
      const { error } = await supabase.from("trips").delete().eq("id", id);
      if (error) throw error;
      trips.value = trips.value.filter((t) => t.id !== id);
      if (currentTrip.value?.id === id) currentTrip.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    trips,
    currentTrip,
    tripMap,
    activeTrips,
    archivedTrips,
    isLoading,
    fetchAll,
    fetchById,
    createTrip,
    updateTrip,
    deleteTrip,
  };
});
