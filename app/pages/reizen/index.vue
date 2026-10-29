<!-- pages/reizen/index.vue -->
<script setup lang="ts">
  import type { TabsItem } from '@nuxt/ui'

  const tripStore = useTripStore()
  const inviteStore = useInviteStore()
  const { getThumbnailUrl } = useTripThumbnail()

  const isCreateTripOpen = ref(false)

  const tabItems = computed<TabsItem[]>(() => [
    {
      label: 'Actief',
      icon: 'i-lucide-plane',
      value: 'active'
    },
    {
      label: 'Archief',
      icon: 'i-lucide-archive',
      value: 'archived'
    }
  ])

  const activeTab = ref<'active' | 'archived'>('active')

  const displayedTrips = computed(() => {
    return activeTab.value === 'active'
      ? tripStore.activeTrips
      : tripStore.archivedTrips
  })

  const fetchData = async () => {
    await Promise.all([
      tripStore.fetchAll(),
      inviteStore.fetchMyPendingInvites()
    ])
  }

  onMounted(() => {
    fetchData()
  })

  function formatDateRange(startDate: string | null, endDate: string | null): string {
    if (!startDate) return 'Datum onbekend'
    const start = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' }).format(new Date(startDate))
    if (!endDate) return start
    const end = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' }).format(new Date(endDate))
    return `${start} - ${end}`
  }
</script>

<template>
  <UDashboardPanel class="reizen-view">
    <template #header>
      <UDashboardNavbar title="Mijn Reizen" />
      <UDashboardToolbar>
        <template #right>
          <UTabs v-model="activeTab" :items="tabItems" :content="false" variant="pill" size="sm" />
          <UButton icon="i-lucide-plus" label="Nieuwe Reis" size="sm" @click="isCreateTripOpen = true" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="tripStore.isLoading" class="reizen-view__loader">
        <UIcon name="i-lucide-loader-circle" class="reizen-view__loader-icon" />
      </div>

      <UEmpty v-else-if="displayedTrips.length === 0"
        :icon="activeTab === 'active' ? 'i-lucide-plane-takeoff' : 'i-lucide-archive'"
        :title="activeTab === 'active' ? 'Geen actieve reizen' : 'Geen gearchiveerde reizen'" :description="activeTab === 'active'
          ? 'Plan je eerste reis om samen uitgaven bij te houden.'
          : 'Vakanties die je afrondt en archiveert verschijnen hier.'" class="reizen-view__empty">
        <template #actions>
          <UButton v-if="activeTab === 'active'" icon="i-lucide-plus" label="Plan je eerste reis"
            @click="isCreateTripOpen = true" />
        </template>
      </UEmpty>

      <!-- Grid met BEM Cards -->
      <div v-else class="trips-grid">
        <UCard v-for="trip in displayedTrips" :key="trip.id" class="trip-card"
          :class="{ 'trip-card--archived': trip.is_archived }" @click="navigateTo(`/reizen/${trip.id}`)">
          <template #header>
            <div class="trip-card__header">
              <h3 class="trip-card__title">
                {{ trip.name }}
              </h3>
              <UBadge variant="subtle" color="neutral" size="sm" class="trip-card__badge">
                {{ formatDateRange(trip.start_date, trip.end_date) }}
              </UBadge>
            </div>
          </template>

          <div class="trip-card__image-container">
            <img :src="getThumbnailUrl(trip.thumbnail_path) || `https://picsum.photos/seed/${trip.id}/600/300`"
              :alt="trip.name" class="trip-card__image" loading="lazy" />
          </div>

          <template #footer>
            <div class="trip-card__footer">
              <div class="trip-card__location">
                <UIcon name="i-lucide-map-pin" class="trip-card__location-icon" />
                <span class="trip-card__location-text">
                  {{ trip.destination || 'Geen bestemming' }}
                </span>
              </div>
              <UIcon name="i-lucide-chevron-right" class="trip-card__arrow-icon" />
            </div>
          </template>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Create Modal -->
  <TripModalCreate v-model:open="isCreateTripOpen" />
</template>

<style lang="scss" scoped>
  .reizen-view {
    &__loader {
      display: flex;
      justify-content: center;
      padding: 3rem 0;
    }

    &__loader-icon {
      font-size: 2rem;
      color: var(--ui-primary);
      animation: spin 1s linear infinite;
    }

    &__empty {
      padding: 3rem 0;
    }
  }

  .trips-grid {
    display: grid;
    grid-template-columns: repeat(1, minmax(0, 1fr));
    gap: 0.875rem;

    @media (min-width: 640px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (min-width: 1024px) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    @media (min-width: 1536px) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    @media (min-width: 1920px) {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }

    @media (min-width: 2400px) {
      grid-template-columns: repeat(6, minmax(0, 1fr));
    }
  }

  .trip-card {
    cursor: pointer;
    overflow: hidden;
    transition: box-shadow 0.2s ease, transform 0.2s ease;

    &:hover {
      box-shadow: 0 0 0 2px var(--ui-primary);
    }

    &--archived {
      opacity: 0.75;
    }

    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    &__title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--ui-text-highlighted);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__badge {
      flex-shrink: 0;
    }

    &__image-container {
      margin: -1rem -1rem;
      overflow: hidden;

      @media (min-width: 640px) {
        margin: -1.5rem -1.5rem;
      }
    }

    &__image {
      width: 100%;
      height: 9.5rem;
      object-fit: cover;
      display: block;

    }

    &__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    &__location {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      min-width: 0;
    }

    &__location-icon {
      font-size: 1rem;
      flex-shrink: 0;
      color: var(--ui-text-muted);
    }

    &__location-text {
      font-size: 0.8125rem;
      color: var(--ui-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__arrow-icon {
      font-size: 1.125rem;
      flex-shrink: 0;
      color: var(--ui-text-muted);
      transition: transform 0.2s ease;

      .trip-card:hover & {
        transform: translateX(2px);
        color: var(--ui-text-highlighted, #111827);
      }
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