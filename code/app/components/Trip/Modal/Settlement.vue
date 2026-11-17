<!-- components/TripModalSettlement.vue -->
<script setup lang="ts">
  import type { TripRecord } from '~/types/pocketbase.types'

  const isOpen = defineModel<boolean>('open', { default: false })

  const props = defineProps<{
    trip: TripRecord | null
  }>()

  const expenseStore = useExpenseStore()
  const memberStore = useMemberStore()
  const { calculateBalances, calculateSettlement } = useTripSettlement()

  const memberBalances = computed(() => {
    return calculateBalances(memberStore.members, expenseStore.expenses)
  })

  const settlements = computed(() => {
    return calculateSettlement(memberBalances.value)
  })

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
      <div class="settlement-modal">
        <UCard class="settlement-card" description="Afrekenen (Minimale Betalingen)">
          <div v-if="settlements.length === 0" class="settlement-card__empty">
            <UAlert icon="i-lucide-check-check" color="success" variant="subtle" title="Iedereen staat quitte!"
              description="Er zijn geen openstaande schulden te verrekenen." />
          </div>
          <CommonActionList v-else>
            <CommonActionListItem v-for="(s, idx) in settlements" :key="idx" icon="i-lucide-arrow-right-left"
              :title="`${s.fromName} → ${s.toName}`" :subtitle="`${s.fromName} maakt over aan ${s.toName}`">
              <template #actions>
                <UBadge :label="formatCurrency(s.amount, props.trip?.currency)" color="primary" variant="subtle"
                  size="md" />
              </template>
            </CommonActionListItem>
          </CommonActionList>
        </UCard>

        <UCard class="settlement-card" description="Balans per Deelnemer">
          <CommonActionList>
            <CommonActionListItem v-for="b in memberBalances" :key="b.memberId"
              :avatar-text="b.displayName.slice(0, 2).toUpperCase()" :title="b.displayName"
              :subtitle="`Betaald: ${formatCurrency(b.totalPaid, props.trip?.currency)} • Deel: ${formatCurrency(b.totalShare, props.trip?.currency)}`">
              <template #actions>
                <UBadge :label="formatCurrency(b.netBalance, props.trip?.currency)"
                  :color="b.netBalance > 0 ? 'success' : b.netBalance < 0 ? 'error' : 'neutral'" variant="subtle" />
              </template>
            </CommonActionListItem>
          </CommonActionList>
        </UCard>
      </div>
    </template>
  </UModal>
</template>

<style lang="scss" scoped>
  .settlement-modal {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .settlement-card {
    :deep([data-slot='body']) {
      padding: 0;
    }

    :deep(.action-list) {
      border: none;
      border-radius: 0;
    }

    &__empty {
      padding: 1rem;
    }
  }
</style>