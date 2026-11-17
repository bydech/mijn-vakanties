<!-- components/TripModalCreate.vue -->
<script setup lang="ts">
  import type { FormSubmitEvent } from '@nuxt/ui'
  import { CURRENCY_OPTIONS } from '~/constants/trips'

  const emit = defineEmits<{
    (e: 'created', id: string): void
  }>()

  const isOpen = defineModel<boolean>('open', { default: false })

  const { compressImage } = useImageCompression()
  const tripStore = useTripStore()
  const toast = useToast()

  const isSubmitting = ref(false)
  const isCompressing = ref(false)
  const uploadedFile = ref<File | null>(null)

  const state = reactive({
    name: '',
    destination: '',
    start_date: '',
    end_date: '',
    budget: 0,
    currency: 'EUR'
  })

  async function onFileSelected(file: File | null | undefined) {
    if (!file) {
      uploadedFile.value = null
      return
    }

    isCompressing.value = true
    try {
      const compressed = await compressImage(file, 1000, 600, 0.4)
      uploadedFile.value = compressed
    } finally {
      isCompressing.value = false
    }
  }

  function resetForm() {
    state.name = ''
    state.destination = ''
    state.start_date = ''
    state.end_date = ''
    state.budget = 0
    state.currency = 'EUR'
    uploadedFile.value = null
  }

  async function onSubmit(event: FormSubmitEvent<typeof state>) {
    if (!event.data.name.trim()) return

    isSubmitting.value = true
    try {
      const formData = new FormData()
      formData.append('name', event.data.name.trim())

      if (event.data.destination?.trim()) {
        formData.append('destination', event.data.destination.trim())
      }
      if (event.data.start_date) {
        formData.append('start_date', event.data.start_date)
      }
      if (event.data.end_date) {
        formData.append('end_date', event.data.end_date)
      }
      if (Number(event.data.budget) > 0) {
        formData.append('budget', String(event.data.budget))
      }
      formData.append('currency', event.data.currency || 'EUR')

      if (uploadedFile.value) {
        formData.append('thumbnail', uploadedFile.value)
      }

      const newTrip = await tripStore.createTrip(formData)
      if (!newTrip) {
        throw new Error('Geen gegevens ontvangen na het aanmaken van de reis.')
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
      <UForm :state="state" class="flex flex-col gap-4" @submit="onSubmit">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UFormField label="Naam van de reis" required name="name" class="sm:col-span-2">
            <UInput v-model="state.name" placeholder="bijv. Zomervakantie Italië of Weekendje Parijs" autofocus
              class="w-full" />
          </UFormField>

          <UFormField label="Bestemming" name="destination" class="sm:col-span-2">
            <UInput v-model="state.destination" placeholder="bijv. Toscane, Italië" icon="i-lucide-map-pin"
              class="w-full" />
          </UFormField>



          <UFormField label="Startdatum" name="start_date">
            <UInput v-model="state.start_date" type="date" class="w-full" />
          </UFormField>

          <UFormField label="Einddatum" name="end_date">
            <UInput v-model="state.end_date" type="date" class="w-full" />
          </UFormField>

          <UFormField label="Totaal Budget (Optioneel)">
            <UInputNumber v-model="state.budget" :min="0" :step="50"
              :format-options="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }"
              placeholder="Geen budget ingesteld" class="w-full" />
          </UFormField>

          <UFormField label="Valuta" name="currency">
            <USelect v-model="state.currency" :items="CURRENCY_OPTIONS" class="w-full" />
          </UFormField>

          <UFormField label="Omslagfoto / Thumbnail" name="thumbnail" class="sm:col-span-2">
            <UFileUpload v-model="uploadedFile" accept="image/*" icon="i-lucide-image"
              :label="isCompressing ? 'Afbeelding optimaliseren...' : 'Kies of sleep een omslagfoto'"
              description="JPG, PNG of WEBP (wordt automatisch geoptimaliseerd)" class="w-full"
              @update:model-value="onFileSelected" />
          </UFormField>
        </div>

        <div class="flex justify-end items-center gap-2 pt-2">
          <UButton label="Annuleren" variant="ghost" color="neutral" @click="isOpen = false" />
          <UButton type="submit" label="Reis Aanmaken" color="primary" :loading="isSubmitting" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>