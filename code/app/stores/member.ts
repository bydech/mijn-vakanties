// stores/members.ts
import { defineStore } from "pinia";
import type { TripMemberRecord, MemberRole } from "~/types/pocketbase.types";

export const useMemberStore = defineStore("members", () => {
  const { $pb } = useNuxtApp();
  const authStore = useAuthStore();

  const members = ref<TripMemberRecord[]>([]);
  const isLoading = ref(false);

  // Lookup map: { [memberId]: memberRecord }
  const memberMap = computed<Record<string, TripMemberRecord>>(() => {
    const map: Record<string, TripMemberRecord> = {};
    for (const m of members.value) {
      map[m.id] = m;
    }
    return map;
  });

  const currentMember = computed(() => {
    const currentUserId = authStore.user?.id;
    if (!currentUserId) return null;
    return members.value.find((m) => m.user === currentUserId) || null;
  });

  const isCurrentUserAdmin = computed(() => {
    return currentMember.value?.role === "admin";
  });

  const isCurrentUserMember = computed(() => {
    return currentMember.value?.role === "member";
  });

  const isCurrentUserViewer = computed(() => {
    return currentMember.value?.role === "viewer";
  });

  const isCurrentUserGuest = computed(() => {
    return Boolean(currentMember.value && !currentMember.value.user);
  });

  /**
   * Leden ophalen van een specifieke reis (gesorteerd op rol en display_name)
   */
  async function fetchByTripId(tripId: string) {
    isLoading.value = true;
    try {
      const records = await $pb.collection("trip_members").getFullList<TripMemberRecord>({
        filter: `trip = "${tripId}"`,
        sort: "role,display_name",
        expand: "user",
      });

      members.value = records;
      return members.value;
    } catch (err) {
      console.error("Fout bij ophalen reisleden:", err);
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Lid toevoegen (gekoppeld aan PocketBase user of als gast)
   */
  async function addMember(payload: { trip: string; display_name: string; role?: MemberRole; user?: string | null }) {
    isLoading.value = true;
    try {
      const data = await $pb.collection("trip_members").create<TripMemberRecord>({
        trip: payload.trip,
        display_name: payload.display_name.trim(),
        role: payload.role || "member",
        user: payload.user || null,
      });

      members.value.push(data);
      return data;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Gast / Schaduwlid toevoegen (user blijft leeg/null)
   */
  async function addGuestMember(tripId: string, displayName: string, role: MemberRole = "viewer") {
    return addMember({
      trip: tripId,
      display_name: displayName,
      role,
      user: null,
    });
  }

  /**
   * Rol van een lid bijwerken
   */
  async function updateMemberRole(memberId: string, role: MemberRole) {
    isLoading.value = true;
    try {
      const data = await $pb.collection("trip_members").update<TripMemberRecord>(memberId, {
        role,
      });

      const idx = members.value.findIndex((m) => m.id === memberId);
      if (idx !== -1) {
        members.value[idx] = { ...members.value[idx], ...data };
      }

      return data;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Veilig een lid verwijderen (met validatie op bestaande uitgaven en splits)
   */
  async function removeMember(memberId: string) {
    isLoading.value = true;
    try {
      // 1. Check of deze persoon uitgaven heeft voorgeschoten
      const paidExpenses = await $pb.collection("expenses").getList(1, 1, {
        filter: `paid_by = "${memberId}"`,
      });

      if (paidExpenses.totalItems > 0) {
        throw new Error(
          `Dit lid kan niet worden verwijderd omdat er nog ${paidExpenses.totalItems} ${
            paidExpenses.totalItems === 1 ? "uitgave staat" : "uitgaven staan"
          } die door deze persoon ${paidExpenses.totalItems === 1 ? "is" : "zijn"} voorgeschoten.`,
        );
      }

      // 2. Check of dit lid meedoet in kostenverdelingen (splits)
      const splits = await $pb.collection("expense_splits").getList(1, 1, {
        filter: `member = "${memberId}"`,
      });

      if (splits.totalItems > 0) {
        throw new Error(`Dit lid kan niet worden verwijderd omdat diegene nog is opgenomen in ${splits.totalItems} kostenverdeling(en). Pas eerst deze uitgaven aan.`);
      }

      // 3. Verwijderen
      await $pb.collection("trip_members").delete(memberId);
      members.value = members.value.filter((m) => m.id !== memberId);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    members,
    memberMap,
    isLoading,
    isCurrentUserAdmin,
    isCurrentUserMember,
    isCurrentUserViewer,
    fetchByTripId,
    addMember,
    addGuestMember,
    updateMemberRole,
    removeMember,
  };
});
