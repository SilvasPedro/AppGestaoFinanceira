import { SharedExpense } from '../types/finance';

/** Divide `amount` igualmente entre `n` pessoas em centavos; a sobra vai para as primeiras. */
export function splitCents(amount: number, n: number): number[] {
  if (n <= 0) return [];
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / n);
  const rest = cents - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

/**
 * Saldo líquido de cada membro, em reais: positivo = tem a receber, negativo = deve.
 * Quem pagou ganha crédito do valor total; cada participante assume a sua parte.
 */
export function computeBalances(expenses: SharedExpense[], memberIds: string[]): Record<string, number> {
  const cents: Record<string, number> = {};
  memberIds.forEach(id => (cents[id] = 0));

  for (const e of expenses) {
    const participants = [...e.splitWith].sort();
    if (participants.length === 0) continue;
    cents[e.paidBy] = (cents[e.paidBy] || 0) + Math.round(e.amount * 100);
    const parts = splitCents(e.amount, participants.length);
    participants.forEach((uid, i) => {
      cents[uid] = (cents[uid] || 0) - parts[i];
    });
  }
  const out: Record<string, number> = {};
  Object.entries(cents).forEach(([id, c]) => (out[id] = c / 100));
  return out;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

/** Menor conjunto simples de pagamentos que zera os saldos (algoritmo guloso). */
export function suggestSettlements(balances: Record<string, number>): Settlement[] {
  const debtors = Object.entries(balances)
    .map(([id, v]) => ({ id, c: Math.round(v * 100) }))
    .filter(x => x.c < 0)
    .sort((a, b) => a.c - b.c);
  const creditors = Object.entries(balances)
    .map(([id, v]) => ({ id, c: Math.round(v * 100) }))
    .filter(x => x.c > 0)
    .sort((a, b) => b.c - a.c);

  const result: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(-debtors[i].c, creditors[j].c);
    if (pay > 0) result.push({ from: debtors[i].id, to: creditors[j].id, amount: pay / 100 });
    debtors[i].c += pay;
    creditors[j].c -= pay;
    if (debtors[i].c === 0) i++;
    if (creditors[j].c === 0) j++;
  }
  return result;
}
