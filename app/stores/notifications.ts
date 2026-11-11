// stores/notifications.ts
import { defineStore } from "pinia";
import type { NotificationRecord } from "~/types/pocketbase.types";

export const useNotificationStore = defineStore("notifications", () => {
  const { $pb } = useNuxtApp();
  const authStore = useAuthStore();

  const notifications = ref<NotificationRecord[]>([]);
  const isLoading = ref(false);

  const unreadCount = computed<number>(() => {
    return notifications.value.reduce((acc, curr) => (!curr.is_read ? acc + 1 : acc), 0);
  });

  /**
   * Haal alle notificaties op voor de ingelogde gebruiker
   */
  async function fetchAll() {
    if (!authStore.user?.id) return [];

    isLoading.value = true;
    try {
      const records = await $pb.collection("notifications").getFullList<NotificationRecord>({
        filter: `user = "${authStore.user.id}"`,
        sort: "-created",
      });

      notifications.value = records;
      return notifications.value;
    } catch (err) {
      console.error("Fout bij ophalen notificaties:", err);
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Markeer een specifieke notificatie als gelezen
   */
  async function markAsRead(id: string) {
    try {
      const updated = await $pb.collection("notifications").update<NotificationRecord>(id, {
        is_read: true,
      });

      const item = notifications.value.find((n) => n.id === id);
      if (item) {
        item.is_read = true;
      }
      return updated;
    } catch (err) {
      console.error("Fout bij markeren als gelezen:", err);
    }
  }

  /**
   * Markeer alle ongelezen notificaties als gelezen
   */
  async function markAllAsRead() {
    const unread = notifications.value.filter((n) => !n.is_read);
    if (unread.length === 0) return;

    // Optimistic UI update: zet lokaal al direct op true
    for (const item of unread) {
      item.is_read = true;
    }

    try {
      await Promise.allSettled(
        unread.map((n) =>
          $pb.collection("notifications").update(n.id, {
            is_read: true,
          }),
        ),
      );
    } catch (err) {
      console.error("Fout bij alles als gelezen markeren:", err);
    }
  }

  /**
   * Notificatie verwijderen
   */
  async function deleteNotification(id: string) {
    try {
      await $pb.collection("notifications").delete(id);
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
