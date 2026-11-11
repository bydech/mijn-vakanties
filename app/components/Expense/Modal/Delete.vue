<!-- components/ExpenseModalDelete.vue -->
<script setup lang="ts">
  import type { ExpenseRecord } from '~/types/pocketbase.types'

  const isOpen = defineModel<boolean>('open', { default: false })

  const props = defineProps<{
    expense: ExpenseRecord | null
    currency?: string
  }>()

  const expenseStore = useExpenseStore()
  const toast = useToast()
  const isDeleting = ref(false)

  async function handleDelete() {
    if (!props.expense) return

    isDeleting.value = true
    try {
      // PocketBase wist automatisch het fysieke receipt-bestand wanneer het record verwijderd wordt
      await expenseStore.deleteExpense(props.expense.id)

      toast.add({
        title: `"${props.expense.title}" verwijderd`,
        color: 'success'
      })

      isOpen.value = false
    } catch (err: any) {
      toast.add({
        title: 'Fout bij verwijderen',
        description: err.message || 'Kon uitgave niet verwijderen.',
        color: 'error'
      })
    } finally {
      isDeleting.value = false
    }
  }
</script>

<template>
  <UModal v-model:open="isOpen" title="Uitgave Verwijderen" description="Weet je zeker dat je deze post wilt wissen?">
    <template #body>
      <div v-if="props.expense" class="flex flex-col gap-4">
        <UAlert icon="i-lucide-alert-triangle" color="error" variant="subtle"
          title="Deze actie kan niet ongedaan worden gemaakt">
          <template #description>
            De uitgave
            <strong>"{{ props.expense.title }}"</strong>
            ({{ formatCurrency(Number(props.expense.amount), props.currency) }})
            en een eventueel gekoppeld bonnetje worden definitief gewist.
          </template>
        </UAlert>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton label="Annuleren" variant="ghost" color="neutral" @click="isOpen = false" />
        <UButton label="Definitief Verwijderen" color="error" icon="i-lucide-trash" :loading="isDeleting"
          @click="handleDelete" />
      </div>
    </template>
  </UModal>
</template>