// stores/trips.ts
import { defineStore } from "pinia";
import type { TripRecord } from "~/types/pocketbase.types";
import { DEFAULT_TRIP_CATEGORIES } from "~/constants/categories";

export const useTripStore = defineStore("trips", () => {
  const nuxtApp = useNuxtApp();
  const $pb = nuxtApp.$pb;

  const trips = ref<TripRecord[]>([]);
  const isLoading = ref(false);

  const activeTrips = computed(() => trips.value.filter((t) => !t.is_archived));
  const archivedTrips = computed(() => trips.value.filter((t) => t.is_archived));

  function getThumbnailUrl(trip: TripRecord, thumbSize: string = "500x300"): string | null {
    if (!trip?.thumbnail || !$pb) return null;
    return $pb.files.getURL(trip, trip.thumbnail, { thumb: thumbSize });
  }

  async function fetchAll() {
    if (!$pb) return [];
    isLoading.value = true;
    try {
      const records = await $pb.collection("trips").getFullList<TripRecord>({
        sort: "-start_date",
      });
      trips.value = records;
      return trips.value;
    } catch (err) {
      console.error("Fout bij ophalen van reizen:", err);
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchById(id: string) {
    if (!$pb) throw new Error("PocketBase niet beschikbaar");
    const existing = trips.value.find((t) => t.id === id);
    if (existing) return existing;

    isLoading.value = true;
    try {
      const data = await $pb.collection("trips").getOne<TripRecord>(id);
      trips.value.push(data);
      return data;
    } catch (err) {
      console.error("Reis niet gevonden:", err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function createTrip(payload: Partial<TripRecord> | FormData): Promise<TripRecord> {
    if (!$pb) throw new Error("PocketBase niet beschikbaar");
    const authStore = useAuthStore();
    isLoading.value = true;
    try {
      let body: Partial<TripRecord> | FormData = payload;

      if (body instanceof FormData) {
        if (!body.has("created_by") && authStore.user?.id) {
          body.append("created_by", authStore.user.id);
        }
        if (!body.has("currency")) {
          body.append("currency", "EUR");
        }
        if (!body.has("is_archived")) {
          body.append("is_archived", "false");
        }
      } else {
        body = {
          ...body,
          created_by: body.created_by || authStore.user?.id,
          is_archived: body.is_archived ?? false,
          currency: body.currency || "EUR",
        };
      }

      const data = await $pb.collection("trips").create<TripRecord>(body);
      trips.value.unshift(data);

      if (authStore.user?.id) {
        try {
          await $pb.collection("trip_members").create({
            trip: data.id,
            user: authStore.user.id,
            display_name: authStore.user.name || authStore.user.email.split("@")[0],
            role: "admin",
          });
        } catch (memberErr) {
          console.error("Kon maker niet toevoegen aan trip_members:", memberErr);
        }
        try {
          await Promise.all(
            DEFAULT_TRIP_CATEGORIES.map((cat) =>
              $pb.collection("trip_categories").create(
                {
                  trip: data.id,
                  name: cat.name,
                  icon: cat.icon,
                  color: cat.color,
                },
                { requestKey: null },
              ),
            ),
          );
        } catch (catErr) {
          console.error("Kon standaardcategorieën niet aanmaken:", catErr);
        }
      }

      return data;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateTrip(id: string, payload: Partial<TripRecord> | FormData) {
    if (!$pb) throw new Error("PocketBase niet beschikbaar");
    isLoading.value = true;
    try {
      const data = await $pb.collection("trips").update<TripRecord>(id, payload);
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
    if (!$pb) throw new Error("PocketBase niet beschikbaar");
    isLoading.value = true;
    try {
      await $pb.collection("trips").delete(id);
      trips.value = trips.value.filter((t) => t.id !== id);
    } finally {
      isLoading.value = false;
    }
  }

  async function toggleArchive(id: string, archiveState: boolean) {
    return await updateTrip(id, { is_archived: archiveState });
  }

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
    getThumbnailUrl,
  };
});
