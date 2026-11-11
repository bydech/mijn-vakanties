<!-- components/TripMemberDeleteModal.vue -->
<script setup lang="ts">
  import type { TripMemberRecord } from '~/types/pocketbase.types'

  const isOpen = defineModel<boolean>('open', { default: false })

  const props = defineProps<{
    member: TripMemberRecord | null
    tripId: string
  }>()

  const emit = defineEmits<{
    (e: 'deleted', memberId: string): void
  }>()

  const { $pb } = useNuxtApp()
  const memberStore = useMemberStore()
  const expenseStore = useExpenseStore()
  const toast = useToast()

  const isChecking = ref(false)
  const isDeleting = ref(false)
  const paidCount = ref(0)
  const splitCount = ref(0)

  const hasExpenses = computed(() => paidCount.value > 0 || splitCount.value > 0)

  watch(
    [() => isOpen.value, () => props.member],
    async ([open, member]) => {
      if (open && member) {
        await checkMemberExpenses(member.id)
      } else {
        paidCount.value = 0
        splitCount.value = 0
      }
    },
    { immediate: true }
  )

  async function checkMemberExpenses(memberId: string) {
    if (!$pb) return
    isChecking.value = true
    try {
      const [paidRes, splitRes] = await Promise.all([
        $pb.collection('expenses').getList(1, 1, {
          filter: `paid_by = "${memberId}"`
        }),
        $pb.collection('expense_splits').getList(1, 1, {
          filter: `member = "${memberId}"`
        })
      ])

      paidCount.value = paidRes.totalItems || 0
      splitCount.value = splitRes.totalItems || 0
    } catch (err) {
      console.error('Fout bij controleren van lid-uitgaven:', err)
    } finally {
      isChecking.value = false
    }
  }

  async function onConfirmDelete() {
    if (!props.member || hasExpenses.value) return

    isDeleting.value = true
    try {
      const memberId = props.member.id
      const memberName = props.member.display_name

      await memberStore.removeMember(memberId)
      await expenseStore.fetchByTripId(props.tripId)

      toast.add({
        title: 'Deelnemer verwijderd',
        description: `${memberName} is succesvol verwijderd.`,
        color: 'success'
      })

      emit('deleted', memberId)
      isOpen.value = false
    } catch (err: any) {
      toast.add({
        title: 'Kan niet verwijderen',
        description: err.message || 'Er ging iets mis bij het verwijderen.',
        color: 'error'
      })
    } finally {
      isDeleting.value = false
    }
  }
</script>

<template>
  <UModal v-model:open="isOpen" :title="hasExpenses ? 'Kan niet verwijderd worden' : 'Reisgenoot Verwijderen'"
    :description="hasExpenses ? 'Deze persoon is nog gekoppeld aan de administratie.' : 'Weet je zeker dat je deze deelnemer wilt verwijderen?'">
    <template #body>
      <div v-if="props.member" class="flex flex-col gap-4">
        <div v-if="isChecking" class="flex items-center justify-center gap-2 py-4 text-xs text-muted">
          <UIcon name="i-lucide-loader-circle" class="animate-spin size-4 text-primary" />
          <span>Controleren op gekoppelde uitgaven...</span>
        </div>

        <UAlert v-else-if="hasExpenses" icon="i-lucide-ban" color="warning" variant="subtle"
          title="Verwijderen niet toegestaan">
          <template #description>
            <div class="flex flex-col gap-2 mt-1 text-xs">
              <p>
                <strong>{{ props.member.display_name }}</strong> kan niet worden verwijderd zolang er gekoppelde
                transacties bestaan:
              </p>
              <ul class="list-disc pl-4 space-y-0.5">
                <li v-if="paidCount > 0">
                  Heeft <strong>{{ paidCount }}</strong> {{ paidCount === 1 ? 'uitgave' : 'uitgaven' }} voorgeschoten.
                </li>
                <li v-if="splitCount > 0">
                  Is opgenomen in <strong>{{ splitCount }}</strong> {{ splitCount === 1 ? 'kostenverdeling' :
                    'kostenverdelingen' }}.
                </li>
              </ul>
              <p class="italic text-muted mt-1">
                Tip: Pas de betreffende uitgaven eerst aan (of verwijder ze) om de koppeling los te maken.
              </p>
            </div>
          </template>
        </UAlert>

        <UAlert v-else icon="i-lucide-alert-triangle" color="error" variant="subtle" title="Toegang intrekken">
          <template #description>
            Er zijn geen openstaande kosten gekoppeld aan <strong>{{ props.member.display_name }}</strong>. Deze persoon
            kan veilig worden verwijderd.
          </template>
        </UAlert>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end items-center gap-2 w-full">
        <template v-if="hasExpenses">
          <UButton label="Begrepen" color="primary" class="w-full sm:w-auto" @click="isOpen = false" />
        </template>

        <template v-else>
          <UButton label="Annuleren" variant="ghost" color="neutral" :disabled="isDeleting" @click="isOpen = false" />
          <UButton label="Ja, Verwijderen" color="error" icon="i-lucide-trash" :loading="isDeleting"
            :disabled="isChecking" @click="onConfirmDelete" />
        </template>
      </div>
    </template>
  </UModal>
</template>