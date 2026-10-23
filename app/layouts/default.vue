<!-- layouts/default.vue -->
<script setup lang="ts">
  import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'

  const colorMode = useColorMode()
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const toast = useToast()

  const navItems: NavigationMenuItem[] = [
    { label: 'Reizen', icon: 'i-lucide-plane', to: '/overzicht' },
    { label: 'Instellingen', icon: 'i-lucide-settings', to: '/instellingen' }
  ]

  const currentUser = computed(() => ({
    name: user.value?.user_metadata?.full_name || user.value?.email?.split('@')[0] || 'Reiziger',
    avatar: {
      src: user.value?.user_metadata?.avatar_url || 'https://github.com/nuxt.png',
      alt: user.value?.email || 'User'
    }
  }))

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.add({ title: 'Fout bij uitloggen', description: error.message, color: 'error' })
      return
    }
    toast.add({ title: 'Uitgelogd', description: 'Tot ziens!', color: 'success' })
    await navigateTo('/login')
  }

  const userItems = computed<DropdownMenuItem[][]>(() => [
    [{ label: user.value?.email || 'Gebruiker', icon: 'i-lucide-user', disabled: true }],
    [
      {
        label: 'Weergave',
        icon: 'i-lucide-sun-moon',
        children: [
          {
            label: 'Licht',
            icon: 'i-lucide-sun',
            type: 'checkbox',
            checked: colorMode.value === 'light',
            onUpdateChecked(checked: boolean) { if (checked) colorMode.preference = 'light' }
          },
          {
            label: 'Donker',
            icon: 'i-lucide-moon',
            type: 'checkbox',
            checked: colorMode.value === 'dark',
            onUpdateChecked(checked: boolean) { if (checked) colorMode.preference = 'dark' }
          }
        ]
      }
    ],
    [{ label: 'Uitloggen', icon: 'i-lucide-log-out', color: 'error', onSelect: handleLogout }]
  ])

  const mobileNavItems = computed<NavigationMenuItem[]>(() => [
    ...navItems,
    { label: 'Profiel', slot: 'user-profile' as const }
  ])
</script>

<template>
  <UDashboardGroup>
    <!-- Desktop Sidebar (verborgen op mobiel) -->
    <UDashboardSidebar collapsible class="hidden md:flex max-w-56">
      <template #header>
        <div class="flex items-center gap-2 px-2 py-1.5 overflow-hidden">
          <UIcon name="i-lucide-palmtree" class="size-6 text-primary shrink-0" />
          <span class="font-semibold text-sm truncate">Mijn Vakanties</span>
        </div>
      </template>

      <UNavigationMenu :items="navItems" orientation="vertical" />

      <template #footer>
        <UDropdownMenu :items="userItems">
          <UButton v-bind="currentUser" :label="currentUser.name" trailing-icon="i-lucide-chevrons-up-down"
            color="neutral" variant="ghost" class="w-full" />
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <div class="flex-1 min-w-0 pb-20 md:pb-0">
      <slot />
    </div>

    <div class="mobile-bottom-nav md:hidden">
      <UNavigationMenu :items="mobileNavItems" orientation="horizontal" variant="pill" class="w-full" :ui="{
        root: 'justify-around border-t border-default py-1.5 px-2 bg-default/90 backdrop-blur-md',
        item: 'py-0 flex-1',
        link: 'flex-col gap-1 px-1 py-1.5 justify-center items-center h-full',
        linkLeadingIcon: 'size-5',
        linkLabel: 'text-[11px]/3 font-normal'
      }">
        <template #user-profile>
          <UDropdownMenu :items="userItems" :content="{ side: 'top', align: 'end' }">
            <button type="button"
              class="w-full flex flex-col items-center justify-center gap-1 px-1 py-1.5 text-muted hover:text-highlighted focus:outline-none transition-colors">
              <UAvatar :src="currentUser.avatar.src" :alt="currentUser.name" size="2xs" />
              <span class="text-[11px]/3 font-normal">Profiel</span>
            </button>
          </UDropdownMenu>
        </template>
      </UNavigationMenu>
    </div>
  </UDashboardGroup>
</template>

<style lang="scss" scoped>
  .mobile-bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 50;
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background-color: var(--ui-bg, #ffffff);
  }
</style>