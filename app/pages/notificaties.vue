<!-- pages/notificaties.vue -->
<script setup lang="ts">
  const inviteStore = useInviteStore()
  const notificationStore = useNotificationStore()

  const isLoading = computed(
    () => inviteStore.isLoading || notificationStore.isLoading
  )

  const totalCount = computed(
    () => inviteStore.pendingInvites.length + notificationStore.notifications.length
  )

  onMounted(async () => {
    await Promise.all([
      inviteStore.fetchMyPendingInvites(),
      notificationStore.fetchAll()
    ])
  })
</script>

<template>
  <UDashboardPanel class="notifications-view">
    <template #header>
      <UDashboardNavbar title="Notificaties">
        <template #trailing>
          <UBadge v-if="totalCount > 0" :label="`${totalCount} nieuw`" color="primary" variant="subtle" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="notifications-view__container">
        <div v-if="isLoading" class="notifications-view__loader">
          <UIcon name="i-lucide-loader-circle" class="notifications-view__spinner" />
        </div>

        <UAlert v-else-if="totalCount === 0" icon="i-lucide-bell-off" color="neutral" variant="subtle"
          title="Geen nieuwe meldingen"
          description="Je hebt op dit moment geen openstaande uitnodigingen of berichten." />

        <template v-else>
          <NotificationsInviteList v-if="inviteStore.pendingInvites.length > 0" />
          <NotificationsGeneralList v-if="notificationStore.notifications.length > 0" />
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>

<style lang="scss">
  .notifications-view {
    &__container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 640px;
      width: 100%;
      margin: 0 auto;
    }

    &__loader {
      display: flex;
      justify-content: center;
      padding: 3rem 0;
    }

    &__spinner {
      font-size: 1.75rem;
      width: 1.75rem;
      height: 1.75rem;
      color: var(--ui-primary);
      animation: spin 1s linear infinite;
    }
  }

  .notification-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    &__title {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ui-text-muted);
      padding: 0 0.25rem;
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }
</style>