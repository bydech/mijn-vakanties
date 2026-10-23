<!-- pages/join/[id].vue -->
<script setup lang="ts">
  const route = useRoute()
  const tripId = route.params.id as string

  const memberStore = useMemberStore()
  const tripStore = useTripStore()
  const supabaseUser = useSupabaseUser()
  const toast = useToast()

  const isLoading = ref(true)

  onMounted(async () => {
    // Als de gebruiker niet is ingelogd, stuur eerst naar login met return url
    if (!supabaseUser.value) {
      navigateTo(`/login?redirect=/join/${tripId}`)
      return
    }

    try {
      await memberStore.joinTripWithCurrentUser(tripId)
      await tripStore.fetchById(tripId)

      toast.add({
        title: 'Welkom bij de reis!',
        description: `Je bent nu deelnemer van ${tripStore.currentTrip?.name || 'de vakantie'}.`,
        color: 'success'
      })

      navigateTo(`/reis/${tripId}`)
    } catch (err: any) {
      toast.add({
        title: 'Deelnemen mislukt',
        description: err.message || 'Kon niet deelnemen aan de reis.',
        color: 'error'
      })
      navigateTo('/overzicht')
    } finally {
      isLoading.value = false
    }
  })
</script>

<template>
  <div class="flex min-h-screen items-center justify-center p-4">
    <div class="text-center space-y-4">
      <UIcon name="i-lucide-loader-circle" class="animate-spin size-10 text-primary mx-auto" />
      <h2 class="text-lg font-semibold">Deelnemen aan vakantie...</h2>
      <p class="text-sm text-muted">We voegen je toe aan het reisoverzicht.</p>
    </div>
  </div>
</template>