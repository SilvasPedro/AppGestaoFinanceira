import { CreditCard, Transaction } from '../types/finance';
import { buildMonthTransactions, currentMonthKey, shiftMonth } from './monthView';
import { buildInvoiceCycle, collectCardTransactions } from './cardCycles';

export interface Reminder {
  id: string; // estável para o mesmo vencimento (usado para não notificar duas vezes)
  kind: 'bill' | 'card';
  title: string;
  dueDate: string; // YYYY-MM-DD
  amount: number;
  daysUntil: number; // negativo = atrasado
}

const pad = (n: number) => String(n).padStart(2, '0');
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function daysBetween(fromIso: string, toIso: string): number {
  const [y1, m1, d1] = fromIso.split('-').map(Number);
  const [y2, m2, d2] = toIso.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

/**
 * Vencimentos que merecem aviso: contas a pagar (fixas e parceladas não pagas, fora do cartão)
 * e faturas de cartão com vencimento próximo. Inclui atrasados do mês atual.
 */
export function buildReminders(
  transactions: Transaction[],
  cards: CreditCard[],
  now: Date = new Date(),
  horizonDays = 3
): Reminder[] {
  const today = isoDay(now);
  const month = currentMonthKey(now);
  const reminders: Reminder[] = [];

  for (const m of [month, shiftMonth(month, 1)]) {
    for (const t of buildMonthTransactions(transactions, m)) {
      if (t.type !== 'expense' || t.isPaid) continue;
      if (t.paymentMethod === 'credit_card') continue; // entra na fatura do cartão
      if (t.nature === 'daily') continue; // gasto avulso não tem vencimento
      const daysUntil = daysBetween(today, t.date);
      if (daysUntil > horizonDays) continue;
      if (daysUntil < 0 && m !== month) continue;
      reminders.push({
        id: `bill_${t.id}_${t.date}`,
        kind: 'bill',
        title: t.description || t.category,
        dueDate: t.date,
        amount: t.amount,
        daysUntil
      });
    }
  }

  const cardTxs = collectCardTransactions(transactions, shiftMonth(month, -2), shiftMonth(month, 2));
  for (const card of cards) {
    if (!card.dueDay) continue;
    for (const m of [shiftMonth(month, -1), month, shiftMonth(month, 1)]) {
      const cycle = buildInvoiceCycle(card, m, cardTxs, today);
      if (!cycle.dueDate || cycle.total <= 0 || cycle.isPaid || !cycle.isClosed) continue;
      const daysUntil = daysBetween(today, cycle.dueDate);
      if (daysUntil > horizonDays || daysUntil < -30) continue;
      reminders.push({
        id: `card_${card.id}_${cycle.dueDate}`,
        kind: 'card',
        title: `Fatura ${card.cardName}`,
        dueDate: cycle.dueDate,
        amount: cycle.total,
        daysUntil
      });
    }
  }

  return reminders.sort((a, b) => a.daysUntil - b.daysUntil);
}

export function describeDue(daysUntil: number): string {
  if (daysUntil < 0) return daysUntil === -1 ? 'venceu ontem' : `venceu há ${-daysUntil} dias`;
  if (daysUntil === 0) return 'vence hoje';
  if (daysUntil === 1) return 'vence amanhã';
  return `vence em ${daysUntil} dias`;
}

// ---------------------------------------------------------------------------
// Notificações do sistema (disparadas enquanto o app está aberto ou instalado)
// ---------------------------------------------------------------------------

const NOTIFIED_KEY = 'finances_pro_notified_reminders';
const ENABLED_KEY = 'finances_pro_notifications_enabled';

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationsEnabled(): boolean {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false;
  try {
    return localStorage.getItem(ENABLED_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setNotificationsEnabled(on: boolean): void {
  try {
    localStorage.setItem(ENABLED_KEY, on ? '1' : '0');
  } catch {
    // ignore
  }
}

/** Pede permissão ao navegador. Deve ser chamada a partir de um clique do usuário. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  const result = await Notification.requestPermission();
  if (result === 'granted') setNotificationsEnabled(true);
  return result;
}

function loadNotified(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '{}');
  } catch {
    return {};
  }
}

/** Dispara uma notificação por lembrete, no máximo uma vez por dia. */
export async function notifyDueReminders(reminders: Reminder[], now: Date = new Date()): Promise<number> {
  if (!notificationsEnabled() || reminders.length === 0) return 0;
  const today = isoDay(now);
  const notified = loadNotified();
  // limpa registros antigos
  Object.keys(notified).forEach(k => {
    if (notified[k] !== today) delete notified[k];
  });

  const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  let sent = 0;
  for (const r of reminders) {
    if (notified[r.id] === today) continue;
    const body = `${describeDue(r.daysUntil)} • ${r.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
    try {
      if (registration) {
        await registration.showNotification(r.title, { body, tag: r.id, icon: '/pwa-192x192.png', badge: '/pwa-192x192.png' });
      } else {
        new Notification(r.title, { body, tag: r.id, icon: '/pwa-192x192.png' });
      }
      notified[r.id] = today;
      sent++;
    } catch {
      // navegador bloqueou: tenta de novo na próxima verificação
    }
  }
  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(notified));
  } catch {
    // ignore
  }
  return sent;
}
