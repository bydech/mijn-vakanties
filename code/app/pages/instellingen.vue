<!-- pages/instellingen.vue -->
<script setup lang="ts">
  const colorMode = useColorMode()
  const authStore = useAuthStore()
  const toast = useToast()

  // Theme switcher logic
  const isDarkMode = computed({
    get: () => colorMode.value === 'dark',
    set: (val: boolean) => {
      colorMode.preference = val ? 'dark' : 'light'
    }
  })

  // Current user details
  const currentUser = computed(() => authStore.user)

  // Placeholder voor de edit modal
  const isEditProfileOpen = ref(false)

  function openEditProfile() {
    isEditProfileOpen.value = true
  }

  async function handleLogout() {
    if (confirm('Weet je zeker dat je wilt uitloggen?')) {
      try {
        await authStore.logout()
        toast.add({
          title: 'Uitgelogd',
          description: 'Je bent succesvol uitgelogd.',
          color: 'neutral'
        })
        navigateTo('/login')
      } catch (err: any) {
        toast.add({
          title: 'Fout bij uitloggen',
          description: err.message || 'Er ging iets mis bij het uitloggen.',
          color: 'error'
        })
      }
    }
  }
</script>

<template>
  <UDashboardPanel class="settings-view">
    <template #header>
      <UDashboardNavbar title="Instellingen" />
    </template>

    <template #body>
      <div class="settings-view__container">
        <UCard title="Account & Profiel" description="Je persoonlijke profielgegevens binnen de app."
          class="settings-view__card">
          <div class="settings-row">
            <div class="settings-row__info">
              <UAvatar
                :text="currentUser?.name?.slice(0, 2).toUpperCase() || currentUser?.email?.slice(0, 2).toUpperCase() || 'PB'"
                size="lg" class="settings-row__avatar" />
              <div class="settings-row__details">
                <span class="settings-row__title">
                  {{ currentUser?.name || 'Naamloos account' }}
                </span>
                <span class="settings-row__subtitle">
                  {{ currentUser?.email || 'Geen e-mailadres bekend' }}
                </span>
              </div>
            </div>

            <div class="settings-row__actions">
              <UButton label="Profiel bewerken" icon="i-lucide-pencil" color="neutral" variant="subtle" size="sm"
                @click="openEditProfile" />
              <UButton label="Uitloggen" icon="i-lucide-log-out" color="error" variant="soft" size="sm"
                @click="handleLogout" />
            </div>
          </div>
        </UCard>

        <UCard title="Weergave & Thema" description="Schakel tussen een lichte en donkere gebruikersinterface."
          class="settings-view__card">
          <div class="settings-row">
            <div class="settings-row__info">
              <div class="settings-row__icon-box">
                <UIcon :name="isDarkMode ? 'i-lucide-moon' : 'i-lucide-sun'" class="settings-row__icon" />
              </div>
              <div class="settings-row__details">
                <span class="settings-row__title">
                  {{ isDarkMode ? 'Donkere modus' : 'Lichte modus' }}
                </span>
                <span class="settings-row__subtitle">
                  {{ isDarkMode ? 'Donker thema is momenteel actief' : 'Licht thema is momenteel actief' }}
                </span>
              </div>
            </div>

            <USwitch v-model="isDarkMode" unchecked-icon="i-lucide-sun" checked-icon="i-lucide-moon" size="lg" />
          </div>
        </UCard>
      </div>

    </template>
  </UDashboardPanel>
</template>

<style lang="scss" scoped>
  .settings-view {
    &__container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.5rem;
    }

    &__card {
      width: 100%;
      max-width: 800px;
    }
  }

  .settings-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    border-radius: 0.5rem;
    background-color: var(--ui-bg-elevated, #f9fafb);
    border: 1px solid var(--ui-border, #e5e7eb);
    flex-wrap: wrap;
    gap: 1rem;

    &__info {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      min-width: 0;
    }

    &__avatar {
      background-color: var(--ui-bg, #ffffff);
      color: var(--ui-text, #111827);
      border: 1px solid var(--ui-border, #e5e7eb);
    }

    &__icon-box {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.5rem;
      background-color: var(--ui-bg, #ffffff);
      border: 1px solid var(--ui-border, #e5e7eb);
      flex-shrink: 0;
    }

    &__icon {
      font-size: 1.25rem;
      color: var(--ui-primary);
    }

    &__details {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    &__title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--ui-text, #111827);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__subtitle {
      font-size: 0.75rem;
      color: var(--ui-text-muted, #6b7280);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
  }
</style>