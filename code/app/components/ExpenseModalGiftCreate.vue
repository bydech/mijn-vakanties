<!-- components/ExpenseModalGiftCreate.vue -->
<script setup lang="ts">
  import type { FormSubmitEvent } from '@nuxt/ui'

  const isOpen = defineModel<boolean>('open', { default: false })

  const props = defineProps<{
    tripId: string
    currency?: string
  }>()

  const expenseStore = useExpenseStore()
  const memberStore = useMemberStore()
  const toast = useToast()

  const isSubmitting = ref(false)

  const state = reactive({
    title: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    received_by_member_id: '',
    notes: ''
  })

  const activeMembers = computed(() => memberStore.members)

  const memberOptions = computed(() => {
    return activeMembers.value.map((m) => ({
      label: `${m.display_name}${!m.user ? ' (Gast)' : ''}`,
      value: m.id
    }))
  })

  function resetForm() {
    state.title = ''
    state.amount = 0
    state.date = new Date().toISOString().split('T')[0]
    state.notes = ''

    const defaultMember = activeMembers.value.find((m) => m.user) || activeMembers.value[0]
    if (defaultMember) {
      state.received_by_member_id = defaultMember.id
    }
  }

  async function onSubmit(event: FormSubmitEvent<typeof state>) {
    if (!event.data.title.trim()) {
      toast.add({ title: 'Vul een omschrijving in', color: 'error' })
      return
    }

    if (Number(event.data.amount) <= 0) {
      toast.add({ title: 'Bedrag moet groter zijn dan 0', color: 'error' })
      return
    }

    isSubmitting.value = true

    try {
      await expenseStore.createExpense(
        {
          trip: props.tripId,
          title: event.data.title.trim(),
          amount: Number(event.data.amount),
          category: '',
          date: event.data.date,
          paid_by: event.data.received_by_member_id,
          paid_from_pot: false,
          is_income: true,
          notes: event.data.notes?.trim() || ''
        },
        []
      )

      toast.add({
        title: 'Gift / Inkomst geregistreerd',
        description: `€ ${Number(event.data.amount).toFixed(2)} verwerkt in de reis.`,
        color: 'success'
      })

      isOpen.value = false
      resetForm()
    } catch (err: any) {
      toast.add({
        title: 'Fout bij opslaan',
        description: err.message || 'Kon inkomst niet opslaan',
        color: 'error'
      })
    } finally {
      isSubmitting.value = false
    }
  }

  watch(
    () => isOpen.value,
    async (open) => {
      if (open && props.tripId) {
        if (memberStore.members.length === 0) {
          await memberStore.fetchByTripId(props.tripId)
        }
        resetForm()
      }
    }
  )
</script>

<template>
  <UModal v-model:open="isOpen" title="Gift of Inkomst Toevoegen"
    description="Registreer ontvangen geld (bijv. een zakcentje van oma of teruggave) dat de totale reiskosten verlaagt.">
    <template #body>
      <UForm :state="state" class="app-form" @submit="onSubmit">
        <UFormField label="Omschrijving" required class="app-form__field">
          <UInput v-model="state.title" placeholder="bijv. Bijdrage van opa & oma of Statiegeld" autofocus
            class="app-form__input" />
        </UFormField>

        <div class="app-form__grid">
          <UFormField label="Bedrag" required class="app-form__field">
            <UInputNumber v-model="state.amount" :min="0.01" :step="0.01"
              :format-options="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }" placeholder="0.00"
              class="app-form__input" />
          </UFormField>

          <UFormField label="Datum" required class="app-form__field">
            <UInput v-model="state.date" type="date" class="app-form__input" />
          </UFormField>
        </div>

        <UFormField label="Ontvangen door" required class="app-form__field">
          <USelect v-model="state.received_by_member_id" :items="memberOptions" class="app-form__input" />
        </UFormField>

        <UFormField label="Notitie (Optioneel)" class="app-form__field">
          <UTextarea v-model="state.notes" placeholder="Optionele extra toelichting..." :rows="2"
            class="app-form__input" />
        </UFormField>

        <div class="app-form__actions">
          <UButton label="Annuleren" variant="ghost" color="neutral" @click="isOpen = false" />
          <UButton type="submit" icon="i-lucide-gift" label="Gift Opslaan" color="primary" :loading="isSubmitting" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>