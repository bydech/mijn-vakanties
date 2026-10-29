// stores/expenses.ts
import { defineStore } from "pinia";
import type { Database, Tables, TablesInsert, TablesUpdate } from "~/types/database.types";
export interface SplitPayload {
  member_id: string;
  amount: number;
}
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
      const { data, error } = await supabase.from("expenses").select("*, splits:expense_splits(*)").eq("trip_id", tripId).order("date", { ascending: false });

      if (error) throw error;
      expenses.value = data || [];
      return expenses.value;
    } finally {
      isLoading.value = false;
    }
  }

  // Nieuwe uitgave toevoegen
  async function createExpense(payload: TablesInsert<"expenses">, splits?: SplitPayload[]) {
    isLoading.value = true;
    try {
      const { data: newExpense, error } = await supabase.from("expenses").insert(payload).select("*, paid_by:paid_by_member_id(*)").single();

      if (error) throw error;

      // Splits toevoegen indien aanwezig
      let createdSplits: Tables<"expense_splits">[] = [];

      if (splits && splits.length > 0 && !payload.is_income) {
        const splitRows = splits.map((s) => ({
          expense_id: newExpense.id,
          member_id: s.member_id,
          amount: s.amount,
        }));

        const { data: insertedSplits, error: splitErr } = await supabase.from("expense_splits").insert(splitRows).select();

        if (splitErr) {
          console.error("Fout bij opslaan splits:", splitErr);
          throw splitErr; // Gooi de error zodat de toast direct aangeeft wat er mis is!
        }
        createdSplits = insertedSplits || [];
      }

      const fullExpense = { ...newExpense, splits: createdSplits };
      expenses.value.unshift(fullExpense);
      return fullExpense;
    } finally {
      isLoading.value = false;
    }
  }

  // 3. Uitgave bijwerken inclusief splits
  async function updateExpense(expenseId: string, payload: TablesUpdate<"expenses">, splits?: SplitPayload[]) {
    isLoading.value = true;
    try {
      // 1. Update de expense en gebruik maybeSingle() in plaats van single()
      const { data: updatedExpense, error } = await supabase.from("expenses").update(payload).eq("id", expenseId).select("*, paid_by:paid_by_member_id(*)").maybeSingle();

      if (error) throw error;

      if (!updatedExpense) {
        throw new Error("Geen rechten om deze uitgave te bewerken of uitgave niet gevonden.");
      }

      // 2. Eerst bestaande splits wissen voor deze expense
      const { error: deleteSplitsErr } = await supabase.from("expense_splits").delete().eq("expense_id", expenseId);

      if (deleteSplitsErr) throw deleteSplitsErr;

      // 3. Nieuwe splits toevoegen indien aanwezig
      let updatedSplits: Tables<"expense_splits">[] = [];
      if (splits && splits.length > 0 && !payload.is_income) {
        const splitRows = splits.map((s) => ({
          expense_id: expenseId,
          member_id: s.member_id,
          amount: s.amount,
        }));

        const { data: insertedSplits, error: splitErr } = await supabase.from("expense_splits").insert(splitRows).select();

        if (splitErr) {
          console.error("Fout bij updaten splits:", splitErr);
          throw splitErr;
        }
        updatedSplits = insertedSplits || [];
      }

      const fullExpense = { ...updatedExpense, splits: updatedSplits };
      const idx = expenses.value.findIndex((e) => e.id === expenseId);
      if (idx !== -1) expenses.value[idx] = fullExpense;

      return fullExpense;
    } finally {
      isLoading.value = false;
    }
  }

  // Uitgave verwijderen
  async function deleteExpense(id: string) {
    isLoading.value = true;
    console.log("deleting expense");
    console.log(id);
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      console.log(error);

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
    updateExpense,
    deleteExpense,
  };
});
