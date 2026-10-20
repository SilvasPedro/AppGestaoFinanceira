import React, { useState } from 'react';
import { X, Target } from 'lucide-react';
import { ExpenseCategory } from '../../types/finance';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  currentBudgets: Record<string, number>;
  onSaveBudget: (category: string, amount: number) => Promise<void>;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  categories,
  currentBudgets,
  onSaveBudget
}) => {
  const [selectedCat, setSelectedCat] = useState<string>(categories[0] || 'Alimentação');
  const [limitStr, setLimitStr] = useState<string>(
    currentBudgets[categories[0]] ? String(currentBudgets[categories[0]]) : '1000'
  );
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCategorySelect = (cat: string) => {
    setSelectedCat(cat);
    const existing = currentBudgets[cat];
    setLimitStr(existing ? String(existing) : '1000');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(limitStr.replace(',', '.'));
    if (isNaN(val) || val <= 0) return;

    setSaving(true);
    try {
      await onSaveBudget(selectedCat, val);
      onClose();
    } catch (err) {
      console.error('Error saving budget:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs transition-opacity"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#141414] border border-[#262626] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom duration-300"
      >
        <div className="w-12 h-1.5 bg-[#2B2B2B] rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#A8B5D1]" />
            <h2 className="text-base font-semibold text-white">Definir Teto de Gastos</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-[#737373] hover:text-white hover:bg-[#262626] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block mb-1.5">
              Selecione a Categoria
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto no-scrollbar pr-1">
              {categories.map((cat) => {
                const isSelected = selectedCat === cat;
                const hasExisting = !!currentBudgets[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className={`px-3 py-2 text-left rounded-xl border text-xs font-medium transition ${
                      isSelected
                        ? 'border-white bg-[#262626] text-white shadow-xs'
                        : 'border-[#262626] bg-[#0D0D0D] text-[#A3A3A3] hover:text-white'
                    }`}
                  >
                    <div className="truncate">{cat}</div>
                    {hasExisting && (
                      <div className="text-[10px] text-[#A8B5D1]">
                        Atual: R$ {currentBudgets[cat]}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block mb-1">
              Limite Mensal Estipulado (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#737373]">
                R$
              </span>
              <input
                type="number"
                step="10"
                min="10"
                required
                value={limitStr}
                onChange={(e) => setLimitStr(e.target.value)}
                placeholder="Ex: 1500"
                className="w-full pl-11 pr-4 py-3 bg-[#0D0D0D] border border-[#262626] rounded-xl text-lg font-semibold text-white focus:outline-hidden focus:border-white transition"
              />
            </div>
            <p className="mt-1 text-[11px] text-[#737373]">
              Você receberá avisos sutis ao atingir 80% e 100% deste limite.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || !limitStr}
              className="w-full py-3.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-wider transition active:scale-[0.98] shadow-md"
            >
              {saving ? 'Gravando Limite...' : 'Salvar Teto Orçamentário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
