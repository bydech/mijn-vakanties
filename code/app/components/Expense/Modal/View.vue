<!-- components/ExpenseModalView.vue -->
<script setup lang="ts">
  import type { ExpenseRecord, ExpenseSplitRecord, TripMemberRecord } from '~/types/pocketbase.types'

  const isOpen = defineModel<boolean>('open', { default: false })

  const props = defineProps<{
    expense: ExpenseRecord | null
    currency?: string
  }>()

  const emit = defineEmits<{
    (e: 'edit', expense: ExpenseRecord): void
    (e: 'delete', expense: ExpenseRecord): void
  }>()

  const memberStore = useMemberStore()
  const categoryStore = useCategoryStore()
  const { getReceiptUrl } = useReceiptAttachment()
  const isLightboxOpen = ref(false)

  const receiptUrl = computed(() => {
    if (!props.expense?.receipt) return null
    return getReceiptUrl(props.expense)
  })

  const splits = computed<ExpenseSplitRecord[]>(() => {
    return props.expense?.expand?.expense_splits_via_expense || []
  })

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

  function getMember(memberId?: string | null): TripMemberRecord | undefined {
    if (!memberId) return undefined
    return memberStore.members.find(m => m.id === memberId)
  }

  function getMemberName(memberId?: string | null): string {
    if (!memberId) return 'Onbekend'
    const member = getMember(memberId)
    return member?.display_name || 'Iemand'
  }

  function isMemberGuest(memberId: string): boolean {
    const member = getMember(memberId)
    return !member?.user
  }

  function getCategoryName(categoryId?: string | null): string {
    if (!categoryId) return 'Geen categorie'
    const cat = categoryStore.categories.find(c => c.id === categoryId)
    return cat?.name || 'Onbekend'
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
              <span class="expense-detail__val">
                <template v-if="expense.paid_from_pot">
                  Gezamenlijke pot
                </template>
                <template v-else>
                  {{ expense.expand?.paid_by?.display_name || getMemberName(expense.paid_by) }}
                </template>
              </span>
            </div>

            <div v-if="!expense.is_income" class="expense-detail__cell">
              <span class="expense-detail__label">Categorie</span>
              <span class="expense-detail__val">
                {{ expense.expand?.category?.name || getCategoryName(expense.category) }}
              </span>
            </div>
          </div>

          <!-- Kostenverdeling / Splits Sectie (Alleen voor uitgaven) -->
          <section v-if="!expense.is_income && !expense.paid_from_pot" class="expense-detail__section">
            <div class="expense-detail__section-header">
              <h4 class="expense-detail__section-title">Wie betaalt mee</h4>
              <span v-if="splits.length > 0" class="expense-detail__section-count">
                {{ splits.length }} {{ splits.length === 1 ? 'persoon' : 'personen' }}
              </span>
            </div>

            <!-- Ingedeelden lijst -->
            <div v-if="splits.length > 0" class="expense-detail__splits-list">
              <div v-for="split in splits" :key="split.id" class="expense-detail__split-row">
                <div class="expense-detail__split-member">
                  <UIcon name="i-lucide-user" class="expense-detail__split-icon" />
                  <span class="expense-detail__split-name">
                    {{ getMemberName(split.member) }}
                  </span>
                  <UBadge v-if="isMemberGuest(split.member)" color="neutral" variant="subtle" size="xs">
                    Gast
                  </UBadge>
                </div>

                <div class="expense-detail__split-amounts">
                  <span class="expense-detail__split-amount">
                    {{ formatCurrency(Number(split.amount)) }}
                  </span>
                  <span class="expense-detail__split-percent">
                    ({{ Math.round((Number(split.amount) / Number(expense.amount)) * 100) }}%)
                  </span>
                </div>
              </div>
            </div>

            <!-- Fallback als er geen specifieke splits zijn opgeslagen -->
            <div v-else class="expense-detail__splits-fallback">
              <UIcon name="i-lucide-users" class="expense-detail__splits-fallback-icon" />
              <span class="expense-detail__splits-fallback-text">
                Gelijk verdeeld over alle reizigers van deze vakantie.
              </span>
            </div>
          </section>

          <!-- Notities sectie -->
          <section v-if="expense.notes" class="expense-detail__section">
            <h4 class="expense-detail__section-title">Notitie</h4>
            <div class="expense-detail__notes-box">
              <p class="expense-detail__notes-text">{{ expense.notes }}</p>
            </div>
          </section>

          <!-- Bonnetjes sectie -->
          <section v-if="expense.receipt" class="expense-detail__section">
            <h4 class="expense-detail__section-title">Bonnetje / Bewijs</h4>
            <div v-if="receiptUrl" class="expense-detail__receipt-card" @click="isLightboxOpen = true">
              <img :src="receiptUrl" alt="Bonnetje" class="expense-detail__receipt-thumb" />
              <div class="expense-detail__receipt-info">
                <span class="expense-detail__receipt-label">Gekoppeld betaalbewijs</span>
                <span class="expense-detail__receipt-action">
                  <UIcon name="i-lucide-maximize-2" class="expense-detail__receipt-action-icon" />
                  Tik voor vergroting
                </span>
              </div>
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
        <div class="lightbox-body">
          <img v-if="receiptUrl" :src="receiptUrl" alt="Bonnetje vergroot" class="lightbox-body__image" />
        </div>
      </template>
      <template #footer>
        <div class="lightbox-footer">
          <UButton v-if="receiptUrl" icon="i-lucide-external-link" label="Open in nieuw venster" variant="ghost"
            color="neutral" :to="receiptUrl" target="_blank" />
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

    &__section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    &__section-title {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ui-text-muted, #6b7280);
      margin: 0;
    }

    &__section-count {
      font-size: 0.75rem;
      color: var(--ui-text-muted, #6b7280);
    }

    &__splits-list {
      display: flex;
      flex-direction: column;
      border-radius: 8px;
      border: 1px solid var(--ui-border, #e5e7eb);
      background-color: var(--ui-bg, #ffffff);
      overflow: hidden;
    }

    &__split-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.625rem 0.875rem;
      border-bottom: 1px solid var(--ui-border-muted, #f3f4f6);

      &:last-child {
        border-bottom: none;
      }
    }

    &__split-member {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    &__split-icon {
      font-size: 1rem;
      color: var(--ui-text-muted, #6b7280);
      flex-shrink: 0;
    }

    &__split-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--ui-text, #1f2937);
    }

    &__split-amounts {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    &__split-amount {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--ui-text, #111827);
    }

    &__split-percent {
      font-size: 0.6875rem;
      color: var(--ui-text-muted, #6b7280);
    }

    &__splits-fallback {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      border-radius: 8px;
      background-color: var(--ui-bg-elevated, #f9fafb);
      border: 1px dashed var(--ui-border, #e5e7eb);
    }

    &__splits-fallback-icon {
      font-size: 1rem;
      color: var(--ui-primary, #10b981);
      flex-shrink: 0;
    }

    &__splits-fallback-text {
      font-size: 0.75rem;
      color: var(--ui-text-muted, #6b7280);
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
      gap: 0.125rem;
    }

    &__receipt-label {
      font-weight: 500;
      font-size: 0.875rem;
      color: var(--ui-text, #111827);
    }

    &__receipt-action {
      font-size: 0.75rem;
      color: var(--ui-primary, #10b981);
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    &__receipt-action-icon {
      font-size: 0.875rem;
    }

    &__actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      align-items: center;
      width: 100%;
    }
  }

  .lightbox-body {
    display: flex;
    justify-content: center;
    padding: 0.5rem;

    &__image {
      max-height: 75vh;
      width: auto;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
  }

  .lightbox-footer {
    display: flex;
    justify-content: space-between;
    width: 100%;
  }
</style>