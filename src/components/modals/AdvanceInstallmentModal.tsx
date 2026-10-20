import React, { useState } from 'react';
import { X, FastForward, CheckCircle2, DollarSign, Percent, AlertCircle } from 'lucide-react';
import { InstallmentGroupSummary } from '../../types/finance';

interface AdvanceInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  installmentGroup: InstallmentGroupSummary | null;
  onConfirmAdvance: (groupId: string, count: number, discount: number, targetDate: string) => Promise<void>;
  currentMonth: string;
}

export const AdvanceInstallmentModal: React.FC<AdvanceInstallmentModalProps> = ({
  isOpen,
  onClose,
  installmentGroup,
  onConfirmAdvance,
  currentMonth
}) => {
  const [countToAdvance, setCountToAdvance] = useState<number>(1);
  const [discountStr, setDiscountStr] = useState<string>('0');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Data do adiantamento (hoje no mês selecionado)
  const todayDay = String(new Date().getDate()).padStart(2, '0');
  const [targetDate, setTargetDate] = useState<string>(`${currentMonth}-${todayDay}`);

  React.useEffect(() => {
    if (isOpen && installmentGroup) {
      setCountToAdvance(Math.min(1, installmentGroup.remainingCount));
      setDiscountStr('0');
      const day = String(new Date().getDate()).padStart(2, '0');
      setTargetDate(`${currentMonth}-${day}`);
    }
  }, [isOpen, installmentGroup, currentMonth]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !installmentGroup) return null;

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const remainingCount = installmentGroup.remainingCount;
  const monthlyAmount = installmentGroup.monthlyAmount;
  const subtotal = Math.round(countToAdvance * monthlyAmount * 100) / 100;
  const parsedDiscount = parseFloat(discountStr.replace(',', '.')) || 0;
  const finalDiscount = Math.min(subtotal, Math.max(0, parsedDiscount));
  const totalToPayNow = Math.max(0, Math.round((subtotal - finalDiscount) * 100) / 100);
  const newRemainingCount = Math.max(0, remainingCount - countToAdvance);
  const newRemainingBalance = Math.max(0, Math.round(newRemainingCount * monthlyAmount * 100) / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (countToAdvance <= 0 || countToAdvance > remainingCount) return;

    setSubmitting(true);
    try {
      await onConfirmAdvance(installmentGroup.groupId, countToAdvance, finalDiscount, targetDate);
      onClose();
    } catch (err) {
      console.error('Error advancing installments:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#141414] border border-[#262626] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E5A97D]/15 text-[#E5A97D] flex items-center justify-center">
              <FastForward className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Adiantar Parcelas</h3>
              <p className="text-[11px] text-[#737373]">{installmentGroup.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-[#737373] hover:text-white hover:bg-[#262626] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Card Resumo do Parcelamento */}
          <div className="p-3.5 bg-[#0D0D0D] border border-[#262626] rounded-2xl flex items-center justify-between text-xs">
            <div>
              <span className="text-[#737373] block text-[10px] uppercase tracking-wider">Parcelas Pendentes</span>
              <span className="font-bold text-white text-sm">
                {remainingCount} de {installmentGroup.totalInstallments}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[#737373] block text-[10px] uppercase tracking-wider">Valor por Parcela</span>
              <span className="font-mono font-bold text-white text-sm">
                {formatBRL(monthlyAmount)}
              </span>
            </div>
          </div>

          {/* Quantidade a Adiantar */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] font-medium text-[#737373] uppercase tracking-wider">
                Quantas parcelas deseja antecipar?
              </label>
              <button
                type="button"
                onClick={() => setCountToAdvance(remainingCount)}
                className="text-[10px] font-semibold text-[#A8B5D1] hover:underline cursor-pointer"
              >
                Quitar todas ({remainingCount}x)
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, remainingCount].filter((v, idx, arr) => v <= remainingCount && arr.indexOf(v) === idx).map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCountToAdvance(num)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                    countToAdvance === num
                      ? 'bg-white text-black border-white shadow-xs'
                      : 'bg-[#0D0D0D] text-[#A3A3A3] border-[#262626] hover:text-white'
                  }`}
                >
                  {num === remainingCount && remainingCount > 3 ? `Todas (${num}x)` : `${num}x`}
                </button>
              ))}
            </div>

            {remainingCount > 4 && (
              <div className="mt-2">
                <input
                  type="range"
                  min={1}
                  max={remainingCount}
                  value={countToAdvance}
                  onChange={(e) => setCountToAdvance(Number(e.target.value))}
                  className="w-full accent-white cursor-pointer h-2 bg-[#262626] rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-[#525252] mt-1">
                  <span>1 parcela</span>
                  <span className="text-white font-bold">{countToAdvance} selecionadas</span>
                  <span>{remainingCount} parcelas</span>
                </div>
              </div>
            )}
          </div>

          {/* Desconto de Antecipação (Opcional - Estilo Nubank) */}
          <div>
            <label className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block mb-1">
              Desconto Recebido pela Antecipação (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#737373]">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={subtotal}
                value={discountStr}
                onChange={(e) => setDiscountStr(e.target.value)}
                placeholder="0,00"
                className="w-full pl-9 pr-3.5 py-2.5 bg-[#0D0D0D] border border-[#262626] rounded-xl text-xs text-white placeholder-[#525252] focus:outline-hidden focus:border-white transition"
              />
            </div>
            <span className="text-[10px] text-[#525252] mt-1 block">
              Caso seu banco/cartão aplique desconto por antecipar parcelas, informe o valor acima.
            </span>
          </div>

          {/* Data do Lançamento no Mês Atual */}
          <div>
            <label className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block mb-1">
              Data da Cobrança Adiantada
            </label>
            <input
              type="date"
              required
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#262626] rounded-xl text-xs text-white focus:outline-hidden"
            />
          </div>

          {/* Extrato do Impacto Financeiro */}
          <div className="p-4 bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl space-y-2 text-xs">
            <div className="flex justify-between text-[#A3A3A3]">
              <span>Valor original ({countToAdvance}x parcelas):</span>
              <span className="font-mono">{formatBRL(subtotal)}</span>
            </div>
            {finalDiscount > 0 && (
              <div className="flex justify-between text-[#A3C9A8]">
                <span>Desconto aplicado:</span>
                <span className="font-mono">-{formatBRL(finalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-white pt-1 border-t border-[#1F1F1F]">
              <span>Cobrado na fatura deste mês:</span>
              <span className="font-mono text-sm text-[#E29578]">{formatBRL(totalToPayNow)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-[#737373] pt-1">
              <span>Saldo devedor restante pós-adiantamento:</span>
              <span className="font-mono text-white">{formatBRL(newRemainingBalance)} ({newRemainingCount}x restantes)</span>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={submitting || countToAdvance <= 0}
              className="w-full min-h-[48px] rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-wider transition active:scale-[0.98] disabled:opacity-40 cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              <FastForward className="w-4 h-4" />
              <span>{submitting ? 'Adiantando parcelas...' : `Confirmar Adiantamento (${formatBRL(totalToPayNow)})`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
