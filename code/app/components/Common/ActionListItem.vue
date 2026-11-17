<!-- components/Common/ActionListItem.vue -->
<script setup lang="ts">
  const props = withDefaults(
    defineProps<{
      title: string
      subtitle?: string
      icon?: string
      iconColor?: string
      avatarText?: string
      avatarSrc?: string
      isPending?: boolean
      clickable?: boolean
      canUpdate?: boolean
      canDelete?: boolean
      deleteLoading?: boolean
    }>(),
    {
      clickable: false,
      canUpdate: false,
      canDelete: false,
      deleteLoading: false
    }
  )

  const emit = defineEmits<{
    (e: 'click'): void
    (e: 'edit'): void
    (e: 'delete'): void
  }>()

  function handleClick() {
    if (props.clickable) {
      emit('click')
    }
  }
</script>

<template>
  <component :is="clickable ? 'button' : 'div'" :type="clickable ? 'button' : undefined" class="action-list-item"
    :class="{
      'action-list-item--pending': isPending,
      'action-list-item--clickable': clickable
    }" @click="handleClick">
    <div class="action-list-item__left">
      <!-- 1. Custom slot krijgt voorrang indien meegegeven -->
      <slot name="leading">
        <!-- 2. Avatar indien avatarText of avatarSrc is meegegeven -->
        <UAvatar v-if="avatarText || avatarSrc" :src="avatarSrc" :text="avatarText" :alt="title" size="sm"
          class="action-list-item__avatar" />

        <!-- 3. Icoon (met optionele custom categoriekleur) -->
        <div v-else-if="icon" class="action-list-item__icon-wrap" :style="iconColor ? {
          backgroundColor: `color-mix(in srgb, ${iconColor} 15%, transparent)`,
          color: iconColor
        } : undefined">
          <UIcon :name="icon" class="action-list-item__icon" />
        </div>
      </slot>

      <div class="action-list-item__content">
        <div class="action-list-item__header">
          <span class="action-list-item__title">{{ title }}</span>
          <slot name="badge" />
        </div>
        <span v-if="subtitle || $slots.subtitle" class="action-list-item__subtitle">
          <slot name="subtitle">{{ subtitle }}</slot>
        </span>
      </div>
    </div>

    <div class="action-list-item__actions" @click.stop>
      <slot name="actions" />

      <UButton v-if="canUpdate" icon="i-lucide-pencil" variant="ghost" color="neutral" size="xs" title="Bewerken"
        @click="emit('edit')" />

      <UButton v-if="canDelete" icon="i-lucide-trash" variant="ghost" color="error" size="xs" title="Verwijderen"
        :loading="deleteLoading" @click="emit('delete')" />
    </div>
  </component>
</template>

<style lang="scss" scoped>
  .action-list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 0.625rem 0.875rem;
    border: none;
    background-color: transparent;
    border-bottom: 1px solid var(--ui-border-muted, #f3f4f6);
    text-align: left;
    transition: background-color 0.15s ease;

    &:last-child {
      border-bottom: none;
    }

    &--clickable {
      cursor: pointer;

      &:hover {
        background-color: var(--ui-bg-muted, #f3f4f6);
      }
    }

    &--pending {
      background-color: var(--ui-bg-elevated, #f9fafb);

      &:hover {
        background-color: var(--ui-bg-muted, #f3f4f6);
      }
    }

    &__left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }

    &__avatar {
      flex-shrink: 0;
    }

    &__icon-wrap {
      width: 2rem;
      height: 2rem;
      border-radius: 9999px;
      background-color: color-mix(in srgb, var(--ui-primary) 12%, transparent);
      color: var(--ui-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    &__icon {
      width: 1rem;
      height: 1rem;
      font-size: 1rem;
    }

    &__content {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    &__header {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      flex-wrap: wrap;
    }

    &__title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--ui-text, #111827);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__subtitle {
      font-size: 0.75rem;
      color: var(--ui-text-muted, #6b7280);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      flex-shrink: 0;
      margin-left: 0.5rem;
    }
  }
</style>