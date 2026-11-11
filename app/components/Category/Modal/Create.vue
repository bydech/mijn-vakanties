<!-- components/TripCategoryModalCreate.vue -->
<script setup lang="ts">
  import { AVAILABLE_CATEGORY_ICONS, AVAILABLE_CATEGORY_COLORS } from '~/constants/categories'

  const isOpen = defineModel<boolean>('open', { default: false })

  const props = defineProps<{
    tripId: string
  }>()

  const categoryStore = useCategoryStore()
  const toast = useToast()

  const isSubmitting = ref(false)
  const formName = ref('')
  const selectedIcon = ref(AVAILABLE_CATEGORY_ICONS[0])
  const selectedColor = ref(AVAILABLE_CATEGORY_COLORS[0])

  function resetForm() {
    formName.value = ''
    selectedIcon.value = AVAILABLE_CATEGORY_ICONS[0]
    selectedColor.value = AVAILABLE_CATEGORY_COLORS[0]
  }

  watch(
    () => isOpen.value,
    (open) => {
      if (open) resetForm()
    }
  )

  async function onSubmit() {
    if (!formName.value.trim()) {
      toast.add({ title: 'Vul een categorienaam in', color: 'error' })
      return
    }

    isSubmitting.value = true
    try {
      await categoryStore.createCategory({
        trip: props.tripId,
        name: formName.value.trim(),
        icon: selectedIcon.value,
        color: selectedColor.value
      })

      toast.add({
        title: 'Categorie toegevoegd',
        color: 'success'
      })

      isOpen.value = false
      resetForm()
    } catch (err: any) {
      toast.add({
        title: 'Fout bij opslaan',
        description: err.message || 'Kon categorie niet toevoegen.',
        color: 'error'
      })
    } finally {
      isSubmitting.value = false
    }
  }
</script>

<template>
  <UModal v-model:open="isOpen" title="Nieuwe Categorie Toevoegen"
    description="Kies een herkenbare naam, passend icoon en kleur.">
    <template #body>
      <form id="category-create-form" class="category-form" @submit.prevent="onSubmit">
        <UFormField label="Naam van categorie" required class="category-form__field">
          <UInput v-model="formName" placeholder="bijv. Skipassen, Souvenirs of Uitgaan" class="category-form__input"
            autofocus />
        </UFormField>

        <!-- Icoon selectie -->
        <div class="category-picker">
          <label class="category-picker__label">Icoon kiezen</label>
          <div class="category-picker__icon-grid">
            <button v-for="icon in AVAILABLE_CATEGORY_ICONS" :key="icon" type="button" class="category-picker__icon-btn"
              :class="{ 'category-picker__icon-btn--active': selectedIcon === icon }" @click="selectedIcon = icon">
              <UIcon :name="icon" class="category-picker__icon" />
            </button>
          </div>
        </div>

        <!-- Kleur selectie -->
        <div class="category-picker">
          <label class="category-picker__label">Kleur kiezen</label>
          <div class="category-picker__color-grid">
            <button v-for="color in AVAILABLE_CATEGORY_COLORS" :key="color" type="button"
              class="category-picker__color-btn"
              :class="{ 'category-picker__color-btn--active': selectedColor === color }"
              :style="{ backgroundColor: color }" @click="selectedColor = color" />
          </div>
        </div>
      </form>
    </template>

    <template #footer>
      <div class="category-modal__footer">
        <UButton label="Annuleren" variant="ghost" color="neutral" @click="isOpen = false" />
        <UButton label="Categorie Opslaan" color="primary" icon="i-lucide-plus" :loading="isSubmitting" type="submit"
          form="category-create-form" />
      </div>
    </template>
  </UModal>
</template>

<style lang="scss" scoped>
  .category-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    &__field {
      width: 100%;
    }

    &__input {
      width: 100%;
    }
  }

  .category-picker {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;

    &__label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--ui-text-muted);
    }

    &__icon-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    &__icon-btn {
      width: 2rem;
      height: 2rem;
      border-radius: 0.375rem;
      border: 1px solid var(--ui-border);
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--ui-bg);
      color: var(--ui-text-muted);
      cursor: pointer;
      transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;

      &:hover {
        border-color: var(--ui-primary);
      }

      &--active {
        border-color: var(--ui-primary);
        background-color: color-mix(in srgb, var(--ui-primary) 12%, transparent);
        color: var(--ui-primary);
      }
    }

    &__icon {
      width: 1rem;
      height: 1rem;
      font-size: 1rem;
    }

    &__color-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    &__color-btn {
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 9999px;
      border: 2px solid transparent;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;

      &:hover {
        transform: scale(1.1);
      }

      &--active {
        transform: scale(1.1);
        border-color: var(--ui-primary);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--ui-primary) 30%, transparent);
      }
    }
  }

  .category-modal__footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
  }
</style>