import React, { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, ChevronLeft, ChevronRight, CreditCard as CardIcon, Lock, LockOpen, CheckCircle2, Info } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { BANK_DEFAULT_COLORS } from '../modals/CreditCardModal';
import { buildInvoiceCycle, collectCardTransactions, computeLimitUsage, invoiceMonthForDate } from '../../services/cardCycles';
import { currentMonthKey, shiftMonth } from '../../services/monthView';
import { formatBRL } from '../../lib/format';
import { EmptyState, PageHeader, todayISO } from '../common/ui';

const fmtDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const fmtShort = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

const monthTitle = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function daysUntil(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const [ty, tm, td] = todayISO().split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000);
}

export const CardsTab: React.FC = () => {
  const { creditCards, transactions } = useFinance();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // A fatura inicial é a que contém a data de hoje para o cartão escolhido
  const card = creditCards.find(c => c.id === selectedCardId) || creditCards[0] || null;
  const defaultMonth = card ? invoiceMonthForDate(card, todayISO()) : currentMonthKey();
  const [monthOverride, setMonthOverride] = useState<{ cardId: string; month: string } | null>(null);
  const month = card && monthOverride?.cardId === card.id ? monthOverride.month : defaultMonth;

  const cardTxs = useMemo(
    () => collectCardTransactions(transactions, shiftMonth(month, -2), shiftMonth(month, 2)),
    [transactions, month]
  );

  const cycle = useMemo(() => (card ? buildInvoiceCycle(card, month, cardTxs) : null), [card, month, cardTxs]);
  const usage = useMemo(() => (card ? computeLimitUsage(card, transactions) : null), [card, transactions]);

  const allInvoicesThisMonth = useMemo(
    () => creditCards.reduce((sum, c) => sum + buildInvoiceCycle(c, month, cardTxs).total, 0),
    [creditCards, month, cardTxs]
  );

  if (creditCards.length === 0) {
    return (
      <div className="space-y-6 pb-24 w-full">
        <PageHeader icon={<CardIcon className="w-5 h-5 text-[#A8B5D1]" />} title="Cartões & Faturas" subtitle="Faturas por ciclo de fechamento e limite comprometido." />
        <EmptyState icon={<CardIcon className="w-5 h-5" />} text="Cadastre um cartão em Configurações (informe o dia de fechamento, o vencimento e o limite) para ver as faturas por ciclo." />
      </div>
    );
  }

  const baseColor = (card && (card.color || (card.bankName && BANK_DEFAULT_COLORS[card.bankName]))) || '#3B82F6';
  const due = cycle?.dueDate ? daysUntil(cycle.dueDate) : null;

  const statusPill = cycle
    ? cycle.isPaid
      ? { label: 'Paga', color: '#A3C9A8', Icon: CheckCircle2 }
      : cycle.isClosed
      ? { label: 'Fechada', color: '#E5A97D', Icon: Lock }
      : { label: 'Aberta', color: '#A8B5D1', Icon: LockOpen }
    : null;

  return (
    <div className="space-y-6 pb-24 w-full">
      <PageHeader
        icon={<CardIcon className="w-5 h-5 text-[#A8B5D1]" />}
        title="Cartões & Faturas"
        subtitle="Cada fatura reúne as compras entre o fechamento anterior e o fechamento atual."
      />

      {/* Seleção de cartão */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Cartões">
        {creditCards.map(c => {
          const active = card?.id === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedCardId(c.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition cursor-pointer ${
                active ? 'border-white/30 bg-white/8 text-white font-semibold' : 'border-white/10 text-[#AEB6C4] hover:text-white'
              }`}
            >
              <span className="w-3 h-3 rounded-full" style={{ background: c.color || (c.bankName && BANK_DEFAULT_COLORS[c.bankName]) || '#3B82F6' }} aria-hidden="true" />
              {c.cardName} <span className="text-[#9AA4B5] font-mono">•••• {c.lastFourDigits}</span>
            </button>
          );
        })}
      </div>

      {card && cycle && usage && (
        <>
          {/* Limite */}
          <section className="card-depth-3d p-5 rounded-3xl space-y-3" aria-label="Limite do cartão">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Limite comprometido</h3>
              {usage.status === 'danger' && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E29578]/15 text-[#E29578] border border-[#E29578]/30">
                  <AlertTriangle className="w-3 h-3" /> Limite estourado
                </span>
              )}
              {usage.status === 'warning' && (
                <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#E5A97D]/15 text-[#E5A97D] border border-[#E5A97D]/30">
                  <AlertTriangle className="w-3 h-3" /> Acima de 80%
                </span>
              )}
            </div>
            {usage.status === 'none' ? (
              <p className="text-xs text-[#9AA4B5]">
                Sem limite cadastrado. Já há <strong className="text-white font-mono">{formatBRL(usage.committed)}</strong> em compras não pagas (incluindo parcelas futuras). Edite o
                cartão em Configurações para informar o limite.
              </p>
            ) : (
              <>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-mono font-semibold text-white">{formatBRL(usage.committed)}</span>
                  <span className="text-[#9AA4B5]">de {formatBRL(usage.limit)}</span>
                </div>
                <div
                  className="h-2.5 rounded-full bg-[#1C212C] overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(100, Math.round(usage.percentage))}
                  aria-label="Limite utilizado"
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, usage.percentage)}%`, background: usage.status === 'danger' ? '#E29578' : usage.status === 'warning' ? '#E5A97D' : '#A3C9A8' }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#9AA4B5]">
                  <span>{Math.round(usage.percentage)}% utilizado</span>
                  <span>Disponível: {formatBRL(usage.available)}</span>
                </div>
              </>
            )}
            <p className="flex items-start gap-1.5 text-[10px] text-[#9AA4B5]">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              Considera compras ainda não marcadas como pagas, incluindo as parcelas dos próximos 12 meses.
            </p>
          </section>

          {/* Fatura do ciclo */}
          <section className="card-depth-3d p-5 rounded-3xl space-y-4" aria-label="Fatura">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Fatura anterior"
                  onClick={() => setMonthOverride({ cardId: card.id, month: shiftMonth(month, -1) })}
                  className="p-1.5 rounded-lg text-[#AEB6C4] hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="min-w-36 text-center">
                  <div className="text-sm font-semibold text-white">Fatura de {monthTitle(month)}</div>
                </div>
                <button
                  type="button"
                  aria-label="Próxima fatura"
                  onClick={() => setMonthOverride({ cardId: card.id, month: shiftMonth(month, 1) })}
                  className="p-1.5 rounded-lg text-[#AEB6C4] hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {statusPill && (
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border" style={{ color: statusPill.color, borderColor: `${statusPill.color}55`, background: `${statusPill.color}1A` }}>
                  <statusPill.Icon className="w-3 h-3" /> {statusPill.label}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl p-4 border border-white/8" style={{ background: `linear-gradient(135deg, ${baseColor}33, #0F1218)` }}>
                <div className="text-[10px] text-[#AEB6C4]">Total da fatura</div>
                <div className="text-xl font-bold font-mono text-white">{formatBRL(cycle.total)}</div>
              </div>
              <div className="rounded-2xl p-4 border border-white/8 bg-[#0F1218]">
                <div className="text-[10px] text-[#9AA4B5]">Período e fechamento</div>
                <div className="text-xs font-semibold text-white">
                  {fmtShort(cycle.start)} a {fmtShort(cycle.end)}
                </div>
                <div className="text-[10px] text-[#9AA4B5]">Fecha em {fmtDate(cycle.end)}</div>
              </div>
              <div className="rounded-2xl p-4 border border-white/8 bg-[#0F1218]">
                <div className="text-[10px] text-[#9AA4B5] flex items-center gap-1">
                  <CalendarClock className="w-3 h-3" /> Vencimento
                </div>
                {cycle.dueDate ? (
                  <>
                    <div className="text-xs font-semibold text-white">{fmtDate(cycle.dueDate)}</div>
                    {!cycle.isPaid && cycle.total > 0 && due !== null && (
                      <div className={`text-[10px] ${due < 0 ? 'text-[#E29578]' : due <= 3 ? 'text-[#E5A97D]' : 'text-[#9AA4B5]'}`}>
                        {due < 0 ? `venceu há ${-due} dia(s)` : due === 0 ? 'vence hoje' : `em ${due} dia(s)`}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[11px] text-[#9AA4B5]">Informe o dia de vencimento ao editar o cartão.</div>
                )}
              </div>
            </div>

            {!card.closingDay && (
              <p className="flex items-start gap-1.5 text-[11px] text-[#E5A97D]">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Este cartão não tem dia de fechamento. Estou usando o mês-calendário; informe o fechamento em Configurações para separar as faturas corretamente.
              </p>
            )}

            {cycle.transactions.length === 0 ? (
              <p className="text-xs text-[#9AA4B5]">Nenhuma compra nesta fatura.</p>
            ) : (
              <ul className="divide-y divide-white/6 rounded-2xl border border-white/8 bg-[#0F1218] overflow-hidden">
                {cycle.transactions.map(t => (
                  <li key={`${t.id}_${t.date}`} className="flex items-center gap-3 px-3 py-2 text-xs">
                    <span className="w-12 shrink-0 text-[#9AA4B5] font-mono">{fmtShort(t.date)}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-white">{t.description}</span>
                      <span className="block text-[10px] text-[#9AA4B5]">{t.category}</span>
                    </span>
                    {t.isPaid && <span className="text-[10px] text-[#A3C9A8]">paga</span>}
                    <span className="font-mono font-semibold text-white">{formatBRL(t.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {creditCards.length > 1 && (
            <p className="text-[11px] text-[#9AA4B5]">
              Soma das faturas de todos os cartões em {monthTitle(month)}: <strong className="text-white font-mono">{formatBRL(allInvoicesThisMonth)}</strong>
            </p>
          )}
        </>
      )}
    </div>
  );
};
