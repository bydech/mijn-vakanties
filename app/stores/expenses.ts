// stores/expenses.ts
import { defineStore } from "pinia";
import type { ExpenseRecord, ExpenseSplitRecord, SplitPayload, TripMemberRecord } from "~/types/pocketbase.types";

export const useExpenseStore = defineStore("expenses", () => {
  const { $pb } = useNuxtApp();

  const expenses = ref<ExpenseRecord[]>([]);
  const members = ref<TripMemberRecord[]>([]);
  const isLoading = ref(false);

  const expenseMap = computed<Record<string, ExpenseRecord>>(() => {
    const map: Record<string, ExpenseRecord> = {};
    for (const exp of expenses.value) {
      map[exp.id] = exp;
    }
    return map;
  });

  const expensesByDate = computed(() => {
    const groups: Record<string, { date: string; total: number; items: ExpenseRecord[] }> = {};

    for (const exp of expenses.value) {
      const dateKey = (exp.date ? exp.date.split(/[ T]/)[0] : "") || "Onbekend";

      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          total: 0,
          items: [],
        };
      }
      groups[dateKey].items.push(exp);

      if (!exp.is_income) {
        groups[dateKey].total += Number(exp.amount || 0);
      }
    }

    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  const totalSpent = computed(() => {
    return expenses.value.filter((e) => !e.is_income).reduce((sum, e) => sum + Number(e.amount || 0), 0);
  });

  const totalIncome = computed(() => {
    return expenses.value.filter((e) => e.is_income).reduce((sum, e) => sum + Number(e.amount || 0), 0);
  });

  function getReceiptUrl(expense: ExpenseRecord): string | null {
    if (!expense.receipt) return null;
    return $pb.files.getURL(expense, expense.receipt);
  }

  async function fetchByTripId(tripId: string) {
    isLoading.value = true;
    try {
      const records = await $pb.collection("expenses").getFullList<ExpenseRecord>({
        filter: `trip = "${tripId}"`,
        sort: "-date,-created",
        expand: "paid_by,category,expense_splits_via_expense",
        requestKey: null,
      });

      expenses.value = records;
      return expenses.value;
    } catch (err: any) {
      if (!err?.isAbort) {
        console.error("Fout bij ophalen uitgaven:", err);
      }
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  async function createExpense(payload: Partial<ExpenseRecord> | FormData, splits?: SplitPayload[]) {
    isLoading.value = true;
    try {
      const newExpense = await $pb.collection("expenses").create<ExpenseRecord>(payload, {
        expand: "paid_by,category",
      });

      let createdSplits: ExpenseSplitRecord[] = [];
      const isIncome = payload instanceof FormData ? payload.get("is_income") === "true" : Boolean(payload.is_income);

      if (splits && splits.length > 0 && !isIncome) {
        // requestKey: null voorkomt dat PocketBase gelijktijdige split-requests annuleert!
        createdSplits = await Promise.all(
          splits.map((s) =>
            $pb.collection("expense_splits").create<ExpenseSplitRecord>(
              {
                expense: newExpense.id,
                member: s.member_id,
                amount: Number(s.amount),
              },
              { requestKey: null },
            ),
          ),
        );
      }

      const fullExpense: ExpenseRecord = {
        ...newExpense,
        expand: {
          ...newExpense.expand,
          expense_splits_via_expense: createdSplits,
        },
      };

      expenses.value.unshift(fullExpense);
      return fullExpense;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateExpense(expenseId: string, payload: Partial<ExpenseRecord> | FormData, splits?: SplitPayload[]) {
    isLoading.value = true;
    try {
      const updatedExpense = await $pb.collection("expenses").update<ExpenseRecord>(expenseId, payload, {
        expand: "paid_by,category",
      });

      const existingSplits = await $pb.collection("expense_splits").getFullList<ExpenseSplitRecord>({
        filter: `expense = "${expenseId}"`,
        requestKey: null,
      });

      if (existingSplits.length > 0) {
        await Promise.all(existingSplits.map((s) => $pb.collection("expense_splits").delete(s.id, { requestKey: null })));
      }

      let updatedSplits: ExpenseSplitRecord[] = [];
      const isIncome = payload instanceof FormData ? payload.get("is_income") === "true" : Boolean(payload.is_income);

      if (splits && splits.length > 0 && !isIncome) {
        updatedSplits = await Promise.all(
          splits.map((s) =>
            $pb.collection("expense_splits").create<ExpenseSplitRecord>(
              {
                expense: expenseId,
                member: s.member_id,
                amount: Number(s.amount),
              },
              { requestKey: null },
            ),
          ),
        );
      }

      const fullExpense: ExpenseRecord = {
        ...updatedExpense,
        expand: {
          ...updatedExpense.expand,
          expense_splits_via_expense: updatedSplits,
        },
      };

      const idx = expenses.value.findIndex((e) => e.id === expenseId);
      if (idx !== -1) {
        expenses.value[idx] = fullExpense;
      }

      return fullExpense;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteExpense(id: string) {
    isLoading.value = true;
    try {
      await $pb.collection("expenses").delete(id);
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
    getReceiptUrl,
    fetchByTripId,
    createExpense,
    updateExpense,
    deleteExpense,
  };
});
