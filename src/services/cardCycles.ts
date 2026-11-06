import { CreditCard, Transaction } from '../types/finance';
import { buildMonthTransactions, currentMonthKey, firstActiveMonth, monthsBetween, shiftMonth } from './monthView';

const pad = (n: number) => String(n).padStart(2, '0');

function clampedDate(month: string, day: number): string {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${y}-${pad(m)}-${pad(Math.min(Math.max(1, day), last))}`;
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export interface InvoiceCycle {
  cardId: string;
  month: string; // mês do fechamento, identifica a fatura
  start: string; // primeiro dia coberto (inclusive)
  end: string; // dia do fechamento (inclusive)
  dueDate: string | null;
  total: number;
  transactions: Transaction[];
  isClosed: boolean;
  isPaid: boolean;
}

/** Datas de uma fatura. Sem dia de fechamento cadastrado, vale o mês-calendário. */
export function cycleDates(card: CreditCard, month: string): { start: string; end: string; dueDate: string | null } {
  if (!card.closingDay) {
    const end = clampedDate(month, 31);
    const dueDate = card.dueDay ? clampedDate(month, card.dueDay) : null;
    return { start: `${month}-01`, end, dueDate };
  }
  const end = clampedDate(month, card.closingDay);
  const start = addDays(clampedDate(shiftMonth(month, -1), card.closingDay), 1);
  let dueDate: string | null = null;
  if (card.dueDay) {
    const dueMonth = card.dueDay > card.closingDay ? month : shiftMonth(month, 1);
    dueDate = clampedDate(dueMonth, card.dueDay);
  }
  return { start, end, dueDate };
}

/** Mês da fatura em que uma compra feita em `date` entra. */
export function invoiceMonthForDate(card: CreditCard, date: string): string {
  const month = date.slice(0, 7);
  if (!card.closingDay) return month;
  return date <= clampedDate(month, card.closingDay) ? month : shiftMonth(month, 1);
}

/** Todas as compras no cartão (inclui parcelas futuras) no intervalo de meses. */
export function collectCardTransactions(transactions: Transaction[], from: string, to: string): Transaction[] {
  const list: Transaction[] = [];
  for (const m of monthsBetween(from, to)) {
    for (const t of buildMonthTransactions(transactions, m)) {
      if (t.type === 'expense' && t.paymentMethod === 'credit_card' && t.cardId) list.push(t);
    }
  }
  return list;
}

export function buildInvoiceCycle(
  card: CreditCard,
  month: string,
  cardTransactions: Transaction[],
  today: string = todayIso()
): InvoiceCycle {
  const { start, end, dueDate } = cycleDates(card, month);
  const txs = cardTransactions
    .filter(t => t.cardId === card.id && t.date >= start && t.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date));
  const total = Math.round(txs.reduce((s, t) => s + t.amount, 0) * 100) / 100;
  return {
    cardId: card.id,
    month,
    start,
    end,
    dueDate,
    total,
    transactions: txs,
    isClosed: today > end,
    isPaid: txs.length > 0 && txs.every(t => t.isPaid)
  };
}

export interface LimitUsage {
  committed: number; // soma do que ainda não foi pago (inclui parcelas futuras)
  limit: number;
  available: number;
  percentage: number;
  status: 'safe' | 'warning' | 'danger' | 'none';
}

/** Limite comprometido: compras no cartão ainda não pagas, incluindo parcelas dos próximos 12 meses. */
export function computeLimitUsage(card: CreditCard, transactions: Transaction[], now: Date = new Date()): LimitUsage {
  const limit = card.limitAmount || 0;
  const from = firstActiveMonth(transactions);
  const to = shiftMonth(currentMonthKey(now), 12);
  const committed =
    Math.round(
      collectCardTransactions(transactions, from, to)
        .filter(t => t.cardId === card.id && !t.isPaid)
        .reduce((s, t) => s + t.amount, 0) * 100
    ) / 100;
  if (limit <= 0) return { committed, limit: 0, available: 0, percentage: 0, status: 'none' };
  const percentage = (committed / limit) * 100;
  return {
    committed,
    limit,
    available: Math.max(0, limit - committed),
    percentage,
    status: percentage >= 100 ? 'danger' : percentage >= 80 ? 'warning' : 'safe'
  };
}
