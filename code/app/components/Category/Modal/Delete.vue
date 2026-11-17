<!-- components/TripCategoryModalDelete.vue -->
<script setup lang="ts">
  import type { TripCategoryRecord } from '~/types/pocketbase.types'

  const isOpen = defineModel<boolean>('open', { default: false })

  const props = defineProps<{
    category: TripCategoryRecord | null
    tripId: string
  }>()

  const emit = defineEmits<{
    (e: 'deleted', categoryId: string): void
  }>()

  const { $pb } = useNuxtApp()
  const categoryStore = useCategoryStore()
  const toast = useToast()

  const isChecking = ref(false)
  const isDeleting = ref(false)
  const linkedExpensesCount = ref(0)

  const hasExpenses = computed(() => linkedExpensesCount.value > 0)

  watch(
    [() => isOpen.value, () => props.category],
    async ([open, category]) => {
      if (open && category) {
        await checkLinkedExpenses(category.id)
      } else {
        linkedExpensesCount.value = 0
      }
    },
    { immediate: true }
  )

  async function checkLinkedExpenses(categoryId: string) {
    if (!$pb) return
    isChecking.value = true
    try {
      const res = await $pb.collection('expenses').getList(1, 1, {
        filter: `category = "${categoryId}"`
      })
      linkedExpensesCount.value = res.totalItems || 0
    } catch (err) {
      console.error('Fout bij controleren van categorie-uitgaven:', err)
    } finally {
      isChecking.value = false
    }
  }

  async function onConfirmDelete() {
    if (!props.category || hasExpenses.value) return

    isDeleting.value = true
    try {
      const categoryId = props.category.id
      const categoryName = props.category.name

      await categoryStore.deleteCategory(categoryId)

      toast.add({
        title: 'Categorie verwijderd',
        description: `"${categoryName}" is succesvol verwijderd.`,
        color: 'success'
      })

      emit('deleted', categoryId)
      isOpen.value = false
    } catch (err: any) {
      toast.add({
        title: 'Fout bij verwijderen',
        description: err.message || 'Kon categorie niet verwijderen.',
        color: 'error'
      })
    } finally {
      isDeleting.value = false
    }
  }
</script>

<template>
  <UModal v-model:open="isOpen" :title="hasExpenses ? 'Kan niet verwijderd worden' : 'Categorie Verwijderen'"
    :ui="{ footer: 'justify-end' }">
    <template #body>
      <div v-if="props.category">
        <UAlert v-if="hasExpenses" icon="i-lucide-ban" color="warning" variant="soft"
          title="Verwijderen niet toegestaan">
          <template #description>
            <p>
              De categorie <strong>"{{ props.category.name }}"</strong> is nog gekoppeld aan
              <strong>{{ linkedExpensesCount }}</strong> {{ linkedExpensesCount === 1 ? 'uitgave' : 'uitgaven' }}.
            </p>
          </template>
        </UAlert>

        <UAlert v-else icon="i-lucide-alert-triangle" color="error" variant="soft"
          title="Deze actie kan niet ongedaan worden gemaakt">
          <template #description>
            Weet je zeker dat je de categorie <strong>"{{ props.category.name }}"</strong> wilt wissen?
          </template>
        </UAlert>
      </div>
    </template>

    <template #footer>
      <template v-if="hasExpenses">
        <UButton label="Begrepen" color="primary" @click="isOpen = false" />
      </template>
      <template v-else>
        <UButton label="Annuleren" variant="ghost" color="neutral" :disabled="isDeleting" @click="isOpen = false" />
        <UButton label="Ja, Verwijderen" color="error" icon="i-lucide-trash" :loading="isDeleting"
          :disabled="isChecking" @click="onConfirmDelete" />
      </template>
    </template>
  </UModal>
</template>