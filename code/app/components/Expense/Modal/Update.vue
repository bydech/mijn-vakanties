<!-- components/ExpenseModalUpdate.vue -->
<script setup lang="ts">
  import type { FormSubmitEvent, FileUploadItem } from '@nuxt/ui'
  import type { ExpenseRecord } from '~/types/pocketbase.types'

  const isOpen = defineModel<boolean>('open', { default: false })

  const props = defineProps<{
    expense: ExpenseRecord | null
    tripId: string
    currency?: string
  }>()

  const expenseStore = useExpenseStore()
  const memberStore = useMemberStore()
  const categoryStore = useCategoryStore()
  const { compressImage } = useImageCompression()
  const toast = useToast()

  const isCompressing = ref(false)
  const isSubmitting = ref(false)

  const fileModel = ref<File | FileUploadItem | null>(null)
  const newReceiptFile = ref<File | null>(null)
  const shouldRemoveReceipt = ref(false)

  // Split state vanuit de geëxtraheerde component
  const splitsPayload = ref<{ member_id: string; amount: number }[]>([])
  const isSplitValid = ref(true)

  const state = reactive({
    title: '',
    amount: 0,
    category: '',
    date: '',
    paid_by: '',
    is_income: false,
    notes: ''
  })

  const isPaidFromPot = computed(() => state.paid_by === 'pot')

  const categoryOptions = computed(() => {
    return categoryStore.categories.map((c) => ({
      label: c.name,
      value: c.id,
      icon: c.icon
    }))
  })

  const activeMembers = computed(() => memberStore.members)

  const memberOptions = computed(() => {
    const list = activeMembers.value.map((m) => ({
      label: `${m.display_name}${!m.user ? ' (Gast)' : ''}`,
      value: m.id
    }))

    if (state.is_income) return list

    return [{ label: 'Gezamenlijke rekening / pot', value: 'pot' }, ...list]
  })

  const initialSplits = computed(() => {
    const splits = props.expense?.expand?.expense_splits_via_expense || []
    return splits.map((s) => ({ memberId: s.member, amount: Number(s.amount) }))
  })

  watch(
    () => isOpen.value,
    async (open) => {
      if (!open || !props.expense) return

      const exp = props.expense

      if (props.tripId) {
        await Promise.all([
          memberStore.fetchByTripId(props.tripId),
          categoryStore.fetchByTripId(props.tripId)
        ])
      }

      state.title = exp.title
      state.amount = Number(exp.amount)
      state.category = exp.category || categoryStore.categories[0]?.id || ''
      state.date = exp.date ? exp.date.substring(0, 10) : ''
      state.is_income = Boolean(exp.is_income)
      state.paid_by = exp.paid_from_pot ? 'pot' : exp.paid_by || ''
      state.notes = exp.notes || ''

      newReceiptFile.value = null
      shouldRemoveReceipt.value = false

      const existingReceiptUrl = exp.receipt ? expenseStore.getReceiptUrl(exp) : null
      if (existingReceiptUrl) {
        fileModel.value = {
          name: 'Gekoppeld bonnetje',
          avatar: { src: existingReceiptUrl, alt: exp.title }
        }
      } else {
        fileModel.value = null
      }
    }
  )

  async function onReceiptSelected(item: File | FileUploadItem | null | undefined) {
    if (!item) {
      fileModel.value = null
      newReceiptFile.value = null
      shouldRemoveReceipt.value = true
      return
    }

    if (item instanceof File) {
      isCompressing.value = true
      try {
        const compressed = await compressImage(item, 1200, 1600, 0.4)
        newReceiptFile.value = compressed
        shouldRemoveReceipt.value = false
      } finally {
        isCompressing.value = false
      }
    }
  }

  async function onSubmit(event: FormSubmitEvent<typeof state>) {
    if (!props.expense) return

    if (!event.data.title.trim()) {
      toast.add({ title: 'Vul een omschrijving in', color: 'error' })
      return
    }

    if (Number(event.data.amount) <= 0) {
      toast.add({ title: 'Bedrag moet groter zijn dan 0', color: 'error' })
      return
    }

    if (!event.data.is_income && !isPaidFromPot.value && !isSplitValid.value) {
      toast.add({
        title: 'Kostenverdeling klopt niet',
        description: 'Zorg dat het totaal van de verdeling gelijk is aan het uitgavebedrag.',
        color: 'error'
      })
      return
    }

    isSubmitting.value = true
    try {
      const fallbackMemberId = activeMembers.value[0]?.id || ''
      const paidBy = isPaidFromPot.value ? fallbackMemberId : event.data.paid_by

      const formData = new FormData()
      formData.append('title', event.data.title.trim())
      formData.append('amount', String(event.data.amount))
      formData.append('category', event.data.is_income ? '' : event.data.category)
      formData.append('date', event.data.date)
      if (paidBy) {
        formData.append('paid_by', paidBy)
      }
      formData.append('paid_from_pot', String(!event.data.is_income && isPaidFromPot.value))
      formData.append('is_income', String(event.data.is_income))
      formData.append('notes', event.data.notes?.trim() || '')

      if (newReceiptFile.value) {
        formData.append('receipt', newReceiptFile.value)
      } else if (shouldRemoveReceipt.value) {
        formData.append('receipt', '')
      }

      const splits = (!event.data.is_income && !isPaidFromPot.value) ? splitsPayload.value : []
      await expenseStore.updateExpense(props.expense.id, formData, splits)

      toast.add({ title: 'Uitgave bijgewerkt', color: 'success' })
      isOpen.value = false
    } catch (err: any) {
      toast.add({ title: 'Fout bij bijwerken', description: err.message, color: 'error' })
    } finally {
      isSubmitting.value = false
    }
  }
