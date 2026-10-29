// composables/useTripSettlement.ts
import type { Tables } from "~/types/database.types";

export interface MemberBalance {
  memberId: string;
  displayName: string;
  isGuest: boolean;
  totalPaid: number;
  totalShare: number;
  netBalance: number;
}

export interface SettlementTransaction {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export type ExpenseWithSplits = Tables<"expenses"> & {
  splits?: Tables<"expense_splits">[];
  paid_from_pot?: boolean;
};

export function useTripSettlement() {
  // In de functie calculateBalances:
  function calculateBalances(members: Tables<"trip_members">[], expenses: ExpenseWithSplits[]): MemberBalance[] {
    if (!members || members.length === 0) return [];

    // Filter inkomsten én uitgaven uit de gezamenlijke pot weg
    const validExpenses = expenses.filter((e) => !e.is_income && !(e as any).paid_from_pot);

    const balanceMap: Record<string, { paid: number; share: number; member: Tables<"trip_members"> }> = {};

    for (const m of members) {
      balanceMap[m.id] = { paid: 0, share: 0, member: m };
    }

    for (const exp of validExpenses) {
      const amount = Number(exp.amount) || 0;

      const payerEntry = balanceMap[exp.paid_by_member_id];
      if (payerEntry) {
        payerEntry.paid += amount;
      }

      if (exp.splits && exp.splits.length > 0) {
        for (const split of exp.splits) {
          const splitMemberEntry = balanceMap[split.member_id];
          if (splitMemberEntry) {
            splitMemberEntry.share += Number(split.amount) || 0;
          }
        }
      } else {
        const splitAmount = amount / members.length;
        for (const m of members) {
          const memberEntry = balanceMap[m.id];
          if (memberEntry) {
            memberEntry.share += splitAmount;
          }
        }
      }
    }

    return Object.values(balanceMap)
      .map(({ member, paid, share }) => ({
        memberId: member.id,
        displayName: member.display_name,
        isGuest: !member.user_id,
        totalPaid: Number(paid.toFixed(2)),
        totalShare: Number(share.toFixed(2)),
        netBalance: Number((paid - share).toFixed(2)),
      }))
      .sort((a, b) => b.netBalance - a.netBalance);
  }

  function calculateSettlement(balances: MemberBalance[]): SettlementTransaction[] {
    const transactions: SettlementTransaction[] = [];

    const debtors = balances
      .filter((b) => b.netBalance < -0.01)
      .map((b) => ({ ...b, remaining: Math.abs(b.netBalance) }))
      .sort((a, b) => b.remaining - a.remaining);

    const creditors = balances
      .filter((b) => b.netBalance > 0.01)
      .map((b) => ({ ...b, remaining: b.netBalance }))
      .sort((a, b) => b.remaining - a.remaining);

    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      if (!debtor || !creditor) break;

      const settleAmount = Math.min(debtor.remaining, creditor.remaining);

      if (settleAmount > 0.01) {
        transactions.push({
          fromId: debtor.memberId,
          fromName: debtor.displayName,
          toId: creditor.memberId,
          toName: creditor.displayName,
          amount: Number(settleAmount.toFixed(2)),
        });
      }

      debtor.remaining -= settleAmount;
      creditor.remaining -= settleAmount;

      if (debtor.remaining <= 0.01) i++;
      if (creditor.remaining <= 0.01) j++;
    }

    return transactions;
  }

  return {
    calculateBalances,
    calculateSettlement,
  };
}
