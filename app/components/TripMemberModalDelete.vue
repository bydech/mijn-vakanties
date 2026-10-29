<!-- components/TripMemberDeleteModal.vue -->
<script setup lang="ts">
  import type { Tables } from '~/types/database.types'

  const isOpen = defineModel<boolean>('open', { default: false })

  const props = defineProps<{
    member: Tables<'trip_members'> | null
    tripId: string
  }>()

  const emit = defineEmits<{
    (e: 'deleted', memberId: string): void
  }>()

  const supabase = useSupabaseClient()
  const memberStore = useMemberStore()
  const expenseStore = useExpenseStore()
  const toast = useToast()

  const isChecking = ref(false)
  const isDeleting = ref(false)
  const paidCount = ref(0)
  const splitCount = ref(0)

  // Heeft de deelnemer gekoppelde transacties?
  const hasExpenses = computed(() => paidCount.value > 0 || splitCount.value > 0)

  // Zodra de modal opent voor een member, controleren we direct in Supabase
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
    isChecking.value = true
    try {
      const [paidRes, splitRes] = await Promise.all([
        supabase
          .from('expenses')
          .select('*', { count: 'exact', head: true })
          .eq('paid_by_member_id', memberId),
        supabase
          .from('expense_splits')
          .select('*', { count: 'exact', head: true })
          .eq('member_id', memberId)
      ])

      paidCount.value = paidRes.count || 0
      splitCount.value = splitRes.count || 0
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
    :description="hasExpenses ? 'Deze persoon is nog gekoppeld aan de administratie.' : 'Weet je zeker dat je deze deelnemer wilt verwijderen?'"
    class="member-delete-modal">
    <template #body>
      <div v-if="member" class="member-delete">
        <!-- 1. Laden van de controle -->
        <div v-if="isChecking" class="flex items-center justify-center gap-2 py-4 text-xs text-muted">
          <UIcon name="i-lucide-loader-circle" class="animate-spin size-4 text-primary" />
          <span>Controleren op gekoppelde uitgaven...</span>
        </div>

        <!-- 2. BLOKKADE: Gebruiker zit nog aan uitgaven vast -->
        <div v-else-if="hasExpenses" class="member-delete__blocked">
          <div class="member-delete__icon-wrap member-delete__icon-wrap--blocked">
            <UIcon name="i-lucide-ban" class="size-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div class="member-delete__blocked-text">
            <h4 class="member-delete__blocked-title">Verwijderen niet toegestaan</h4>
            <p class="member-delete__blocked-desc">
              <strong>{{ member.display_name }}</strong> kan niet worden verwijderd zolang er gekoppelde transacties
              bestaan:
            </p>
            <ul class="member-delete__blocked-list">
              <li v-if="paidCount > 0">
                • Heeft <strong>{{ paidCount }}</strong> {{ paidCount === 1 ? 'uitgave' : 'uitgaven' }} voorgeschoten.
              </li>
              <li v-if="splitCount > 0">
                • Is opgenomen in <strong>{{ splitCount }}</strong> {{ splitCount === 1 ? 'kostenverdeling' :
                'kostenverdelingen' }}.
              </li>
            </ul>
            <p class="member-delete__blocked-help">
              Tip: Pas de betreffende uitgaven eerst aan (of verwijder ze) om de koppeling los te maken.
            </p>
          </div>
        </div>

        <!-- 3. GEEN KOPPELING: Veilig te verwijderen waarschuwing -->
        <div v-else class="member-delete__warning">
          <div class="member-delete__icon-wrap member-delete__icon-wrap--warning">
            <UIcon name="i-lucide-alert-triangle" class="size-5 text-red-600 dark:text-red-400" />
          </div>
          <div class="member-delete__warning-text">
            <h4 class="member-delete__warning-title">Toegang intrekken</h4>
            <p class="member-delete__warning-desc">
              Er zijn geen openstaande kosten gekoppeld aan <strong>{{ member.display_name }}</strong>. Deze persoon kan
              veilig worden verwijderd.
            </p>
          </div>
        </div>

        <!-- Deelnemer profielkaartje -->
        <div class="member-delete__card">
          <div class="member-delete__info">
            <UAvatar :text="member.display_name.slice(0, 2).toUpperCase()" size="md" class="member-delete__avatar" />
            <div class="member-delete__meta">
              <div class="flex items-center gap-1.5">
                <span class="member-delete__name">{{ member.display_name }}</span>
                <UBadge v-if="member.status === 'pending'" color="warning" variant="subtle" size="xs">
                  In afwachting
                </UBadge>
                <UBadge v-else-if="!member.user_id" color="neutral" variant="subtle" size="xs">
                  Gast
                </UBadge>
              </div>
              <span class="member-delete__sub">
                {{ member.role === 'admin' ? 'Beheerder' : member.role === 'viewer' ? 'Kijker' : 'Deelnemer' }}
                <span v-if="member.email"> • {{ member.email }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="member-delete__actions">
        <!-- Knop als verwijderen NIET kan -->
        <template v-if="hasExpenses">
          <UButton label="Begrepen" color="primary" class="w-full sm:w-auto" @click="isOpen = false" />
        </template>

        <!-- Knoppen als verwijderen WEL kan -->
        <template v-else>
          <UButton label="Annuleren" variant="ghost" color="neutral" :disabled="isDeleting" @click="isOpen = false" />
          <UButton label="Ja, Verwijderen" color="error" icon="i-lucide-trash" :loading="isDeleting"
            :disabled="isChecking" @click="onConfirmDelete" />
        </template>
      </div>
    </template>
  </UModal>
</template>

<style lang="scss" scoped>
  .member-delete {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;

    &__blocked {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
      padding: 1rem;
      border-radius: 8px;
      background-color: #fffbeb;
      border: 1px solid rgba(245, 158, 11, 0.3);

      @media (prefers-color-scheme: dark) {
        background-color: rgba(245, 158, 11, 0.1);
        border-color: rgba(245, 158, 11, 0.25);
      }
    }

    &__warning {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
      padding: 1rem;
      border-radius: 8px;
      background-color: #fef2f2;
      border: 1px solid rgba(239, 68, 68, 0.2);

      @media (prefers-color-scheme: dark) {
        background-color: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.3);
      }
    }

    &__icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 50%;
      flex-shrink: 0;

      &--blocked {
        background-color: #fef3c7;

        @media (prefers-color-scheme: dark) {
          background-color: rgba(245, 158, 11, 0.2);
        }
      }

      &--warning {
        background-color: #fee2e2;

        @media (prefers-color-scheme: dark) {
          background-color: rgba(239, 68, 68, 0.2);
        }
      }
    }

    &__blocked-text,
    &__warning-text {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    &__blocked-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #b45309;
      margin: 0;

      @media (prefers-color-scheme: dark) {
        color: #fbbf24;
      }
    }

    &__warning-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #b91c1c;
      margin: 0;

      @media (prefers-color-scheme: dark) {
        color: #f87171;
      }
    }

    &__blocked-desc,
    &__warning-desc {
      font-size: 0.8125rem;
      color: var(--ui-text, #374151);
      margin: 0;
    }

    &__blocked-list {
      margin: 0.25rem 0;
      padding-left: 0.5rem;
      list-style: none;
      font-size: 0.8125rem;
      color: var(--ui-text, #1f2937);
    }

    &__blocked-help {
      font-size: 0.75rem;
      color: var(--ui-text-muted, #6b7280);
      margin: 0;
      font-style: italic;
    }

    &__card {
      padding: 0.875rem 1rem;
      border-radius: 8px;
      border: 1px solid var(--ui-border, #e5e7eb);
      background-color: var(--ui-bg-elevated, #f9fafb);
    }

    &__info {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }

    &__avatar {
      background-color: var(--ui-bg-elevated, #e5e7eb);
      color: var(--ui-text, #111827);
      font-weight: 600;
    }

    &__meta {
      display: flex;
      flex-direction: column;
    }

    &__name {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--ui-text, #111827);
    }

    &__sub {
      font-size: 0.75rem;
      color: var(--ui-text-muted, #6b7280);
    }

    &__actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
    }
  }
</style>