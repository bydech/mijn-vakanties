<!-- layouts/default.vue -->
<script setup lang="ts">
  import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'

  const inviteStore = useInviteStore()
  const colorMode = useColorMode()
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const toast = useToast()

  const navItems: NavigationMenuItem[] = [
    { label: 'Reizen', icon: 'i-lucide-plane', to: '/reizen' },
    { label: 'Instellingen', icon: 'i-lucide-settings', to: '/instellingen' }
  ]

  onMounted(async () => {
    await inviteStore.fetchMyPendingInvites()
  })

  const unreadCount = computed(() => inviteStore.pendingInvites.length)

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.add({ title: 'Fout bij uitloggen', description: error.message, color: 'error' })
      return
    }
    toast.add({ title: 'Uitgelogd', description: 'Tot ziens!', color: 'success' })
    await navigateTo('/login')
  }

  const userMenuItems = computed<DropdownMenuItem[][]>(() => [
    [{ label: user.value?.email || 'Account', icon: 'i-lucide-user', disabled: true }],
    [
      {
        label: 'Notificaties',
        icon: 'i-lucide-bell',
        to: '/notificaties',
        badge: unreadCount.value > 0 ? String(unreadCount.value) : undefined
      }
    ],
    [
      {
        label: 'Thema',
        icon: 'i-lucide-sun-moon',
        children: [
          {
            label: 'Licht',
            icon: 'i-lucide-sun',
            type: 'checkbox',
            checked: colorMode.value === 'light',
            onUpdateChecked(checked: boolean) {
              if (checked) colorMode.preference = 'light'
            }
          },
          {
            label: 'Donker',
            icon: 'i-lucide-moon',
            type: 'checkbox',
            checked: colorMode.value === 'dark',
            onUpdateChecked(checked: boolean) {
              if (checked) colorMode.preference = 'dark'
            }
          }
        ]
      }
    ],
    [{ label: 'Uitloggen', icon: 'i-lucide-log-out', color: 'error', onSelect: handleLogout }]
  ])
</script>

<template>
  <main>
    <slot />
  </main>

  <aside class="floating-nav">
    <div class="floating-nav__pill">
      <UNavigationMenu color="neutral" variant="link" :items="navItems" class="floating-nav__menu" />

      <div class="floating-nav__divider" />

      <UDropdownMenu :items="userMenuItems" :content="{ side: 'top', align: 'end' }">
        <div class="relative inline-flex">
          <UButton icon="i-lucide-user" size="xs" variant="soft" color="neutral" class="rounded-full" />
          <!-- Notificatie indicator badge op de profielknop -->
          <UBadge v-if="unreadCount > 0" :label="String(unreadCount)" color="error" size="xs"
            class="absolute -top-1 -right-1 px-1 min-w-4 h-4 flex items-center justify-center text-[10px] rounded-full pointer-events-none" />
        </div>
      </UDropdownMenu>
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