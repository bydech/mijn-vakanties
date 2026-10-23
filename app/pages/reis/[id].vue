<!-- pages/reis/[id].vue -->
<script setup lang="ts">
  import type { Tables } from '~/types/database.types'

  const route = useRoute()
  const tripId = route.params.id as string

  const isMembersModalOpen = ref(false)

  const tripStore = useTripStore()
  const expenseStore = useExpenseStore()
  const toast = useToast()

  const isCreateOpen = ref(false)
  const isViewOpen = ref(false)
  const isUpdateOpen = ref(false)
  const isDeleteOpen = ref(false)
  const selectedExpense = ref<any>(null)

  onMounted(async () => {
    await Promise.all([
      tripStore.fetchById(tripId),
      expenseStore.fetchByTripId(tripId)
    ])
  })

  const trip = computed(() => tripStore.currentTrip)

  function formatCurrency(amount: number, currency = 'EUR') {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: currency || 'EUR'
    }).format(amount)
  }

  function formatDayHeader(dateStr: string) {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('nl-NL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).format(date)
  }

  function getCategoryIcon(cat: string) {
    switch (cat) {
      case 'Eten & Drinken': return 'i-lucide-utensils'
      case 'Boodschappen': return 'i-lucide-shopping-cart'
      case 'Vervoer': return 'i-lucide-car'
      case 'Verblijf': return 'i-lucide-bed'
      case 'Activiteiten': return 'i-lucide-ticket'
      case 'Winkelen': return 'i-lucide-shopping-bag'
      default: return 'i-lucide-receipt'
    }
  }

  function onRowClick(item: any) {
    selectedExpense.value = item
    isViewOpen.value = true
  }

  function handleEdit(expense: any) {
    selectedExpense.value = expense
    isUpdateOpen.value = true
  }

  function handleDelete(expense: any) {
    selectedExpense.value = expense
    isDeleteOpen.value = true
  }


</script>

<template>
  <UDashboardPanel class="trip-detail">
    <template #header>
      <UDashboardNavbar>
        <template #left>
          <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" to="/overzicht" />
          <div class="trip-detail__nav-title">
            <span class="font-semibold truncate">{{ trip?.name || 'Vakantie' }}</span>
            <span v-if="trip?.destination" class="text-xs text-muted flex items-center gap-1">
              <UIcon name="i-lucide-map-pin" class="size-3" />
              {{ trip.destination }}
            </span>
          </div>
        </template>

        <template #right>
          <div class="flex items-center gap-1.5">
            <!-- Knop voor reisgenoten -->
            <UButton icon="i-lucide-users" variant="soft" color="neutral" @click="isMembersModalOpen = true" />

            <!-- Bestaande Nieuwe Uitgave knop -->
            <UButton icon="i-lucide-plus" label="Uitgave" color="primary" @click="isCreateOpen = true" />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="trip-detail__container">
        <!-- Budget / Saldo Kaartje bovenin -->
        <div v-if="trip" class="trip-kpi-card">
          <div class="trip-kpi-card__row">
            <div>
              <span class="trip-kpi-card__label">Totaal Uitgegeven</span>
              <div class="trip-kpi-card__spent">
                {{ formatCurrency(expenseStore.totalSpent, trip.currency) }}
              </div>
            </div>

            <div v-if="trip.budget && Number(trip.budget) > 0" class="text-right">
              <span class="trip-kpi-card__label">Resterend Budget</span>
              <div class="trip-kpi-card__remaining"
                :class="{ 'trip-kpi-card__remaining--negative': (Number(trip.budget) - expenseStore.totalSpent) < 0 }">
                {{ formatCurrency(Number(trip.budget) - expenseStore.totalSpent, trip.currency) }}
              </div>
            </div>
          </div>

          <div v-if="expenseStore.totalIncome > 0" class="trip-kpi-card__income-badge">
            <UIcon name="i-lucide-gift" class="size-3.5 text-emerald-500" />
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
            <UButton icon="i-lucide-plus" label="Eerste uitgave toevoegen" @click="isCreateOpen = true" />
          </template>
        </UEmpty>

        <!-- Dagen & Uitgavenlijst -->
        <div v-else class="day-groups">
          <section v-for="group in expenseStore.expensesByDate" :key="group.date" class="day-group">
            <!-- Dag Header met Subtotaal -->
            <div class="day-group__header">
              <h3 class="day-group__date">{{ formatDayHeader(group.date) }}</h3>
              <span class="day-group__total">{{ formatCurrency(group.total, trip?.currency) }}</span>
            </div>

            <!-- Uitgaven van deze specifieke dag -->
            <div class="day-group__items">
              <div v-for="item in group.items" :key="item.id"
                class="expense-row cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40 rounded-lg px-2 transition-colors"
                @click="onRowClick(item)">
                <div class="expense-row__left">
                  <div class="expense-row__icon-wrap" :class="{ 'expense-row__icon-wrap--income': item.is_income }">
                    <UIcon :name="item.is_income ? 'i-lucide-gift' : getCategoryIcon(item.category)" class="size-5" />
                  </div>

                  <div class="expense-row__meta">
                    <span class="expense-row__title">{{ item.title }}</span>
                    <span class="expense-row__sub">
                      Betaald door <strong>{{ item.paid_by?.display_name || 'Iemand' }}</strong>
                      <span v-if="!item.is_income"> • {{ item.category }}</span>
                    </span>
                  </div>
                </div>

                <div class="expense-row__right">
                  <!-- Indicatie van bonnetje of notitie -->
                  <div class="flex items-center gap-1 text-muted mr-1">
                    <UIcon v-if="item.receipt_path" name="i-lucide-paperclip" class="size-3.5 text-primary" />
                    <UIcon v-if="item.notes" name="i-lucide-message-square" class="size-4 text-neutral-400" />
                  </div>

                  <span class="expense-row__amount" :class="{ 'expense-row__amount--income': item.is_income }">
                    {{ item.is_income ? '+' : '' }} {{ formatCurrency(Number(item.amount), trip?.currency) }}
                  </span>
                  <UIcon name="i-lucide-chevron-right" class="size-4 text-muted" />

                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Quick-Add Modal -->
  <ExpenseModalCreate v-model:open="isCreateOpen" :trip-id="tripId" :currency="trip?.currency" />

  <ExpenseModalView v-model:open="isViewOpen" :expense="selectedExpense" :currency="trip?.currency" @edit="handleEdit"
    @delete="handleDelete" />

  <ExpenseModalUpdate v-model:open="isUpdateOpen" :expense="selectedExpense" :trip-id="tripId"
    :currency="trip?.currency" />

  <ExpenseModalDelete v-model:open="isDeleteOpen" :expense="selectedExpense" :currency="trip?.currency" />
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
    background-color: var(--ui-bg-elevated, #f9fafb);
    border: 1px solid var(--ui-border, #e5e7eb);

    &__row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    &__label {
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ui-text-muted, #6b7280);
    }

    &__spent {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--ui-text, #111827);
    }

    &__remaining {
      font-size: 1.25rem;
      font-weight: 600;
      color: #10b981;

      &--negative {
        color: #ef4444;
      }
    }

    &__income-badge {
      margin-top: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--ui-text-muted, #6b7280);
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
      border-bottom: 1px solid var(--ui-border, #e5e7eb);
    }

    &__date {
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: capitalize;
      color: var(--ui-text, #111827);
      margin: 0;
    }

    &__total {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--ui-text-muted, #6b7280);
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
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--ui-border-muted, #f3f4f6);

    &:last-child {
      border-bottom: none;
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
      background-color: var(--ui-bg-elevated, #f3f4f6);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--ui-text-muted, #4b5563);
      flex-shrink: 0;

      &--income {
        background-color: #ecfdf5;
        color: #059669;
      }
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

    &__amount {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--ui-text, #111827);

      &--income {
        color: #059669;
      }
    }
  }

  .trip-fab {
    position: fixed;
    bottom: calc(5rem + env(safe-area-inset-bottom, 0px));
    right: 1.25rem;
    width: 54px;
    height: 54px;
    border-radius: 50%;
    background-color: var(--ui-primary, #10b981);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
    z-index: 40;
    border: none;
    cursor: pointer;
  }
</style>