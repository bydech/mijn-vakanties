<!-- components/TripModalUpdate.vue -->
<script setup lang="ts">
  import type { FormSubmitEvent } from '@nuxt/ui'
  import type { Tables } from '~/types/database.types'

  const isOpen = defineModel<boolean>('open', { default: false })

  const props = defineProps<{
    trip: Tables<'trips'> | null
  }>()

  const tripStore = useTripStore()
  const { compressImage, uploadThumbnail, deleteThumbnail, getThumbnailUrl } = useTripThumbnail()
  const toast = useToast()

  const isSubmitting = ref(false)
  const isCompressing = ref(false)
  const isDeleteModalOpen = ref(false)

  // Thumbnail state
  const fileInputRef = ref<HTMLInputElement | null>(null)
  const newThumbnailFile = ref<File | null>(null)
  const previewUrl = ref<string | null>(null)
  const currentThumbnailPath = ref<string | null>(null)
  const shouldRemoveThumbnail = ref(false)

  const state = reactive({
    name: '',
    destination: '',
    start_date: '',
    end_date: '',
    budget: 0,
    currency: 'EUR',
    is_archived: false
  })

  const currencyOptions = [
    { label: 'EUR (€)', value: 'EUR' },
    { label: 'USD ($)', value: 'USD' },
    { label: 'GBP (£)', value: 'GBP' }
  ]

  watch(
    () => props.trip,
    (t) => {
      if (!t) return
      state.name = t.name
      state.destination = t.destination || ''
      state.start_date = t.start_date || ''
      state.end_date = t.end_date || ''
      state.budget = Number(t.budget || 0)
      state.currency = t.currency || 'EUR'
      state.is_archived = Boolean(t.is_archived)

      // Thumbnail initialiseren
      newThumbnailFile.value = null
      shouldRemoveThumbnail.value = false
      currentThumbnailPath.value = (t as any).thumbnail_path || null
      previewUrl.value = getThumbnailUrl((t as any).thumbnail_path)
    },
    { immediate: true }
  )

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
        newThumbnailFile.value = compressed
        previewUrl.value = URL.createObjectURL(compressed)
        shouldRemoveThumbnail.value = false
      } finally {
        isCompressing.value = false
      }
    }
  }

  function removeThumbnail() {
    newThumbnailFile.value = null
    previewUrl.value = null
    shouldRemoveThumbnail.value = true
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }

  function openDeleteConfirmation() {
    isOpen.value = false
    isDeleteModalOpen.value = true
  }

  async function onSubmit(event: FormSubmitEvent<typeof state>) {
    if (!props.trip) return

    if (!event.data.name.trim()) {
      toast.add({ title: 'Vul een reisnaam in', color: 'error' })
      return
    }

    isSubmitting.value = true
    try {
      let finalThumbnailPath = currentThumbnailPath.value

      // 1. Nieuwe foto geüpload: oude wissen en nieuwe uploaden
      if (newThumbnailFile.value) {
        if (currentThumbnailPath.value) {
          await deleteThumbnail(currentThumbnailPath.value)
        }
        finalThumbnailPath = await uploadThumbnail(newThumbnailFile.value, props.trip.id)
      } else if (shouldRemoveThumbnail.value && currentThumbnailPath.value) {
        // 2. Bestaande foto gewist
        await deleteThumbnail(currentThumbnailPath.value)
        finalThumbnailPath = null
      }

      await tripStore.updateTrip(props.trip.id, {
        name: event.data.name.trim(),
        destination: event.data.destination?.trim() || null,
        start_date: event.data.start_date || null,
        end_date: event.data.end_date || null,
        budget: Number(event.data.budget) > 0 ? Number(event.data.budget) : null,
        currency: event.data.currency,
        is_archived: event.data.is_archived,
        thumbnail_path: finalThumbnailPath
      } as any)

      toast.add({
        title: 'Reis bijgewerkt',
        description: event.data.is_archived ? 'De reis is gearchiveerd.' : 'Reisgegevens zijn succesvol opgeslagen.',
        color: 'success'
      })

      isOpen.value = false
    } catch (err: any) {
      toast.add({
        title: 'Fout bij bijwerken',
        description: err.message || 'Kon reis niet bijwerken.',
        color: 'error'
      })
    } finally {
      isSubmitting.value = false
    }
  }
</script>

