<!-- pages/reizen/[id].vue -->
<script setup lang="ts">
  const route = useRoute()
  const tripId = route.params.id as string

  const tripStore = useTripStore()
  const expenseStore = useExpenseStore()
  const memberStore = useMemberStore()
  const categoryStore = useCategoryStore()

  const isViewMembersOpen = ref(false)
  const isUpdateTripOpen = ref(false)
  const isSettlementOpen = ref(false)
  const isCreateExpenseOpen = ref(false)
  const isViewExpenseOpen = ref(false)
  const isUpdateExpenseOpen = ref(false)
  const isDeleteExpenseOpen = ref(false)
  const isCreateGiftOpen = ref(false)
  const isCategoriesOpen = ref(false)

  const selectedExpense = ref<any>(null)

  const trip = computed(() => {
    return tripStore.trips.find((t) => t.id === tripId) ?? null
  })

  const categoryMap = computed(() => {
    return new Map(categoryStore.categories.map((cat) => [cat.id, cat]))
  })

  const hasBudget = computed(() => {
    return Number(trip.value?.budget || 0) > 0
  })

  const budgetPercentage = computed(() => {
    const budget = Number(trip.value?.budget || 0)
    if (budget <= 0) return 0
    return Math.min(100, (expenseStore.totalSpent / budget) * 100)
  })

  function getCategory(categoryId?: string | null) {
    if (!categoryId) return null
    return categoryMap.value.get(categoryId) || null
  }

  const memberMap = computed(() => {
    return new Map(memberStore.members.map((m) => [m.id, m]))
  })

  function getMemberName(memberId?: string | null): string {
    if (!memberId) return 'Onbekend'
    return memberMap.value.get(memberId)?.display_name || 'Iemand'
  }

  function handleView(item: any) {
    selectedExpense.value = item
    isViewExpenseOpen.value = true
  }

  function handleEdit(expense: any) {
    selectedExpense.value = expense
    isUpdateExpenseOpen.value = true
  }

  function handleDelete(expense: any) {
    selectedExpense.value = expense
    isDeleteExpenseOpen.value = true
  }

  onMounted(async () => {
    await Promise.all([
      tripStore.fetchById(tripId),
      memberStore.fetchByTripId(tripId),
      expenseStore.fetchByTripId(tripId),
      categoryStore.fetchByTripId(tripId)
    ])
  })
</script>

