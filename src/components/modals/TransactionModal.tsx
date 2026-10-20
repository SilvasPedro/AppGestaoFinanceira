import React, { useState } from 'react';
import { X, Check, Calendar, CreditCard as CreditCardIcon, Tag, DollarSign, Layers, Plus } from 'lucide-react';
import { 
  TransactionType, 
  TransactionNature, 
  PaymentMethod, 
  Category, 
  Transaction 
} from '../../types/finance';
import { useFinance } from '../../context/FinanceContext';
import { CreditCardModal } from './CreditCardModal';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id' | 'userId'>) => Promise<void>;
  defaultMonth: string; // 'YYYY-MM'
  transactionToEdit?: Transaction | null;
  onUpdate?: (id: string, tx: Partial<Transaction>) => Promise<void>;
  initialNature?: TransactionNature;
  initialType?: TransactionType;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'credit_card', label: 'Cartão Crédito' },
  { id: 'pix', label: 'PIX' },
  { id: 'debit_card', label: 'Cartão Débito' },
  { id: 'boleto', label: 'Boleto' },
  { id: 'bank_transfer', label: 'Transferência' },
  { id: 'cash', label: 'Dinheiro' }
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultMonth,
  transactionToEdit,
  onUpdate,
  initialNature,
  initialType
}) => {
  const { expenseCategories, incomeCategories, creditCards, addCreditCard } = useFinance();
  const [type, setType] = useState<TransactionType>(initialType || 'expense');
  const [nature, setNature] = useState<TransactionNature>(initialNature || 'daily');
  const [amountStr, setAmountStr] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<Category>(expenseCategories[0] || 'Alimentação');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [isPaid, setIsPaid] = useState<boolean>(true);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [isCardModalOpen, setIsCardModalOpen] = useState<boolean>(false);

  // Installment specifics
  const [totalInstallments, setTotalInstallments] = useState<number>(10);
  const [currentInstallment, setCurrentInstallment] = useState<number>(1);
  const [installmentCalcMode, setInstallmentCalcMode] = useState<'total' | 'monthly'>('total');

  // Date defaults to today's day in current month
  const todayDay = String(new Date().getDate()).padStart(2, '0');
  const [date, setDate] = useState<string>(`${defaultMonth}-${todayDay}`);

  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;

    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setNature(transactionToEdit.nature);
      setAmountStr(String(transactionToEdit.amount));
      setDescription(transactionToEdit.description || '');
      setCategory(transactionToEdit.category);
      setPaymentMethod(transactionToEdit.paymentMethod);
      setIsPaid(transactionToEdit.isPaid ?? true);
      setDate(transactionToEdit.date);
      setSelectedCardId(transactionToEdit.cardId || '');
      if (transactionToEdit.installmentDetails) {
        setTotalInstallments(transactionToEdit.installmentDetails.totalInstallments || 1);
        setCurrentInstallment(transactionToEdit.installmentDetails.currentInstallment || 1);
        setInstallmentCalcMode('monthly');
      } else {
        setTotalInstallments(10);
        setCurrentInstallment(1);
        setInstallmentCalcMode('total');
      }
    } else {
      const startType = initialType || 'expense';
      const startNature = initialNature || 'daily';
      setType(startType);
      setNature(startNature);
      setAmountStr('');
      setDescription('');
      setCategory(startType === 'income' ? (incomeCategories[0] || 'Salário') : (expenseCategories[0] || 'Alimentação'));
      setPaymentMethod(startType === 'income' ? 'pix' : 'credit_card');
      setIsPaid(true);
      const day = String(new Date().getDate()).padStart(2, '0');
      setDate(`${defaultMonth}-${day}`);
      setSelectedCardId(creditCards[0]?.id || '');
      setTotalInstallments(10);
      setCurrentInstallment(1);
      setInstallmentCalcMode('total');
    }
  }, [isOpen, transactionToEdit, defaultMonth, expenseCategories, incomeCategories, creditCards, initialType, initialNature]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'income') {
      setCategory(incomeCategories[0] || 'Salário');
      setPaymentMethod('pix');
    } else {
      setCategory(expenseCategories[0] || 'Alimentação');
      setPaymentMethod('credit_card');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawVal = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(rawVal) || rawVal <= 0) return;

    setSubmitting(true);
    try {
      const selectedCard = paymentMethod === 'credit_card' && selectedCardId
        ? creditCards.find(c => c.id === selectedCardId)
        : null;

      const cardFields = selectedCard ? {
        cardId: selectedCard.id,
        cardName: selectedCard.cardName,
        cardLastFour: selectedCard.lastFourDigits
      } : {};

      if (nature === 'installment') {
        const totalAmount = installmentCalcMode === 'total' ? rawVal : rawVal * totalInstallments;
        const monthlyAmount = installmentCalcMode === 'monthly' ? rawVal : rawVal / totalInstallments;
        const defaultDesc = type === 'income'
          ? `Venda Parcelada (${currentInstallment}/${totalInstallments})`
          : `Compra Parcelada (${currentInstallment}/${totalInstallments})`;

        const payload = {
          type,
          nature: 'installment' as const,
          amount: Math.round(monthlyAmount * 100) / 100,
          category,
          date,
          description: description.trim() || defaultDesc,
          paymentMethod,
          isPaid,
          ...cardFields,
          installmentDetails: {
            totalAmount: Math.round(totalAmount * 100) / 100,
            totalInstallments: Number(totalInstallments),
            currentInstallment: Number(currentInstallment),
            monthlyAmount: Math.round(monthlyAmount * 100) / 100,
            groupId: transactionToEdit?.installmentDetails?.groupId || `grp_${Date.now()}`,
            purchaseDate: transactionToEdit?.installmentDetails?.purchaseDate || date
          }
        };

        if (transactionToEdit && onUpdate) {
          await onUpdate(transactionToEdit.id, payload);
        } else {
          await onSave(payload);
        }
      } else {
        const payload: Omit<Transaction, 'id' | 'userId'> = {
          type,
          nature,
          amount: rawVal,
          category,
          date,
          description: description.trim() || (type === 'income' ? 'Receita' : 'Despesa'),
          paymentMethod,
          isPaid: nature === 'fixed' ? isPaid : true,
          ...cardFields
        };

        if (transactionToEdit && onUpdate) {
          await onUpdate(transactionToEdit.id, payload);
        } else {
          await onSave(payload);
        }
      }

      onClose();
    } catch (err) {
      console.error('Error saving transaction:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div 
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-[#141414] border border-[#262626] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-300"
        >
          {/* Mobile pull grabber */}
          <div className="w-12 h-1.5 bg-[#2B2B2B] rounded-full mx-auto mb-4 sm:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
            <h2 className="text-base font-semibold text-white">
              {transactionToEdit ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-xl text-[#737373] hover:text-white hover:bg-[#262626] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Type Selector (Despesa vs Receita) */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#0D0D0D] rounded-xl border border-[#262626]">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  type === 'expense'
                    ? 'bg-[#E29578] text-black shadow-xs'
                    : 'text-[#A3A3A3] hover:text-white'
                }`}
              >
                Despesa (-)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  type === 'income'
                    ? 'bg-[#A3C9A8] text-black shadow-xs'
                    : 'text-[#A3A3A3] hover:text-white'
                }`}
              >
                Receita (+)
              </button>
            </div>

            {/* Natureza do Gasto / Receita */}
            <div>
              <label className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block mb-1.5">
                Estrutura do Lançamento
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setNature('daily')}
                  className={`py-2 px-2 text-xs font-medium rounded-xl border text-center transition cursor-pointer ${
                    nature === 'daily'
                      ? 'border-white bg-[#262626] text-white'
                      : 'border-[#262626] bg-[#171717] text-[#A3A3A3] hover:text-white'
                  }`}
                >
                  {type === 'expense' ? 'Gasto Diário' : 'Receita Pontual'}
                </button>

                <button
                  type="button"
                  onClick={() => setNature('fixed')}
                  className={`py-2 px-2 text-xs font-medium rounded-xl border text-center transition cursor-pointer ${
                    nature === 'fixed'
                      ? 'border-white bg-[#262626] text-white'
                      : 'border-[#262626] bg-[#171717] text-[#A3A3A3] hover:text-white'
                  }`}
                >
                  {type === 'expense' ? 'Fixo Recorrente' : 'Salário Fixo'}
                </button>

                <button
                  type="button"
                  onClick={() => setNature('installment')}
                  className={`py-2 px-2 text-xs font-medium rounded-xl border text-center transition cursor-pointer ${
                    nature === 'installment'
                      ? type === 'income'
                        ? 'border-[#A3C9A8] bg-[#A3C9A8]/15 text-[#A3C9A8]'
                        : 'border-[#E29578] bg-[#E29578]/15 text-[#E29578]'
                      : 'border-[#262626] bg-[#171717] text-[#A3A3A3] hover:text-white'
                  }`}
                >
                  {type === 'income' ? 'Venda Parcelada' : 'Parcelamento'}
                </button>
              </div>
            </div>

            {/* Campo Valor em Destaque */}
            <div>
              <label className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block mb-1">
                {nature === 'installment'
                  ? installmentCalcMode === 'total' 
                    ? (type === 'income' ? 'Valor Total da Venda (R$)' : 'Valor Total da Compra (R$)')
                    : (type === 'income' ? 'Valor da Parcela a Receber (R$)' : 'Valor da Parcela Mensal (R$)')
                  : 'Valor (R$)'}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#737373]">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-11 pr-4 py-3 bg-[#0D0D0D] border border-[#262626] rounded-xl text-lg font-semibold text-white focus:outline-hidden focus:border-white transition"
                />
              </div>
            </div>

            {/* Detalhes de Parcelamento (Se for compra ou venda parcelada) */}
            {nature === 'installment' && (
              <div className="p-3.5 bg-[#0D0D0D] border border-[#262626] rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#A8B5D1] font-medium flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Configuração de Parcelas
                  </span>
                  <div className="flex gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setInstallmentCalcMode('total')}
                      className={`px-2 py-0.5 rounded-sm cursor-pointer ${installmentCalcMode === 'total' ? 'bg-[#262626] text-white' : 'text-[#737373]'}`}
                    >
                      Valor Total
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstallmentCalcMode('monthly')}
                      className={`px-2 py-0.5 rounded-sm cursor-pointer ${installmentCalcMode === 'monthly' ? 'bg-[#262626] text-white' : 'text-[#737373]'}`}
                    >
                      Valor/Mês
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[#737373] block mb-1">Total de Parcelas</label>
                    <select
                      value={totalInstallments}
                      onChange={(e) => setTotalInstallments(Number(e.target.value))}
                      className="w-full bg-[#171717] border border-[#262626] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-hidden"
                    >
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 18, 24, 36, 48].map((num) => (
                        <option key={num} value={num}>{num}x parcelas</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#737373] block mb-1">Parcela Atual</label>
                    <input
                      type="number"
                      min="1"
                      max={totalInstallments}
                      value={currentInstallment}
                      onChange={(e) => setCurrentInstallment(Number(e.target.value))}
                      className="w-full bg-[#171717] border border-[#262626] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-hidden"
                    />
                  </div>
                </div>

                {amountStr && (
                  <div className="text-[11px] text-[#A3A3A3] pt-1 border-t border-[#1F1F1F] flex justify-between">
                    <span>{type === 'income' ? 'Receita mensal prevista:' : 'Impacto mensal futuro:'}</span>
                    <span className={`font-semibold ${type === 'income' ? 'text-[#A3C9A8]' : 'text-[#E29578]'}`}>
                      {installmentCalcMode === 'total'
                        ? `R$ ${(parseFloat(amountStr) / totalInstallments).toFixed(2)} / mês`
                        : `R$ ${parseFloat(amountStr).toFixed(2)} / mês (Total: R$ ${(parseFloat(amountStr) * totalInstallments).toFixed(2)})`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Toggle Pago / Recebido (Fixo ou Parcelado) */}
            {(nature === 'fixed' || nature === 'installment') && (
              <div className="flex items-center justify-between p-3 bg-[#0D0D0D] border border-[#262626] rounded-xl">
                <div>
                  <span className="text-xs font-medium text-white block">
                    {type === 'income' ? 'Já foi recebido este mês?' : 'Já foi pago este mês?'}
                  </span>
                  <span className="text-[10px] text-[#737373]">
                    Controle manual de {type === 'income' ? 'recebimento' : 'pagamento'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPaid(!isPaid)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isPaid
                      ? 'bg-[#A3C9A8]/20 text-[#A3C9A8] border border-[#A3C9A8]/40'
                      : 'bg-[#E29578]/20 text-[#E29578] border border-[#E29578]/40'
                  }`}
                >
                  {type === 'income'
                    ? (isPaid ? 'Recebido' : 'A Receber')
                    : (isPaid ? 'Pago' : 'Pendente')}
                </button>
              </div>
            )}

            {/* Descrição */}
            <div>
              <label className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block mb-1">
                Descrição
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Supermercado, Aluguel, Salário..."
                className="w-full px-3.5 py-2.5 bg-[#0D0D0D] border border-[#262626] rounded-xl text-xs text-white placeholder-[#525252] focus:outline-hidden focus:border-white transition"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block mb-1">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-3.5 py-2.5 bg-[#0D0D0D] border border-[#262626] rounded-xl text-xs text-white focus:outline-hidden focus:border-white transition"
              >
                {(type === 'expense' ? expenseCategories : incomeCategories).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Data & Forma de Pagamento */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block mb-1">
                  Data
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#262626] rounded-xl text-xs text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block mb-1">
                  Forma de Pagamento
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#262626] rounded-xl text-xs text-white focus:outline-hidden"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm.id} value={pm.id}>{pm.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Seleção Dinâmica de Cartão de Crédito se método for Cartão */}
            {paymentMethod === 'credit_card' && (
              <div className="p-3 bg-[#0D0D0D] border border-[#262626] rounded-xl space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-[#A8B5D1] uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCardIcon className="w-3.5 h-3.5 text-[#A8B5D1]" />
                    <span>Cartão de Crédito Utilizado</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCardModalOpen(true)}
                    className="text-[10px] text-[#A8B5D1] hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Novo Cartão
                  </button>
                </div>

                {creditCards.length > 0 ? (
                  <select
                    value={selectedCardId}
                    onChange={(e) => setSelectedCardId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#171717] border border-[#262626] rounded-lg text-xs text-white focus:outline-hidden"
                  >
                    <option value="">Selecione o cartão (opcional)...</option>
                    {creditCards.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.cardName} •••• {c.lastFourDigits} ({c.bankName})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center justify-between text-xs text-[#737373] py-1">
                    <span>Nenhum cartão cadastrado ainda</span>
                    <button
                      type="button"
                      onClick={() => setIsCardModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-[#262626] hover:bg-[#333333] text-[11px] text-white font-medium cursor-pointer"
                    >
                      + Cadastrar Agora
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || !amountStr}
                className="w-full py-3.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-wider transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-md cursor-pointer"
              >
                {submitting 
                  ? 'Salvando alterações...' 
                  : transactionToEdit 
                  ? 'Salvar Alterações' 
                  : 'Confirmar Lançamento'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal para adicionar cartão de crédito direto pelo lançamento */}
      <CreditCardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        onSave={async (card) => {
          await addCreditCard(card);
        }}
      />
    </>
  );
};
