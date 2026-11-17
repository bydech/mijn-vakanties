<!-- components/TripModalUpdate.vue -->
<script setup lang="ts">
  import type { FormSubmitEvent, FileUploadItem } from '@nuxt/ui'
  import type { TripRecord } from '~/types/pocketbase.types'
  import { CURRENCY_OPTIONS } from '~/constants/trips'

  const isOpen = defineModel<boolean>('open', { default: false })

  const props = defineProps<{
    trip: TripRecord | null
  }>()

  const memberStore = useMemberStore()
  const tripStore = useTripStore()
  const { compressImage } = useImageCompression()
  const toast = useToast()

  const isSubmitting = ref(false)
  const isCompressing = ref(false)
  const isDeleteModalOpen = ref(false)

  const fileModel = ref<File | FileUploadItem | null>(null)
  const newCompressedFile = ref<File | null>(null)
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

  watch(
    () => props.trip,
    (t) => {
      if (!t) return
      state.name = t.name
      state.destination = t.destination || ''
      state.start_date = t.start_date ? t.start_date.substring(0, 10) : ''
      state.end_date = t.end_date ? t.end_date.substring(0, 10) : ''
      state.budget = Number(t.budget || 0)
      state.currency = t.currency || 'EUR'
      state.is_archived = Boolean(t.is_archived)

      newCompressedFile.value = null
      shouldRemoveThumbnail.value = false

      const existingUrl = tripStore.getThumbnailUrl(t)
      if (existingUrl) {
        fileModel.value = {
          name: 'Huidige omslagfoto',
          avatar: { src: existingUrl, alt: t.name }
        }
      } else {
        fileModel.value = null
      }
    },
    { immediate: true }
  )

  async function onFileSelected(item: File | FileUploadItem | null | undefined) {
    if (!item) {
      fileModel.value = null
      newCompressedFile.value = null
      shouldRemoveThumbnail.value = true
      return
    }

    if (item instanceof File) {
      isCompressing.value = true
      try {
        const compressed = await compressImage(item, 1000, 600, 0.4)
        newCompressedFile.value = compressed
        shouldRemoveThumbnail.value = false
      } finally {
        isCompressing.value = false
      }
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
      const formData = new FormData()
      formData.append('name', event.data.name.trim())
      formData.append('destination', event.data.destination?.trim() || '')
      formData.append('start_date', event.data.start_date || '')
      formData.append('end_date', event.data.end_date || '')
      formData.append('budget', String(Number(event.data.budget) > 0 ? event.data.budget : 0))
      formData.append('currency', event.data.currency || 'EUR')
      formData.append('is_archived', String(event.data.is_archived))

      if (newCompressedFile.value) {
        formData.append('thumbnail', newCompressedFile.value)
      } else if (shouldRemoveThumbnail.value) {
        formData.append('thumbnail', '')
      }

      await tripStore.updateTrip(props.trip.id, formData)

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
        <UForm :state="state" class="app-form" @submit="onSubmit">
          <div class="app-form__grid">
            <UFormField label="Naam van de reis" required name="name" class="app-form__field app-form__field--full">
              <UInput v-model="state.name" placeholder="bijv. Zomervakantie Spanje" class="app-form__input" />
            </UFormField>

            <UFormField label="Bestemming" name="destination" class="app-form__field app-form__field--full">
              <UInput v-model="state.destination" placeholder="bijv. Valencia, Spanje" icon="i-lucide-map-pin"
                class="app-form__input" />
            </UFormField>

            <UFormField label="Startdatum" name="start_date" class="app-form__field">
              <UInput v-model="state.start_date" type="date" class="app-form__input" />
            </UFormField>

            <UFormField label="Einddatum" name="end_date" class="app-form__field">
              <UInput v-model="state.end_date" type="date" class="app-form__input" />
            </UFormField>

            <UFormField label="Totaal Budget (Optioneel)" class="app-form__field">
              <UInputNumber v-model="state.budget" :min="0" :step="50"
                :format-options="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }"
                placeholder="Geen budget ingesteld" class="app-form__input" />
            </UFormField>

            <UFormField label="Valuta" name="currency" class="app-form__field">
              <USelect v-model="state.currency" :items="CURRENCY_OPTIONS" class="app-form__input" />
            </UFormField>

            <UFormField label="Omslagfoto / Thumbnail" name="thumbnail" class="app-form__field app-form__field--full">
              <UFileUpload v-model="fileModel" accept="image/*" icon="i-lucide-image"
                :label="isCompressing ? 'Afbeelding optimaliseren...' : 'Kies een omslagfoto of vervang de huidige'"
                description="JPG, PNG of WEBP (wordt automatisch geoptimaliseerd)" class="app-form__input"
                @update:model-value="onFileSelected" />
            </UFormField>
          </div>

          <template v-if="memberStore.isCurrentUserAdmin">
            <USeparator />

            <UAlert icon="i-lucide-archive" color="neutral" variant="subtle" orientation="horizontal"
              title="Reis afronden / Archiveren"
              description="Gearchiveerde reizen worden verplaatst naar het archief-tabblad op het dashboard.">
              <template #actions>
                <USwitch v-model="state.is_archived" />
              </template>
            </UAlert>

            <UAlert icon="i-lucide-alert-triangle" color="error" variant="subtle" orientation="horizontal"
              title="Reis verwijderen" :description="state.is_archived
                ? 'Deze reis is gearchiveerd en kan nu definitief worden verwijderd.'
                : 'Reizen kunnen pas worden verwijderd nadat ze zijn gearchiveerd.'">
              <template #actions>
                <UButton icon="i-lucide-trash" label="Verwijderen" color="error" variant="soft" size="xs"
                  :disabled="!state.is_archived" @click="openDeleteConfirmation" />
              </template>
            </UAlert>
          </template>

          <div class="app-form__actions">
            <UButton label="Annuleren" variant="ghost" color="neutral" @click="isOpen = false" />
            <UButton type="submit" label="Opslaan" color="primary" :loading="isSubmitting" />
          </div>
        </UForm>
      </template>
    </UModal>

    <TripModalDelete v-model:open="isDeleteModalOpen" :trip="props.trip" />
  </div>
</template>