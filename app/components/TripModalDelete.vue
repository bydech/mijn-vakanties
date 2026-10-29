<!-- components/TripModalDelete.vue -->
<script setup lang="ts">
  import type { Tables } from '~/types/database.types'

  const isOpen = defineModel<boolean>('open', { default: false })

  const props = defineProps<{
    trip: Tables<'trips'> | null
  }>()

  const tripStore = useTripStore()
  const toast = useToast()
  const isDeleting = ref(false)

  // components/TripModalDelete.vue
  async function onConfirmDelete() {
    if (!props.trip) return

    // Sla de gegevens lokaal op vóórdat de store wordt geleegd
    const tripId = props.trip.id
    const tripName = props.trip.name

    isDeleting.value = true
    try {
      // 1. Sluit eerst de modal zodat Vue niet probeert te her-renderen met een lege trip
      isOpen.value = false

      // 2. Verwijder de reis uit Supabase en Pinia
      await tripStore.deleteTrip(tripId)

      // 3. Toon de succesmelding
      toast.add({
        title: 'Reis verwijderd',
        description: `"${tripName}" is permanent verwijderd.`,
        color: 'success'
      })

      // 4. Redirect direct naar de reizen pagina
      await navigateTo('/reizen')
    } catch (err: any) {
      // Bij een fout: heropen de modal en toon error
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
      <div class="delete-trip">
        <div class="delete-trip__warning-box">
          <UIcon name="i-lucide-alert-triangle" class="delete-trip__warning-icon" />
          <div class="delete-trip__warning-text">
            <span class="delete-trip__warning-title">Deze actie kan niet ongedaan worden gemaakt</span>
            <p class="delete-trip__warning-desc">
              Alle geregistreerde uitgaven, kostenverdelingen, bonnetjes en categorieën van
              <strong>{{ props.trip?.name || 'deze reis' }}</strong> worden permanent verwijderd.
            </p>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="delete-trip__actions">
        <UButton label="Annuleren" variant="ghost" color="neutral" :disabled="isDeleting" @click="isOpen = false" />
        <UButton icon="i-lucide-trash" label="Definitief verwijderen" color="error" :loading="isDeleting"
          @click="onConfirmDelete" />
      </div>
    </template>
  </UModal>
</template>

<style lang="scss" scoped>
  .delete-trip {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    &__warning-box {
      display: flex;
      gap: 0.875rem;
      padding: 0.875rem 1rem;
      border-radius: 8px;
      background-color: #fef2f2;
      border: 1px solid #fee2e2;

      @media (prefers-color-scheme: dark) {
        background-color: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.2);
      }
    }

    &__warning-icon {
      font-size: 1.25rem;
      color: #ef4444;
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    &__warning-text {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    &__warning-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #991b1b;

      @media (prefers-color-scheme: dark) {
        color: #fca5a5;
      }
    }

    &__warning-desc {
      font-size: 0.8125rem;
      color: #b91c1c;
      margin: 0;
      line-height: 1.4;

      @media (prefers-color-scheme: dark) {
        color: #f87171;
      }
    }

    &__actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
    }
  }
</style>