<template>
  <UDashboardPanel class="trip-detail">
    <template #header>
      <UDashboardNavbar>
        <template #left>
          <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" to="/reizen" />
          <span class="font-semibold truncate">{{ trip?.name || 'Vakantie' }}</span>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #right>
          <UButton icon="i-lucide-settings" variant="soft" color="neutral" title="Reisinstellingen & Afronden"
            @click="isUpdateTripOpen = true" />
          <UButton icon="i-lucide-tags" variant="soft" color="neutral" title="Categorieën beheren"
            @click="isCategoriesOpen = true" />
          <!-- Verrekenen knop opent nu direct de modal -->
          <UButton icon="i-lucide-arrow-right-left" variant="soft" color="neutral" title="Verrekenen"
            @click="isSettlementOpen = true" />
          <UButton icon="i-lucide-users" variant="soft" color="neutral" title="Deelnemers beheren"
            @click="isViewMembersOpen = true" />
          <UButton icon="i-lucide-gift" label="Gift" color="neutral" variant="soft" title="Gift of inkomst toevoegen"
            @click="isCreateGiftOpen = true" />
          <UButton icon="i-lucide-plus" label="Uitgave" color="primary" @click="isCreateExpenseOpen = true" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="trip-detail__container">
        <div v-if="trip" class="trip-kpi-card">
          <div class="trip-kpi-card__row">
            <div>
              <span class="trip-kpi-card__label">Totaal Uitgegeven</span>
              <div class="trip-kpi-card__spent">
                {{ formatCurrency(expenseStore.totalSpent, trip.currency) }}
              </div>
            </div>

            <!-- Alleen tonen als er een budget is ingesteld -->
            <div v-if="hasBudget" class="budget-card">
              <div class="budget-card__header">
                <span>Budget voortgang</span>
                <span>{{ formatCurrency(expenseStore.totalSpent, trip?.currency) }} / {{ formatCurrency(trip?.budget,
                  trip?.currency) }}</span>
              </div>
              <UProgress :value="budgetPercentage" />
            </div>
          </div>

          <div v-if="expenseStore.totalIncome > 0" class="trip-kpi-card__income-badge">
            <UIcon name="i-lucide-gift" class="size-3.5" />
            <span>{{ formatCurrency(expenseStore.totalIncome, trip.currency) }} ontvangen giften/inkomsten</span>
          </div>
        </div>

        <!-- Laadindicator -->
        <div v-if="expenseStore.isLoading" class="flex justify-center py-12">
          <UIcon name="i-lucide-loader-circle" class="animate-spin size-8 text-primary" />
        </div>

        <!-- Lege Staat -->
        <UEmpty v-else-if="expenseStore.expenses.length === 0" icon="i-lucide-wallet" title="Nog geen uitgaven"
          description="Tik op de knop om de eerste aankoop of gift vast te leggen." class="py-12">
          <template #actions>
            <UButton icon="i-lucide-plus" label="Eerste uitgave toevoegen" @click="isCreateExpenseOpen = true" />
          </template>
        </UEmpty>

        <!-- Dagen & Uitgavenlijst -->
        <div v-else class="day-groups">
          <section v-for="group in expenseStore.expensesByDate" :key="group.date" class="day-group">
            <div class="day-group__header">
              <h3 class="day-group__date">{{ formatDayHeader(group.date) }}</h3>
              <span class="day-group__total">{{ formatCurrency(group.total, trip?.currency) }}</span>
            </div>

            <div class="day-group__items">
              <div v-for="item in group.items" :key="item.id" class="expense-row" @click="handleView(item)">
                <div class="expense-row__left">
                  <div class="expense-row__icon-wrap" :class="{ 'expense-row__icon-wrap--income': item.is_income }"
                    :style="!item.is_income && getCategory(item.category_id)?.color ? {
                      backgroundColor: `${getCategory(item.category_id)?.color}15`,
                      color: getCategory(item.category_id)?.color
                    } : {}">
                    <UIcon
                      :name="item.is_income ? 'i-lucide-gift' : (getCategory(item.category_id)?.icon || 'i-lucide-receipt')"
                      class="expense-row__icon" />
                  </div>

                  <div class="expense-row__meta">
                    <span class="expense-row__title">{{ item.title }}</span>
                    <span class="expense-row__sub">
                      <template v-if="(item as any).paid_from_pot">
                        Betaald via <strong>Gezamenlijke pot</strong>
                      </template>
                      <template v-else>
                        Betaald door <strong>{{ getMemberName(item.paid_by_member_id) }}</strong>
                      </template>
                      <template v-if="!item.is_income && getCategory(item.category_id)">
                        • {{ getCategory(item.category_id)?.name }}
                      </template>
                    </span>
                  </div>
                </div>

                <div class="expense-row__right">
                  <div class="expense-row__indicators">
                    <UIcon v-if="item.receipt_path" name="i-lucide-paperclip"
                      class="expense-row__indicator-icon expense-row__indicator-icon--primary" />
                    <UIcon v-if="item.notes" name="i-lucide-message-square" class="expense-row__indicator-icon" />
                  </div>

                  <span class="expense-row__amount" :class="{ 'expense-row__amount--income': item.is_income }">
                    {{ item.is_income ? '+' : '' }} {{ formatCurrency(Number(item.amount), trip?.currency) }}
                  </span>
                  <UIcon name="i-lucide-chevron-right" class="expense-row__chevron" />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </template>
  </UDashboardPanel>
  <!-- Modals -->
  <TripCategoriesModal v-model:open="isCategoriesOpen" :trip-id="tripId" :trip-name="trip?.name" />
  <TripMembersModal v-model:open="isViewMembersOpen" :trip-id="tripId" :trip-name="trip?.name" />
  <TripModalUpdate v-model:open="isUpdateTripOpen" :trip="trip" />
  <TripModalSettlement v-model:open="isSettlementOpen" :trip="trip" />
  <ExpenseModalCreate v-model:open="isCreateExpenseOpen" :trip-id="tripId" :currency="trip?.currency" />
  <ExpenseModalView v-model:open="isViewExpenseOpen" :expense="selectedExpense" :currency="trip?.currency"
    @edit="handleEdit" @delete="handleDelete" />
  <ExpenseModalUpdate v-model:open="isUpdateExpenseOpen" :expense="selectedExpense" :trip-id="tripId"
    :currency="trip?.currency" />
  <ExpenseModalGiftCreate v-model:open="isCreateGiftOpen" :trip-id="tripId" :currency="trip?.currency" />
  <ExpenseModalDelete v-model:open="isDeleteExpenseOpen" :expense="selectedExpense" :currency="trip?.currency" />
</template>

<style lang="scss" scoped>
  .trip-detail {
    &__nav-title {
      display: flex;
      flex-direction: column;
    }

    &__container {
      padding: 1rem;
      max-width: 760px;
      margin: 0 auto;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
  }

  .trip-kpi-card {
    padding: 1rem 1.25rem;
    border-radius: 10px;
    background-color: var(--ui-bg-elevated);
    border: 1px solid var(--ui-border);

    &__row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    &__label {
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ui-text-muted);
    }

    &__spent {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--ui-text);
    }

    &__remaining {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-neutral);
    }

    &__income-badge {
      margin-top: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--ui-text-muted);
    }
  }

  .day-groups {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .day-group {
    display: flex;
    flex-direction: column;

    &__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--ui-border);
    }

    &__date {
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: capitalize;
      color: var(--ui-text);
      margin: 0;
    }

    &__total {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--ui-text-muted);
    }

    &__items {
      display: flex;
      flex-direction: column;
    }
  }

  .expense-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.625rem 0.5rem;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.15s ease;

    &:hover {
      background-color: var(--ui-bg-elevated, #f9fafb);
    }

    &__left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }

    &__icon-wrap {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background-color: var(--ui-bg-elevated, #f3f4f6);
      color: var(--ui-text-muted, #6b7280);

      &--income {
        background-color: #ecfdf5;
        color: #059669;
      }
    }

    &__icon {
      font-size: 1.25rem;
    }

    &__meta {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    &__title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--ui-text, #111827);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__sub {
      font-size: 0.75rem;
      color: var(--ui-text-muted, #6b7280);
    }

    &__right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    &__indicators {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-right: 0.25rem;
    }

    &__indicator-icon {
      font-size: 0.875rem;
      color: var(--ui-text-muted, #9ca3af);

      &--primary {
        color: var(--ui-primary, #10b981);
      }
    }

    &__amount {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--ui-text, #111827);

      &--income {
        color: #059669;
      }
    }

    &__chevron {
      font-size: 1rem;
      color: var(--ui-text-muted, #9ca3af);
    }
  }
</style>