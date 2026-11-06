import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Target, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  ShieldCheck, 
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import { BudgetSuggestionResult } from '../../services/budgetSuggester';
import { formatBRL } from '../../lib/format';

interface SmartBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  currentBudgets: Record<string, number>;
  onSaveBudgets: (limits: Record<string, number>) => Promise<void>;
  budgetSuggestion: BudgetSuggestionResult;
}

export const SmartBudgetModal: React.FC<SmartBudgetModalProps> = ({
  isOpen,
  onClose,
  categories,
  currentBudgets,
  onSaveBudgets,
  budgetSuggestion
}) => {
  const [limitsMap, setLimitsMap] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, string> = {};
      categories.forEach(cat => {
        initial[cat] = currentBudgets[cat] ? String(currentBudgets[cat]) : '';
      });
      setLimitsMap(initial);
    }
  }, [isOpen, categories, currentBudgets]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);


  const handleApplySmartSuggestion = () => {
    if (budgetSuggestion.isDeficit) return;
    const updated: Record<string, string> = {};
    categories.forEach(cat => {
      const suggested = budgetSuggestion.suggestedLimits[cat];
      updated[cat] = suggested !== undefined ? String(suggested) : (limitsMap[cat] || '');
    });
    setLimitsMap(updated);
  };

  const handleInputChange = (cat: string, val: string) => {
    setLimitsMap(prev => ({ ...prev, [cat]: val }));
  };

  // Cálculo da soma dos limites preenchidos
  const totalAllocated = useMemo(() => {
    let sum = 0;
    Object.values(limitsMap).forEach(v => {
      const num = parseFloat(v.replace(',', '.'));
      if (!isNaN(num) && num > 0) {
        sum += num;
      }
    });
    return Math.round(sum * 100) / 100;
  }, [limitsMap]);

  const availableSurplus = budgetSuggestion.availableSurplus;
  const isOverSurplus = availableSurplus > 0 && totalAllocated > availableSurplus;
  const surplusPercentage = availableSurplus > 0 ? (totalAllocated / availableSurplus) * 100 : 0;
  const remainingMargin = Math.max(0, availableSurplus - totalAllocated);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const numericLimits: Record<string, number> = {};
      Object.entries(limitsMap).forEach(([cat, val]) => {
        const num = parseFloat(val.replace(',', '.'));
        if (!isNaN(num) && num > 0) {
          numericLimits[cat] = num;
        }
      });

      await onSaveBudgets(numericLimits);
      onClose();
    } catch (err) {
      console.error('Error saving budgets:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#151A23] border border-[#283040] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl relative max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#283040] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center">
              <Target className="w-4 h-4 text-[#A8B5D1]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Limites & Tetos Inteligentes</h3>
              <p className="text-[11px] text-[#9AA4B5]">Configure tetos baseados na sua capacidade real</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-[#9AA4B5] hover:text-white hover:bg-[#283040] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="overflow-y-auto no-scrollbar py-4 space-y-4 flex-1">
          {/* Card de Sobra Líquida e Sugestão Inteligente */}
          <div className="p-4 bg-[#0F1218] border border-[#283040] rounded-2xl space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] text-[#9AA4B5] uppercase tracking-wider font-semibold block">
                  Sobra Líquida Mensal Disponível
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className={`text-xl font-bold ${
                    budgetSuggestion.isDeficit ? 'text-[#E29578]' : 'text-[#A3C9A8]'
                  }`}>
                    {formatBRL(availableSurplus)}
                  </span>
                  <span className="text-[11px] text-[#9AA4B5]">
                    {budgetSuggestion.isDeficit ? '(Déficit)' : 'livre para categorias'}
                  </span>
                </div>
                <p className="text-[11px] text-[#9AA4B5] mt-1">
                  Renda ({formatBRL(budgetSuggestion.totalIncome)}) − Fixos ({formatBRL(budgetSuggestion.fixedExpenses)}) − Parcelas ({formatBRL(budgetSuggestion.installmentsTotal)})
                </p>
              </div>

              {!budgetSuggestion.isDeficit && (
                <button
                  type="button"
                  onClick={handleApplySmartSuggestion}
                  className="py-2 px-3 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-md cursor-pointer shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-black" />
                  <span>Sugerir Tetos</span>
                </button>
              )}
            </div>

            {/* Alerta de Orçamento Deficitário */}
            {budgetSuggestion.isDeficit && (
              <div className="p-3 rounded-xl bg-[#E29578]/10 border border-[#E29578]/30 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[#E29578] shrink-0 mt-0.5" />
                <p className="text-xs text-[#E29578] leading-relaxed">
                  {budgetSuggestion.warningMessage || 'Suas despesas fixas e parcelas consom 100% da sua renda atual. Reduza custos antes de fixar novos limites.'}
                </p>
              </div>
            )}

            {!budgetSuggestion.isDeficit && budgetSuggestion.safetyReserve > 0 && (
              <div className="pt-2 border-t border-[#1E2430] flex items-center justify-between text-[11px] text-[#AEB6C4]">
                <span className="flex items-center gap-1 text-[#A3C9A8]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Margem de segurança (20%): {formatBRL(budgetSuggestion.safetyReserve)}
                </span>
                <span>Alocável: {formatBRL(budgetSuggestion.allocableBudget)}</span>
              </div>
            )}
          </div>

          {/* Lista de Categorias com Inputs */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] text-[#9AA4B5] uppercase tracking-wider font-semibold">
                Categorias de Gastos Diários
              </span>
              <span className="text-[10px] text-[#9AA4B5]">
                Valores mensais (R$)
              </span>
            </div>

            <div className="space-y-2">
              {categories.map(cat => {
                const suggested = budgetSuggestion.suggestedLimits[cat];
                const currentVal = limitsMap[cat] || '';

                return (
                  <div
                    key={cat}
                    className="p-3 bg-[#0F1218] border border-[#283040] rounded-2xl flex items-center justify-between gap-3 hover:border-[#3B4558] transition"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        {cat}
                      </div>
                      {suggested !== undefined && (
                        <div className="text-[10px] text-[#A8B5D1] mt-0.5 flex items-center gap-1">
                          <span>Sugerido: {formatBRL(suggested)}</span>
                          {currentVal !== String(suggested) && (
                            <button
                              type="button"
                              onClick={() => handleInputChange(cat, String(suggested))}
                              className="text-[10px] text-[#A3C9A8] hover:underline cursor-pointer ml-1"
                            >
                              Aplicar
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="relative w-32 shrink-0">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#9AA4B5]">
                        R$
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={currentVal}
                        onChange={(e) => handleInputChange(cat, e.target.value)}
                        placeholder="0,00"
                        className="w-full pl-9 pr-3 py-2 bg-[#151A23] border border-[#283040] rounded-xl text-xs font-semibold text-white text-right focus:border-[#8892A4] focus:outline-hidden transition"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer com Barra de Somatório Dinâmico e Botões */}
        <div className="pt-3 border-t border-[#283040] shrink-0 space-y-3">
          {/* Barra de Somatório Dinâmico */}
          <div className="p-3 bg-[#0F1218] border border-[#283040] rounded-2xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#AEB6C4] font-medium">Soma de Todos os Tetos</span>
              <span className={`font-mono font-bold ${isOverSurplus ? 'text-[#E29578]' : 'text-white'}`}>
                {formatBRL(totalAllocated)} <span className="text-[#9AA4B5] text-[11px]">/ {formatBRL(availableSurplus)}</span>
              </span>
            </div>

            {/* Barra Linear de Progresso */}
            <div className="w-full h-2 rounded-full bg-[#1E2430] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isOverSurplus 
                    ? 'bg-[#E29578]' 
                    : surplusPercentage >= 80 
                    ? 'bg-[#E5A97D]' 
                    : 'bg-[#A3C9A8]'
                }`}
                style={{ width: `${Math.min(100, surplusPercentage)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px]">
              {isOverSurplus ? (
                <span className="text-[#E29578] font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Ultrapassa a sobra líquida em {formatBRL(totalAllocated - availableSurplus)}
                </span>
              ) : (
                <span className="text-[#A3C9A8] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Dentro da renda • Margem de {formatBRL(remainingMargin)} preservada
                </span>
              )}
              <span className="text-[#9AA4B5] font-mono">
                {Math.round(surplusPercentage)}% da sobra
              </span>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 px-4 rounded-xl bg-[#283040] hover:bg-[#363F50] text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold transition shadow-lg active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? 'Salvando Tetos...' : 'Salvar Todos os Tetos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
