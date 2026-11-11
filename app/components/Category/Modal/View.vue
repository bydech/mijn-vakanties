<!-- components/TripCategoriesModal.vue -->
<script setup lang="ts">
  import ActionList from '~/components/Common/ActionList.vue';
  import ActionListItem from '~/components/Common/ActionListItem.vue';
  import type { TripCategoryRecord } from '~/types/pocketbase.types'

  const isOpen = defineModel<boolean>('open', { default: false })

  const props = defineProps<{
    tripId: string
    tripName?: string
  }>()

  const categoryStore = useCategoryStore()
  const memberStore = useMemberStore()

  const isCreateOpen = ref(false)
  const isUpdateOpen = ref(false)
  const isDeleteOpen = ref(false)

  const selectedCategoryForEdit = ref<TripCategoryRecord | null>(null)
  const selectedCategoryForDelete = ref<TripCategoryRecord | null>(null)

  function openCreateModal() {
    isCreateOpen.value = true
  }

  function openEditModal(cat: TripCategoryRecord) {
    selectedCategoryForEdit.value = cat
    isUpdateOpen.value = true
  }

  function openDeleteModal(cat: TripCategoryRecord) {
    selectedCategoryForDelete.value = cat
    isDeleteOpen.value = true
  }

  watch(
    () => isOpen.value,
    async (open) => {
      if (open && props.tripId) {
        await categoryStore.fetchByTripId(props.tripId)
      }
    }
  )
</script>

<template>
  <div>
    <UModal v-model:open="isOpen" title="Categorieën Beheren"
      :description="`Pas de categorieën aan voor ${props.tripName || 'deze vakantie'}`">
      <template #body>

        <div v-if="categoryStore.isLoading" class="flex justify-center py-6">
          <UIcon name="i-lucide-loader-circle" class="animate-spin size-6 text-primary" />
        </div>

        <ActionList v-else add-button-label="Nieuwe categorie toevoegen"
          :show-add-button="memberStore.isCurrentUserAdmin" @add="openCreateModal">
          <ActionListItem v-for="cat in categoryStore.categories" :key="cat.id" :title="cat.name"
            :icon="cat.icon || 'i-lucide-receipt'" :icon-color="cat.color" :can-update="memberStore.isCurrentUserAdmin"
            :can-delete="memberStore.isCurrentUserAdmin" @edit="openEditModal(cat)" @delete="openDeleteModal(cat)" />
        </ActionList>
      </template>
    </UModal>

    <!-- Sub-modals voor Create, Update & Delete -->
    <CategoryModalCreate v-model:open="isCreateOpen" :trip-id="props.tripId" />
    <CategoryModalUpdate v-model:open="isUpdateOpen" :category="selectedCategoryForEdit" />
    <CategoryModalDelete v-model:open="isDeleteOpen" :category="selectedCategoryForDelete" :trip-id="props.tripId" />
  </div>
</template>