</script>

<template>
  <UModal v-model:open="isOpen" title="Uitgave Bewerken" description="Pas gegevens, categorie en verdeling aan.">
    <template #body>
      <UForm :state="state" class="app-form" @submit="onSubmit">
        <div class="app-form__grid">
          <UFormField label="Titel / Omschrijving" required class="app-form__field app-form__field--full">
            <UInput v-model="state.title" class="app-form__input" />
          </UFormField>

          <UFormField label="Bedrag" required class="app-form__field">
            <UInputNumber v-model="state.amount" :min="0.01" :step="0.01"
              :format-options="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }" class="app-form__input" />
          </UFormField>

          <UFormField label="Datum" required class="app-form__field">
            <UInput v-model="state.date" type="date" class="app-form__input" />
          </UFormField>

          <UFormField :label="state.is_income ? 'Ontvangen door' : 'Betaald door'" required class="app-form__field">
            <USelect v-model="state.paid_by" :items="memberOptions" class="app-form__input" />
          </UFormField>

          <UFormField v-if="!state.is_income" label="Categorie" required class="app-form__field">
            <USelect v-model="state.category" :items="categoryOptions" class="app-form__input" />
          </UFormField>
        </div>

        <UAlert v-if="!state.is_income && isPaidFromPot" icon="i-lucide-info" color="neutral" variant="subtle"
          title="Gezamenlijke rekening"
          description="Dit bedrag telt mee voor het totaalbudget, maar creëert geen onderlinge schulden." />

        <ExpenseSplitSelector v-else-if="!state.is_income" v-model="splitsPayload" v-model:valid="isSplitValid"
          :amount="Number(state.amount || 0)" :members="activeMembers" :initial-splits="initialSplits" />

        <UFormField label="Notitie (Optioneel)" class="app-form__field">
          <UTextarea v-model="state.notes" :rows="2" class="app-form__input" />
        </UFormField>

        <UFormField label="Bonnetje of betaalbewijs" name="receipt" class="app-form__field">
          <UFileUpload v-model="fileModel" accept="image/*" icon="i-lucide-camera"
            :label="isCompressing ? 'Afbeelding optimaliseren...' : 'Kies een bonnetje of vervang het huidige'"
            description="PNG, JPG of WEBP (wordt automatisch geoptimaliseerd)" class="app-form__input"
            @update:model-value="onReceiptSelected" />
        </UFormField>

        <div class="app-form__actions">
          <UButton label="Annuleren" variant="ghost" color="neutral" @click="isOpen = false" />
          <UButton type="submit" label="Wijzigingen Opslaan" color="primary" :loading="isSubmitting" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>