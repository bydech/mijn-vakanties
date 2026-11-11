<!-- components/ExpenseSplitSelector.vue -->
<script setup lang="ts">
  import type { TabsItem } from '@nuxt/ui'
  import type { TripMemberRecord } from '~/types/pocketbase.types'

  const props = defineProps<{
    amount: number
    members: TripMemberRecord[]
    currency?: string
    initialSplits?: { memberId: string; amount: number }[]
  }>()

  const modelValue = defineModel<{ member_id: string; amount: number }[]>({ default: () => [] })
  const isValid = defineModel<boolean>('valid', { default: true })

  const splitMode = ref<'equal' | 'exact'>('equal')

  const splitModeTabs = [
    { label: 'Gelijk', value: 'equal' },
    { label: 'Exact / Ongelijk', value: 'exact' }
  ] satisfies TabsItem[]

  const selectedMemberIds = ref<string[]>([])
  const customSplitAmounts = reactive<Record<string, number>>({})

  watch(
    [() => props.members, () => props.initialSplits],
    ([members, splits]) => {
      for (const m of members) {
        if (customSplitAmounts[m.id] === undefined) {
          customSplitAmounts[m.id] = 0
        }
      }

      if (splits && splits.length > 0) {
        selectedMemberIds.value = splits.map((s) => s.memberId)
        for (const s of splits) {
          customSplitAmounts[s.memberId] = Number(s.amount)
        }

        const firstAmount = Number(splits[0]?.amount || 0)
        const isAllSame = splits.every((s) => Math.abs(Number(s.amount) - firstAmount) < 0.05)
        splitMode.value = isAllSame ? 'equal' : 'exact'
      } else {
        selectedMemberIds.value = members.map((m) => m.id)
        splitMode.value = 'equal'
      }
    },
    { immediate: true }
  )

  const perPersonEqualShare = computed(() => {
    if (selectedMemberIds.value.length === 0 || !props.amount) return 0
    return Number((props.amount / selectedMemberIds.value.length).toFixed(2))
  })

  const totalCustomSplit = computed(() => {
    return Object.values(customSplitAmounts).reduce((sum, val) => sum + (Number(val) || 0), 0)
  })

  const splitDifference = computed(() => {
    return Number((props.amount - totalCustomSplit.value).toFixed(2))
  })

  const isCustomSplitValid = computed(() => {
    return Math.abs(splitDifference.value) < 0.01
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

  function buildEqualSplits(total: number, memberIds: string[]) {
    const count = memberIds.length
    if (count === 0) return []
    const baseShare = Math.floor((total / count) * 100) / 100
    const remainder = Number((total - baseShare * count).toFixed(2))

    return memberIds.map((id, index) => ({
      member_id: id,
      amount: index === 0 ? Number((baseShare + remainder).toFixed(2)) : baseShare
    }))
  }

  watchEffect(() => {
    const total = Number(props.amount || 0)

    if (splitMode.value === 'equal') {
      isValid.value = selectedMemberIds.value.length > 0 && total > 0
      modelValue.value = buildEqualSplits(total, selectedMemberIds.value)
    } else {
      isValid.value = isCustomSplitValid.value && total > 0

      modelValue.value = props.members
        .filter((m) => (customSplitAmounts[m.id] || 0) > 0)
        .map((m) => ({
          member_id: m.id,
          amount: Number(customSplitAmounts[m.id])
        }))
    }
  })
</script>

<template>
  <div class="split-section">
    <div class="split-section__header">
      <div class="split-section__title-group">
        <span class="split-section__title">Wie betaalt er mee?</span>
      </div>
      <UTabs v-model="splitMode" :items="splitModeTabs" :content="false" size="xs" />
    </div>

    <div v-if="splitMode === 'equal'" class="split-members-list">
      <div v-for="m in props.members" :key="m.id" class="split-member-row" @click="toggleMember(m.id)">
        <UCheckbox :model-value="selectedMemberIds.includes(m.id)" @click.stop @update:model-value="toggleMember(m.id)"
          :label="m.display_name" />
        <span v-if="selectedMemberIds.includes(m.id)" class="split-member-row__amount">
          € {{ perPersonEqualShare.toFixed(2) }}
        </span>
      </div>
    </div>

    <div v-else class="split-custom-list">

      <div v-for="m in props.members" :key="m.id" class="split-custom-row">
        <span class="text-sm">{{ m.display_name }}</span>
        <UInputNumber v-model="customSplitAmounts[m.id]" :min="0" :step="0.01"
          :format-options="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }" placeholder="0.00" />
      </div>

      <UAlert :icon="isCustomSplitValid ? 'i-lucide-check-circle-2' : 'i-lucide-alert-circle'"
        :color="isCustomSplitValid ? 'success' : 'error'" variant="subtle"
        :title="isCustomSplitValid ? 'Kostenverdeling klopt exact!' : `Nog € ${Math.abs(splitDifference).toFixed(2)} ${splitDifference > 0 ? 'te verdelen' : 'te veel verdeeld'}`"
        :description="`Totaal verdeeld: € ${totalCustomSplit.toFixed(2)} van € ${Number(props.amount || 0).toFixed(2)}`" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .split-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    background-color: var(--ui-bg-muted);
    border: 1px solid var(--ui-border);

    &__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }

    &__title-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    &__title {
      font-size: .875rem;
    }
  }

  .split-members-list,
  .split-custom-list {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .split-member-row,
  .split-custom-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.625rem;
    border-radius: 0.375rem;
    background-color: var(--ui-bg);
    border: 1px solid var(--ui-border-muted);

    &__amount {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--ui-text);
    }
  }

  .split-member-row {
    cursor: pointer;

    &:hover {
      background-color: var(--ui-bg-muted);
    }
  }
</style>