<!-- components/ExpenseModalCreate.vue -->
<script setup lang="ts">
  import type { FormSubmitEvent } from '@nuxt/ui'

  const isOpen = defineModel<boolean>('open', { default: false })

  const props = defineProps<{
    tripId: string
  }>()

  const expenseStore = useExpenseStore()
  const memberStore = useMemberStore()
  const categoryStore = useCategoryStore()
  const { compressImage } = useImageCompression()
  const toast = useToast()

  const isSubmitting = ref(false)
  const isCompressing = ref(false)
  const receiptFile = ref<File | null>(null)

  // Split state gekoppeld aan ExpenseSplitSelector
  const splitsPayload = ref<{ member_id: string; amount: number }[]>([])
  const isSplitValid = ref(true)

  const state = reactive({
    title: '',
    amount: 0,
    category: '',
    date: new Date().toISOString().substring(0, 10),
    paid_by: '',
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
      label: `${m.display_name}${m.role === 'admin' ? ' ' : (!m.user ? ' (Gast)' : '')}`,
      value: m.id
    }))

    return [
      { label: 'Gezamenlijke rekening / pot', value: 'pot' },
      ...list
    ]
  })

  async function onReceiptSelected(file: File | null | undefined) {
    if (!file) {
      receiptFile.value = null
      return
    }

    isCompressing.value = true
    try {
      const compressed = await compressImage(file, 1200, 1600, 0.4)
      receiptFile.value = compressed
    } finally {
      isCompressing.value = false
    }
  }

  function resetForm() {
    state.title = ''
    state.amount = 0
    state.category = categoryStore.categories[0]?.id || ''
    state.date = new Date().toISOString().substring(0, 10)
    state.notes = ''
    receiptFile.value = null

    const organizer =
      activeMembers.value.find((m) => m.role === 'admin') ||
      activeMembers.value.find((m) => m.user) ||
      activeMembers.value[0]

    state.paid_by = organizer?.id || 'pot'
  }

  watch(
    () => isOpen.value,
    async (open) => {
      if (open && props.tripId) {
        await Promise.all([
          memberStore.fetchByTripId(props.tripId),
          categoryStore.fetchByTripId(props.tripId)
        ])
        resetForm()
      }
    }
  )

  async function onSubmit(event: FormSubmitEvent<typeof state>) {
    if (!event.data.title.trim()) {
      toast.add({ title: 'Vul een omschrijving in', color: 'error' })
      return
    }

    if (Number(event.data.amount) <= 0) {
      toast.add({ title: 'Bedrag moet groter zijn dan 0', color: 'error' })
      return
    }

    if (!event.data.category) {
      toast.add({ title: 'Kies een categorie', color: 'error' })
      return
    }

    if (!isPaidFromPot.value && !isSplitValid.value) {
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
      formData.append('trip', props.tripId)
      formData.append('title', event.data.title.trim())
      formData.append('amount', String(event.data.amount))
      formData.append('category', event.data.category)
      formData.append('date', event.data.date)
      if (paidBy) formData.append('paid_by', paidBy)
      formData.append('paid_from_pot', String(isPaidFromPot.value))
      formData.append('is_income', 'false')
      if (event.data.notes?.trim()) {
        formData.append('notes', event.data.notes.trim())
      }
      if (receiptFile.value) {
        formData.append('receipt', receiptFile.value)
      }

      const splits = isPaidFromPot.value ? [] : splitsPayload.value

      await expenseStore.createExpense(formData, splits)

      toast.add({
        title: 'Uitgave toegevoegd',
        color: 'success'
      })

      isOpen.value = false
      resetForm()
    } catch (err: any) {
      toast.add({
        title: 'Fout bij opslaan',
        description: err.message || 'Kon uitgave niet opslaan',
        color: 'error'
      })
    } finally {
      isSubmitting.value = false
    }
  }
</script>

<template>
  <UModal v-model:open="isOpen" title="Nieuwe Uitgave Registreren"
    description="Voer de details en wie er meebetalen in.">
    <template #body>
      <UForm :state="state" class="app-form" @submit="onSubmit">
        <div class="app-form__grid">
          <UFormField label="Titel / Omschrijving" required class="app-form__field app-form__field--full">
            <UInput v-model="state.title" placeholder="bijv. Diner aan het strand of Benzine" autofocus
              class="app-form__input" />
          </UFormField>

          <UFormField label="Bedrag" required class="app-form__field">
            <UInputNumber v-model="state.amount" :min="0.01" :step="0.01"
              :format-options="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }" placeholder="0.00"
              class="app-form__input" />
          </UFormField>

          <UFormField label="Datum" required class="app-form__field">
            <UInput v-model="state.date" type="date" class="app-form__input" />
          </UFormField>

          <UFormField label="Betaald door" required class="app-form__field">
            <USelect v-model="state.paid_by" :items="memberOptions" class="app-form__input" />
          </UFormField>

          <UFormField label="Categorie" required class="app-form__field">
            <USelect v-model="state.category" :items="categoryOptions" class="app-form__input" />
          </UFormField>
        </div>

        <UAlert v-if="isPaidFromPot" icon="i-lucide-info" color="neutral" variant="subtle" title="Gezamenlijke rekening"
          description="Dit bedrag telt mee voor het totaalbudget, maar creëert geen onderlinge schulden." />

        <ExpenseSplitSelector v-else v-model="splitsPayload" v-model:valid="isSplitValid"
          :amount="Number(state.amount || 0)" :members="activeMembers" />

        <UFormField label="Notitie (Optioneel)" class="app-form__field">
          <UTextarea v-model="state.notes" placeholder="bijv. inclusief fooi of wie wat had" :rows="2"
            class="app-form__input" />
        </UFormField>

        <UFormField label="Bonnetje of foto toevoegen" name="receipt" class="app-form__field">
          <UFileUpload v-model="receiptFile" accept="image/*" icon="i-lucide-camera"
            :label="isCompressing ? 'Foto comprimeren...' : 'Klik om een foto of bonnetje te kiezen'"
            description="PNG, JPG of WEBP (wordt automatisch geoptimaliseerd)" class="app-form__input"
            @update:model-value="onReceiptSelected" />
        </UFormField>

        <div class="app-form__actions">
          <UButton label="Annuleren" variant="ghost" color="neutral" @click="isOpen = false" />
          <UButton type="submit" label="Opslaan" color="primary" :loading="isSubmitting" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>