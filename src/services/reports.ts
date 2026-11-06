import { Transaction } from '../types/finance';
import { buildMonthTransactions, monthsBetween } from './monthView';

export interface MonthSummary {
  month: string; // YYYY-MM
  income: number;
  expenses: number;
  net: number;
  byCategory: Record<string, number>; // somente despesas
}

export interface CategoryRow {
  category: string;
  total: number;
  share: number; // 0-100
}

export interface YearSummary {
  year: number;
  months: MonthSummary[];
  totalIncome: number;
  totalExpenses: number;
  net: number;
  savingsRate: number; // % da renda que sobrou (0 se não há renda)
  avgMonthlyExpense: number;
  bestMonth: MonthSummary | null; // maior sobra
  worstMonth: MonthSummary | null; // menor sobra
  categories: CategoryRow[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function summarizeMonth(transactions: Transaction[], month: string): MonthSummary {
  const txs = buildMonthTransactions(transactions, month);
  let income = 0;
  let expenses = 0;
  const byCategory: Record<string, number> = {};
  for (const t of txs) {
    if (t.type === 'income') {
      income += t.amount;
    } else {
      expenses += t.amount;
      const cat = t.category || 'Outros';
      byCategory[cat] = (byCategory[cat] || 0) + t.amount;
    }
  }
  return { month, income: round2(income), expenses: round2(expenses), net: round2(income - expenses), byCategory };
}

export function summarizeRange(transactions: Transaction[], from: string, to: string): MonthSummary[] {
  return monthsBetween(from, to).map(m => summarizeMonth(transactions, m));
}

/** Variação percentual de `prev` para `cur`. null quando não há base de comparação. */
export function pctChange(prev: number, cur: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

export interface CategoryComparison {
  category: string;
  previous: number;
  current: number;
  diff: number;
  pct: number | null;
}

/** Compara despesas por categoria entre dois resumos, ordenado pela maior variação absoluta. */
export function compareCategories(previous: MonthSummary, current: MonthSummary): CategoryComparison[] {
  const cats = new Set([...Object.keys(previous.byCategory), ...Object.keys(current.byCategory)]);
  return Array.from(cats)
    .map(category => {
      const p = previous.byCategory[category] || 0;
      const c = current.byCategory[category] || 0;
      return { category, previous: round2(p), current: round2(c), diff: round2(c - p), pct: pctChange(p, c) };
    })
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}

export function summarizeYear(transactions: Transaction[], year: number): YearSummary {
  const months = summarizeRange(transactions, `${year}-01`, `${year}-12`);
  const totalIncome = round2(months.reduce((s, m) => s + m.income, 0));
  const totalExpenses = round2(months.reduce((s, m) => s + m.expenses, 0));

  const catTotals: Record<string, number> = {};
  months.forEach(m => {
    for (const [c, v] of Object.entries(m.byCategory)) catTotals[c] = (catTotals[c] || 0) + v;
  });
  const categories: CategoryRow[] = Object.entries(catTotals)
    .map(([category, total]) => ({
      category,
      total: round2(total),
      share: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0
    }))
    .sort((a, b) => b.total - a.total);

  const active = months.filter(m => m.income > 0 || m.expenses > 0);
  const bestMonth = active.length ? active.reduce((a, b) => (b.net > a.net ? b : a)) : null;
  const worstMonth = active.length ? active.reduce((a, b) => (b.net < a.net ? b : a)) : null;

  return {
    year,
    months,
    totalIncome,
    totalExpenses,
    net: round2(totalIncome - totalExpenses),
    savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
    avgMonthlyExpense: active.length ? round2(totalExpenses / active.length) : 0,
    bestMonth,
    worstMonth,
    categories
  };
}

/** Anos que possuem lançamentos (mais recente primeiro); sempre inclui o ano atual. */
export function availableYears(transactions: Transaction[], now: Date = new Date()): number[] {
  const years = new Set<number>([now.getFullYear()]);
  for (const t of transactions) {
    const y = parseInt((t.nature === 'fixed' ? t.startDate || t.date : t.date)?.slice(0, 4) || '', 10);
    if (y) years.add(y);
  }
  return Array.from(years).sort((a, b) => b - a);
}

/** Lançamentos efetivos (com recorrência e parcelas) de todos os meses do intervalo, em ordem de data. */
export function flattenMonths(transactions: Transaction[], from: string, to: string): Transaction[] {
  const list: Transaction[] = [];
  for (const m of monthsBetween(from, to)) list.push(...buildMonthTransactions(transactions, m));
  return list.sort((a, b) => a.date.localeCompare(b.date));
}
