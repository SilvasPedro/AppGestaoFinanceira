import { CategoryBudget, Transaction } from '../types/finance';
import { buildMonthTransactions, shiftMonth } from './monthView';

export interface BudgetStatusDetail {
  id?: string;
  category: string;
  baseLimit: number; // teto do mês (padrão ou específico), sem o acúmulo
  carry: number; // sobra acumulada de meses anteriores
  limit: number; // baseLimit + carry
  spent: number;
  percentage: number;
  status: 'safe' | 'warning' | 'danger';
  rollover: boolean;
  isMonthOverride: boolean; // existe teto específico para este mês
}

type SpendMap = Map<string, Record<string, number>>;

function spentByCategory(transactions: Transaction[], month: string, cache: SpendMap): Record<string, number> {
  const hit = cache.get(month);
  if (hit) return hit;
  const map: Record<string, number> = {};
  for (const t of buildMonthTransactions(transactions, month)) {
    if (t.type === 'expense') map[t.category] = (map[t.category] || 0) + t.amount;
  }
  cache.set(month, map);
  return map;
}

/** Teto base de uma categoria em um mês: o específico do mês, senão o padrão. */
export function baseLimitFor(
  budgets: CategoryBudget[],
  category: string,
  month: string
): { budget: CategoryBudget; isOverride: boolean } | null {
  const mine = budgets.filter(b => b.category === category);
  const override = mine.find(b => b.monthYear === month);
  if (override) return { budget: override, isOverride: true };
  const base = mine.find(b => !b.monthYear);
  return base ? { budget: base, isOverride: false } : null;
}

const MAX_CHAIN = 24;

function carryInto(
  budgets: CategoryBudget[],
  transactions: Transaction[],
  category: string,
  month: string,
  cache: SpendMap,
  memo: Map<string, number>
): number {
  const key = `${category}|${month}`;
  const cached = memo.get(key);
  if (cached !== undefined) return cached;

  const base = budgets.find(b => b.category === category && !b.monthYear);
  const from = base?.rolloverFrom;
  let result = 0;
  if (base?.rollover && from && month > from && month <= shiftMonth(from, MAX_CHAIN)) {
    const prev = shiftMonth(month, -1);
    const prevBase = baseLimitFor(budgets, category, prev);
    if (prevBase) {
      const prevCarry = carryInto(budgets, transactions, category, prev, cache, memo);
      const prevLimit = prevBase.budget.limitAmount + prevCarry;
      const prevSpent = spentByCategory(transactions, prev, cache)[category] || 0;
      result = Math.max(0, prevLimit - prevSpent);
    }
  }
  memo.set(key, result);
  return result;
}

/** Situação de cada teto no mês, considerando tetos específicos e acúmulo de sobras. */
export function computeBudgetStatuses(
  budgets: CategoryBudget[],
  transactions: Transaction[],
  month: string
): BudgetStatusDetail[] {
  const cache: SpendMap = new Map();
  const memo = new Map<string, number>();
  const categories = Array.from(new Set(budgets.map(b => b.category)));
  const spentNow = spentByCategory(transactions, month, cache);

  const out: BudgetStatusDetail[] = [];
  for (const category of categories) {
    const resolved = baseLimitFor(budgets, category, month);
    if (!resolved) continue; // só existe teto para outros meses
    const baseLimit = resolved.budget.limitAmount;
    const carry = carryInto(budgets, transactions, category, month, cache, memo);
    const limit = baseLimit + carry;
    const spent = spentNow[category] || 0;
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;
    const status = percentage >= 100 ? 'danger' : percentage >= 80 ? 'warning' : 'safe';
    const baseDoc = budgets.find(b => b.category === category && !b.monthYear);
    out.push({
      id: resolved.budget.id,
      category,
      baseLimit,
      carry,
      limit,
      spent,
      percentage,
      status,
      rollover: !!baseDoc?.rollover,
      isMonthOverride: resolved.isOverride
    });
  }
  return out;
}
