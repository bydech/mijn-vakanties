<!-- components/TripInviteModal.vue -->
<script setup lang="ts">

  const isOpen = defineModel<boolean>('open', { default: false })

  const props = defineProps<{
    invite: PendingInvite | null
  }>()

  const inviteStore = useInviteStore()
  const tripStore = useTripStore()
  const toast = useToast()
  const isProcessing = ref(false)

  async function onAccept() {
    if (!props.invite) return
    isProcessing.value = true
    try {
      await inviteStore.acceptInvite(props.invite.id)
      await tripStore.fetchAll()
      toast.add({
        title: 'Uitnodiging geaccepteerd!',
        description: `Je hebt nu toegang tot ${props.invite.trip?.name || 'de reis'}.`,
        color: 'success'
      })
      isOpen.value = false
      if (props.invite.trip_id) {
        navigateTo(`/reis/${props.invite.trip_id}`)
      }
    } catch (err: any) {
      toast.add({
        title: 'Fout bij accepteren',
        description: err.message || 'Kon uitnodiging niet accepteren.',
        color: 'error'
      })
    } finally {
      isProcessing.value = false
    }
  }

  async function onReject() {
    if (!props.invite) return
    isProcessing.value = true
    try {
      await inviteStore.rejectInvite(props.invite.id)
      toast.add({
        title: 'Uitnodiging afgewezen',
        color: 'neutral'
      })
      isOpen.value = false
    } catch (err: any) {
      toast.add({
        title: 'Fout bij afwijzen',
        description: err.message,
        color: 'error'
      })
    } finally {
      isProcessing.value = false
    }
  }
</script>

<template>
  <UModal v-model:open="isOpen" title="Reisuitnodiging"
    description="Je bent uitgenodigd om deel te nemen aan een reis.">
    <template #body>
      <div v-if="invite" class="flex flex-col gap-4">
        <div
          class="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850 flex items-center gap-3">
          <div class="size-11 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-plane" class="size-6" />
          </div>
          <div class="flex flex-col">
            <span class="font-bold text-base text-neutral-900 dark:text-white">
              {{ invite.trip?.name || 'Vakantie' }}
            </span>
            <span v-if="invite.trip?.destination" class="text-xs text-muted flex items-center gap-1">
              <UIcon name="i-lucide-map-pin" class="size-3.5" />
              {{ invite.trip.destination }}
            </span>
          </div>
        </div>

        <div class="text-sm text-neutral-600 dark:text-neutral-300">
          Je bent uitgenodigd met de rol:
          <UBadge color="primary" variant="subtle" size="xs" class="ml-1">
            {{ invite.role === 'admin' ? 'Beheerder' : invite.role === 'viewer' ? 'Kijker' : 'Deelnemer' }}
          </UBadge>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton label="Afwijzen" variant="ghost" color="neutral" :disabled="isProcessing" @click="onReject" />
        <UButton label="Accepteren & Openen" color="primary" icon="i-lucide-check" :loading="isProcessing"
          @click="onAccept" />
      </div>
    </template>
  </UModal>
</template>