<template>
  <div>
    <UModal v-model:open="isOpen" title="Reis Bewerken & Instellingen"
      description="Pas de reisdetails aan of markeer de reis als afgerond.">
      <template #body>
        <UForm :state="state" class="trip-form" @submit="onSubmit">
          <!-- Form Grid -->
          <div class="trip-form__grid">
            <UFormField label="Naam van de reis" required class="trip-form__field trip-form__field--full">
              <UInput v-model="state.name" placeholder="bijv. Zomervakantie Spanje" class="trip-form__input" />
            </UFormField>

            <UFormField label="Bestemming" class="trip-form__field trip-form__field--full">
              <UInput v-model="state.destination" placeholder="bijv. Valencia, Spanje" icon="i-lucide-map-pin"
                class="trip-form__input" />
            </UFormField>

            <!-- Thumbnail upload sectie -->
            <div class="trip-thumbnail-field trip-form__field--full">
              <span class="trip-thumbnail-field__label">Omslagfoto / Thumbnail</span>

              <input ref="fileInputRef" type="file" accept="image/*" class="trip-thumbnail-field__hidden-input"
                @change="handleThumbnailSelect" />

              <div v-if="!previewUrl" class="trip-thumbnail-field__dropzone" @click="triggerFileInput">
                <div class="trip-thumbnail-field__icon-wrap">
                  <UIcon :name="isCompressing ? 'i-lucide-loader-circle' : 'i-lucide-image'"
                    class="trip-thumbnail-field__icon" :class="{ 'trip-thumbnail-field__icon--spin': isCompressing }" />
                </div>
                <div class="trip-thumbnail-field__meta">
                  <span class="trip-thumbnail-field__prompt">
                    {{ isCompressing ? 'Afbeelding optimaliseren...' : 'Kies een omslagfoto of vervang de huidige' }}
                  </span>
                  <span class="trip-thumbnail-field__hint">JPG, PNG of WEBP (wordt automatisch geoptimaliseerd)</span>
                </div>
              </div>

              <div v-else class="trip-thumbnail-field__preview-card">
                <img :src="previewUrl" alt="Thumbnail preview" class="trip-thumbnail-field__preview-img" />
                <div class="trip-thumbnail-field__preview-info">
                  <span class="trip-thumbnail-field__filename truncate">
                    {{ newThumbnailFile ? newThumbnailFile.name : 'Huidige omslagfoto' }}
                  </span>
                  <span class="trip-thumbnail-field__filesize">
                    {{ newThumbnailFile ? `${(newThumbnailFile.size / 1024).toFixed(0)} KB (nieuw)` : 'Opgeslagen' }}
                  </span>
                </div>
                <div class="trip-thumbnail-field__actions">
                  <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" size="xs"
                    title="Ander bestand kiezen" @click="triggerFileInput" />
                  <UButton icon="i-lucide-x" color="error" variant="ghost" size="xs" title="Foto verwijderen"
                    @click="removeThumbnail" />
                </div>
              </div>
            </div>

            <UFormField label="Startdatum" class="trip-form__field">
              <UInput v-model="state.start_date" type="date" class="trip-form__input" />
            </UFormField>

            <UFormField label="Einddatum" class="trip-form__field">
              <UInput v-model="state.end_date" type="date" class="trip-form__input" />
            </UFormField>

            <UFormField label="Totaal Budget (Optioneel)">
              <UInputNumber v-model="state.budget" :min="0" :step="50"
                :format-options="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }"
                placeholder="Geen budget ingesteld" class="w-full" />
            </UFormField>

            <UFormField label="Valuta" class="trip-form__field">
              <USelect v-model="state.currency" :items="currencyOptions" class="trip-form__input w-full" />
            </UFormField>
          </div>

          <USeparator />

          <!-- Status Banner: Archiveren / Afronden -->
          <div class="trip-form__archive-card">
            <div class="trip-form__archive-info">
              <span class="trip-form__archive-title">Reis afronden / Archiveren</span>
              <span class="trip-form__archive-desc">
                Gearchiveerde reizen worden verplaatst naar het archief-tabblad op het dashboard.
              </span>
            </div>
            <USwitch v-model="state.is_archived" />
          </div>

          <!-- Gevarenzone: Verwijderen -->
          <div class="trip-form__danger-zone">
            <div class="trip-form__danger-info">
              <span class="trip-form__danger-title">Reis verwijderen</span>
              <span class="trip-form__danger-desc">
                {{
                  state.is_archived
                    ? 'Deze reis is gearchiveerd en kan nu definitief worden verwijderd.'
                    : 'Reizen kunnen pas worden verwijderd nadat ze zijn gearchiveerd.'
                }}
              </span>
            </div>
            <UButton icon="i-lucide-trash" label="Reis verwijderen" color="error" variant="soft" size="xs"
              :disabled="!state.is_archived" @click="openDeleteConfirmation" />
          </div>

          <div class="trip-form__actions">
            <UButton label="Annuleren" variant="ghost" color="neutral" @click="isOpen = false" />
            <UButton type="submit" label="Opslaan" color="primary" :loading="isSubmitting" />
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Bevestigingsmodal -->
    <TripModalDelete v-model:open="isDeleteModalOpen" :trip="props.trip" />
  </div>
</template>

<style lang="scss" scoped>
  .trip-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;

    &__archive-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 0.875rem 1rem;
      border-radius: 8px;
      background-color: var(--ui-bg-elevated, #f9fafb);
      border: 1px solid var(--ui-border, #e5e7eb);
    }

    &__archive-info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    &__archive-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--ui-text-highlighted, #111827);
    }

    &__archive-desc {
      font-size: 0.75rem;
      color: var(--ui-text-muted, #6b7280);
      line-height: 1.35;
    }

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

    &__danger-zone {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      border: 1px dashed var(--ui-border, #e5e7eb);
      background-color: var(--ui-bg, #ffffff);
    }

    &__danger-info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    &__danger-title {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #ef4444;
    }

    &__danger-desc {
      font-size: 0.6875rem;
      color: var(--ui-text-muted, #6b7280);
      line-height: 1.35;
    }

    &__actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.5rem;
      padding-top: 0.25rem;
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

    &__actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
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