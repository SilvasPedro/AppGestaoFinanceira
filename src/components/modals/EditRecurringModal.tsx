import React, { useState, useEffect } from 'react';
import { X, Calendar, CreditCard as CreditCardIcon, Tag, DollarSign, Repeat, ArrowDownRight, ArrowUpRight, Check } from 'lucide-react';
import { Transaction, TransactionType, PaymentMethod, Category } from '../../types/finance';
import { useFinance } from '../../context/FinanceContext';
import { CreditCardModal } from './CreditCardModal';

interface EditRecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  recurringItem: Transaction | null;
  onSave: (id: string, updates: Partial<Transaction>) => Promise<void>;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'credit_card', label: 'Cartão Crédito' },
  { id: 'pix', label: 'PIX' },
  { id: 'debit_card', label: 'Cartão Débito' },
  { id: 'boleto', label: 'Boleto' },
  { id: 'bank_transfer', label: 'Transferência' },
  { id: 'cash', label: 'Dinheiro' }
];

export const EditRecurringModal: React.FC<EditRecurringModalProps> = ({
  isOpen,
  onClose,
  recurringItem,
  onSave
}) => {
  const { expenseCategories, incomeCategories, creditCards, addCreditCard, currentMonth } = useFinance();

  const [description, setDescription] = useState<string>('');
  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('');
  const [dueDay, setDueDay] = useState<number>(5);
  const [category, setCategory] = useState<Category>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [isCardModalOpen, setIsCardModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);

  const categories = type === 'income' ? incomeCategories : expenseCategories;

  useEffect(() => {
    if (isOpen && recurringItem) {
      setDescription(recurringItem.description);
      setType(recurringItem.type);
      setAmountStr(String(recurringItem.amount));
      const extractedDay = parseInt(recurringItem.date.split('-')[2] || '5', 10);
      setDueDay(isNaN(extractedDay) ? 5 : extractedDay);
      setCategory(recurringItem.category);
      setPaymentMethod(recurringItem.paymentMethod);
      setSelectedCardId(recurringItem.cardId || (creditCards[0]?.id || ''));
    }
  }, [isOpen, recurringItem, creditCards]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !recurringItem) return null;

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'income') {
      setCategory(incomeCategories[0] || 'Salário');
      setPaymentMethod('pix');
    } else {
      setCategory(expenseCategories[0] || 'Moradia');
      setPaymentMethod('credit_card');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountStr.replace(',', '.')) || 0;
    if (!description.trim() || parsedAmount <= 0) return;

    setSubmitting(true);
    try {
      const dayFormatted = String(Math.min(31, Math.max(1, dueDay))).padStart(2, '0');
      const monthPrefix = currentMonth || recurringItem.date.slice(0, 7) || new Date().toISOString().slice(0, 7);
      const updatedDate = `${monthPrefix}-${dayFormatted}`;

      const selectedCard = creditCards.find(c => c.id === selectedCardId);

      await onSave(recurringItem.id, {
        description: description.trim(),
        type,
        amount: parsedAmount,
        category,
        paymentMethod,
        date: updatedDate,
        cardId: paymentMethod === 'credit_card' ? selectedCard?.id : undefined,
        cardName: paymentMethod === 'credit_card' ? selectedCard?.cardName : undefined,
        cardLastFour: paymentMethod === 'credit_card' ? selectedCard?.lastFourDigits : undefined
      });
      onClose();
    } catch (err) {
      console.error('Error updating recurring transaction:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#151A23] border border-[#283040] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#283040]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center">
              <Repeat className="w-4 h-4 text-[#A8B5D1]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Editar Recorrência Fixa</h3>
              <p className="text-[11px] text-[#9AA4B5]">Ajustar valor, vencimento ou categoria</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-[#9AA4B5] hover:text-white hover:bg-[#283040] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Tipo (Despesa / Receita) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#0F1218] border border-[#283040] rounded-2xl">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                type === 'expense'
                  ? 'bg-[#E29578] text-black shadow-xs font-bold'
                  : 'text-[#9AA4B5] hover:text-white'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              Despesa Fixa
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                type === 'income'
                  ? 'bg-[#A3C9A8] text-black shadow-xs font-bold'
                  : 'text-[#9AA4B5] hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Receita Fixa
            </button>
          </div>

          {/* Nome / Descrição */}
          <div>
            <label className="block text-xs font-medium text-[#AEB6C4] mb-1.5">
              Nome do Compromisso
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Netflix, Aluguel, Salário, Internet"
              className="w-full bg-[#0F1218] border border-[#283040] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#5E6A7E] focus:border-[#8892A4] focus:outline-hidden transition"
            />
          </div>

          {/* Valor Mensal e Dia de Vencimento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#AEB6C4] mb-1.5 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-[#A3C9A8]" />
                Valor Mensal (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0,00"
                className="w-full bg-[#0F1218] border border-[#283040] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white placeholder-[#5E6A7E] focus:border-[#8892A4] focus:outline-hidden transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#AEB6C4] mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#A8B5D1]" />
                Dia do Vencimento
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={31}
                  required
                  value={dueDay}
                  onChange={(e) => setDueDay(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-full bg-[#0F1218] border border-[#283040] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white placeholder-[#5E6A7E] focus:border-[#8892A4] focus:outline-hidden transition"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#9AA4B5] pointer-events-none">
                  Todo dia {String(dueDay).padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs font-medium text-[#AEB6C4] mb-1.5 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-[#E5A97D]" />
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#0F1218] border border-[#283040] rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-[#8892A4] focus:outline-hidden transition"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Método de Pagamento */}
          <div>
            <label className="block text-xs font-medium text-[#AEB6C4] mb-1.5">
              {type === 'income' ? 'Forma de Recebimento' : 'Método de Pagamento'}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`py-2 px-2 text-xs rounded-xl font-medium border transition cursor-pointer text-center ${
                    paymentMethod === m.id
                      ? 'bg-white text-black border-white shadow-xs font-semibold'
                      : 'bg-[#0F1218] text-[#AEB6C4] border-[#283040] hover:text-white hover:bg-[#1C212C]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cartão de Crédito Vinculado */}
          {paymentMethod === 'credit_card' && (
            <div className="p-3 bg-[#0F1218] border border-[#283040] rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#AEB6C4] flex items-center gap-1.5">
                  <CreditCardIcon className="w-3.5 h-3.5 text-[#A8B5D1]" />
                  Cartão Vinculado
                </label>
                <button
                  type="button"
                  onClick={() => setIsCardModalOpen(true)}
                  className="text-[11px] text-[#A8B5D1] hover:underline cursor-pointer"
                >
                  + Novo Cartão
                </button>
              </div>

              {creditCards.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {creditCards.map(c => {
                    const isSelected = selectedCardId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCardId(c.id)}
                        className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#1E2430] border-[#A8B5D1] text-white'
                            : 'bg-[#151A23] border-[#283040] text-[#AEB6C4] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: c.color || '#A8B5D1' }} 
                          />
                          <span className="text-xs font-semibold text-white">{c.cardName}</span>
                          <span className="text-[11px] text-[#9AA4B5]">•••• {c.lastFourDigits}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#A8B5D1]" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-xs text-[#9AA4B5] mb-2">Nenhum cartão cadastrado</p>
                  <button
                    type="button"
                    onClick={() => setIsCardModalOpen(true)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#283040] text-white hover:bg-[#363F50] transition cursor-pointer"
                  >
                    Cadastrar Cartão
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 px-4 rounded-xl bg-[#283040] hover:bg-[#363F50] text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold transition shadow-lg active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>

        <CreditCardModal
          isOpen={isCardModalOpen}
          onClose={() => setIsCardModalOpen(false)}
          onSave={addCreditCard}
        />
      </div>
    </div>
  );
};
