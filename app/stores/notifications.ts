// stores/notifications.ts
import { defineStore } from "pinia";
import type { Database, Tables } from "~/types/database.types";

export type NotificationItem = Tables<"notifications">;

export const useNotificationStore = defineStore("notifications", () => {
  const supabase = useSupabaseClient<Database>();

  const notifications = shallowRef<NotificationItem[]>([]);

  const isLoading = ref(false);

  const unreadCount = computed<number>(() => {
    return notifications.value.reduce((acc, curr) => (!curr.is_read ? acc + 1 : acc), 0);
  });

  // Haal alle notificaties op voor de ingelogde gebruiker
  async function fetchAll() {
    isLoading.value = true;
    try {
      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });

      if (error) throw error;
      notifications.value = data || [];
      return notifications.value;
    } catch (err) {
      console.error("Fout bij ophalen notificaties:", err);
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  // Markeer specifieke notificatie als gelezen
  async function markAsRead(id: string) {
    try {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);

      if (error) throw error;

      const item = notifications.value.find((n) => n.id === id);
      if (item) item.is_read = true;
    } catch (err) {
      console.error("Fout bij markeren als gelezen:", err);
    }
  }

  // Markeer alles als gelezen
  async function markAllAsRead() {
    try {
      const unreadIds = notifications.value.filter((n) => !n.is_read).map((n) => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);

      if (error) throw error;

      for (const item of notifications.value) {
        item.is_read = true;
      }
    } catch (err) {
      console.error("Fout bij alles als gelezen markeren:", err);
    }
  }

  // Notificatie verwijderen
  async function deleteNotification(id: string) {
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", id);

      if (error) throw error;
      notifications.value = notifications.value.filter((n) => n.id !== id);
    } catch (err) {
      console.error("Fout bij verwijderen notificatie:", err);
    }
  }

  return {
    notifications,
    unreadCount,
    isLoading,
    fetchAll,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
});
