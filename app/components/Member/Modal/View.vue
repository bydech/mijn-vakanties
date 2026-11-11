<!-- components/TripMembersModal.vue -->
<script setup lang="ts">
  import ActionList from '~/components/Common/ActionList.vue';
  import ActionListItem from '~/components/Common/ActionListItem.vue';
  import type { TripRecord, TripMemberRecord } from '~/types/pocketbase.types'

  const isOpen = defineModel<boolean>('open', { default: false })

  const props = defineProps<{
    trip: TripRecord
  }>()

  const memberStore = useMemberStore()
  const inviteStore = useInviteStore()
  const toast = useToast()

  const isCreateOpen = ref(false)
  const isDeleteOpen = ref(false)
  const selectedMemberForDelete = ref<TripMemberRecord | null>(null)

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

  function openDeleteModal(member: TripMemberRecord) {
    selectedMemberForDelete.value = member
    isDeleteOpen.value = true
  }

  watch(
    () => isOpen.value,
    async (open) => {
      if (open && props.trip.id) {
        await Promise.all([
          memberStore.fetchByTripId(props.trip.id),
          inviteStore.fetchTripInvites(props.trip.id)
        ])
      }
    }
  )
</script>

<template>
  <div>
    <UModal v-model:open="isOpen" title="Reisgenoten & Deelnemers"
      :description="`Beheer wie er toegang hebben tot ${props.trip.name || 'deze vakantie'}`">
      <template #body>


        <div v-if="memberStore.isLoading || inviteStore.isLoading" class="flex justify-center py-6">
          <UIcon name="i-lucide-loader-circle" class="animate-spin size-6 text-primary" />
        </div>

        <ActionList v-else add-button-label="Deelnemer / gast toevoegen"
          :show-add-button="memberStore.isCurrentUserAdmin" @add="isCreateOpen = true">


          <ActionListItem v-for="invite in inviteStore.currentTripInvites" :key="invite.id" :title="invite.email"
            :subtitle="`Uitgenodigd als ${invite.role === 'viewer' ? 'kijker' : 'deelnemer'}`" is-pending>
            <template #leading>
              <UAvatar icon="i-lucide-mail" size="sm" />
            </template>

            <template #badge>
              <UBadge color="warning" variant="subtle" size="xs">
                In afwachting
              </UBadge>
            </template>

            <template #actions>
              <UButton v-if="memberStore.isCurrentUserAdmin" icon="i-lucide-x" variant="ghost" color="neutral" size="xs"
                title="Uitnodiging intrekken" @click="onCancelInvite(invite.id)" />
            </template>
          </ActionListItem>

          <ActionListItem v-for="member in memberStore.members" :key="member.id" :title="member.display_name"
            :subtitle="member.user === props.trip.created_by ? 'Organisator / Beheerder' : (member.role === 'viewer' ? 'Kijker' : 'Deelnemer')"
            :can-delete="memberStore.isCurrentUserAdmin && member.user !== props.trip.created_by"
            @delete="openDeleteModal(member)">
            <template #leading>
              <UAvatar :text="member.display_name.slice(0, 2).toUpperCase()" size="sm" />
            </template>
          </ActionListItem>
        </ActionList>
      </template>
    </UModal>

    <MemberModalCreate v-model:open="isCreateOpen" :trip-id="props.trip.id" />
    <MemberModalDelete v-model:open="isDeleteOpen" :member="selectedMemberForDelete" :trip-id="props.trip.id" />
  </div>
</template>