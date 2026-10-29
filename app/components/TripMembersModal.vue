<!-- components/TripMembersModal.vue -->
<script setup lang="ts">
  import type { Tables } from '~/types/database.types'

  const isOpen = defineModel<boolean>('open', { default: false })
  const props = defineProps<{
    tripId: string
    tripName?: string
  }>()

  const memberStore = useMemberStore()
  const inviteStore = useInviteStore()
  const expenseStore = useExpenseStore()
  const toast = useToast()

  // 1. E-mail uitnodiging state
  const emailInput = ref('')
  const selectedEmailRole = ref<'member' | 'viewer'>('member')
  const isEmailSubmitting = ref(false)

  // 2. Gast toevoegen state
  const guestNameInput = ref('')
  const isGuestSubmitting = ref(false)

  const roleOptions = [
    { label: 'Deelnemer', value: 'member' },
    { label: 'Kijker', value: 'viewer' }
  ]

  // Actie: Uitnodigen via e-mail
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

  // Actie: Gast toevoegen (altijd als 'viewer')
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

  // Uitnodiging intrekken
  async function onCancelInvite(inviteId: string) {
    try {
      await inviteStore.cancelInvite(inviteId)
      toast.add({
        title: 'Uitnodiging ingetrokken',
        color: 'neutral'
      })
    } catch (err: any) {
      toast.add({
        title: 'Fout bij intrekken',
        description: err.message || 'Kon uitnodiging niet intrekken.',
        color: 'error'
      })
    }
  }

  // Delete modal state voor bestaande leden
  const isDeleteOpen = ref(false)
  const selectedMemberForDelete = ref<Tables<'trip_members'> | null>(null)

  function openDeleteModal(member: Tables<'trip_members'>) {
    selectedMemberForDelete.value = member
    isDeleteOpen.value = true
  }

  const totalParticipantsCount = computed(() => {
    return memberStore.members.length + inviteStore.currentTripInvites.length
  })

  watch(
    () => isOpen.value,
    async (open) => {
      if (open && props.tripId) {
        await Promise.all([
          memberStore.fetchByTripId(props.tripId),
          inviteStore.fetchTripInvites(props.tripId)
        ])
      }
    }
  )
</script>

