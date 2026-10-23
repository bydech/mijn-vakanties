// stores/expenses.ts
import { defineStore } from "pinia";
import type { Database, Tables, TablesInsert, TablesUpdate } from "~/types/database.types";

export type ExpenseWithPayer = Tables<"expenses"> & {
  paid_by?: Tables<"trip_members"> | null;
};

export const useExpenseStore = defineStore("expenses", () => {
  const supabase = useSupabaseClient<Database>();
  const supabaseUser = useSupabaseUser();

  const expenses = ref<ExpenseWithPayer[]>([]);
  const members = ref<Tables<"trip_members">[]>([]);
  const isLoading = ref(false);

  // Lookup map: { [expenseId]: expenseObject }
  const expenseMap = computed<Record<string, ExpenseWithPayer>>(() => {
    const map: Record<string, ExpenseWithPayer> = {};
    for (const exp of expenses.value) {
      map[exp.id] = exp;
    }
    return map;
  });

  // Groepeer uitgaven per datum (meest recente datum bovenaan)
  const expensesByDate = computed(() => {
    const groups: Record<string, { date: string; total: number; items: ExpenseWithPayer[] }> = {};

    for (const exp of expenses.value) {
      const dateKey = exp.date;
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          total: 0,
          items: [],
        };
      }
      groups[dateKey].items.push(exp);
      // Alleen uitgaven optellen bij het dagtotaal (inkomsten/giften niet)
      if (!exp.is_income) {
        groups[dateKey].total += Number(exp.amount || 0);
      }
    }

    // Sorteer dagen aflopend (nieuwste dag eerst)
    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  // Totaal uitgegeven bedrag binnen de reis
  const totalSpent = computed(() => {
    return expenses.value.filter((e) => !e.is_income).reduce((sum, e) => sum + Number(e.amount || 0), 0);
  });

  // Totaal aan inkomsten / giften binnen de reis
  const totalIncome = computed(() => {
    return expenses.value.filter((e) => e.is_income).reduce((sum, e) => sum + Number(e.amount || 0), 0);
  });

  // Haal uitgaven en leden op voor een specifieke trip
  async function fetchByTripId(tripId: string) {
    isLoading.value = true;
    try {
      const [expensesRes, membersRes] = await Promise.all([
        supabase.from("expenses").select("*, paid_by:paid_by_member_id(*)").eq("trip_id", tripId).order("date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("trip_members").select("*").eq("trip_id", tripId).order("display_name", { ascending: true }),
      ]);

      if (expensesRes.error) throw expensesRes.error;
      if (membersRes.error) throw membersRes.error;

      expenses.value = (expensesRes.data as ExpenseWithPayer[]) || [];
      members.value = membersRes.data || [];
    } finally {
      isLoading.value = false;
    }
  }

  // Nieuwe uitgave toevoegen
  async function createExpense(payload: Omit<TablesInsert<"expenses">, "created_by">) {
    if (!supabaseUser.value) throw new Error("Geen actieve sessie");

    isLoading.value = true;
    try {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          ...payload,
          created_by: supabaseUser.value.id,
        })
        .select("*, paid_by:paid_by_member_id(*)")
        .single();

      if (error) throw error;

      expenses.value.unshift(data as ExpenseWithPayer);
      return data;
    } finally {
      isLoading.value = false;
    }
  }

  // Uitgave verwijderen
  async function deleteExpense(id: string) {
    isLoading.value = true;
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      expenses.value = expenses.value.filter((e) => e.id !== id);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    expenses,
    members,
    isLoading,
    expenseMap,
    expensesByDate,
    totalSpent,
    totalIncome,
    fetchByTripId,
    createExpense,
    deleteExpense,
  };
});
