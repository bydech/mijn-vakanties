<!-- components/TripCategoriesModal.vue -->
<script setup lang="ts">
  import type { Tables } from '~/types/database.types'

  const isOpen = defineModel<boolean>('open', { default: false })

  const props = defineProps<{
    tripId: string
    tripName?: string
  }>()

  const categoryStore = useCategoryStore()
  const toast = useToast()

  const isSubmitting = ref(false)
  const deletingId = ref<string | null>(null)
  const editingCategory = ref<Tables<'trip_categories'> | null>(null)

  const availableIcons = [
    'i-lucide-utensils',
    'i-lucide-shopping-cart',
    'i-lucide-car',
    'i-lucide-bed',
    'i-lucide-ticket',
    'i-lucide-shopping-bag',
    'i-lucide-beer',
    'i-lucide-coffee',
    'i-lucide-fuel',
    'i-lucide-plane',
    'i-lucide-train',
    'i-lucide-receipt'
  ]

  const availableColors = [
    '#f97316', // Oranje
    '#10b981', // Smaragd
    '#3b82f6', // Blauw
    '#8b5cf6', // Paars
    '#ec4899', // Roze
    '#eab308', // Geel
    '#06b6d4', // Cyaan
    '#ef4444', // Rood
    '#6b7280'  // Grijs
  ]

  const formName = ref('')
  const selectedIcon = ref(availableIcons[0])
  const selectedColor = ref(availableColors[0])

  function resetForm() {
    editingCategory.value = null
    formName.value = ''
    selectedIcon.value = availableIcons[0]
    selectedColor.value = availableColors[0]
  }

  function startEdit(cat: Tables<'trip_categories'>) {
    editingCategory.value = cat
    formName.value = cat.name
    selectedIcon.value = cat.icon
    selectedColor.value = cat.color
  }

  function cancelEdit() {
    resetForm()
  }

  // Fetch on open
  watch(
    () => isOpen.value,
    async (open) => {
      if (open && props.tripId) {
        await categoryStore.fetchByTripId(props.tripId)
        resetForm()
      }
    }
  )

  async function onSubmitForm() {
    if (!formName.value.trim()) {
      toast.add({ title: 'Vul een categorienaam in', color: 'error' })
      return
    }

    isSubmitting.value = true
    try {
      if (editingCategory.value) {
        // 1. Bewerken
        await categoryStore.updateCategory(editingCategory.value.id, {
          name: formName.value.trim(),
          icon: selectedIcon.value,
          color: selectedColor.value
        })

        toast.add({
          title: 'Categorie bijgewerkt',
          color: 'success'
        })
      } else {
        // 2. Nieuw toevoegen
        await categoryStore.createCategory({
          trip_id: props.tripId,
          name: formName.value.trim(),
          icon: selectedIcon.value,
          color: selectedColor.value
        })

        toast.add({
          title: 'Categorie toegevoegd',
          color: 'success'
        })
      }
      resetForm()
    } catch (err: any) {
      toast.add({
        title: 'Fout bij opslaan',
        description: err.message || 'Kon categorie niet opslaan.',
        color: 'error'
      })
    } finally {
      isSubmitting.value = false
    }
  }

  async function onDeleteCategory(id: string) {
    deletingId.value = id
    try {
      await categoryStore.deleteCategory(id)
      if (editingCategory.value?.id === id) {
        resetForm()
      }
      toast.add({
        title: 'Categorie verwijderd',
        color: 'success'
      })
    } catch (err: any) {
      toast.add({
        title: 'Kon categorie niet verwijderen',
        description: err.message,
        color: 'error'
      })
    } finally {
      deletingId.value = null
    }
  }
</script>

