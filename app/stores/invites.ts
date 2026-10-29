// stores/invites.ts
import { defineStore } from "pinia";
import type { Database, Tables } from "~/types/database.types";

export type PendingInvite = Tables<"trip_invites"> & {
  trip: (Tables<"trips"> & { members: Tables<"trip_members">[] }) | null;
};

export const useInviteStore = defineStore("invites", () => {
  const supabase = useSupabaseClient<Database>();
  const pendingInvites = ref<PendingInvite[]>([]);
  // Openstaande uitnodigingen voor de momenteel geopende reis
  const currentTripInvites = ref<Tables<"trip_invites">[]>([]);
  const isLoading = ref(false);

  async function fetchMyPendingInvites() {
    isLoading.value = true;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !user.email) return [];

      const userEmail = user.email.trim().toLowerCase();

      const { data, error } = await supabase.from("trip_invites").select("*, trip:trips(*, members:trip_members(*))").eq("status", "pending").ilike("email", userEmail);

      if (error) throw error;

      pendingInvites.value = (data as any) || [];
      return pendingInvites.value;
    } catch (err) {
      console.error("Fout bij ophalen invites:", err);
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  // Uitnodigingen van een specifieke reis ophalen
  async function fetchTripInvites(tripId: string) {
    isLoading.value = true;
    try {
      const { data, error } = await supabase.from("trip_invites").select("*").eq("trip_id", tripId).eq("status", "pending").order("created_at", { ascending: false });

      if (error) throw error;
      currentTripInvites.value = data || [];
      return currentTripInvites.value;
    } catch (err) {
      console.error("Fout bij ophalen reis-uitnodigingen:", err);
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  // Iemand uitnodigen voor een reis
  async function sendInvite(tripId: string, email: string, role: "member" | "viewer" = "member") {
    isLoading.value = true;
    try {
      const cleanEmail = email.trim().toLowerCase();

      const { data, error } = await supabase
        .from("trip_invites")
        .insert({
          trip_id: tripId,
          email: cleanEmail,
          role,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      currentTripInvites.value.unshift(data);
      return data;
    } finally {
      isLoading.value = false;
    }
  }

  // Uitnodiging intrekken / verwijderen door beheerder
  async function cancelInvite(inviteId: string) {
    isLoading.value = true;
    try {
      const { data, error } = await supabase.from("trip_invites").delete().eq("id", inviteId).select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Geen rechten om deze uitnodiging in te trekken.");
      }

      currentTripInvites.value = currentTripInvites.value.filter((i) => i.id !== inviteId);
    } finally {
      isLoading.value = false;
    }
  }

  // Uitnodiging accepteren via RPC
  async function acceptInvite(inviteId: string) {
    isLoading.value = true;
    try {
      const { data, error } = await supabase.rpc("accept_trip_invite", {
        invite_id: inviteId,
      });

      if (error) throw error;
      pendingInvites.value = pendingInvites.value.filter((i) => i.id !== inviteId);
      return data;
    } finally {
      isLoading.value = false;
    }
  }

  // Uitnodiging weigeren
  async function rejectInvite(inviteId: string) {
    isLoading.value = true;
    try {
      const { error } = await supabase.from("trip_invites").update({ status: "rejected" }).eq("id", inviteId);

      if (error) throw error;
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
