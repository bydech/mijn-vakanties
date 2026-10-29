// stores/members.ts
import { defineStore } from "pinia";
import type { Database, Tables } from "~/types/database.types";

export const useMemberStore = defineStore("members", () => {
  const supabase = useSupabaseClient<Database>();
  const supabaseUser = useSupabaseUser();

  const members = ref<Tables<"trip_members">[]>([]);
  const isLoading = ref(false);

  // Lookup map: { [memberId]: memberObject }
  const memberMap = computed<Record<string, Tables<"trip_members">>>(() => {
    const map: Record<string, Tables<"trip_members">> = {};
    for (const m of members.value) {
      map[m.id] = m;
    }
    return map;
  });

  // Controleer of de huidige ingelogde gebruiker admin is van deze reis
  const isCurrentUserAdmin = computed(() => {
    if (!supabaseUser.value) return false;
    const currentMember = members.value.find((m) => m.user_id === supabaseUser.value?.id);
    return currentMember?.role === "admin";
  });

  // Leden ophalen van een specifieke reis
  async function fetchByTripId(tripId: string) {
    isLoading.value = true;
    try {
      const { data, error } = await supabase
        .from("trip_members")
        .select("*")
        .eq("trip_id", tripId)
        .order("role", { ascending: true }) // admin eerst
        .order("display_name", { ascending: true });

      if (error) throw error;
      members.value = data || [];
      return members.value;
    } finally {
      isLoading.value = false;
    }
  }

  // Gast / Schaduwlid toevoegen (user_id blijft null)
  async function addGuestMember(tripId: string, displayName: string, role: "member" | "viewer" = "member") {
    isLoading.value = true;
    try {
      const { data, error } = await supabase
        .from("trip_members")
        .insert({
          trip_id: tripId,
          display_name: displayName.trim(),
          role,
          user_id: null,
        })
        .select()
        .single();

      if (error) throw error;
      members.value.push(data);
      return data;
    } finally {
      isLoading.value = false;
    }
  }

  // Rol bijwerken
  async function updateMemberRole(memberId: string, role: "admin" | "member" | "viewer") {
    isLoading.value = true;
    try {
      const { data, error } = await supabase.from("trip_members").update({ role }).eq("id", memberId).select().single();

      if (error) throw error;
      const idx = members.value.findIndex((m) => m.id === memberId);
      if (idx !== -1) members.value[idx] = data;
      return data;
    } finally {
      isLoading.value = false;
    }
  }

  // Veilig lid verwijderen
  async function removeMember(memberId: string) {
    isLoading.value = true;
    try {
      const { count: paidCount, error: paidErr } = await supabase.from("expenses").select("*", { count: "exact", head: true }).eq("paid_by_member_id", memberId);

      if (paidErr) throw paidErr;
      if (paidCount && paidCount > 0) {
        throw new Error(
          `Dit lid kan niet worden verwijderd omdat er nog ${paidCount} ${paidCount === 1 ? "uitgave staat" : "uitgaven staan"} die door deze persoon zijn voorgeschoten.`,
        );
      }

      const { count: splitCount, error: splitErr } = await supabase.from("expense_splits").select("*", { count: "exact", head: true }).eq("member_id", memberId);

      if (splitErr) throw splitErr;
      if (splitCount && splitCount > 0) {
        throw new Error(`Dit lid kan niet worden verwijderd omdat diegene nog is opgenomen in ${splitCount} kostenverdeling(en). Pas eerst deze uitgaven aan.`);
      }

      const { error } = await supabase.from("trip_members").delete().eq("id", memberId);
      if (error) throw error;
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
    fetchByTripId,
    addGuestMember,
    updateMemberRole,
    removeMember,
  };
});
