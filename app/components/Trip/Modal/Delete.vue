<!-- components/TripModalDelete.vue -->
<script setup lang="ts">
  import type { TripRecord } from '~/types/pocketbase.types'

  const isOpen = defineModel<boolean>('open', { default: false })

  const props = defineProps<{
    trip: TripRecord | null
  }>()

  const tripStore = useTripStore()
  const toast = useToast()
  const isDeleting = ref(false)

  async function onConfirmDelete() {
    if (!props.trip) return

    isDeleting.value = true
    try {
      isOpen.value = false

      await tripStore.deleteTrip(props.trip.id)

      toast.add({
        title: 'Reis verwijderd',
        description: `"${props.trip.name}" is permanent verwijderd.`,
        color: 'success'
      })

      await navigateTo('/reizen')
    } catch (err: any) {
      isOpen.value = true
      toast.add({
        title: 'Fout bij verwijderen',
        description: err.message || 'Kon reis niet verwijderen.',
        color: 'error'
      })
    } finally {
      isDeleting.value = false
    }
  }
</script>

<template>
  <UModal v-model:open="isOpen" title="Reis definitief verwijderen"
    description="Weet je zeker dat je deze reis wilt wissen?">
    <template #body>
      <UAlert icon="i-lucide-alert-triangle" color="error" variant="subtle"
        title="Deze actie kan niet ongedaan worden gemaakt"
        :description="`Alle geregistreerde uitgaven, kostenverdelingen, bonnetjes en categorieën van ${props.trip?.name || 'deze reis'} worden permanent verwijderd.`" />
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton label="Annuleren" variant="ghost" color="neutral" :disabled="isDeleting" @click="isOpen = false" />
        <UButton icon="i-lucide-trash" label="Definitief verwijderen" color="error" :loading="isDeleting"
          @click="onConfirmDelete" />
      </div>
    </template>
  </UModal>
</template>
