<!-- components/ExpenseModalCreate.vue -->
<script setup lang="ts">
  import type { FormSubmitEvent } from '@nuxt/ui'
  import { useReceiptAttachment } from '~/composables/useReceiptAttachments';

  const isOpen = defineModel<boolean>('open', { default: false })
  const props = defineProps<{
    tripId: string
    currency?: string
  }>()

  const expenseStore = useExpenseStore()
  const toast = useToast()
  const { uploadReceipt, compressImage, isUploading } = useReceiptAttachment()
  const isSubmitting = ref(false)

  const selectedFile = ref<File | null>(null)
  const previewUrl = ref<string | null>(null)
  const sizeInfo = ref<{ original: string; compressed: string } | null>(null)

  const state = reactive({
    title: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
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

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  async function onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement)?.files?.[0]
    if (file) {
      selectedFile.value = file
      previewUrl.value = URL.createObjectURL(file)

      const compressed = await compressImage(file)
      sizeInfo.value = {
        original: formatBytes(file.size),
        compressed: formatBytes(compressed.size)
      }
    }
  }

  function clearReceipt() {
    selectedFile.value = null
    previewUrl.value = null
    sizeInfo.value = null
  }

  function resetForm() {
    state.title = ''
    state.amount = 0
    state.date = new Date().toISOString().split('T')[0]
    state.category = 'Eten & Drinken'
    state.is_income = false
    state.notes = ''
    clearReceipt()
  }

  watch(
    () => isOpen.value,
    (open) => {
      if (open) {
        resetForm()
        if (expenseStore.members.length > 0 && !state.paid_by_member_id) {
          state.paid_by_member_id = expenseStore.members[0]!.id
        }
      }
    }
  )

  const memberOptions = computed(() => {
    return expenseStore.members.map(m => ({
      label: m.display_name,
      value: m.id
    }))
  })

  async function onSubmit(event: FormSubmitEvent<typeof state>) {
    if (!event.data.title.trim()) return
    if (Number(event.data.amount) <= 0) {
      toast.add({ title: 'Voer een geldig bedrag in', color: 'error' })
      return
    }

    isSubmitting.value = true
    try {
      let receiptPath: string | null = null

      // Upload en comprimeer foto indien aanwezig
      if (selectedFile.value && !state.is_income) {
        receiptPath = await uploadReceipt(selectedFile.value, props.tripId)
      }

      await expenseStore.createExpense({
        trip_id: props.tripId,
        title: event.data.title.trim(),
        amount: Number(event.data.amount),
        date: event.data.date,
        paid_by_member_id: event.data.paid_by_member_id,
        category: event.data.category,
        is_income: event.data.is_income,
        receipt_path: receiptPath,
        notes: event.data.notes.trim() || null
      })

      toast.add({
        title: event.data.is_income ? 'Inkomst geregistreerd' : 'Uitgave toegevoegd',
        color: 'success'
      })

      isOpen.value = false
      resetForm()
    } catch (err: any) {
      toast.add({
        title: 'Fout bij opslaan',
        description: err.message,
        color: 'error'
      })
    } finally {
      isSubmitting.value = false
    }
  }
</script>

<template>
  <UModal v-model:open="isOpen" :title="state.is_income ? 'Nieuwe Inkomst / Gift' : 'Nieuwe Uitgave'"
    :description="state.is_income ? 'Voeg ontvangen geld toe aan de reis' : 'Registreer een uitgave met bonnetje en notities'"
    class="expense-modal">
    <template #body>
      <UForm :state="state" class="expense-form" @submit="onSubmit">
        <!-- Type switch -->
        <div class="expense-form__type-switch">
          <UButton :variant="!state.is_income ? 'solid' : 'ghost'" color="primary" label="Uitgave"
            icon="i-lucide-arrow-up-right" class="flex-1" @click="state.is_income = false" />
          <UButton :variant="state.is_income ? 'solid' : 'ghost'" color="success" label="Inkomst / Cadeau"
            icon="i-lucide-gift" class="flex-1" @click="state.is_income = true" />
        </div>

        <!-- Bedrag -->
        <div class="expense-form__amount-box">
          <span class="expense-form__currency-symbol">{{ props.currency || '€' }}</span>
          <UInputNumber v-model="state.amount" :increment="false" :decrement="false" :step="0.01" :min="0"
            :format-options="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }" placeholder="0.00" autofocus
            class="expense-form__amount-input" />
        </div>

        <UFormField label="Omschrijving" required name="title">
          <UInput v-model="state.title" placeholder="bijv. Diner aan het water, Tanken, Bakker" class="w-full" />
        </UFormField>

        <div class="expense-form__grid">
          <UFormField label="Betaald door / Ontvangen door" required name="paid_by_member_id" class="w-full">
            <USelect v-model="state.paid_by_member_id" :items="memberOptions" class="w-full" />
          </UFormField>

          <UFormField label="Datum" required name="date" class="w-full">
            <UInput v-model="state.date" type="date" class="w-full" />
          </UFormField>
        </div>

        <UFormField v-if="!state.is_income" label="Categorie" name="category">
          <USelect v-model="state.category" :items="categories" class="w-full" />
        </UFormField>

        <!-- Notities -->
        <UFormField label="Notitie / Opmerkingen" name="notes">
          <UTextarea v-model="state.notes" placeholder="Optionele extra toelichting of afspraken..." :rows="2"
            class="w-full" />
        </UFormField>

        <!-- Bonnetjes upload (alleen bij uitgaven) -->
        <div v-if="!state.is_income" class="expense-form__receipt-section">
          <UFormField label="Bonnetje / Bewijs" help="Wordt automatisch gecomprimeerd naar WebP (< 200 KB)">
            <input type="file" accept="image/*" class="hidden" ref="fileInputRef" @change="onFileSelected" />
            <UButton v-if="!selectedFile" icon="i-lucide-camera" label="Bonnetje toevoegen / Foto maken"
              variant="outline" color="neutral" class="w-full"
              @click="($refs.fileInputRef as HTMLInputElement).click()" />
          </UFormField>

          <div v-if="previewUrl" class="receipt-preview">
            <img :src="previewUrl" alt="Bonnetje preview" class="receipt-preview__img" />
            <div class="receipt-preview__meta">
              <span v-if="sizeInfo" class="receipt-preview__badge">
                {{ sizeInfo.original }} → <strong>{{ sizeInfo.compressed }}</strong>
              </span>
              <UButton icon="i-lucide-trash" color="error" variant="soft" size="xs" label="Verwijder foto"
                @click="clearReceipt" />
            </div>
          </div>
        </div>

        <div class="expense-form__actions">
          <UButton label="Annuleren" variant="ghost" color="neutral" @click="isOpen = false" />
          <UButton type="submit" :label="state.is_income ? 'Inkomst Opslaan' : 'Uitgave Toevoegen'" color="primary"
            :loading="isSubmitting || isUploading" />
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

    &__type-switch {
      display: flex;
      background-color: var(--ui-bg-elevated, #f3f4f6);
      padding: 0.25rem;
      border-radius: 8px;
      gap: 0.25rem;
    }

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

    &__badge {
      font-size: 0.75rem;
      color: var(--ui-text-muted, #4b5563);

      strong {
        color: #10b981;
      }
    }
  }
</style>