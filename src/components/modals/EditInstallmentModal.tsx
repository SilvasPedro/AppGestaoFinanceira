import React, { useState, useEffect } from 'react';
import { X, Check, CreditCard as CreditCardIcon, Tag, DollarSign, Layers } from 'lucide-react';
import { 
  InstallmentGroupSummary, 
  PaymentMethod, 
  Category 
} from '../../types/finance';
import { useFinance } from '../../context/FinanceContext';
import { CreditCardModal } from './CreditCardModal';
import { formatBRL } from '../../lib/format';

interface EditInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  installmentGroup: InstallmentGroupSummary | null;
  onSave: (groupId: string, updates: {
    description?: string;
    category?: string;
    paymentMethod?: PaymentMethod;
    cardId?: string;
    cardName?: string;
    cardLastFour?: string;
    monthlyAmount?: number;
    totalInstallments?: number;
    currentInstallment?: number;
  }) => Promise<void>;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'credit_card', label: 'Cartão Crédito' },
  { id: 'pix', label: 'PIX' },
  { id: 'debit_card', label: 'Cartão Débito' },
  { id: 'boleto', label: 'Boleto' },
  { id: 'bank_transfer', label: 'Transferência' },
  { id: 'cash', label: 'Dinheiro' }
];

export const EditInstallmentModal: React.FC<EditInstallmentModalProps> = ({
  isOpen,
  onClose,
  installmentGroup,
  onSave
}) => {
  const { expenseCategories, incomeCategories, creditCards, addCreditCard } = useFinance();

  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<Category>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [totalInstallments, setTotalInstallments] = useState<number>(1);
  const [currentInstallment, setCurrentInstallment] = useState<number>(1);
  const [monthlyAmountStr, setMonthlyAmountStr] = useState<string>('');
  const [isCardModalOpen, setIsCardModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);

  const categories = installmentGroup?.type === 'income' ? incomeCategories : expenseCategories;

  useEffect(() => {
    if (isOpen && installmentGroup) {
      setDescription(installmentGroup.description);
      setCategory(installmentGroup.category);
      setPaymentMethod(installmentGroup.paymentMethod);
      setSelectedCardId(installmentGroup.cardId || (creditCards[0]?.id || ''));
      setTotalInstallments(installmentGroup.totalInstallments);
      setCurrentInstallment(installmentGroup.currentInstallment || 1);
      setMonthlyAmountStr(String(installmentGroup.monthlyAmount));
    }
  }, [isOpen, installmentGroup, creditCards]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !installmentGroup) return null;


  const parsedMonthly = parseFloat(monthlyAmountStr.replace(',', '.')) || 0;
  const calculatedTotal = Math.round(parsedMonthly * totalInstallments * 100) / 100;
  const remainingCount = Math.max(0, totalInstallments - currentInstallment);
  const calculatedRemaining = Math.round(remainingCount * parsedMonthly * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || parsedMonthly <= 0 || totalInstallments < currentInstallment) {
      return;
    }

    setSubmitting(true);
    try {
      const selectedCard = creditCards.find(c => c.id === selectedCardId);
      await onSave(installmentGroup.groupId, {
        description: description.trim(),
        category,
        paymentMethod,
        cardId: paymentMethod === 'credit_card' ? selectedCard?.id : undefined,
        cardName: paymentMethod === 'credit_card' ? selectedCard?.cardName : undefined,
        cardLastFour: paymentMethod === 'credit_card' ? selectedCard?.lastFourDigits : undefined,
        monthlyAmount: parsedMonthly,
        totalInstallments,
        currentInstallment
      });
      onClose();
    } catch (err) {
      console.error('Error updating installment group:', err);
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
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Editar Parcelamento</h3>
              <p className="text-[11px] text-[#9AA4B5]">Atualiza todas as parcelas deste grupo</p>
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
          {/* Nome / Descrição */}
          <div>
            <label className="block text-xs font-medium text-[#AEB6C4] mb-1.5">
              Nome da Compra / Descrição
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: iPhone 15, Geladeira, Pneu"
              className="w-full bg-[#0F1218] border border-[#283040] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#5E6A7E] focus:border-[#8892A4] focus:outline-hidden transition"
            />
          </div>

          {/* Valor da Parcela, Parcela Vigente e Total de Parcelas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-[#AEB6C4] mb-1.5 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-[#A8B5D1]" />
                Valor Parcela
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={monthlyAmountStr}
                onChange={(e) => setMonthlyAmountStr(e.target.value)}
                placeholder="0,00"
                className="w-full bg-[#0F1218] border border-[#283040] rounded-xl px-3 py-2.5 text-sm font-semibold text-white placeholder-[#5E6A7E] focus:border-[#8892A4] focus:outline-hidden transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#AEB6C4] mb-1.5 flex items-center gap-1">
                <span className="text-[#E29578] font-bold">#</span>
                Parcela Vigente
              </label>
              <input
                type="number"
                min={1}
                max={totalInstallments}
                required
                value={currentInstallment}
                onChange={(e) => setCurrentInstallment(Math.min(totalInstallments, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full bg-[#0F1218] border border-[#283040] rounded-xl px-3 py-2.5 text-sm font-semibold text-white placeholder-[#5E6A7E] focus:border-[#8892A4] focus:outline-hidden transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#AEB6C4] mb-1.5 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-[#E5A97D]" />
                Total Parcelas
              </label>
              <input
                type="number"
                min={currentInstallment}
                max={96}
                required
                value={totalInstallments}
                onChange={(e) => {
                  const val = Math.max(currentInstallment, parseInt(e.target.value) || 1);
                  setTotalInstallments(val);
                }}
                className="w-full bg-[#0F1218] border border-[#283040] rounded-xl px-3 py-2.5 text-sm font-semibold text-white placeholder-[#5E6A7E] focus:border-[#8892A4] focus:outline-hidden transition"
              />
            </div>
          </div>
          <p className="text-[11px] text-[#9AA4B5] -mt-2">
            Alterar a parcela vigente ajusta em cascata os índices de todo o extrato.
          </p>

          {/* Resumo de Projeção */}
          <div className="p-3 bg-[#0F1218] border border-[#283040] rounded-2xl grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-[#9AA4B5] block uppercase tracking-wider">Novo Valor Total</span>
              <span className="font-semibold text-white">{formatBRL(calculatedTotal)}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#9AA4B5] block uppercase tracking-wider">Saldo Devedor Restante</span>
              <span className="font-semibold text-[#E29578]">{formatBRL(calculatedRemaining)}</span>
            </div>
            <div className="col-span-2 pt-1 border-t border-[#1E2430] flex items-center justify-between text-[11px] text-[#AEB6C4]">
              <span>Parcela configurada: <strong className="text-white">{currentInstallment} de {totalInstallments}</strong></span>
              <span>Faltam quitar: <strong className="text-white">{remainingCount}</strong></span>
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs font-medium text-[#AEB6C4] mb-1.5 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-[#A3C9A8]" />
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
              Método de Pagamento
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`py-2 px-2 text-xs rounded-xl font-medium border transition cursor-pointer text-center ${
                    paymentMethod === m.id
                      ? 'bg-white text-black border-white shadow-xs'
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
