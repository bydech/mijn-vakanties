<!-- components/TripMemberModalCreate.vue -->
<script setup lang="ts">
  import type { TabsItem } from '@nuxt/ui'

  const isOpen = defineModel<boolean>('open', { default: false })

  const props = defineProps<{
    tripId: string
  }>()

  const inviteStore = useInviteStore()
  const memberStore = useMemberStore()
  const expenseStore = useExpenseStore()
  const toast = useToast()

  // Tabs configuratie
  const tabItems: TabsItem[] = [
    {
      label: 'Via e-mail uitnodigen',
      icon: 'i-lucide-mail',
      value: 'invite'
    },
    {
      label: 'Gast toevoegen',
      icon: 'i-lucide-user',
      value: 'guest'
    }
  ]

  const activeTab = ref<'invite' | 'guest'>('invite')

  const emailInput = ref('')
  const selectedEmailRole = ref<'member' | 'viewer'>('member')
  const isEmailSubmitting = ref(false)

  const roleOptions = [
    { label: 'Deelnemer (kan uitgaven invoeren)', value: 'member' },
    { label: 'Kijker (alleen-lezen)', value: 'viewer' }
  ]

  async function onInviteByEmail() {
    if (!emailInput.value.trim()) {
      toast.add({ title: 'Vul een e-mailadres in', color: 'error' })
      return
    }

    isEmailSubmitting.value = true
    try {
      await inviteStore.sendInvite(
        props.tripId,
        emailInput.value.trim(),
        selectedEmailRole.value
      )
      toast.add({
        title: 'Uitnodiging verstuurd!',
        description: `Er is een uitnodiging gestuurd naar ${emailInput.value.trim()}.`,
        color: 'success'
      })
      emailInput.value = ''
      isOpen.value = false
    } catch (err: any) {
      toast.add({
        title: 'Fout bij uitnodigen',
        description: err.message || 'Kon uitnodiging niet versturen.',
        color: 'error'
      })
    } finally {
      isEmailSubmitting.value = false
    }
  }

  // 2. Gast toevoegen state
  const guestNameInput = ref('')
  const isGuestSubmitting = ref(false)

  async function onAddGuest() {
    if (!guestNameInput.value.trim()) {
      toast.add({ title: 'Vul een naam in voor de gast', color: 'error' })
      return
    }

    isGuestSubmitting.value = true
    try {
      await memberStore.addGuestMember(
        props.tripId,
        guestNameInput.value.trim(),
        'viewer'
      )
      await expenseStore.fetchByTripId(props.tripId)

      toast.add({
        title: 'Gast toegevoegd',
        description: `${guestNameInput.value.trim()} is als gast toegevoegd aan de reis.`,
        color: 'success'
      })
      guestNameInput.value = ''
      isOpen.value = false
    } catch (err: any) {
      toast.add({
        title: 'Fout bij toevoegen',
        description: err.message || 'Kon gast niet toevoegen.',
        color: 'error'
      })
    } finally {
      isGuestSubmitting.value = false
    }
  }
</script>

<template>
  <UModal v-model:open="isOpen" title="Deelnemer of gast toevoegen"
    description="Nodig iemand uit met een e-mailadres of voeg handmatig een reisgenoot toe.">
    <template #body>
      <div class="app-form">
        <UTabs v-model="activeTab" :items="tabItems" :content="false" class="w-full" />

        <div v-if="activeTab === 'invite'" class="flex flex-col gap-3">
          <p class="text-xs text-muted">
            De uitgenodigde ontvangt een e-mail en kan zelf inloggen om kosten te bekijken of toe te voegen.
          </p>

          <UFormField label="E-mailadres" required class="app-form__field">
            <UInput v-model="emailInput" type="email" placeholder="naam@voorbeeld.nl" class="app-form__input"
              autofocus />
          </UFormField>

          <UFormField label="Rol" class="app-form__field">
            <USelect v-model="selectedEmailRole" :items="roleOptions" class="app-form__input" />
          </UFormField>
        </div>

        <!-- Tab 2: Gast toevoegen -->
        <div v-else class="flex flex-col gap-3">
          <p class="text-xs text-muted">
            Ideaal voor reisgenoten zonder app-account (zoals kinderen). Jij of andere deelnemers beheren hun uitgaven.
          </p>

          <UFormField label="Naam van de gast" required class="app-form__field">
            <UInput v-model="guestNameInput" placeholder="bijv. Tim of Lisa" class="app-form__input" autofocus />
          </UFormField>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="app-form__actions w-full">
        <UButton label="Annuleren" variant="ghost" color="neutral" @click="isOpen = false" />

        <UButton v-if="activeTab === 'invite'" icon="i-lucide-send" label="Uitnodiging versturen" color="primary"
          :loading="isEmailSubmitting" @click="onInviteByEmail" />

        <UButton v-else icon="i-lucide-user-plus" label="Gast toevoegen" color="primary" :loading="isGuestSubmitting"
          @click="onAddGuest" />
      </div>
    </template>
  </UModal>
</template>