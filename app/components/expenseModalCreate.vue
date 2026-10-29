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
  const { compressImage, uploadReceipt } = useReceiptAttachment()
  const toast = useToast()

  const isSubmitting = ref(false)
  const isCompressing = ref(false)
  const fileInputRef = ref<HTMLInputElement | null>(null)
  const receiptFile = ref<File | null>(null)
  const receiptPreviewUrl = ref<string | null>(null)

  // Split settings
  const splitMode = ref<'equal' | 'exact'>('equal')
  const selectedMemberIds = ref<string[]>([])
  const customSplitAmounts = reactive<Record<string, number>>({})

  const state = reactive({
    title: '',
    amount: 0,
    category_id: '',
    expense_date: new Date().toISOString().split('T')[0],
    paid_by_member_id: '', // Kan een member-UUID zijn OF 'pot'
    notes: ''
  })

  // Bepaal of de gezamenlijke rekening geselecteerd is
  const isPaidFromPot = computed(() => state.paid_by_member_id === 'pot')

  const categoryOptions = computed(() => {
    return categoryStore.categories.map((c) => ({
      label: c.name,
      value: c.id,
      icon: c.icon
    }))
  })

  const activeMembers = computed(() => memberStore.members)

  // Voeg 'Gezamenlijke pot' direct toe bovenaan de opties
  const memberOptions = computed(() => {
    const list = activeMembers.value.map(m => ({
      label: `${m.display_name}${m.role === 'admin' ? ' ' : (!m.user_id ? ' (Gast)' : '')}`,
      value: m.id
    }))

    return [
      { label: 'Gezamenlijke rekening / pot', value: 'pot' },
      ...list
    ]
  })

  const perPersonEqualShare = computed(() => {
    if (selectedMemberIds.value.length === 0 || !state.amount) return 0
    return Number((state.amount / selectedMemberIds.value.length).toFixed(2))
  })

  const totalCustomSplit = computed(() => {
    return Object.values(customSplitAmounts).reduce((sum, val) => sum + (Number(val) || 0), 0)
  })

  const splitDifference = computed(() => {
    return Number((state.amount - totalCustomSplit.value).toFixed(2))
  })

  function toggleMember(memberId: string) {
    const idx = selectedMemberIds.value.indexOf(memberId)
    if (idx > -1) {
      if (selectedMemberIds.value.length > 1) {
        selectedMemberIds.value.splice(idx, 1)
      }
    } else {
      selectedMemberIds.value.push(memberId)
    }
  }

  function triggerFileInput() {
    fileInputRef.value?.click()
  }

  async function handleReceiptSelect(event: Event) {
    const target = event.target as HTMLInputElement
    if (target.files && target.files[0]) {
      const rawFile = target.files[0]
      isCompressing.value = true

      try {
        const compressed = await compressImage(rawFile)
        receiptFile.value = compressed
        receiptPreviewUrl.value = URL.createObjectURL(compressed)
      } finally {
        isCompressing.value = false
      }
    }
  }

  function removeReceipt() {
    receiptFile.value = null
    if (receiptPreviewUrl.value) {
      URL.revokeObjectURL(receiptPreviewUrl.value)
      receiptPreviewUrl.value = null
    }
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }

  function resetForm() {
    state.title = ''
    state.amount = 0
    state.category_id = categoryStore.categories[0]?.id || ''
    state.expense_date = new Date().toISOString().split('T')[0]
    state.notes = ''
    removeReceipt()
    splitMode.value = 'equal'

    // Standaard de organisator selecteren (admin), anders eerste lid, anders pot
    const organizer = activeMembers.value.find(m => m.role === 'admin')
      || activeMembers.value.find(m => m.user_id)
      || activeMembers.value[0]

    state.paid_by_member_id = organizer?.id || 'pot'

    selectedMemberIds.value = activeMembers.value.map(m => m.id)

    for (const m of activeMembers.value) {
      customSplitAmounts[m.id] = 0
    }
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

  watch(
    () => activeMembers.value,
    (members) => {
      for (const m of members) {
        if (customSplitAmounts[m.id] === undefined) {
          customSplitAmounts[m.id] = 0
        }
      }
    },
    { immediate: true }
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

    if (!event.data.category_id) {
      toast.add({ title: 'Kies een categorie', color: 'error' })
      return
    }

    // Alleen splits valideren als het niet uit de pot komt
    if (!isPaidFromPot.value && splitMode.value === 'exact' && Math.abs(splitDifference.value) > 0.01) {
      toast.add({
        title: 'Kostenverdeling klopt niet',
        description: `Er is nog een verschil van € ${Math.abs(splitDifference.value).toFixed(2)}.`,
        color: 'error'
      })
      return
    }

    isSubmitting.value = true

    try {
      let receiptPath: string | null = null

      if (receiptFile.value) {
        receiptPath = await uploadReceipt(receiptFile.value, props.tripId)
      }

      let splitsPayload: { member_id: string; amount: number }[] = []

      // Als het uit de pot betaald is, worden er GEEN splits aangemaakt
      if (!isPaidFromPot.value) {
        if (splitMode.value === 'equal') {
          const share = perPersonEqualShare.value
          splitsPayload = selectedMemberIds.value.map(id => ({
            member_id: id,
            amount: share
          }))
        } else {
          splitsPayload = activeMembers.value
            .filter(m => (customSplitAmounts[m.id] || 0) > 0)
            .map(m => ({
              member_id: m.id,
              amount: Number(customSplitAmounts[m.id])
            }))
        }
      }

      // Als het uit de pot is, koppelen we voor de foreign key een admin/willekeurig lid (of null als je schema nullable toestaat)
      const fallbackMemberId = activeMembers.value[0]?.id || ''

      await expenseStore.createExpense(
        {
          trip_id: props.tripId,
          title: event.data.title.trim(),
          amount: Number(event.data.amount),
          category_id: event.data.category_id,
          date: event.data.expense_date,
          paid_by_member_id: isPaidFromPot.value ? fallbackMemberId : event.data.paid_by_member_id,
          paid_from_pot: isPaidFromPot.value,
          is_income: false,
          notes: event.data.notes?.trim() || null,
          receipt_path: receiptPath
        } as any,
        splitsPayload
      )

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
      <UForm :state="state" class="expense-form" @submit="onSubmit">
        <!-- Veldgroep / Form Grid -->
        <div class="expense-form__grid">
          <UFormField label="Titel / Omschrijving" required class="expense-form__field expense-form__field--full">
            <UInput v-model="state.title" placeholder="bijv. Diner aan het strand of Benzine" autofocus
              class="expense-form__input" />
          </UFormField>

          <UFormField label="Bedrag" required class="expense-form__field">
            <UInputNumber v-model="state.amount" :min="0.01" :step="0.01"
              :format-options="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }" placeholder="0.00"
              class="expense-form__input" />
          </UFormField>

          <UFormField label="Datum" required class="expense-form__field">
            <UInput v-model="state.expense_date" type="date" class="expense-form__input" />
          </UFormField>

          <UFormField label="Betaald door" required class="expense-form__field">
            <USelect v-model="state.paid_by_member_id" :items="memberOptions" class="expense-form__input w-full" />
          </UFormField>

          <UFormField label="Categorie" required class="expense-form__field">
            <USelect v-model="state.category_id" :items="categoryOptions" class="expense-form__input w-full" />
          </UFormField>
        </div>

        <!-- Informatiebanner als de Gezamenlijke Pot gekozen is -->
        <div v-if="isPaidFromPot" class="pot-info-banner">
          <UIcon name="i-lucide-info" class="pot-info-banner__icon" />
          <span class="pot-info-banner__text">
            Betaald met de gezamenlijke rekening: dit bedrag telt mee voor het totaalbudget, maar creëert geen
            onderlinge schulden.
          </span>
        </div>

        <!-- Kostenverdeling / Splits: alleen tonen als het NIET de pot is -->
        <div v-else class="split-section">
          <div class="split-section__header">
            <div class="split-section__title-group">
              <UIcon name="i-lucide-users" class="split-section__icon" />
              <span class="split-section__title">Wie betaalt er mee?</span>
            </div>

            <div class="split-section__toggle-group">
              <UButton :variant="splitMode === 'equal' ? 'solid' : 'ghost'" color="primary" label="Gelijk" size="xs"
                @click="splitMode = 'equal'" />
              <UButton :variant="splitMode === 'exact' ? 'solid' : 'ghost'" color="primary" label="Exact / Ongelijk"
                size="xs" @click="splitMode = 'exact'" />
            </div>
          </div>

          <!-- Modus 1: Gelijk verdelen -->
          <div v-if="splitMode === 'equal'" class="split-members-list">
            <div v-for="m in activeMembers" :key="m.id" class="split-member-row" @click="toggleMember(m.id)">
              <div class="split-member-row__left">
                <UCheckbox :model-value="selectedMemberIds.includes(m.id)" @click.stop="toggleMember(m.id)" />
                <span class="split-member-row__name">{{ m.display_name }}</span>
                <UBadge v-if="!m.user_id" color="neutral" variant="subtle" size="xs">Gast</UBadge>
              </div>

              <span v-if="selectedMemberIds.includes(m.id)" class="split-member-row__amount">
                € {{ perPersonEqualShare.toFixed(2) }}
              </span>
              <span v-else class="split-member-row__inactive">
                Betaalt niet mee
              </span>
            </div>
          </div>

          <!-- Modus 2: Exact per persoon -->
          <div v-else class="split-custom-list">
            <div v-for="m in activeMembers" :key="m.id" class="split-custom-row">
              <div class="split-custom-row__left">
                <span class="split-custom-row__name">{{ m.display_name }}</span>
                <UBadge v-if="!m.user_id" color="neutral" variant="subtle" size="xs">Gast</UBadge>
              </div>

              <div class="split-custom-row__input-wrap">
                <UInputNumber v-model="customSplitAmounts[m.id]" :min="0" :step="0.01"
                  :format-options="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }" placeholder="0.00" size="sm"
                  class="expense-form__input" />
              </div>
            </div>

            <div class="split-difference-bar" :class="{
              'split-difference-bar--valid': Math.abs(splitDifference) < 0.01,
              'split-difference-bar--invalid': Math.abs(splitDifference) >= 0.01
            }">
              <span>
                Totaal verdeeld: € {{ totalCustomSplit.toFixed(2) }} van € {{ Number(state.amount || 0).toFixed(2) }}
              </span>
              <span class="split-difference-bar__status">
                {{ Math.abs(splitDifference) < 0.01 ? 'Klopt exact!' : `Nog € ${splitDifference.toFixed(2)}` }} </span>
            </div>
          </div>
        </div>

        <UFormField label="Notitie (Optioneel)" class="expense-form__field">
          <UTextarea v-model="state.notes" placeholder="bijv. inclusief fooi of wie wat had" :rows="2"
            class="expense-form__input" />
        </UFormField>

        <!-- Bonnetjes upload sectie -->
        <div class="receipt-upload">
          <span class="receipt-upload__label">Bonnetje of foto toevoegen</span>

          <input ref="fileInputRef" type="file" accept="image/*" class="receipt-upload__hidden-input"
            @change="handleReceiptSelect" />

          <div v-if="!receiptPreviewUrl" class="receipt-upload__dropzone" @click="triggerFileInput">
            <div class="receipt-upload__icon-wrap">
              <UIcon :name="isCompressing ? 'i-lucide-loader-circle' : 'i-lucide-camera'" class="receipt-upload__icon"
                :class="{ 'receipt-upload__icon--spin': isCompressing }" />
            </div>
            <div class="receipt-upload__meta">
              <span class="receipt-upload__prompt">
                {{ isCompressing ? 'Foto comprimeren...' : 'Klik om een foto of bonnetje te kiezen' }}
              </span>
              <span class="receipt-upload__hint">PNG, JPG of WEBP (wordt automatisch geoptimaliseerd)</span>
            </div>
          </div>

          <div v-else class="receipt-upload__preview-card">
            <img :src="receiptPreviewUrl" alt="Voorbeeld van bonnetje" class="receipt-upload__preview-img" />
            <div class="receipt-upload__preview-info">
              <span class="receipt-upload__filename">
                {{ receiptFile?.name || 'Bonnetje' }}
              </span>
              <span class="receipt-upload__filesize">
                {{ (receiptFile?.size ? (receiptFile.size / 1024).toFixed(0) : 0) }} KB
              </span>
            </div>
            <UButton icon="i-lucide-x" color="error" variant="ghost" size="xs" title="Foto verwijderen"
              class="receipt-upload__remove-btn" @click="removeReceipt" />
          </div>
        </div>

        <!-- Formulier acties -->
        <div class="expense-form__actions">
          <UButton label="Annuleren" variant="ghost" color="neutral" @click="isOpen = false" />
          <UButton type="submit" label="Opslaan" color="primary" :loading="isSubmitting" />
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

    &__grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.75rem;

      @media (min-width: 640px) {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    &__field {
      &--full {
        @media (min-width: 640px) {
          grid-column: span 2;
        }
      }
    }

    &__input {
      width: 100%;
    }

    &__actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.5rem;
      padding-top: 0.5rem;
    }
  }

  .pot-info-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    background-color: var(--ui-bg-elevated, #f9fafb);
    border: 1px dashed var(--ui-border, #e5e7eb);

    &__icon {
      font-size: 1.25rem;
      color: var(--ui-primary, #10b981);
      flex-shrink: 0;
    }

    &__text {
      font-size: 0.8125rem;
      color: var(--ui-text-muted, #6b7280);
      line-height: 1.4;
    }
  }

  .split-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.875rem;
    border-radius: 8px;
    background-color: var(--ui-bg-elevated, #f9fafb);
    border: 1px solid var(--ui-border, #e5e7eb);

    &__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    &__title-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    &__icon {
      font-size: 1rem;
      color: var(--ui-primary, #10b981);
    }

    &__title {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ui-text-muted, #6b7280);
    }

    &__toggle-group {
      display: flex;
      gap: 0.25rem;
      background-color: var(--ui-bg-muted, #f3f4f6);
      padding: 0.125rem;
      border-radius: 6px;
    }
  }

  .split-members-list {
    display: flex;
    flex-direction: column;
  }

  .split-member-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    cursor: pointer;

    &__left {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }

    &__name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--ui-text, #111827);
    }

    &__amount {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--ui-primary, #10b981);
    }

    &__inactive {
      font-size: 0.75rem;
      color: var(--ui-text-muted, #9ca3af);
    }
  }

  .split-custom-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .split-custom-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.375rem 0;

    &__left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
    }

    &__name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--ui-text, #111827);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__input-wrap {
      width: 128px;
      flex-shrink: 0;
    }
  }

  .split-difference-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.625rem;
    border-radius: 8px;
    font-size: 0.75rem;
    margin-top: 0.5rem;

    &--valid {
      background-color: #ecfdf5;
      color: #065f46;
    }

    &--invalid {
      background-color: #fffbeb;
      color: #92400e;
    }

    &__status {
      font-weight: 700;
    }
  }

  .receipt-upload {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;

    &__label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--ui-text, #111827);
    }

    &__hidden-input {
      display: none;
    }

    &__dropzone {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      border: 1.5px dashed var(--ui-border, #d1d5db);
      background-color: var(--ui-bg-elevated, #f9fafb);
      cursor: pointer;
      transition: border-color 0.15s ease, background-color 0.15s ease;

      &:hover {
        border-color: var(--ui-primary, #10b981);
        background-color: var(--ui-bg-muted, #f3f4f6);
      }
    }

    &__icon-wrap {
      width: 36px;
      height: 36px;
      border-radius: 6px;
      background-color: var(--ui-bg, #ffffff);
      border: 1px solid var(--ui-border-muted, #e5e7eb);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    &__icon {
      font-size: 1.25rem;
      color: var(--ui-primary, #10b981);

      &--spin {
        animation: spin 1s linear infinite;
      }
    }

    &__meta {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      min-width: 0;
    }

    &__prompt {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--ui-text, #111827);
    }

    &__hint {
      font-size: 0.6875rem;
      color: var(--ui-text-muted, #6b7280);
    }

    &__preview-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      border: 1px solid var(--ui-border, #e5e7eb);
      background-color: var(--ui-bg-elevated, #f9fafb);
    }

    &__preview-img {
      width: 44px;
      height: 44px;
      border-radius: 6px;
      object-fit: cover;
      border: 1px solid var(--ui-border, #e5e7eb);
      flex-shrink: 0;
    }

    &__preview-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }

    &__filename {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--ui-text, #111827);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__filesize {
      font-size: 0.6875rem;
      color: var(--ui-text-muted, #6b7280);
    }

    &__remove-btn {
      flex-shrink: 0;
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }
</style>