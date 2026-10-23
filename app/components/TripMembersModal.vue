<!-- components/TripMembersModal.vue -->
<script setup lang="ts">
  import type { Tables } from '~/types/database.types'

  const isOpen = defineModel<boolean>('open', { default: false })
  const props = defineProps<{
    tripId: string
    tripName?: string
  }>()

  const memberStore = useMemberStore()
  const expenseStore = useExpenseStore()
  const toast = useToast()

  const newGuestName = ref('')
  const selectedRole = ref<'member' | 'viewer'>('member')
  const isAdding = ref(false)

  const roleOptions = [
    { label: 'Deelnemer (Kan kosten invoeren)', value: 'member' },
    { label: 'Kijker (Alleen inzien)', value: 'viewer' }
  ]

  watch(
    () => isOpen.value,
    async (open) => {
      if (open && props.tripId) {
        await memberStore.fetchByTripId(props.tripId)
      }
    }
  )

  async function onAddGuest() {
    if (!newGuestName.value.trim()) return

    isAdding.value = true
    try {
      await memberStore.addGuestMember(props.tripId, newGuestName.value, selectedRole.value)
      // Synchroniseer ook expenseStore zodat hij meteen in de "Betaald door"-dropdown staat
      await expenseStore.fetchByTripId(props.tripId)

      toast.add({
        title: 'Reisgenoot toegevoegd',
        description: `${newGuestName.value} is als gast toegevoegd.`,
        color: 'success'
      })
      newGuestName.value = ''
    } catch (err: any) {
      toast.add({
        title: 'Fout bij toevoegen',
        description: err.message,
        color: 'error'
      })
    } finally {
      isAdding.value = false
    }
  }

  async function handleRemove(member: Tables<'trip_members'>) {
    if (confirm(`Weet je zeker dat je ${member.display_name} wilt verwijderen?`)) {
      try {
        await memberStore.removeMember(member.id)
        await expenseStore.fetchByTripId(props.tripId)
        toast.add({ title: 'Lid verwijderd', color: 'success' })
      } catch (err: any) {
        toast.add({
          title: 'Verwijderen mislukt',
          description: 'Mogelijk heeft deze persoon al gekoppelde uitgaven.',
          color: 'error'
        })
      }
    }
  }

  function copyInviteLink() {
    const url = `${window.location.origin}/join/${props.tripId}`
    navigator.clipboard.writeText(url)
    toast.add({
      title: 'Link gekopieerd!',
      description: 'Deel deze link in de groepsapp zodat anderen kunnen meedoen.',
      color: 'success'
    })
  }
</script>

<template>
  <UModal v-model:open="isOpen" title="Reisgenoten & Leden"
    :description="`Beheer wie er meedoen aan ${props.tripName || 'deze vakantie'}`">
    <template #body>
      <div class="members-modal">
        <!-- Deelbare link knop -->
        <div class="members-modal__invite-box">
          <div class="members-modal__invite-text">
            <span class="font-semibold text-sm">Vrienden of familie uitnodigen</span>
            <span class="text-xs text-muted">Stuur een link zodat ze met hun eigen account deelnemen</span>
          </div>
          <UButton icon="i-lucide-share-2" label="Kopieer Uitnodigingslink" variant="soft" color="primary" size="sm"
            @click="copyInviteLink" />
        </div>

        <USeparator label="Of voeg een gast/schaduwlid toe" />

        <!-- Snel gast toevoegen (zonder account) -->
        <div class="members-modal__add-form">
          <UInput v-model="newGuestName" placeholder="Naam van gast (bijv. Tom of Moeder)" class="flex-1"
            @keydown.enter="onAddGuest" />
          <USelect v-model="selectedRole" :items="roleOptions" class="w-36" />
          <UButton icon="i-lucide-user-plus" label="Toevoegen" color="primary" :loading="isAdding"
            @click="onAddGuest" />
        </div>

        <!-- Huidige Leden Lijst -->
        <div class="members-list">
          <span class="members-list__title">Deelnemers ({{ memberStore.members.length }})</span>

          <div v-if="memberStore.isLoading" class="flex justify-center py-4">
            <UIcon name="i-lucide-loader-circle" class="animate-spin size-6 text-primary" />
          </div>

          <div v-else class="members-list__items">
            <div v-for="member in memberStore.members" :key="member.id" class="member-item">
              <div class="member-item__info">
                <UAvatar :text="member.display_name.slice(0, 2).toUpperCase()" size="sm" class="member-item__avatar" />
                <div class="member-item__details">
                  <span class="member-item__name">
                    {{ member.display_name }}
                    <span v-if="!member.user_id" class="member-item__guest-tag">(Gast)</span>
                  </span>
                  <span class="member-item__role">
                    {{ member.role === 'admin' ? 'Beheerder' : member.role === 'viewer' ? 'Kijker' : 'Deelnemer' }}
                  </span>
                </div>
              </div>

              <div class="member-item__actions">
                <UBadge v-if="member.role === 'admin'" color="primary" variant="subtle" size="xs">
                  Admin
                </UBadge>
                <UButton v-else icon="i-lucide-trash" variant="ghost" color="error" size="xs"
                  @click="handleRemove(member)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style lang="scss" scoped>
  .members-modal {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;

    &__invite-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: var(--ui-bg-elevated, #f9fafb);
      padding: 0.875rem 1rem;
      border-radius: 8px;
      border: 1px solid var(--ui-border, #e5e7eb);
      gap: 0.75rem;

      @media (max-width: 640px) {
        flex-direction: column;
        align-items: stretch;
      }
    }

    &__invite-text {
      display: flex;
      flex-direction: column;
    }

    &__add-form {
      display: flex;
      gap: 0.5rem;
      align-items: center;

      @media (max-width: 640px) {
        flex-direction: column;
        align-items: stretch;
      }
    }
  }

  .members-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    &__title {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ui-text-muted, #6b7280);
    }

    &__items {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--ui-border, #e5e7eb);
      border-radius: 8px;
      overflow: hidden;
    }
  }

  .member-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.625rem 0.875rem;
    border-bottom: 1px solid var(--ui-border-muted, #f3f4f6);

    &:last-child {
      border-bottom: none;
    }

    &__info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    &__avatar {
      background-color: var(--ui-bg-elevated, #e5e7eb);
      color: var(--ui-text, #111827);
      font-weight: 600;
    }

    &__details {
      display: flex;
      flex-direction: column;
    }

    &__name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--ui-text, #111827);
    }

    &__guest-tag {
      font-size: 0.75rem;
      color: var(--ui-text-muted, #6b7280);
      font-weight: 400;
    }

    &__role {
      font-size: 0.6875rem;
      color: var(--ui-text-muted, #6b7280);
    }

    &__actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  }
</style>