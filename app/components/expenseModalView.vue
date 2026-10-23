<!-- components/ExpenseModalView.vue -->
<script setup lang="ts">
  import { useReceiptAttachment } from '~/composables/useReceiptAttachments';
  import type { Tables } from '~/types/database.types'

  const isOpen = defineModel<boolean>('open', { default: false })
  const props = defineProps<{
    expense: (Tables<'expenses'> & { paid_by?: Tables<'trip_members'> | null }) | null
    currency?: string
  }>()

  const emit = defineEmits<{
    (e: 'edit', expense: Tables<'expenses'>): void
    (e: 'delete', expense: Tables<'expenses'>): void
  }>()

  const { getSignedUrl } = useReceiptAttachment()
  const signedReceiptUrl = ref<string | null>(null)
  const isLoadingReceipt = ref(false)
  const isLightboxOpen = ref(false)

  watch(
    () => props.expense?.receipt_path,
    async (path) => {
      signedReceiptUrl.value = null
      if (path) {
        isLoadingReceipt.value = true
        signedReceiptUrl.value = await getSignedUrl(path)
        isLoadingReceipt.value = false
      }
    },
    { immediate: true }
  )

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: props.currency || 'EUR'
    }).format(amount)
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return ''
    return new Intl.DateTimeFormat('nl-NL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(dateStr))
  }

  function handleEdit() {
    if (!props.expense) return
    emit('edit', props.expense)
    isOpen.value = false
  }

  function handleDelete() {
    if (!props.expense) return
    emit('delete', props.expense)
    isOpen.value = false
  }
</script>

<template>
  <div>
    <UModal v-model:open="isOpen" :title="expense?.title || 'Details'" :description="formatDate(expense?.date)"
      class="expense-detail-modal">
      <template #body>
        <div v-if="expense" class="expense-detail">
          <!-- Hero Bedrag Banner -->
          <div class="expense-detail__hero">
            <span class="expense-detail__hero-label">
              {{ expense.is_income ? 'Ontvangen Bedrag' : 'Uitgave Bedrag' }}
            </span>
            <span class="expense-detail__hero-value"
              :class="{ 'expense-detail__hero-value--income': expense.is_income }">
              {{ expense.is_income ? '+' : '' }} {{ formatCurrency(Number(expense.amount)) }}
            </span>
          </div>

          <!-- Specificaties Grid -->
          <div class="expense-detail__grid">
            <div class="expense-detail__cell">
              <span class="expense-detail__label">Betaald door</span>
              <span class="expense-detail__val">{{ expense.paid_by?.display_name || 'Onbekend' }}</span>
            </div>

            <div v-if="!expense.is_income" class="expense-detail__cell">
              <span class="expense-detail__label">Categorie</span>
              <span class="expense-detail__val">{{ expense.category }}</span>
            </div>
          </div>

          <!-- Notities sectie -->
          <section v-if="expense.notes" class="expense-detail__section">
            <h4 class="expense-detail__section-title">Notitie</h4>
            <div class="expense-detail__notes-box">
              <p class="expense-detail__notes-text">{{ expense.notes }}</p>
            </div>
          </section>



          <!-- Bonnetjes sectie -->
          <section v-if="expense.receipt_path" class="expense-detail__section">
            <h4 class="expense-detail__section-title">Bonnetje / Bewijs</h4>
            <div v-if="signedReceiptUrl" class="expense-detail__receipt-card" @click="isLightboxOpen = true">
              <img :src="signedReceiptUrl" alt="Bonnetje" class="expense-detail__receipt-thumb" />
              <div class="expense-detail__receipt-info">
                <span class="font-medium text-sm">Gekoppeld betaalbewijs</span>
                <span class="text-xs text-primary flex items-center gap-1">
                  <UIcon name="i-lucide-maximize-2" class="size-3.5" />
                  Tik voor vergroting
                </span>
              </div>
            </div>

            <div v-else-if="isLoadingReceipt" class="expense-detail__receipt-loading">
              <UIcon name="i-lucide-loader-circle" class="animate-spin size-5 text-primary" />
              <span>Beveiligde foto autoriseren...</span>
            </div>
          </section>
        </div>
      </template>

      <template #footer>
        <div class="expense-detail__actions">
          <UButton icon="i-lucide-trash" label="Verwijderen" color="error" variant="soft" @click="handleDelete" />
          <UButton icon="i-lucide-pencil" label="Bewerken" color="neutral" variant="soft" @click="handleEdit" />
        </div>
      </template>
    </UModal>

    <!-- Lightbox Modal -->
    <UModal v-model:open="isLightboxOpen" title="Bonnetje Vergroot">
      <template #body>
        <div class="flex justify-center p-2">
          <img v-if="signedReceiptUrl" :src="signedReceiptUrl" alt="Bonnetje vergroot"
            class="max-h-[75vh] w-auto object-contain rounded-lg shadow-md" />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-between w-full">
          <UButton v-if="signedReceiptUrl" icon="i-lucide-external-link" label="Open in nieuw venster" variant="ghost"
            color="neutral" :to="signedReceiptUrl" target="_blank" />
          <UButton label="Sluiten" color="primary" @click="isLightboxOpen = false" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<style lang="scss" scoped>
  .expense-detail {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;

    &__hero {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem;
      border-radius: 8px;
      background-color: var(--ui-bg-elevated, #f9fafb);
      border: 1px solid var(--ui-border, #e5e7eb);
    }

    &__hero-label {
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ui-text-muted, #6b7280);
    }

    &__hero-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--ui-text, #111827);

      &--income {
        color: #059669;
      }
    }

    &__grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }

    &__cell {
      display: flex;
      flex-direction: column;
      padding: 0.625rem 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--ui-border, #e5e7eb);
      background-color: var(--ui-bg, #ffffff);
    }

    &__label {
      font-size: 0.6875rem;
      color: var(--ui-text-muted, #6b7280);
    }

    &__val {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--ui-text, #111827);
    }

    &__section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    &__section-title {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ui-text-muted, #6b7280);
      margin: 0;
    }

    &__notes-box {
      padding: 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--ui-border, #e5e7eb);
    }

    &__notes-text {
      font-size: 0.875rem;
      color: var(--ui-text, #374151);
      white-space: pre-wrap;
      margin: 0;
    }

    &__receipt-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.875rem;
      border-radius: 8px;
      border: 1px dashed var(--ui-border, #d1d5db);
      cursor: pointer;
      transition: background-color 0.15s;

      &:hover {
        background-color: var(--ui-bg-elevated, #f3f4f6);
      }
    }

    &__receipt-thumb {
      width: 52px;
      height: 52px;
      object-fit: cover;
      border-radius: 6px;
    }

    &__receipt-info {
      display: flex;
      flex-direction: column;
    }

    &__receipt-loading {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      font-size: 0.8125rem;
      color: var(--ui-text-muted, #6b7280);
    }

    &__actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      align-items: center;
      width: 100%;

      &-right {
        display: flex;
        gap: 0.5rem;
      }
    }
  }
</style>