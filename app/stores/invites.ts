// stores/invites.ts
import { defineStore } from "pinia";
import type { TripInviteRecord, MemberRole } from "~/types/pocketbase.types";

export const useInviteStore = defineStore("invites", () => {
  const { $pb } = useNuxtApp();
  const authStore = useAuthStore();

  const pendingInvites = ref<TripInviteRecord[]>([]);
  const currentTripInvites = ref<TripInviteRecord[]>([]);
  const isLoading = ref(false);

  /**
   * Openstaande uitnodigingen ophalen voor het e-mailadres van de ingelogde gebruiker
   */
  async function fetchMyPendingInvites() {
    const userEmail = authStore.user?.email?.trim().toLowerCase();
    if (!userEmail) return [];

    isLoading.value = true;
    try {
      const records = await $pb.collection("trip_invites").getFullList<TripInviteRecord>({
        filter: $pb.filter("status = {:status} && email = {:email}", {
          status: "pending",
          email: userEmail,
        }),
        expand: "trip,invited_by",
        sort: "-autodate",
        requestKey: null,
      });

      pendingInvites.value = records;
      return pendingInvites.value;
    } catch (err) {
      console.error("Fout bij ophalen invites:", err);
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Uitnodigingen van een specifieke reis ophalen (voor de beheerder van de reis)
   */
  async function fetchTripInvites(tripId: string) {
    isLoading.value = true;
    try {
      const records = await $pb.collection("trip_invites").getFullList<TripInviteRecord>({
        filter: `trip = "${tripId}" && status = "pending"`,
        sort: "-created",
      });

      currentTripInvites.value = records;
      return currentTripInvites.value;
    } catch (err) {
      console.error("Fout bij ophalen reis-uitnodigingen:", err);
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Iemand uitnodigen voor een reis
   */
  async function sendInvite(tripId: string, email: string, role: MemberRole = "member") {
    isLoading.value = true;
    try {
      const cleanEmail = email.trim().toLowerCase();

      const record = await $pb.collection("trip_invites").create<TripInviteRecord>({
        trip: tripId,
        email: cleanEmail,
        role,
        status: "pending",
        invited_by: authStore.user?.id,
      });

      currentTripInvites.value.unshift(record);
      return record;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Uitnodiging intrekken / verwijderen door de beheerder
   */
  async function cancelInvite(inviteId: string) {
    isLoading.value = true;
    try {
      await $pb.collection("trip_invites").delete(inviteId);
      currentTripInvites.value = currentTripInvites.value.filter((i) => i.id !== inviteId);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Uitnodiging accepteren
   * 1. Haal de invite op
   * 2. Voeg de gebruiker toe aan trip_members
   * 3. Update of verwijder het invite-record
   */
  async function acceptInvite(inviteId: string) {
    if (!authStore.user) throw new Error("Je moet ingelogd zijn om een uitnodiging te accepteren.");

    isLoading.value = true;
    try {
      // 1. Invite details ophalen
      const invite = await $pb.collection("trip_invites").getOne<TripInviteRecord>(inviteId);

      // 2. Toevoegen aan trip_members
      const newMember = await $pb.collection("trip_members").create({
        trip: invite.trip,
        user: authStore.user.id,
        display_name: authStore.user.name || authStore.user.email.split("@")[0],
        role: invite.role,
      });

      // 3. Markeer uitnodiging als geaccepteerd (of verwijder deze)
      await $pb.collection("trip_invites").update(inviteId, {
        status: "accepted",
      });

      // Lokaal opschonen
      pendingInvites.value = pendingInvites.value.filter((i) => i.id !== inviteId);
      return newMember;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Uitnodiging weigeren
   */
  async function rejectInvite(inviteId: string) {
    isLoading.value = true;
    try {
      await $pb.collection("trip_invites").update(inviteId, {
        status: "rejected",
      });

      pendingInvites.value = pendingInvites.value.filter((i) => i.id !== inviteId);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    pendingInvites,
    currentTripInvites,
    isLoading,
    fetchMyPendingInvites,
    fetchTripInvites,
    sendInvite,
    cancelInvite,
    acceptInvite,
    rejectInvite,
  };
});
