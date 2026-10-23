import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Check, 
  Calendar, 
  CreditCard as CreditCardIcon, 
  Tag, 
  DollarSign, 
  Layers, 
  Plus, 
  Minus,
  ChevronDown,
  ChevronUp,
  ArrowDownRight, 
  ArrowUpRight, 
  Repeat, 
  Zap, 
  FileText, 
  Building2, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  ReceiptText
} from 'lucide-react';
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

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { id: 'credit_card', label: 'Cartão de Crédito', icon: CreditCardIcon, color: '#A8B5D1' },
  { id: 'pix', label: 'PIX Instantâneo', icon: Zap, color: '#A3C9A8' },
  { id: 'debit_card', label: 'Cartão de Débito', icon: CreditCardIcon, color: '#E29578' },
  { id: 'boleto', label: 'Boleto Bancário', icon: FileText, color: '#E9C46A' },
  { id: 'bank_transfer', label: 'Transferência Bancária', icon: Building2, color: '#38BDF8' },
  { id: 'cash', label: 'Dinheiro em Espécie', icon: DollarSign, color: '#4ADE80' }
];

// Função determinística para gerar cores suaves de categorias
const getCategoryColor = (cat: string) => {
  const palette = ['#A3C9A8', '#E29578', '#A8B5D1', '#F4A261', '#E76F51', '#2A9D8F', '#E9C46A', '#9B5DE5', '#60A5FA', '#34D399'];
  let hash = 0;
  for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
};

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

  // Controle unificado de Lista Suspensa (Custom Dropdowns)
  const [openDropdown, setOpenDropdown] = useState<'category' | 'paymentMethod' | 'card' | null>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Fecha dropdowns se clicar fora
  useEffect(() => {
    if (!openDropdown) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.custom-dropdown-container')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [openDropdown]);

  useEffect(() => {
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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (openDropdown) {
          setOpenDropdown(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, openDropdown]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setOpenDropdown(null);
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

  const selectedPaymentConfig = PAYMENT_METHODS.find(p => p.id === paymentMethod) || PAYMENT_METHODS[0];
  const PaymentIcon = selectedPaymentConfig.icon;

  const currentCategoryList = type === 'expense' ? expenseCategories : incomeCategories;

  const selectedCard = creditCards.find(c => c.id === selectedCardId);

  return (
    <>
      <div 
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200 p-0 sm:p-4"
      >
        <div 
          ref={modalContentRef}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg card-depth-3d rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-300 border border-white/12 border-t-white/25"
          style={{
            background: 'linear-gradient(180deg, #181818 0%, #0F0F0F 100%)',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.95), 0 0 40px rgba(255, 255, 255, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          }}
        >
          {/* Mobile pull grabber */}
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />

          {/* Header com estilo Liquid Glass */}
          <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center btn-liquid-glass"
                style={{
                  color: type === 'income' ? '#A3C9A8' : '#E29578'
                }}
              >
                <ReceiptText className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>{transactionToEdit ? 'Editar Lançamento' : 'Novo Lançamento'}</span>
                  {transactionToEdit && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-[#A8B5D1] border border-white/10">
                      Editando
                    </span>
                  )}
                </h2>
                <span className="text-[10px] text-[#737373] block">
                  Defina os valores, categoria e estrutura financeira
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar modal"
              className="btn-liquid-glass w-8 h-8 rounded-full text-white/70 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* 1. SELETOR DE TIPO (DESPESA VS RECEITA) - Estilo Segmented Glass com Neon Glow */}
            <div>
              <label className="text-[10px] font-semibold text-[#8C8C8C] uppercase tracking-wider block mb-1.5">
                Tipo da Operação
              </label>
              <div className="toggle-segmented-glass p-1 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleTypeChange('expense')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    type === 'expense'
                      ? 'border border-[#E29578]/50 text-white shadow-lg'
                      : 'text-[#8C8C8C] hover:text-white hover:bg-white/5'
                  }`}
                  style={type === 'expense' ? {
                    background: 'linear-gradient(135deg, rgba(226, 149, 120, 0.28) 0%, rgba(226, 149, 120, 0.1) 100%)',
                    boxShadow: '0 0 16px rgba(226, 149, 120, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                  } : {}}
                >
                  <ArrowDownRight className="w-4 h-4 text-[#E29578] stroke-[2.5]" />
                  <span>Despesa (-)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTypeChange('income')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    type === 'income'
                      ? 'border border-[#A3C9A8]/50 text-white shadow-lg'
                      : 'text-[#8C8C8C] hover:text-white hover:bg-white/5'
                  }`}
                  style={type === 'income' ? {
                    background: 'linear-gradient(135deg, rgba(163, 201, 168, 0.28) 0%, rgba(163, 201, 168, 0.1) 100%)',
                    boxShadow: '0 0 16px rgba(163, 201, 168, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                  } : {}}
                >
                  <ArrowUpRight className="w-4 h-4 text-[#A3C9A8] stroke-[2.5]" />
                  <span>Receita (+)</span>
                </button>
              </div>
            </div>

            {/* 2. SELETOR DE NATUREZA / ESTRUTURA DO LANÇAMENTO */}
            <div>
              <label className="text-[10px] font-semibold text-[#8C8C8C] uppercase tracking-wider block mb-1.5">
                Estrutura do Lançamento
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setNature('daily')}
                  className={`py-2 px-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
                    nature === 'daily'
                      ? 'btn-liquid-glass border-white/40 text-white shadow-md'
                      : 'border-white/5 bg-[#121212] text-[#8C8C8C] hover:text-white hover:bg-white/5'
                  }`}
                  style={nature === 'daily' ? {
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.05) 100%)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.35)'
                  } : {}}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="truncate">{type === 'expense' ? 'Gasto Diário' : 'Pontual'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNature('fixed')}
                  className={`py-2 px-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
                    nature === 'fixed'
                      ? 'btn-liquid-glass border-white/40 text-white shadow-md'
                      : 'border-white/5 bg-[#121212] text-[#8C8C8C] hover:text-white hover:bg-white/5'
                  }`}
                  style={nature === 'fixed' ? {
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.05) 100%)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.35)'
                  } : {}}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span className="truncate">{type === 'expense' ? 'Fixo Recorrente' : 'Fixo Mensal'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNature('installment')}
                  className={`py-2 px-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
                    nature === 'installment'
                      ? 'btn-liquid-glass text-white shadow-md'
                      : 'border-white/5 bg-[#121212] text-[#8C8C8C] hover:text-white hover:bg-white/5'
                  }`}
                  style={nature === 'installment' ? {
                    borderColor: type === 'income' ? 'rgba(163, 201, 168, 0.6)' : 'rgba(226, 149, 120, 0.6)',
                    background: type === 'income' 
                      ? 'linear-gradient(135deg, rgba(163, 201, 168, 0.22) 0%, rgba(163, 201, 168, 0.08) 100%)'
                      : 'linear-gradient(135deg, rgba(226, 149, 120, 0.22) 0%, rgba(226, 149, 120, 0.08) 100%)',
                    boxShadow: type === 'income'
                      ? '0 0 16px rgba(163, 201, 168, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.35)'
                      : '0 0 16px rgba(226, 149, 120, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.35)'
                  } : {}}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="truncate">{type === 'income' ? 'Venda Parcelada' : 'Parcelado'}</span>
                </button>
              </div>
            </div>

            {/* 3. CAMPO DE VALOR EM DESTAQUE 3D COM LIQUID GLASS */}
            <div className="card-depth-3d p-4 rounded-2xl border border-white/10 focus-within:border-white/40 focus-within:ring-2 focus-within:ring-white/10 transition-all bg-[#121212]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-semibold text-[#8C8C8C] uppercase tracking-wider">
                  {nature === 'installment'
                    ? installmentCalcMode === 'total' 
                      ? (type === 'income' ? 'Valor Total da Venda' : 'Valor Total da Compra')
                      : (type === 'income' ? 'Valor da Parcela a Receber' : 'Valor da Parcela Mensal')
                    : 'Valor do Lançamento'}
                </label>
                {amountStr && (
                  <button
                    type="button"
                    onClick={() => setAmountStr('')}
                    className="text-[10px] text-[#737373] hover:text-white flex items-center gap-0.5 cursor-pointer transition"
                  >
                    <X className="w-3 h-3" /> Limpar
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div 
                  className="px-2.5 py-1 rounded-xl border flex items-center justify-center font-bold text-xs select-none shadow-xs"
                  style={{
                    backgroundColor: type === 'income' ? 'rgba(163, 201, 168, 0.15)' : 'rgba(226, 149, 120, 0.15)',
                    borderColor: type === 'income' ? 'rgba(163, 201, 168, 0.4)' : 'rgba(226, 149, 120, 0.4)',
                    color: type === 'income' ? '#A3C9A8' : '#E29578'
                  }}
                >
                  R$
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-transparent text-2xl sm:text-3xl font-bold font-mono text-white placeholder-white/20 focus:outline-hidden custom-number-input"
                />
              </div>
            </div>

            {/* 4. MÓDULO DE PARCELAMENTO COM SETAS DE AUMENTAR/DIMINUIR PERSONALIZADAS */}
            {nature === 'installment' && (
              <div className="card-depth-3d p-4 rounded-2xl border border-white/10 space-y-3.5 bg-[#121212]/90">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#A8B5D1] font-semibold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Configuração de Parcelas
                  </span>
                  {/* Alternador de Modo de Cálculo */}
                  <div className="toggle-segmented-glass p-0.5 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setInstallmentCalcMode('total')}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition cursor-pointer ${
                        installmentCalcMode === 'total' 
                          ? 'toggle-segment-active text-white' 
                          : 'text-[#8C8C8C] hover:text-white'
                      }`}
                    >
                      Valor Total
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstallmentCalcMode('monthly')}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition cursor-pointer ${
                        installmentCalcMode === 'monthly' 
                          ? 'toggle-segment-active text-white' 
                          : 'text-[#8C8C8C] hover:text-white'
                      }`}
                    >
                      Valor / Mês
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Total de Parcelas com Setas de Aumentar / Diminuir Estilizadas */}
                  <div className="p-3 rounded-xl bg-[#171717] border border-white/8 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-medium text-[#8C8C8C] uppercase tracking-wider">
                        Total de Parcelas
                      </label>
                      <span className="text-[10px] font-mono font-bold text-white bg-white/10 px-1.5 py-0.5 rounded-md">
                        {totalInstallments}x
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Botão de Diminuir (-) */}
                      <button
                        type="button"
                        onClick={() => {
                          setTotalInstallments(prev => {
                            const next = Math.max(2, prev - 1);
                            if (currentInstallment > next) setCurrentInstallment(next);
                            return next;
                          });
                        }}
                        disabled={totalInstallments <= 2}
                        title="Diminuir total de parcelas"
                        className="btn-liquid-glass w-8 h-8 rounded-lg flex items-center justify-center text-white hover:text-white disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer shrink-0"
                      >
                        <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>

                      {/* Input Central com Setas Verticais Estilizadas (Chevron Up / Down) */}
                      <div className="relative flex-1 flex items-center">
                        <input
                          type="number"
                          min={2}
                          max={72}
                          value={totalInstallments}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                              const clamped = Math.max(2, Math.min(72, val));
                              setTotalInstallments(clamped);
                              if (currentInstallment > clamped) setCurrentInstallment(clamped);
                            }
                          }}
                          className="w-full bg-[#121212] border border-white/10 hover:border-white/20 focus:border-white/40 rounded-lg pl-2 pr-7 py-1.5 text-center text-xs font-mono font-bold text-white focus:outline-hidden custom-number-input transition"
                        />
                        {/* Setas Estilizadas Integradas ao Input */}
                        <div className="absolute right-1 flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => setTotalInstallments(prev => Math.min(72, prev + 1))}
                            disabled={totalInstallments >= 72}
                            title="Aumentar"
                            className="w-5 h-3 rounded-t-sm btn-liquid-glass flex items-center justify-center text-white/80 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
                            style={{ padding: 0 }}
                          >
                            <ChevronUp className="w-2.5 h-2.5 stroke-[3]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTotalInstallments(prev => {
                                const next = Math.max(2, prev - 1);
                                if (currentInstallment > next) setCurrentInstallment(next);
                                return next;
                              });
                            }}
                            disabled={totalInstallments <= 2}
                            title="Diminuir"
                            className="w-5 h-3 rounded-b-sm btn-liquid-glass flex items-center justify-center text-white/80 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
                            style={{ padding: 0 }}
                          >
                            <ChevronDown className="w-2.5 h-2.5 stroke-[3]" />
                          </button>
                        </div>
                      </div>

                      {/* Botão de Aumentar (+) */}
                      <button
                        type="button"
                        onClick={() => setTotalInstallments(prev => Math.min(72, prev + 1))}
                        disabled={totalInstallments >= 72}
                        title="Aumentar total de parcelas"
                        className="btn-liquid-glass w-8 h-8 rounded-lg flex items-center justify-center text-white hover:text-white disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>

                    {/* Chips de Atalho Rápido */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1">
                      {[2, 3, 6, 10, 12, 18, 24].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setTotalInstallments(num);
                            if (currentInstallment > num) setCurrentInstallment(num);
                          }}
                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono transition cursor-pointer shrink-0 ${
                            totalInstallments === num
                              ? 'bg-white text-black font-bold shadow-xs'
                              : 'bg-white/5 text-[#8C8C8C] hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {num}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Parcela Atual com Setas de Aumentar / Diminuir Estilizadas */}
                  <div className="p-3 rounded-xl bg-[#171717] border border-white/8 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-medium text-[#8C8C8C] uppercase tracking-wider">
                        Parcela Atual
                      </label>
                      <span className="text-[10px] font-mono font-bold text-white bg-white/10 px-1.5 py-0.5 rounded-md">
                        {currentInstallment}ª de {totalInstallments}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Botão de Diminuir (-) */}
                      <button
                        type="button"
                        onClick={() => setCurrentInstallment(prev => Math.max(1, prev - 1))}
                        disabled={currentInstallment <= 1}
                        title="Retroceder parcela"
                        className="btn-liquid-glass w-8 h-8 rounded-lg flex items-center justify-center text-white hover:text-white disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer shrink-0"
                      >
                        <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>

                      {/* Input Central com Setas Verticais Estilizadas */}
                      <div className="relative flex-1 flex items-center">
                        <input
                          type="number"
                          min={1}
                          max={totalInstallments}
                          value={currentInstallment}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) setCurrentInstallment(Math.max(1, Math.min(totalInstallments, val)));
                          }}
                          className="w-full bg-[#121212] border border-white/10 hover:border-white/20 focus:border-white/40 rounded-lg pl-2 pr-7 py-1.5 text-center text-xs font-mono font-bold text-white focus:outline-hidden custom-number-input transition"
                        />
                        {/* Setas Estilizadas Integradas ao Input */}
                        <div className="absolute right-1 flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => setCurrentInstallment(prev => Math.min(totalInstallments, prev + 1))}
                            disabled={currentInstallment >= totalInstallments}
                            title="Avançar parcela"
                            className="w-5 h-3 rounded-t-sm btn-liquid-glass flex items-center justify-center text-white/80 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
                            style={{ padding: 0 }}
                          >
                            <ChevronUp className="w-2.5 h-2.5 stroke-[3]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCurrentInstallment(prev => Math.max(1, prev - 1))}
                            disabled={currentInstallment <= 1}
                            title="Retroceder parcela"
                            className="w-5 h-3 rounded-b-sm btn-liquid-glass flex items-center justify-center text-white/80 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
                            style={{ padding: 0 }}
                          >
                            <ChevronDown className="w-2.5 h-2.5 stroke-[3]" />
                          </button>
                        </div>
                      </div>

                      {/* Botão de Aumentar (+) */}
                      <button
                        type="button"
                        onClick={() => setCurrentInstallment(prev => Math.min(totalInstallments, prev + 1))}
                        disabled={currentInstallment >= totalInstallments}
                        title="Avançar parcela"
                        className="btn-liquid-glass w-8 h-8 rounded-lg flex items-center justify-center text-white hover:text-white disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>

                    <div className="text-[10px] text-[#737373] text-center pt-0.5">
                      Progresso: {Math.round((currentInstallment / totalInstallments) * 100)}% concluído
                    </div>
                  </div>
                </div>

                {/* Resumo do Cálculo da Parcela */}
                {amountStr && !isNaN(parseFloat(amountStr)) && (
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/8 flex items-center justify-between text-xs">
                    <span className="text-[#A3A3A3]">
                      {type === 'income' ? 'Receita mensal estimada:' : 'Impacto mensal previsto:'}
                    </span>
                    <span className={`font-mono font-bold ${type === 'income' ? 'text-[#A3C9A8]' : 'text-[#E29578]'}`}>
                      {installmentCalcMode === 'total'
                        ? `R$ ${(parseFloat(amountStr) / totalInstallments).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mês`
                        : `R$ ${parseFloat(amountStr).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mês (Total: R$ ${(parseFloat(amountStr) * totalInstallments).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 5. TOGGLE DE STATUS PAGO / RECEBIDO (Para Fixo ou Parcelado) */}
            {(nature === 'fixed' || nature === 'installment') && (
              <div className="card-depth-3d p-3.5 rounded-2xl border border-white/10 flex items-center justify-between bg-[#121212]">
                <div>
                  <span className="text-xs font-semibold text-white block">
                    {type === 'income' ? 'Já foi recebido este mês?' : 'Já foi pago este mês?'}
                  </span>
                  <span className="text-[10px] text-[#8C8C8C]">
                    Controle manual de {type === 'income' ? 'recebimento' : 'pagamento'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPaid(!isPaid)}
                  className={`btn-liquid-glass px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isPaid
                      ? 'border-[#A3C9A8]/50 text-[#A3C9A8] shadow-sm'
                      : 'border-[#E29578]/50 text-[#E29578] shadow-sm'
                  }`}
                  style={{
                    background: isPaid 
                      ? 'linear-gradient(135deg, rgba(163, 201, 168, 0.22) 0%, rgba(163, 201, 168, 0.08) 100%)'
                      : 'linear-gradient(135deg, rgba(226, 149, 120, 0.22) 0%, rgba(226, 149, 120, 0.08) 100%)',
                    boxShadow: isPaid
                      ? '0 0 14px rgba(163, 201, 168, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                      : '0 0 14px rgba(226, 149, 120, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                  }}
                >
                  {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  <span>
                    {type === 'income'
                      ? (isPaid ? 'Recebido' : 'A Receber')
                      : (isPaid ? 'Pago' : 'Pendente')}
                  </span>
                </button>
              </div>
            )}

            {/* 6. DESCRIÇÃO COM LIQUID GLASS */}
            <div>
              <label className="text-[10px] font-semibold text-[#8C8C8C] uppercase tracking-wider block mb-1">
                Descrição
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Supermercado, Aluguel, Salário, Internet..."
                  className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/10 hover:border-white/20 focus:border-white/40 rounded-xl text-xs text-white placeholder-[#525252] focus:outline-hidden transition shadow-xs"
                />
              </div>
            </div>

            {/* 7. CATEGORIA - LISTA SUSPENSA CUSTOMIZADA (CUSTOM DROPDOWN) */}
            <div className="custom-dropdown-container relative">
              <label className="text-[10px] font-semibold text-[#8C8C8C] uppercase tracking-wider block mb-1">
                Categoria
              </label>
              <button
                type="button"
                onClick={() => setOpenDropdown(prev => prev === 'category' ? null : 'category')}
                className="btn-liquid-glass w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between border-white/10 hover:border-white/20 text-xs text-white transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" 
                    style={{ backgroundColor: getCategoryColor(category) }}
                  />
                  <span className="font-semibold truncate">{category}</span>
                </div>
                <ChevronDown 
                  className={`w-4 h-4 text-white/60 transition-transform duration-200 ${
                    openDropdown === 'category' ? 'rotate-180 text-white' : ''
                  }`} 
                />
              </button>

              {/* Menu da Lista Suspensa de Categorias */}
              {openDropdown === 'category' && (
                <div className="absolute z-50 left-0 right-0 mt-1.5 p-1.5 rounded-2xl bg-[#141414]/98 border border-white/15 backdrop-blur-2xl shadow-2xl max-h-56 overflow-y-auto no-scrollbar space-y-0.5 animate-in fade-in duration-150">
                  {currentCategoryList.map((cat) => {
                    const isSelected = cat === category;
                    const catColor = getCategoryColor(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setCategory(cat);
                          setOpenDropdown(null);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-white/15 text-white font-semibold shadow-xs'
                            : 'text-[#A3A3A3] hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" 
                            style={{ backgroundColor: catColor }}
                          />
                          <span className="truncate">{cat}</span>
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-white shrink-0 stroke-[2.5]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 8. DATA & FORMA DE PAGAMENTO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Campo Data */}
              <div>
                <label className="text-[10px] font-semibold text-[#8C8C8C] uppercase tracking-wider block mb-1">
                  Data
                </label>
                <div className="relative flex items-center">
                  <Calendar className="w-3.5 h-3.5 text-white/60 absolute left-3 pointer-events-none" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#121212] border border-white/10 hover:border-white/20 focus:border-white/40 rounded-xl text-xs font-medium text-white focus:outline-hidden transition shadow-xs"
                  />
                </div>
              </div>

              {/* Forma de Pagamento - LISTA SUSPENSA CUSTOMIZADA */}
              <div className="custom-dropdown-container relative">
                <label className="text-[10px] font-semibold text-[#8C8C8C] uppercase tracking-wider block mb-1">
                  Forma de Pagamento
                </label>
                <button
                  type="button"
                  onClick={() => setOpenDropdown(prev => prev === 'paymentMethod' ? null : 'paymentMethod')}
                  className="btn-liquid-glass w-full px-3 py-2 rounded-xl flex items-center justify-between border-white/10 hover:border-white/20 text-xs text-white transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <PaymentIcon className="w-3.5 h-3.5 shrink-0" style={{ color: selectedPaymentConfig.color }} />
                    <span className="font-semibold truncate">{selectedPaymentConfig.label}</span>
                  </div>
                  <ChevronDown 
                    className={`w-4 h-4 text-white/60 transition-transform duration-200 ${
                      openDropdown === 'paymentMethod' ? 'rotate-180 text-white' : ''
                    }`} 
                  />
                </button>

                {/* Menu da Lista Suspensa de Formas de Pagamento */}
                {openDropdown === 'paymentMethod' && (
                  <div className="absolute z-50 left-0 right-0 mt-1.5 p-1.5 rounded-2xl bg-[#141414]/98 border border-white/15 backdrop-blur-2xl shadow-2xl max-h-56 overflow-y-auto no-scrollbar space-y-0.5 animate-in fade-in duration-150">
                    {PAYMENT_METHODS.map((pm) => {
                      const isSelected = pm.id === paymentMethod;
                      const Icon = pm.icon;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => {
                            setPaymentMethod(pm.id);
                            setOpenDropdown(null);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                            isSelected
                              ? 'bg-white/15 text-white font-semibold shadow-xs'
                              : 'text-[#A3A3A3] hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: pm.color }} />
                            <span className="truncate">{pm.label}</span>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-white shrink-0 stroke-[2.5]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 9. SELETOR DE CARTÃO DE CRÉDITO - LISTA SUSPENSA CUSTOMIZADA */}
            {paymentMethod === 'credit_card' && (
              <div className="card-depth-3d p-3.5 rounded-2xl border border-white/10 space-y-2 bg-[#121212]/90 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-[#A8B5D1] uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCardIcon className="w-3.5 h-3.5 text-[#A8B5D1]" />
                    <span>Cartão de Crédito Utilizado</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCardModalOpen(true)}
                    className="text-[10px] font-semibold text-[#A8B5D1] hover:text-white flex items-center gap-1 cursor-pointer transition"
                  >
                    <Plus className="w-3 h-3" /> Novo Cartão
                  </button>
                </div>

                {creditCards.length > 0 ? (
                  <div className="custom-dropdown-container relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(prev => prev === 'card' ? null : 'card')}
                      className="btn-liquid-glass w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between border-white/10 hover:border-white/20 text-xs text-white transition-all cursor-pointer"
                    >
                      {selectedCard ? (
                        <div className="flex items-center gap-2.5 truncate">
                          <div 
                            className="w-4 h-3 rounded-xs shrink-0 border border-white/20 shadow-xs" 
                            style={{ background: selectedCard.color || '#3B82F6' }} 
                          />
                          <span className="font-semibold text-white truncate">{selectedCard.cardName}</span>
                          <span className="font-mono text-[11px] text-[#8C8C8C] truncate">•••• {selectedCard.lastFourDigits}</span>
                        </div>
                      ) : (
                        <span className="text-[#737373] text-xs">Selecione o cartão de crédito (opcional)...</span>
                      )}
                      <ChevronDown 
                        className={`w-4 h-4 text-white/60 transition-transform duration-200 ${
                          openDropdown === 'card' ? 'rotate-180 text-white' : ''
                        }`} 
                      />
                    </button>

                    {/* Menu da Lista Suspensa de Cartões */}
                    {openDropdown === 'card' && (
                      <div className="absolute z-50 left-0 right-0 mt-1.5 p-1.5 rounded-2xl bg-[#141414]/98 border border-white/15 backdrop-blur-2xl shadow-2xl max-h-56 overflow-y-auto no-scrollbar space-y-0.5 animate-in fade-in duration-150">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCardId('');
                            setOpenDropdown(null);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                            selectedCardId === ''
                              ? 'bg-white/15 text-white font-semibold'
                              : 'text-[#A3A3A3] hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span className="text-[#8C8C8C]">Nenhum cartão específico</span>
                          {selectedCardId === '' && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                        </button>

                        {creditCards.map(card => {
                          const isSelected = card.id === selectedCardId;
                          return (
                            <button
                              key={card.id}
                              type="button"
                              onClick={() => {
                                setSelectedCardId(card.id);
                                setOpenDropdown(null);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                                isSelected
                                  ? 'bg-white/15 text-white font-semibold shadow-xs'
                                  : 'text-[#A3A3A3] hover:text-white hover:bg-white/5'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <div 
                                  className="w-4 h-3 rounded-xs shrink-0 border border-white/20 shadow-xs" 
                                  style={{ background: card.color || '#3B82F6' }} 
                                />
                                <div className="text-left truncate">
                                  <div className="font-semibold text-white truncate">{card.cardName}</div>
                                  <div className="text-[10px] text-[#737373] font-mono">
                                    •••• {card.lastFourDigits} {card.bankName ? `(${card.bankName})` : ''}
                                  </div>
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-white shrink-0 stroke-[2.5]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-[#737373] py-1">
                    <span>Nenhum cartão cadastrado ainda</span>
                    <button
                      type="button"
                      onClick={() => setIsCardModalOpen(true)}
                      className="btn-liquid-glass px-3 py-1 rounded-xl text-[11px] text-white font-semibold cursor-pointer"
                    >
                      + Cadastrar Agora
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 10. BOTÃO DE CONFIRMAÇÃO (SUBMIT) - Apple Liquid Glass Primary */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || !amountStr}
                className="btn-liquid-glass-primary w-full py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-xl cursor-pointer"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Salvando alterações...</span>
                  </span>
                ) : transactionToEdit ? (
                  'Salvar Alterações'
                ) : (
                  'Confirmar Lançamento'
                )}
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
