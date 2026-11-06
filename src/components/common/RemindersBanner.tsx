import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, CreditCard, X } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { buildReminders, describeDue, notifyDueReminders } from '../../services/reminders';
import { formatBRL } from '../../lib/format';
import type { TabType } from './BottomNav';

const DISMISS_KEY = 'finances_pro_reminders_dismissed';
const todayKey = () => new Date().toISOString().slice(0, 10);

function loadDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === todayKey();
  } catch {
    return false;
  }
}

interface Props {
  onNavigateTab: (tab: TabType) => void;
}

/** Aviso de contas e faturas a vencer + notificações do sistema quando o usuário permitiu. */
export const RemindersBanner: React.FC<Props> = ({ onNavigateTab }) => {
  const { transactions, creditCards, loading } = useFinance();
  const [dismissed, setDismissed] = useState(loadDismissed);
  // força recálculo quando o dia vira com o app aberto
  const [tick, setTick] = useState(0);

  const reminders = useMemo(
    () => (loading ? [] : buildReminders(transactions, creditCards)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, creditCards, loading, tick]
  );

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30 * 60 * 1000);
    const onVisible = () => document.visibilityState === 'visible' && setTick(t => t + 1);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    if (reminders.length > 0) void notifyDueReminders(reminders);
  }, [reminders]);

  if (dismissed || reminders.length === 0) return null;

  const overdue = reminders.filter(r => r.daysUntil < 0).length;
  const shown = reminders.slice(0, 3);

  return (
    <div
      role="region"
      aria-label="Vencimentos próximos"
      className={`mb-4 rounded-2xl border p-3.5 ${overdue ? 'border-[#E29578]/40 bg-[#E29578]/8' : 'border-[#E5A97D]/30 bg-[#E5A97D]/8'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <BellRing className={`w-4 h-4 ${overdue ? 'text-[#E29578]' : 'text-[#E5A97D]'}`} />
          {overdue ? `${overdue} vencimento(s) em atraso` : 'Vencimentos próximos'}
          {reminders.length > shown.length && <span className="font-normal text-[#9AA4B5]">+{reminders.length - shown.length}</span>}
        </div>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            try {
              sessionStorage.setItem(DISMISS_KEY, todayKey());
            } catch {
              // ignore
            }
          }}
          aria-label="Dispensar avisos de hoje"
          className="p-1 rounded-lg text-[#9AA4B5] hover:text-white cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <ul className="mt-2 space-y-1">
        {shown.map(r => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onNavigateTab(r.kind === 'card' ? 'cards' : 'transactions')}
              className="w-full flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-[11px] hover:bg-white/5 cursor-pointer"
            >
              <span className="flex items-center gap-1.5 min-w-0 text-[#D6DBE4]">
                {r.kind === 'card' && <CreditCard className="w-3 h-3 shrink-0 text-[#A8B5D1]" />}
                <span className="truncate">{r.title}</span>
                <span className={r.daysUntil < 0 ? 'text-[#E29578]' : 'text-[#9AA4B5]'}>· {describeDue(r.daysUntil)}</span>
              </span>
              <span className="font-mono font-semibold text-white shrink-0">{formatBRL(r.amount)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
