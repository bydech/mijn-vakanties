// composables/useTripSettlement.ts
import type { TripMemberRecord, ExpenseRecord, ExpenseSplitRecord } from "~/types/pocketbase.types";

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

function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function useTripSettlement() {
  function calculateBalances(members: TripMemberRecord[], expenses: ExpenseRecord[]): MemberBalance[] {
    if (!members || members.length === 0) return [];

    // Alleen uitgaven uit de gezamenlijke pot negeren voor onderlinge schulden
    const relevantExpenses = expenses.filter((e) => !e.paid_from_pot);

    const balanceMap: Record<string, { paid: number; share: number; member: TripMemberRecord }> = {};

    for (const m of members) {
      balanceMap[m.id] = { paid: 0, share: 0, member: m };
    }

    for (const exp of relevantExpenses) {
      const amount = roundCents(Number(exp.amount) || 0);
      if (amount <= 0) continue;

      // Inkomst / Gift: ontvanger heeft groepsgeld gekregen, dus dat verlaagt wat diegene netto heeft voorgeschoten
      if (exp.is_income) {
        if (exp.paid_by && balanceMap[exp.paid_by]) {
          balanceMap[exp.paid_by]!.paid -= amount;
        }

        const count = members.length;
        const baseShare = Math.floor((amount / count) * 100) / 100;
        const remainder = roundCents(amount - baseShare * count);

        members.forEach((m, idx) => {
          const entry = balanceMap[m.id];
          if (entry) {
            entry.share -= idx === 0 ? roundCents(baseShare + remainder) : baseShare;
          }
        });
        continue;
      }

      // 1. Reguliere uitgave: betaald bedrag toekennen aan de betaler
      if (exp.paid_by && balanceMap[exp.paid_by]) {
        balanceMap[exp.paid_by]!.paid += amount;
      }

      // 2. Splits ophalen via expand
      const expenseSplits: ExpenseSplitRecord[] = exp.expand?.expense_splits_via_expense || [];

      if (expenseSplits.length > 0) {
        // Check of er een afrondingsverschil van bijv. 1 cent zit tussen som van splits en exp.amount
        const totalSplits = roundCents(expenseSplits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0));
        const diff = roundCents(amount - totalSplits);

        expenseSplits.forEach((split, idx) => {
          if (split.member && balanceMap[split.member]) {
            const splitAmt = Number(split.amount) || 0;
            // Corrigeer eventuele losse afrondingscent bij de eerste deelnemer in de split
            const adjustedAmt = idx === 0 && Math.abs(diff) <= 0.05 ? roundCents(splitAmt + diff) : splitAmt;
            balanceMap[split.member]!.share += adjustedAmt;
          }
        });
      } else {
        // Fallback: gelijk verdelen met cent-correctie op de eerste persoon
        const count = members.length;
        const baseShare = Math.floor((amount / count) * 100) / 100;
        const remainder = roundCents(amount - baseShare * count);

        members.forEach((m, idx) => {
          const entry = balanceMap[m.id];
          if (entry) {
            entry.share += idx === 0 ? roundCents(baseShare + remainder) : baseShare;
          }
        });
      }
    }

    return Object.values(balanceMap)
      .map(({ member, paid, share }) => {
        const totalPaid = roundCents(paid);
        const totalShare = roundCents(share);
        return {
          memberId: member.id,
          displayName: member.display_name,
          isGuest: !member.user,
          totalPaid,
          totalShare,
          netBalance: roundCents(totalPaid - totalShare),
        };
      })
      .sort((a, b) => b.netBalance - a.netBalance);
  }

  function calculateSettlement(balances: MemberBalance[]): SettlementTransaction[] {
    const transactions: SettlementTransaction[] = [];

    const debtors = balances
      .filter((b) => b.netBalance < -0.005)
      .map((b) => ({ ...b, remaining: roundCents(Math.abs(b.netBalance)) }))
      .sort((a, b) => b.remaining - a.remaining);

    const creditors = balances
      .filter((b) => b.netBalance > 0.005)
      .map((b) => ({ ...b, remaining: roundCents(b.netBalance) }))
      .sort((a, b) => b.remaining - a.remaining);

    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      if (!debtor || !creditor) break;

      const settleAmount = roundCents(Math.min(debtor.remaining, creditor.remaining));

      if (settleAmount >= 0.01) {
        transactions.push({
          fromId: debtor.memberId,
          fromName: debtor.displayName,
          toId: creditor.memberId,
          toName: creditor.displayName,
          amount: settleAmount,
        });
      }

      debtor.remaining = roundCents(debtor.remaining - settleAmount);
      creditor.remaining = roundCents(creditor.remaining - settleAmount);

      if (debtor.remaining < 0.01) i++;
      if (creditor.remaining < 0.01) j++;
    }

    return transactions;
  }

  return {
    calculateBalances,
    calculateSettlement,
  };
}
