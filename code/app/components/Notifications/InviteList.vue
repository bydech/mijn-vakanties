<!-- components/NotificationInviteList.vue -->
<script setup lang="ts">
  import type { PendingInvite } from '~/types/pocketbase.types'

  const inviteStore = useInviteStore()
  const tripStore = useTripStore()
  const toast = useToast()

  const processingId = ref<string | null>(null)

  function getTripName(invite: PendingInvite): string {
    return invite.expand?.trip?.name || 'Onbekende vakantie'
  }

  function getInviterName(invite: any): string {
    const inviter = invite.expand?.invited_by
    if (inviter) {
      return inviter.name || inviter.email?.split('@')[0] || 'Een reisgenoot'
    }
    return 'Een reisgenoot'
  }

  function getInviteDescription(invite: PendingInvite): string {
    const roleLabel = invite.role === 'viewer' ? 'kijker' : 'deelnemer'
    return `${getInviterName(invite)} heeft je uitgenodigd als ${roleLabel}.`
  }

  async function handleAccept(invite: PendingInvite) {
    processingId.value = invite.id
    try {
      await inviteStore.acceptInvite(invite.id)
      await tripStore.fetchAll()
      toast.add({
        title: 'Uitnodiging geaccepteerd!',
        description: `Je bent nu deelnemer van ${getTripName(invite)}.`,
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
  <section class="notification-section">
    <span class="notification-section__title">Reisuitnodigingen</span>

    <UAlert v-for="invite in inviteStore.pendingInvites" :key="invite.id" icon="i-lucide-plane" color="primary"
      variant="subtle" orientation="horizontal" :title="getTripName(invite)"
      :description="getInviteDescription(invite)">
      <template #actions>
        <UButton label="Afwijzen" color="neutral" variant="ghost" size="xs" :disabled="processingId === invite.id"
          @click="handleReject(invite)" />
        <UButton label="Accepteren" color="primary" variant="solid" size="xs" :loading="processingId === invite.id"
          @click="handleAccept(invite)" />
      </template>
    </UAlert>
  </section>
</template>