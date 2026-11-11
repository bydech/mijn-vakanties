<!-- components/NotificationGeneralList.vue -->
<script setup lang="ts">
  const notificationStore = useNotificationStore()
  const toast = useToast()

  async function handleDismiss(id: string) {
    try {
      await notificationStore.markAsRead(id)
    } catch (err: any) {
      toast.add({
        title: 'Fout bij sluiten',
        description: err.message || 'Kon melding niet bijwerken.',
        color: 'error'
      })
    }
  }
</script>

<template>
  <section class="notification-section">
    <span class="notification-section__title">Meldingen</span>

    <UAlert v-for="item in notificationStore.notifications" :key="item.id" :icon="item.icon || 'i-lucide-bell'"
      :color="item.color || 'neutral'" variant="subtle" :title="item.title"
      :description="item.message || item.description" close @update:open="handleDismiss(item.id)" />
  </section>
</template>