<template>
  <UModal v-model:open="isOpen" title="Categorieën Beheren"
    :description="`Pas de categorieën aan voor ${props.tripName || 'deze vakantie'}`">
    <template #body>
      <div class="categories-modal">
        <!-- Sectie 1: Formulier (Aanmaken of Bewerken) -->
        <section class="category-form">
          <div class="category-form__header">
            <h4 class="category-form__title">
              {{ editingCategory ? 'Categorie bewerken' : 'Nieuwe categorie toevoegen' }}
            </h4>
            <UButton v-if="editingCategory" label="Annuleren" variant="ghost" color="neutral" size="xs"
              @click="cancelEdit" />
          </div>

          <div class="category-form__body">
            <!-- Naam input -->
            <UInput v-model="formName" placeholder="bijv. Skipassen of Souvenirs" class="category-form__input" />

            <!-- Icoon picker -->
            <div class="category-form__picker-group">
              <span class="category-form__picker-label">Icoon:</span>
              <div class="category-form__icons">
                <button v-for="icon in availableIcons" :key="icon" type="button" class="category-form__icon-btn"
                  :class="{ 'category-form__icon-btn--selected': selectedIcon === icon }" @click="selectedIcon = icon">
                  <UIcon :name="icon" class="category-form__icon-preview" />
                </button>
              </div>
            </div>

            <!-- Kleur picker -->
            <div class="category-form__picker-group">
              <span class="category-form__picker-label">Kleur:</span>
              <div class="category-form__colors">
                <button v-for="color in availableColors" :key="color" type="button" class="category-form__color-btn"
                  :class="{ 'category-form__color-btn--selected': selectedColor === color }"
                  :style="{ backgroundColor: color }" @click="selectedColor = color" />
              </div>
            </div>

            <!-- Actieknoppen -->
            <div class="category-form__actions">
              <UButton :icon="editingCategory ? 'i-lucide-check' : 'i-lucide-plus'"
                :label="editingCategory ? 'Wijziging opslaan' : 'Categorie toevoegen'" color="primary"
                :loading="isSubmitting" @click="onSubmitForm" />
            </div>
          </div>
        </section>

        <USeparator />

        <!-- Sectie 2: Bestaande Categorieënlijst -->
        <div class="categories-list">
          <span class="categories-list__title">
            Bestaande categorieën ({{ categoryStore.categories.length }})
          </span>

          <div v-if="categoryStore.isLoading" class="categories-list__loader">
            <UIcon name="i-lucide-loader-circle" class="categories-list__loader-icon" />
          </div>

          <div v-else class="categories-list__items">
            <div v-for="cat in categoryStore.categories" :key="cat.id" class="category-item"
              :class="{ 'category-item--editing': editingCategory?.id === cat.id }">
              <div class="category-item__left">
                <div class="category-item__icon-wrap" :style="{
                  backgroundColor: `${cat.color}20`,
                  color: cat.color
                }">
                  <UIcon :name="cat.icon" class="category-item__icon" />
                </div>
                <span class="category-item__name">{{ cat.name }}</span>
              </div>

              <div class="category-item__actions">
                <UButton icon="i-lucide-pencil" variant="ghost" color="neutral" size="xs" title="Categorie bewerken"
                  @click="startEdit(cat)" />
                <UButton icon="i-lucide-trash" variant="ghost" color="error" size="xs" title="Categorie verwijderen"
                  :loading="deletingId === cat.id" @click="onDeleteCategory(cat.id)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style lang="scss" scoped>
  .categories-modal {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .category-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    &__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    &__title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--ui-text-highlighted, #111827);
      margin: 0;
    }

    &__body {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    &__input {
      width: 100%;
    }

    &__picker-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    &__picker-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--ui-text-muted, #6b7280);
    }

    &__icons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    &__icon-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid var(--ui-border, #e5e7eb);
      background-color: var(--ui-bg, #ffffff);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        border-color: var(--ui-primary, #10b981);
      }

      &--selected {
        border-color: var(--ui-primary, #10b981);
        background-color: var(--ui-primary-subtle, #ecfdf5);
        color: var(--ui-primary, #10b981);
      }
    }

    &__icon-preview {
      font-size: 1rem;
    }

    &__colors {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    &__color-btn {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      transition: transform 0.15s ease, border-color 0.15s ease;

      &:hover {
        transform: scale(1.15);
      }

      &--selected {
        border-color: var(--ui-text, #111827);
        transform: scale(1.15);
      }
    }

    &__actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.25rem;
    }
  }

  .categories-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    &__title {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ui-text-muted, #6b7280);
    }

    &__loader {
      display: flex;
      justify-content: center;
      padding: 1rem 0;

      &-icon {
        font-size: 1.5rem;
        color: var(--ui-primary, #10b981);
        animation: spin 1s linear infinite;
      }
    }

    &__items {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--ui-border, #e5e7eb);
      border-radius: 8px;
      overflow: hidden;
    }
  }

  .category-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.625rem 0.875rem;
    border-bottom: 1px solid var(--ui-border-muted, #f3f4f6);
    transition: background-color 0.15s ease;

    &:last-child {
      border-bottom: none;
    }

    &--editing {
      background-color: var(--ui-primary-subtle, #ecfdf5);
    }

    &__left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    &__icon-wrap {
      width: 30px;
      height: 30px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    &__icon {
      font-size: 1rem;
    }

    &__name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--ui-text, #111827);
    }

    &__actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
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