<template>
  <UModal v-model:open="isOpen" title="Reisgenoten & Deelnemers"
    :description="`Beheer wie er toegang hebben tot ${props.tripName || 'deze vakantie'}`">
    <template #body>
      <div class="members-modal">

        <!-- Sectie 1: Uitnodigen via e-mail (met account) -->
        <section class="member-section">
          <div class="member-section__header">
            <UIcon name="i-lucide-mail" class="member-section__icon" />
            <div class="member-section__meta">
              <h4 class="member-section__title">Deelnemer uitnodigen</h4>
              <p class="member-section__desc">
                Nodig iemand uit met een e-mailadres. Diegene kan zelf inloggen en uitgaven toevoegen.
              </p>
            </div>
          </div>

          <div class="member-section__form">
            <div class="member-section__fields">
              <UInput v-model="emailInput" type="email" placeholder="naam@voorbeeld.nl" class="member-section__input" />
              <USelect v-model="selectedEmailRole" :items="roleOptions" class="member-section__select" />
            </div>
            <UButton icon="i-lucide-send" label="Uitnodiging versturen" color="primary" :loading="isEmailSubmitting"
              class="member-section__submit" @click="onInviteByEmail" />
          </div>
        </section>

        <USeparator />

        <!-- Sectie 2: Gast toevoegen (zonder account) -->
        <section class="member-section">
          <div class="member-section__header">
            <UIcon name="i-lucide-user" class="member-section__icon" />
            <div class="member-section__meta">
              <h4 class="member-section__title">Gast toevoegen</h4>
              <p class="member-section__desc">
                Voor reisgenoten zonder account (bijv. kinderen of meereizenden). Je beheert hun uitgaven zelf.
              </p>
            </div>
          </div>

          <div class="member-section__form">
            <div class="member-section__fields member-section__fields--single">
              <UInput v-model="guestNameInput" placeholder="Naam van gast (bijv. Tom of Lisa)"
                class="member-section__input" />
            </div>
            <UButton icon="i-lucide-user-plus" label="Gast toevoegen" :loading="isGuestSubmitting"
              class="member-section__submit" @click="onAddGuest" />
          </div>
        </section>

        <USeparator />

        <!-- Sectie 3: Huidige Leden & Openstaande Uitnodigingen Lijst -->
        <div class="members-list">
          <span class="members-list__title">
            Deelnemers ({{ totalParticipantsCount }})
          </span>

          <div v-if="memberStore.isLoading || inviteStore.isLoading" class="members-list__loader">
            <UIcon name="i-lucide-loader-circle" class="members-list__loader-icon" />
          </div>

          <div v-else class="members-list__items">
            <!-- 1. Openstaande uitnodigingen (Pending) -->
            <div v-for="invite in inviteStore.currentTripInvites" :key="invite.id"
              class="member-item member-item--pending">
              <div class="member-item__info">
                <UAvatar icon="i-lucide-mail" size="sm" class="member-item__avatar member-item__avatar--pending" />
                <div class="member-item__details">
                  <div class="member-item__header">
                    <span class="member-item__name">{{ invite.email }}</span>
                    <UBadge color="warning" variant="subtle" size="xs">
                      In afwachting
                    </UBadge>
                  </div>
                  <span class="member-item__role">
                    Uitgenodigd als {{ invite.role === 'viewer' ? 'kijker' : 'deelnemer' }}
                  </span>
                </div>
              </div>

              <div class="member-item__actions">
                <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="xs" title="Uitnodiging intrekken"
                  @click="onCancelInvite(invite.id)" />
              </div>
            </div>

            <!-- 2. Reeds geaccepteerde leden en gasten -->
            <div v-for="member in memberStore.members" :key="member.id" class="member-item">
              <div class="member-item__info">
                <UAvatar :text="member.display_name.slice(0, 2).toUpperCase()" size="sm" class="member-item__avatar" />
                <div class="member-item__details">
                  <div class="member-item__header">
                    <span class="member-item__name">{{ member.display_name }}</span>
                    <UBadge v-if="!member.user_id" color="neutral" variant="subtle" size="xs">
                      Gast
                    </UBadge>
                  </div>
                  <span class="member-item__role">
                    {{ member.role === 'admin' ? 'Beheerder' : member.role === 'viewer' ? 'Kijker' : 'Deelnemer' }}
                  </span>
                </div>
              </div>

              <div class="member-item__actions">
                <UBadge v-if="member.role === 'admin'" color="primary" variant="subtle" size="sm">
                  Admin
                </UBadge>
                <UButton v-else icon="i-lucide-trash" variant="ghost" color="error" size="xs"
                  title="Deelnemer verwijderen" @click="openDeleteModal(member)" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </template>
  </UModal>

  <TripMemberModalDelete v-model:open="isDeleteOpen" :member="selectedMemberForDelete" :trip-id="props.tripId" />
</template>

<style lang="scss" scoped>
  .members-modal {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .member-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    &__header {
      display: flex;
      align-items: flex-start;
      gap: 0.625rem;
    }

    &__icon {
      font-size: 1.125rem;
      color: var(--ui-primary, #10b981);
      margin-top: 0.125rem;
      flex-shrink: 0;
    }

    &__meta {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    &__title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--ui-text-highlighted, #111827);
      margin: 0;
    }

    &__desc {
      font-size: 0.75rem;
      color: var(--ui-text-muted, #6b7280);
      margin: 0;
      line-height: 1.35;
    }

    &__form {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }

    &__fields {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.5rem;

      @media (min-width: 640px) {
        grid-template-columns: 1fr 140px;
      }

      &--single {
        grid-template-columns: 1fr;

        @media (min-width: 640px) {
          grid-template-columns: 1fr;
        }
      }
    }

    &__input,
    &__select {
      width: 100%;
    }

    &__submit {
      align-self: flex-end;
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

    &__loader {
      display: flex;
      justify-content: center;
      padding: 1rem 0;

      &-icon {
        font-size: 1.5rem;
        color: var(--ui-primary, #10b981);
        animation: spin 1s linear infinite;
      }
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

    &--pending {
      background-color: var(--ui-bg-elevated, #fafafa);
    }

    &__info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }

    &__avatar {
      background-color: var(--ui-bg-elevated, #e5e7eb);
      color: var(--ui-text, #111827);
      font-weight: 600;

      &--pending {
        background-color: #fef3c7;
        color: #d97706;
      }
    }

    &__details {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    &__header {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      flex-wrap: wrap;
    }

    &__name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--ui-text, #111827);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__role {
      font-size: 0.6875rem;
      color: var(--ui-text-muted, #6b7280);
    }

    &__actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
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