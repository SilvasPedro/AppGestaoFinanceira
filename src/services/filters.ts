import { Transaction } from '../types/finance';

export interface TransactionFilter {
  text: string;
  type: 'all' | 'income' | 'expense';
  categories: string[];
  cardId: string | null;
  accountId: string | null;
  tags: string[];
  minAmount: number | null;
  maxAmount: number | null;
  /** Período livre. Quando ambos vazios, usa o mês selecionado no app. */
  dateFrom: string;
  dateTo: string;
  paid: 'all' | 'paid' | 'pending';
}

export const EMPTY_FILTER: TransactionFilter = {
  text: '',
  type: 'all',
  categories: [],
  cardId: null,
  accountId: null,
  tags: [],
  minAmount: null,
  maxAmount: null,
  dateFrom: '',
  dateTo: '',
  paid: 'all'
};

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function hasCustomPeriod(f: TransactionFilter): boolean {
  return !!(f.dateFrom || f.dateTo);
}

/** Quantos critérios (além do mês) estão ativos — usado no selo do botão "Filtros". */
export function countActiveFilters(f: TransactionFilter): number {
  let n = 0;
  if (f.text.trim()) n++;
  if (f.type !== 'all') n++;
  if (f.categories.length) n++;
  if (f.cardId) n++;
  if (f.accountId) n++;
  if (f.tags.length) n++;
  if (f.minAmount !== null) n++;
  if (f.maxAmount !== null) n++;
  if (hasCustomPeriod(f)) n++;
  if (f.paid !== 'all') n++;
  return n;
}

export function matchesFilter(tx: Transaction, f: TransactionFilter): boolean {
  if (f.type !== 'all' && tx.type !== f.type) return false;
  if (f.categories.length && !f.categories.includes(tx.category)) return false;
  if (f.cardId && tx.cardId !== f.cardId) return false;
  if (f.accountId && tx.accountId !== f.accountId) return false;
  if (f.tags.length) {
    const own = (tx.tags || []).map(norm);
    if (!f.tags.every(t => own.includes(norm(t)))) return false;
  }
  if (f.minAmount !== null && tx.amount < f.minAmount) return false;
  if (f.maxAmount !== null && tx.amount > f.maxAmount) return false;
  if (f.dateFrom && tx.date < f.dateFrom) return false;
  if (f.dateTo && tx.date > f.dateTo) return false;
  if (f.paid === 'paid' && !tx.isPaid) return false;
  if (f.paid === 'pending' && tx.isPaid) return false;

  const q = norm(f.text.trim());
  if (q) {
    const haystack = norm(
      [
        tx.description,
        tx.category,
        tx.cardName || '',
        tx.cardLastFour || '',
        (tx.tags || []).join(' '),
        tx.amount.toFixed(2),
        tx.amount.toFixed(2).replace('.', ',')
      ].join(' ')
    );
    if (!haystack.includes(q)) return false;
  }
  return true;
}

export function applyFilter(txs: Transaction[], f: TransactionFilter): Transaction[] {
  return txs.filter(t => matchesFilter(t, f));
}

// ---------------------------------------------------------------------------
// Filtros salvos (por dispositivo)
// ---------------------------------------------------------------------------

export interface SavedFilter {
  id: string;
  name: string;
  filter: TransactionFilter;
}

const SAVED_KEY = 'finances_pro_saved_filters';

export function loadSavedFilters(): SavedFilter[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(p => p && typeof p.id === 'string' && typeof p.name === 'string' && p.filter)
      .map(p => ({ id: p.id, name: p.name, filter: { ...EMPTY_FILTER, ...p.filter } }));
  } catch {
    return [];
  }
}

export function persistSavedFilters(list: SavedFilter[]): void {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  } catch {
    // armazenamento indisponível: o filtro vale só nesta sessão
  }
}
