<!-- components/ExpenseModalDelete.vue -->
<script setup lang="ts">
  import { useReceiptAttachment } from '~/composables/useReceiptAttachments';
  import type { Tables } from '~/types/database.types'

  const isOpen = defineModel<boolean>('open', { default: false })
  const props = defineProps<{
    expense: Tables<'expenses'> | null
    currency?: string
  }>()

  const expenseStore = useExpenseStore()
  const { deleteReceipt } = useReceiptAttachment()
  const toast = useToast()
  const isDeleting = ref(false)

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: props.currency || 'EUR'
    }).format(amount)
  }

  async function handleDelete() {
    if (!props.expense) return

    isDeleting.value = true
    try {
      // 1. Verwijder gekoppeld bonnetje uit de storage bucket
      if (props.expense.receipt_path) {
        await deleteReceipt(props.expense.receipt_path)
      }

      // 2. Verwijder uitgave uit de database
      await expenseStore.deleteExpense(props.expense.id)

      toast.add({
        title: `"${props.expense.title}" verwijderd`,
        color: 'success'
      })

      isOpen.value = false
    } catch (err: any) {
      toast.add({
        title: 'Fout bij verwijderen',
        description: err.message,
        color: 'error'
      })
    } finally {
      isDeleting.value = false
    }
  }
</script>

<template>
  <UModal v-model:open="isOpen" title="Uitgave Verwijderen" description="Weet je zeker dat je deze post wilt wissen?"
    class="expense-delete-modal">
    <template #body>
      <div v-if="expense" class="expense-delete">
        <div class="expense-delete__warning">
          <UIcon name="i-lucide-alert-triangle" class="expense-delete__warning-icon" />
          <p class="expense-delete__warning-text">
            Deze actie kan niet ongedaan worden gemaakt. De uitgave
            <strong>"{{ expense.title }}"</strong> ({{ formatCurrency(Number(expense.amount)) }})
            en een eventueel gekoppeld bonnetje worden definitief gewist.
          </p>
        </div>
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

<style lang="scss" scoped>
  .expense-delete {
    &__warning {
      display: flex;
      gap: 0.75rem;
      padding: 1rem;
      border-radius: 8px;
      background-color: #fef2f2;
      border: 1px solid #fee2e2;
    }

    &__warning-icon {
      color: #ef4444;
      font-size: 1.25rem;
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    &__warning-text {
      font-size: 0.8125rem;
      color: #991b1b;
      line-height: 1.4;
      margin: 0;
    }
  }
</style>