<!-- components/TripModalCreate.vue -->
<script setup lang="ts">
  import type { FormSubmitEvent } from '@nuxt/ui'

  const isOpen = defineModel<boolean>('open', { default: false })

  const emit = defineEmits<{
    (e: 'created', id: string): void
  }>()

  const tripStore = useTripStore()
  const { compressImage, uploadThumbnail } = useTripThumbnail()
  const toast = useToast()

  const isSubmitting = ref(false)
  const isCompressing = ref(false)
  const fileInputRef = ref<HTMLInputElement | null>(null)
  const thumbnailFile = ref<File | null>(null)
  const thumbnailPreviewUrl = ref<string | null>(null)

  const state = reactive({
    name: '',
    destination: '',
    start_date: '',
    end_date: '',
    budget: 0,
    currency: 'EUR'
  })

  const currencyOptions = [
    { label: 'EUR (€)', value: 'EUR' },
    { label: 'USD ($)', value: 'USD' },
    { label: 'GBP (£)', value: 'GBP' },
    { label: 'JPY (¥)', value: 'JPY' }
  ]

  function triggerFileInput() {
    fileInputRef.value?.click()
  }

  async function handleThumbnailSelect(event: Event) {
    const target = event.target as HTMLInputElement
    if (target.files && target.files[0]) {
      const rawFile = target.files[0]
      isCompressing.value = true
      try {
        const compressed = await compressImage(rawFile, 1000, 600, 0.4)
        thumbnailFile.value = compressed
        thumbnailPreviewUrl.value = URL.createObjectURL(compressed)
      } finally {
        isCompressing.value = false
      }
    }
  }

  function removeThumbnail() {
    thumbnailFile.value = null
    if (thumbnailPreviewUrl.value) {
      URL.revokeObjectURL(thumbnailPreviewUrl.value)
      thumbnailPreviewUrl.value = null
    }
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }

  function resetForm() {
    state.name = ''
    state.destination = ''
    state.start_date = ''
    state.end_date = ''
    state.budget = 0
    state.currency = 'EUR'
    removeThumbnail()
  }

  async function onSubmit(event: FormSubmitEvent<typeof state>) {
    if (!event.data.name.trim()) return

    isSubmitting.value = true


    try {
      // 1. Maak reis aan
      const newTrip = await tripStore.createTrip({
        name: event.data.name.trim(),
        destination: event.data.destination?.trim() || null,
        start_date: event.data.start_date || null,
        end_date: event.data.end_date || null,
        budget: Number(event.data.budget) > 0 ? Number(event.data.budget) : null,
        currency: event.data.currency
      })

      // 2. Upload thumbnail als die gekozen is
      if (thumbnailFile.value && newTrip.id) {
        const path = await uploadThumbnail(thumbnailFile.value, newTrip.id)
        if (path) {
          await tripStore.updateTrip(newTrip.id, { thumbnail_path: path })
        }
      }

      toast.add({
        title: 'Vakantie aangemaakt!',
        description: `Veel plezier met "${newTrip.name}".`,
        color: 'success'
      })

      isOpen.value = false
      emit('created', newTrip.id)
      resetForm()
    } catch (err: any) {
      toast.add({
        title: 'Fout bij aanmaken',
        description: err.message || 'Kon de reis niet opslaan.',
        color: 'error'
      })
    } finally {
      isSubmitting.value = false
    }
  }
</script>

<template>
  <UModal v-model:open="isOpen" title="Nieuwe Reis Plannen"
    description="Maak een reisomgeving aan om budgetten en kosten bij te houden.">
    <template #body>
      <UForm :state="state" class="trip-form" @submit="onSubmit">
        <UFormField label="Naam van de reis" required name="name" class="trip-form__field">
          <UInput v-model="state.name" placeholder="bijv. Zomervakantie Italië of Weekendje Parijs" autofocus
            class="trip-form__input" />
        </UFormField>

        <UFormField label="Bestemming" name="destination" class="trip-form__field">
          <UInput v-model="state.destination" placeholder="bijv. Toscane, Frankrijk" icon="i-lucide-map-pin"
            class="trip-form__input" />
        </UFormField>

        <!-- Thumbnail upload sectie -->
        <div class="trip-thumbnail-field">
          <span class="trip-thumbnail-field__label">Omslagfoto / Thumbnail</span>

          <input ref="fileInputRef" type="file" accept="image/*" class="trip-thumbnail-field__hidden-input"
            @change="handleThumbnailSelect" />

          <div v-if="!thumbnailPreviewUrl" class="trip-thumbnail-field__dropzone" @click="triggerFileInput">
            <div class="trip-thumbnail-field__icon-wrap">
              <UIcon :name="isCompressing ? 'i-lucide-loader-circle' : 'i-lucide-image'"
                class="trip-thumbnail-field__icon" :class="{ 'trip-thumbnail-field__icon--spin': isCompressing }" />
            </div>
            <div class="trip-thumbnail-field__meta">
              <span class="trip-thumbnail-field__prompt">
                {{ isCompressing ? 'Afbeelding optimaliseren...' : 'Kies een sfeervolle omslagfoto' }}
              </span>
              <span class="trip-thumbnail-field__hint">JPG, PNG of WEBP (wordt automatisch geoptimaliseerd)</span>
            </div>
          </div>

          <div v-else class="trip-thumbnail-field__preview-card">
            <img :src="thumbnailPreviewUrl" alt="Thumbnail preview" class="trip-thumbnail-field__preview-img" />
            <div class="trip-thumbnail-field__preview-info">
              <span class="trip-thumbnail-field__filename truncate">
                {{ thumbnailFile?.name || 'Omslagfoto' }}
              </span>
              <span class="trip-thumbnail-field__filesize">
                {{ (thumbnailFile?.size ? (thumbnailFile.size / 1024).toFixed(0) : 0) }} KB
              </span>
            </div>
            <UButton icon="i-lucide-x" color="error" variant="ghost" size="xs" title="Foto verwijderen"
              @click="removeThumbnail" />
          </div>
        </div>

        <div class="trip-form__grid">
          <UFormField label="Startdatum" name="start_date" class="trip-form__field">
            <UInput v-model="state.start_date" type="date" class="trip-form__input" />
          </UFormField>

          <UFormField label="Einddatum" name="end_date" class="trip-form__field">
            <UInput v-model="state.end_date" type="date" class="trip-form__input" />
          </UFormField>

          <UFormField label="Totaal Budget (Optioneel)">
            <UInputNumber v-model="state.budget" :min="0" :step="50"
              :format-options="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }"
              placeholder="Geen budget ingesteld" class="w-full" />
          </UFormField>

          <UFormField label="Valuta" name="currency" class="trip-form__field">
            <USelect v-model="state.currency" :items="currencyOptions" class="trip-form__input w-full" />
          </UFormField>
        </div>

        <div class="trip-form__actions">
          <UButton label="Annuleren" variant="ghost" color="neutral" @click="isOpen = false" />
          <UButton type="submit" label="Reis Aanmaken" color="primary" :loading="isSubmitting" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<style lang="scss" scoped>
  .trip-form {
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

    &__input {
      width: 100%;
    }

    &__actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
  }

  .trip-thumbnail-field {
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
      width: 38px;
      height: 38px;
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
      width: 64px;
      height: 42px;
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
    }

    &__filesize {
      font-size: 0.6875rem;
      color: var(--ui-text-muted, #6b7280);
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