<!-- components/Common/ActionList.vue -->
<script setup lang="ts">
  import ActionListItem from '~/components/Common/ActionListItem.vue'

  defineProps<{
    addButtonLabel?: string
    showAddButton?: boolean
  }>()

  const emit = defineEmits<{
    (e: 'add'): void
  }>()
</script>

<template>
  <div class="action-list">
    <slot />

    <ActionListItem v-if="showAddButton && addButtonLabel" :title="addButtonLabel" clickable
      class="action-list__add-item" @click="emit('add')">
      <template #leading>
        <div class="action-list__add-icon-wrap">
          <UIcon name="i-lucide-plus" class="action-list__add-icon" />
        </div>
      </template>
    </ActionListItem>
  </div>
</template>

<style lang="scss" scoped>
  .action-list {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--ui-border, #e5e7eb);
    border-radius: 0.5rem;
    overflow: hidden;
    background-color: var(--ui-bg, #ffffff);

    &__add-item {
      :deep(.action-list-item__title) {
        color: var(--ui-text-toned);
      }
    }

    &__add-icon-wrap {
      width: 2rem;
      height: 2rem;
      border-radius: 9999px;
      border: 1px dashed color-mix(in srgb, var(--ui-text-toned) 30%, transparent);
      color: var(--ui-text-muted);
      background-color: color-mix(in srgb, var(--ui-text-muted) 5%, transparent);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    &__add-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }

  }
</style>