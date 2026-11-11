<!-- layouts/default.vue -->
<script setup lang="ts">
  import type { NavigationMenuItem } from '@nuxt/ui'

  const authStore = useAuthStore()
  const inviteStore = useInviteStore()
  const notificationStore = useNotificationStore()

  const hasUnreadNotifications = computed(() => {
    return (
      inviteStore.pendingInvites.length > 0 ||
      notificationStore.notifications.length > 0
    )
  })

  const navItems = computed(() => [
    {
      label: 'Reizen',
      icon: 'i-lucide-plane',
      to: '/reizen'
    },
    {
      label: 'Notificaties',
      icon: 'i-lucide-bell',
      to: '/notificaties',
      slot: 'notifications' as const
    },
    {
      label: 'Instellingen',
      icon: 'i-lucide-settings',
      to: '/instellingen'
    }
  ] satisfies NavigationMenuItem[])

  async function loadNotificationCounts() {
    if (!authStore.isAuthenticated) return
    await Promise.all([
      inviteStore.fetchMyPendingInvites(),
      notificationStore.fetchAll()
    ])
  }

  watch(
    () => authStore.isAuthenticated,
    (isAuth) => {
      if (isAuth) loadNotificationCounts()
    },
    { immediate: true }
  )
</script>

<template>
  <main>
    <slot />
  </main>

  <aside class="floating-nav">
    <div class="floating-nav__pill">
      <UNavigationMenu color="neutral" variant="link" :items="navItems" class="floating-nav__menu">
        <template #notifications-leading="{ item }">
          <UChip :show="hasUnreadNotifications" color="error" size="xs" inset>
            <UIcon :name="item.icon!" class="size-5 shrink-0" />
          </UChip>
        </template>
      </UNavigationMenu>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
  .floating-nav {
    position: fixed;
    bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 50;
    pointer-events: none;
    padding: 0 1rem;

    &__pill {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.625rem;
      border-radius: 9999px;
      background-color: var(--ui-bg);
      border: 1px solid var(--ui-border);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    &__divider {
      width: 1px;
      height: 1.25rem;
      background-color: var(--ui-border);
    }
  }
</style>