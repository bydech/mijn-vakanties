<!-- pages/notificaties.vue -->
<script setup lang="ts">
  import type { PendingInvite } from '~/stores/invites'

  const inviteStore = useInviteStore()
  const tripStore = useTripStore()
  const toast = useToast()

  const processingId = ref<string | null>(null)

  onMounted(async () => {
    await inviteStore.fetchMyPendingInvites()
  })

  function getInviterName(invite: PendingInvite) {
    const members = invite.trip?.members || []
    if (invite.invited_by) {
      const direct = members.find((m) => m.user_id === invite.invited_by || m.id === invite.invited_by)
      if (direct?.display_name) return direct.display_name
    }
    const creator = members.find((m) => m.user_id === invite.trip?.created_by || m.role === 'admin')
    return creator?.display_name || 'Een reisgenoot'
  }

  async function handleAccept(invite: PendingInvite) {
    processingId.value = invite.id
    try {
      await inviteStore.acceptInvite(invite.id)
      await tripStore.fetchAll()
      toast.add({
        title: 'Uitnodiging geaccepteerd!',
        description: `Je bent nu deelnemer van ${invite.trip?.name || 'de vakantie'}.`,
        color: 'success'
      })
    } catch (err: any) {
      toast.add({
        title: 'Fout bij accepteren',
        description: err.message || 'Kon uitnodiging niet accepteren.',
        color: 'error'
      })
    } finally {
      processingId.value = null
    }
  }

  async function handleReject(invite: PendingInvite) {
    processingId.value = invite.id
    try {
      await inviteStore.rejectInvite(invite.id)
      toast.add({
        title: 'Uitnodiging afgewezen',
        color: 'neutral'
      })
    } catch (err: any) {
      toast.add({
        title: 'Fout bij afwijzen',
        description: err.message || 'Kon uitnodiging niet afwijzen.',
        color: 'error'
      })
    } finally {
      processingId.value = null
    }
  }
</script>

<template>
  <div class="notifications-page">
    <div class="notifications-page__header">
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" to="/overzicht" />
        <h1 class="text-xl font-bold text-highlighted">Notificaties</h1>
      </div>
      <UBadge v-if="inviteStore.pendingInvites.length > 0" :label="`${inviteStore.pendingInvites.length} nieuw`"
        color="primary" variant="subtle" />
    </div>

    <!-- Loading State -->
    <div v-if="inviteStore.isLoading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="animate-spin size-7 text-primary" />
    </div>

    <!-- Lege staat -->
    <div v-else-if="inviteStore.pendingInvites.length === 0" class="notifications-page__empty">
      <div class="notifications-page__empty-icon">
        <UIcon name="i-lucide-bell-off" class="size-8 text-muted" />
      </div>
      <h3 class="font-semibold text-base text-highlighted mt-3">Geen nieuwe meldingen</h3>
      <p class="text-xs text-muted max-w-xs mt-1">
        Je hebt op dit moment geen openstaande uitnodigingen of berichten.
      </p>
    </div>

    <!-- Notificaties lijst -->
    <div v-else class="notifications-page__list">
      <div class="text-xs font-semibold uppercase tracking-wider text-muted px-1">
        Reisuitnodigingen
      </div>

      <div v-for="invite in inviteStore.pendingInvites" :key="invite.id" class="notification-card">
        <div class="notification-card__body">
          <UAvatar icon="i-lucide-plane" size="md" class="bg-primary/10 text-primary shrink-0" />

          <div class="notification-card__content">
            <h4 class="font-semibold text-sm text-highlighted">
              {{ invite.trip?.name || 'Onbekende vakantie' }}
            </h4>
            <p class="text-xs text-muted mt-0.5">
              <strong>{{ getInviterName(invite) }}</strong> heeft je uitgenodigd als
              <span class="font-medium text-default">
                {{ invite.role === 'viewer' ? 'kijker' : 'deelnemer' }}
              </span>.
            </p>
          </div>
        </div>

        <div class="notification-card__actions">
          <UButton label="Afwijzen" color="neutral" variant="ghost" size="sm" :disabled="processingId === invite.id"
            @click="handleReject(invite)" />
          <UButton label="Accepteren" color="primary" variant="solid" size="sm" :loading="processingId === invite.id"
            @click="handleAccept(invite)" />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .notifications-page {
    max-width: 640px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;

    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--ui-border, #e5e7eb);
    }

    &__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 3.5rem 1rem;

      &-icon {
        padding: 0.875rem;
        border-radius: 9999px;
        background-color: var(--ui-bg-elevated, #f3f4f6);
      }
    }

    &__list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
  }

  .notification-card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    border-radius: 10px;
    background-color: var(--ui-bg, #ffffff);
    border: 1px solid var(--ui-border, #e5e7eb);

    @media (min-width: 640px) {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }

    &__body {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    &__content {
      display: flex;
      flex-direction: column;
    }

    &__actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.5rem;
    }
  }

</style>
