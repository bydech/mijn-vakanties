<!-- components/TripModalSettlement.vue -->
<script setup lang="ts">
  import type { Tables } from '~/types/database.types'

  const isOpen = defineModel<boolean>('open', { default: false })

  const props = defineProps<{
    trip: Tables<'trips'> | null
  }>()

  const expenseStore = useExpenseStore()
  const memberStore = useMemberStore()
  const toast = useToast()
  const { calculateBalances, calculateSettlement } = useTripSettlement()

  const memberBalances = computed(() => {
    return calculateBalances(memberStore.members, expenseStore.expenses)
  })

  const settlements = computed(() => {
    return calculateSettlement(memberBalances.value)
  })

  function copySettlementSummary() {
    if (settlements.value.length === 0) return

    let text = `🌴 *Afrekening: ${props.trip?.name || 'Vakantie'}*\n`
    text += `Totaal verrekend bedrag: ${formatCurrency(expenseStore.totalSpent, props.trip?.currency)}\n\n`
    text += `*Wie betaalt aan wie:*\n`

    for (const s of settlements.value) {
      text += `👉 ${s.fromName} betaalt ${formatCurrency(s.amount, props.trip?.currency)} aan ${s.toName}\n`
    }

    navigator.clipboard.writeText(text)
    toast.add({
      title: 'Afrekening gekopieerd!',
      description: 'Je kunt dit overzicht nu direct in WhatsApp plakken.',
      color: 'success'
    })
  }

  watch(
    () => isOpen.value,
    async (open) => {
      if (open && props.trip?.id) {
        await Promise.all([
          memberStore.fetchByTripId(props.trip.id),
          expenseStore.fetchByTripId(props.trip.id)
        ])
      }
    }
  )
</script>

<template>
  <UModal v-model:open="isOpen" title="Verrekenen & Balans" :description="props.trip?.name || 'Vakantie overzicht'">
    <template #body>
      <div class="settle-modal">
        <!-- 1. Afrekenen sectie -->
        <section class="settle-card">
          <div class="settle-card__header">
            <div class="settle-card__title-wrap">
              <UIcon name="i-lucide-arrow-right-left" class="settle-card__icon" />
              <h4 class="settle-card__title">Afrekenen (Minimale Betalingen)</h4>
            </div>
            <span class="settle-card__count">
              {{ settlements.length }} {{ settlements.length === 1 ? 'transactie' : 'transacties' }}
            </span>
          </div>

          <div v-if="settlements.length === 0" class="settle-card__empty">
            <UIcon name="i-lucide-check-check" class="settle-card__empty-icon" />
            <p class="settle-card__empty-title">Iedereen staat quitte!</p>
            <p class="settle-card__empty-desc">Er zijn geen openstaande schulden te verrekenen.</p>
          </div>

          <div v-else class="settle-card__list">
            <div v-for="(s, idx) in settlements" :key="idx" class="settle-row">
              <div class="settle-row__parties">
                <span class="settle-row__name">{{ s.fromName }}</span>
                <span class="settle-row__sub">maakt over aan</span>
                <span class="settle-row__name">{{ s.toName }}</span>
              </div>
              <div class="settle-row__amount">
                {{ formatCurrency(s.amount, props.trip?.currency) }}
              </div>
            </div>
          </div>
        </section>

        <!-- 2. Balans per Deelnemer sectie -->
        <section class="settle-card">
          <div class="settle-card__header">
            <div class="settle-card__title-wrap">
              <UIcon name="i-lucide-scale" class="settle-card__icon" />
              <h4 class="settle-card__title">Balans per Deelnemer</h4>
            </div>
            <span class="settle-card__count">Voorgeschoten vs Deel</span>
          </div>

          <div class="settle-card__list">
            <div v-for="b in memberBalances" :key="b.memberId" class="balance-row">
              <div class="balance-row__info">
                <div class="balance-row__header">
                  <span class="balance-row__name">{{ b.displayName }}</span>
                  <UBadge v-if="b.isGuest" color="neutral" variant="subtle" size="xs">Gast</UBadge>
                </div>
                <span class="balance-row__sub">
                  Betaald: {{ formatCurrency(b.totalPaid, props.trip?.currency) }} • Eerlijk deel: {{
                    formatCurrency(b.totalShare, props.trip?.currency) }}
                </span>
              </div>

              <div class="balance-row__net"
                :class="{ 'balance-row__net--positive': b.netBalance > 0, 'balance-row__net--negative': b.netBalance < 0 }">
                <span>{{ b.netBalance > 0 ? '+' : '' }}{{ formatCurrency(b.netBalance, props.trip?.currency) }}</span>
                <span class="balance-row__status">
                  {{ b.netBalance > 0 ? 'krijgt' : b.netBalance < 0 ? 'betaalt' : 'quitte' }} </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>

    <template #footer>
      <div class="settle-modal__footer">
        <UButton label="Sluiten" color="neutral" variant="ghost" @click="isOpen = false" />
        <UButton v-if="settlements.length > 0" icon="i-lucide-share-2" label="Kopieer Overzicht" color="primary"
          @click="copySettlementSummary" />
      </div>
    </template>
  </UModal>
</template>

<style lang="scss" scoped>
  .settle-modal {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;

    &__footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
    }
  }

  .settle-card {
    border-radius: 8px;
    background-color: var(--ui-bg, #ffffff);
    border: 1px solid var(--ui-border, #e5e7eb);
    overflow: hidden;

    &__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--ui-border, #e5e7eb);
      background-color: var(--ui-bg-elevated, #f9fafb);
    }

    &__title-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    &__icon {
      font-size: 1.125rem;
      color: var(--ui-primary, #10b981);
    }

    &__title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--ui-text-highlighted, #111827);
      margin: 0;
    }

    &__count {
      font-size: 0.75rem;
      color: var(--ui-text-muted, #6b7280);
    }

    &__empty {
      padding: 1.5rem 1rem;
      text-align: center;

      &-icon {
        font-size: 2rem;
        color: var(--ui-primary, #10b981);
        margin: 0 auto 0.5rem;
      }

      &-title {
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--ui-text-highlighted, #111827);
        margin: 0;
      }

      &-desc {
        font-size: 0.75rem;
        color: var(--ui-text-muted, #6b7280);
        margin-top: 0.25rem;
      }
    }

    &__list {
      display: flex;
      flex-direction: column;
    }
  }

  .settle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--ui-border-muted, #f3f4f6);

    &:last-child {
      border-bottom: none;
    }

    &__parties {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      flex-wrap: wrap;
    }

    &__name {
      font-weight: 600;
      font-size: 0.8125rem;
      color: var(--ui-text-highlighted, #111827);
    }

    &__sub {
      font-size: 0.75rem;
      color: var(--ui-text-muted, #6b7280);
    }

    &__amount {
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--ui-text, #111827);
    }
  }

  .balance-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--ui-border-muted, #f3f4f6);

    &:last-child {
      border-bottom: none;
    }

    &__info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    &__header {
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    &__name {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--ui-text-highlighted, #111827);
    }

    &__sub {
      font-size: 0.75rem;
      color: var(--ui-text-muted, #6b7280);
    }

    &__net {
      font-size: 0.875rem;
      font-weight: 700;
      text-align: right;

      &--positive {
        color: #10b981;
      }

      &--negative {
        color: #ef4444;
      }
    }

    &__status {
      font-size: 0.625rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: block;
      color: var(--ui-text-muted, #6b7280);
    }
  }
</style>