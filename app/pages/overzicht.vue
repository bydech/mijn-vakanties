<!-- pages/overzicht.vue -->
<script setup lang="ts">
  import type { Tables } from '~/types/database.types'

  const tripStore = useTripStore()
  const isCreateOpen = ref(false)

  onMounted(async () => {
    if (tripStore.trips.length === 0) {
      await tripStore.fetchAll()
    }
  })

  function formatCurrency(amount: number | null, currency = 'EUR') {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: currency || 'EUR'
    }).format(amount || 0)
  }

  function formatDateRange(start?: string | null, end?: string | null) {
    if (!start) return 'Datum n.t.b.'
    const s = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' }).format(new Date(start))
    if (!end) return s
    const e = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(end))
    return `${s} - ${e}`
  }

  function onTripCreated(tripId: string) {
    navigateTo(`/reis/${tripId}`)
  }
</script>

<template>
  <UDashboardPanel class="trips-view">
    <template #header>
      <UDashboardNavbar title="Mijn Reizen">
        <template #right>
          <UButton icon="i-lucide-plus" label="Nieuwe Reis" color="primary" @click="isCreateOpen = true" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="trips-view__container">
        <!-- Loading indicator -->
        <div v-if="tripStore.isLoading" class="flex justify-center py-12">
          <UIcon name="i-lucide-loader-circle" class="animate-spin size-8 text-primary" />
        </div>

        <!-- Lege status -->
        <UEmpty v-else-if="tripStore.activeTrips.length === 0" icon="i-lucide-plane-takeoff"
          title="Nog geen actieve reizen" description="Plan je eerste reis om samen uitgaven bij te houden."
          class="py-12">
          <template #actions>
            <UButton icon="i-lucide-plus" label="Plan je eerste reis" @click="isCreateOpen = true" />
          </template>
        </UEmpty>

        <!-- Reizen Lijst / Kaarten -->
        <div v-else class="trips-grid">
          <UCard v-for="trip in tripStore.activeTrips" :key="trip.id"
            class="trip-card cursor-pointer transition-all hover:ring-2 hover:ring-primary/40"
            @click="navigateTo(`/reis/${trip.id}`)">
            <div class="trip-card__content">
              <div class="trip-card__header">
                <div class="trip-card__title-wrap">
                  <h3 class="trip-card__title">{{ trip.name }}</h3>
                  <div v-if="trip.destination" class="trip-card__destination">
                    <UIcon name="i-lucide-map-pin" class="size-4 text-muted shrink-0" />
                    <span>{{ trip.destination }}</span>
                  </div>
                </div>

                <UBadge variant="subtle" color="neutral" class="trip-card__badge">
                  {{ formatDateRange(trip.start_date, trip.end_date) }}
                </UBadge>
              </div>

              <div class="trip-card__footer">
                <div class="trip-card__budget">
                  <span class="trip-card__budget-label">Budget</span>
                  <span class="trip-card__budget-value">
                    {{ formatCurrency(trip.budget, trip.currency) }}
                  </span>
                </div>

                <UIcon name="i-lucide-chevron-right" class="size-5 text-muted" />
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Create Modal -->
  <TripModalCreate v-model:open="isCreateOpen" @created="onTripCreated" />
</template>

<style lang="scss" scoped>
  .trips-view {
    &__container {
      padding: 1rem;
      max-width: 900px;
      margin: 0 auto;
      width: 100%;
    }
  }

  .trips-grid {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;

    @media (min-width: 640px) {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .trip-card {
    &__content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    &__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
    }

    &__title {
      font-size: 1.0625rem;
      font-weight: 600;
      color: var(--ui-text, #111827);
      margin: 0;
    }

    &__destination {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8125rem;
      color: var(--ui-text-muted, #6b7280);
      margin-top: 0.25rem;
    }

    &__footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.75rem;
      border-top: 1px solid var(--ui-border, #e5e7eb);
    }

    &__budget {
      display: flex;
      flex-direction: column;
    }

    &__budget-label {
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ui-text-muted, #6b7280);
    }

    &__budget-value {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--ui-text, #111827);
    }
  }
</style>