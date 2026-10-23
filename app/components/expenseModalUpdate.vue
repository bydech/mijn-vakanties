<!-- components/ExpenseModalUpdate.vue -->
<script setup lang="ts">
  import type { FormSubmitEvent } from '@nuxt/ui'
  import { useReceiptAttachment } from '~/composables/useReceiptAttachments';
  import type { Tables } from '~/types/database.types'

  const isOpen = defineModel<boolean>('open', { default: false })
  const props = defineProps<{
    expense: Tables<'expenses'> | null
    tripId: string
    currency?: string
  }>()

  const expenseStore = useExpenseStore()
  const toast = useToast()
  const { uploadReceipt, deleteReceipt, compressImage, getSignedUrl, isUploading } = useReceiptAttachment()
  const isSubmitting = ref(false)

  const selectedFile = ref<File | null>(null)
  const previewUrl = ref<string | null>(null)
  const existingReceiptUrl = ref<string | null>(null)
  const shouldDeleteExistingReceipt = ref(false)

  const state = reactive({
    title: '',
    amount: 0,
    date: '',
    paid_by_member_id: '',
    category: 'Eten & Drinken',
    is_income: false,
    notes: ''
  })

  const categories = [
    'Eten & Drinken',
    'Boodschappen',
    'Vervoer',
    'Verblijf',
    'Activiteiten',
    'Winkelen',
    'Overig'
  ]

  watch(
    () => props.expense,
    async (newExp) => {
      if (!newExp) return
      state.title = newExp.title
      state.amount = Number(newExp.amount)
      state.date = newExp.date
      state.paid_by_member_id = newExp.paid_by_member_id
      state.category = newExp.category
      state.is_income = newExp.is_income
      state.notes = newExp.notes || ''

      selectedFile.value = null
      previewUrl.value = null
      shouldDeleteExistingReceipt.value = false
      existingReceiptUrl.value = null

      if (newExp.receipt_path) {
        existingReceiptUrl.value = await getSignedUrl(newExp.receipt_path)
      }
    },
    { immediate: true }
  )

  const memberOptions = computed(() => {
    return expenseStore.members.map(m => ({
      label: m.display_name,
      value: m.id
    }))
  })

  async function onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement)?.files?.[0]
    if (file) {
      selectedFile.value = file
      previewUrl.value = URL.createObjectURL(file)
    }
  }

  async function onSubmit(event: FormSubmitEvent<typeof state>) {
    if (!props.expense || !event.data.title.trim()) return

    isSubmitting.value = true
    try {
      let finalReceiptPath = props.expense.receipt_path

      // 1. Verwijder oude bon indien gewenst of vervangen
      if ((shouldDeleteExistingReceipt.value || selectedFile.value) && props.expense.receipt_path) {
        await deleteReceipt(props.expense.receipt_path)
        finalReceiptPath = null
      }

      // 2. Upload nieuwe bon indien geselecteerd
      if (selectedFile.value && !state.is_income) {
        finalReceiptPath = await uploadReceipt(selectedFile.value, props.tripId)
      }

      // 3. Update database record via Supabase direct
      const { error } = await useSupabaseClient()
        .from('expenses')
        .update({
          title: event.data.title.trim(),
          amount: Number(event.data.amount),
          date: event.data.date,
          paid_by_member_id: event.data.paid_by_member_id,
          category: event.data.category,
          is_income: event.data.is_income,
          receipt_path: finalReceiptPath,
          notes: event.data.notes.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', props.expense.id)

      if (error) throw error

      // Sync store
      await expenseStore.fetchByTripId(props.tripId)

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
  <UModal v-model:open="isOpen" title="Uitgave Bewerken"
    description="Pas de details of het bonnetje van deze uitgave aan." class="expense-modal">
    <template #body>
      <UForm :state="state" class="expense-form" @submit="onSubmit">
        <!-- Bedrag -->
        <div class="expense-form__amount-box">
          <span class="expense-form__currency-symbol">{{ props.currency || '€' }}</span>
          <UInputNumber v-model="state.amount" :increment="false" :decrement="false" :step="0.01" :min="0"
            :format-options="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }" placeholder="0.00"
            class="expense-form__amount-input" />
        </div>

        <UFormField label="Omschrijving" required name="title">
          <UInput v-model="state.title" class="w-full" />
        </UFormField>

        <div class="expense-form__grid">
          <UFormField label="Betaald door" required name="paid_by_member_id" class="w-full">
            <USelect v-model="state.paid_by_member_id" :items="memberOptions" class="w-full" />
          </UFormField>

          <UFormField label="Datum" required name="date" class="w-full">
            <UInput v-model="state.date" type="date" class="w-full" />
          </UFormField>
        </div>

        <UFormField v-if="!state.is_income" label="Categorie" name="category">
          <USelect v-model="state.category" :items="categories" class="w-full" />
        </UFormField>

        <UFormField label="Notitie / Opmerking" name="notes">
          <UTextarea v-model="state.notes" placeholder="Notitie aanpassen..." :rows="2" class="w-full" />
        </UFormField>

        <UFormField label="Notitie / Opmerkingen" name="notes">
          <UTextarea v-model="state.notes" :rows="2" class="w-full" />
        </UFormField>

        <!-- Bonnetjes beheer -->
        <div v-if="!state.is_income" class="expense-form__receipt-section">
          <UFormField label="Bonnetje">
            <!-- Bestaande bon weergave -->
            <div v-if="existingReceiptUrl && !shouldDeleteExistingReceipt && !previewUrl" class="receipt-preview">
              <img :src="existingReceiptUrl" alt="Huidig bonnetje" class="receipt-preview__img" />
              <div class="receipt-preview__meta">
                <span class="text-xs text-muted">Huidig opgeslagen bonnetje</span>
                <UButton icon="i-lucide-trash" label="Bonnetje verwijderen" color="error" variant="soft" size="xs"
                  @click="shouldDeleteExistingReceipt = true" />
              </div>
            </div>

            <!-- Nieuwe foto preview -->
            <div v-else-if="previewUrl" class="receipt-preview">
              <img :src="previewUrl" alt="Nieuw bonnetje" class="receipt-preview__img" />
              <div class="receipt-preview__meta">
                <span class="text-xs text-emerald-600 font-medium">Nieuwe foto geselecteerd</span>
                <UButton icon="i-lucide-x" label="Annuleer vervanging" color="neutral" variant="ghost" size="xs"
                  @click="selectedFile = null; previewUrl = null" />
              </div>
            </div>

            <!-- Upload trigger -->
            <div v-else>
              <input type="file" accept="image/*" class="hidden" ref="updateFileInputRef" @change="onFileSelected" />
              <UButton icon="i-lucide-upload" label="Nieuw bonnetje uploaden" variant="outline" color="neutral"
                class="w-full" @click="($refs.updateFileInputRef as HTMLInputElement).click()" />
            </div>
          </UFormField>
        </div>

        <div class="expense-form__actions">
          <UButton label="Annuleren" variant="ghost" color="neutral" @click="isOpen = false" />
          <UButton type="submit" label="Wijzigingen Opslaan" color="primary" :loading="isSubmitting || isUploading" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<style lang="scss" scoped>
  .expense-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    &__amount-box {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background-color: var(--ui-bg-elevated, #f9fafb);
      border-radius: 8px;
      border: 1px solid var(--ui-border, #e5e7eb);
    }

    &__currency-symbol {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--ui-text, #111827);
    }

    &__amount-input {
      font-size: 1.5rem;
      font-weight: 700;
      width: 140px;
    }

    &__grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;

      @media (max-width: 640px) {
        grid-template-columns: 1fr;
      }
    }

    &__receipt-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    &__actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
  }

  .receipt-preview {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    background-color: var(--ui-bg-elevated, #f9fafb);
    border: 1px solid var(--ui-border, #e5e7eb);

    &__img {
      width: 52px;
      height: 52px;
      object-fit: cover;
      border-radius: 6px;
    }

    &__meta {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
  }
</style>