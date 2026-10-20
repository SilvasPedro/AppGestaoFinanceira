import React, { useState, useMemo } from 'react';
import { 
  Repeat, 
  Layers, 
  FastForward, 
  Pencil, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Plus, 
  CreditCard as CreditCardIcon, 
  ArrowUpRight, 
  ArrowDownRight, 
  History, 
  Check, 
  RotateCcw,
  Sparkles,
  CalendarOff
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Transaction, InstallmentGroupSummary } from '../../types/finance';
import { AdvanceInstallmentModal } from '../modals/AdvanceInstallmentModal';
import { EditInstallmentModal } from '../modals/EditInstallmentModal';
import { EditRecurringModal } from '../modals/EditRecurringModal';
import { DeleteConfirmModal } from '../modals/DeleteConfirmModal';
import { TransactionModal } from '../modals/TransactionModal';

export const RecurringTab: React.FC = () => {
  const { 
    transactions,
    recurringItems, 
    installmentGroups, 
    currentMonth,
    deleteTransaction,
    updateTransaction,
    discontinueRecurringTransaction,
    deleteInstallmentGroup,
    advanceInstallments,
    updateInstallmentGroup,
    togglePaidStatus,
    addTransaction
  } = useFinance();

  const [activeSubTab, setActiveSubTab] = useState<'recurring' | 'installments' | 'history'>('recurring');
  const [fixedFilter, setFixedFilter] = useState<'all' | 'expense' | 'income'>('all');

  // Modals state
  const [advanceGroup, setAdvanceGroup] = useState<InstallmentGroupSummary | null>(null);
  const [editGroup, setEditGroup] = useState<InstallmentGroupSummary | null>(null);
  const [editRecurring, setEditRecurring] = useState<Transaction | null>(null);
  const [deleteRecurringTarget, setDeleteRecurringTarget] = useState<Transaction | null>(null);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<InstallmentGroupSummary | null>(null);

  // New Transaction Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [initialNature, setInitialNature] = useState<'fixed' | 'installment'>('fixed');
  const [initialType, setInitialType] = useState<'expense' | 'income'>('expense');

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatMonthDisplay = (ym: string) => {
    if (!ym) return '';
    const [year, month] = ym.split('-').map(Number);
    if (!year || !month) return ym;
    const date = new Date(year, month - 1, 1);
    const str = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    return str.replace('.', '');
  };

  // Separação dos Gastos Fixos Ativos vs Descontinuados
  const { activeRecurring, discontinuedRecurring } = useMemo(() => {
    const active: Transaction[] = [];
    const discontinued: Transaction[] = [];

    recurringItems.forEach(item => {
      const isDiscontinued = item.endDate && item.endDate <= currentMonth;
      if (isDiscontinued) {
        discontinued.push(item);
      } else {
        active.push(item);
      }
    });

    return { activeRecurring: active, discontinuedRecurring: discontinued };
  }, [recurringItems, currentMonth]);

  // Parcelamentos Ativos vs Finalizados
  const { activeInstallments, finishedInstallments } = useMemo(() => {
    const active: InstallmentGroupSummary[] = [];
    const finished: InstallmentGroupSummary[] = [];

    installmentGroups.forEach(group => {
      if (group.isFinished || group.remainingCount === 0) {
        finished.push(group);
      } else {
        active.push(group);
      }
    });

    return { activeInstallments: active, finishedInstallments: finished };
  }, [installmentGroups]);

  // Totais de gastos fixos ativos
  const fixedTotals = useMemo(() => {
    let expenseTotal = 0;
    let incomeTotal = 0;

    activeRecurring.forEach(item => {
      if (item.type === 'expense') {
        expenseTotal += item.amount;
      } else {
        incomeTotal += item.amount;
      }
    });

    return {
      expenseTotal,
      incomeTotal,
      netTotal: incomeTotal - expenseTotal
    };
  }, [activeRecurring]);

  // Totais de parcelamentos ativos
  const installmentTotals = useMemo(() => {
    let totalDebt = 0;
    let monthlyCommitment = 0;

    activeInstallments.forEach(group => {
      totalDebt += group.remainingBalance;
      monthlyCommitment += group.monthlyAmount;
    });

    return {
      totalDebt,
      monthlyCommitment,
      count: activeInstallments.length
    };
  }, [activeInstallments]);

  // Itens filtrados da aba de recorrências
  const filteredRecurring = useMemo(() => {
    if (fixedFilter === 'all') return activeRecurring;
    return activeRecurring.filter(t => t.type === fixedFilter);
  }, [activeRecurring, fixedFilter]);

  const handleOpenAddFixed = (type: 'expense' | 'income') => {
    setInitialNature('fixed');
    setInitialType(type);
    setIsAddModalOpen(true);
  };

  const handleOpenAddInstallment = () => {
    setInitialNature('installment');
    setInitialType('expense');
    setIsAddModalOpen(true);
  };

  const handleReactivateRecurring = async (item: Transaction) => {
    await updateTransaction(item.id, { endDate: null });
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12 animate-in fade-in duration-200">
      {/* Header com Apresentação e Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              Recorrências & Parcelas
            </h1>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#1C1C1C] border border-[#2E2E2E] text-[#A3A3A3]">
              {activeRecurring.length + activeInstallments.length} ativos
            </span>
          </div>
          <p className="text-xs text-[#737373] mt-0.5">
            Controle centralizado de pagamentos fixos, assinaturas e compras parceladas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAddFixed('expense')}
            className="flex-1 sm:flex-none py-2 px-3 rounded-xl bg-[#171717] hover:bg-[#222222] border border-[#262626] text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Repeat className="w-3.5 h-3.5 text-[#E5A97D]" />
            <span>+ Gasto Fixo</span>
          </button>
          <button
            onClick={handleOpenAddInstallment}
            className="flex-1 sm:flex-none py-2 px-3 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>+ Parcelamento</span>
          </button>
        </div>
      </div>

      {/* Tabs Principais */}
      <div className="flex items-center gap-1.5 p-1 bg-[#141414] border border-[#262626] rounded-2xl overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab('recurring')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 ${
            activeSubTab === 'recurring'
              ? 'bg-[#262626] text-white shadow-xs'
              : 'text-[#737373] hover:text-white'
          }`}
        >
          <Repeat className={`w-3.5 h-3.5 ${activeSubTab === 'recurring' ? 'text-[#E5A97D]' : ''}`} />
          <span>Gastos Fixos</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#171717] border border-[#333333] text-[#A3A3A3]">
            {activeRecurring.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('installments')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 ${
            activeSubTab === 'installments'
              ? 'bg-[#262626] text-white shadow-xs'
              : 'text-[#737373] hover:text-white'
          }`}
        >
          <Layers className={`w-3.5 h-3.5 ${activeSubTab === 'installments' ? 'text-[#A8B5D1]' : ''}`} />
          <span>Parcelamentos</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#171717] border border-[#333333] text-[#A3A3A3]">
            {activeInstallments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 ${
            activeSubTab === 'history'
              ? 'bg-[#262626] text-white shadow-xs'
              : 'text-[#737373] hover:text-white'
          }`}
        >
          <History className={`w-3.5 h-3.5 ${activeSubTab === 'history' ? 'text-[#A3C9A8]' : ''}`} />
          <span>Finalizados</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#171717] border border-[#333333] text-[#A3A3A3]">
            {finishedInstallments.length + discontinuedRecurring.length}
          </span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* ABA 1: GASTOS FIXOS & RECORRÊNCIAS                                  */}
      {/* ==================================================================== */}
      {activeSubTab === 'recurring' && (
        <div className="space-y-4">
          {/* Métricas dos Gastos Fixos */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-4 bg-[#141414] border border-[#262626] rounded-2xl space-y-1">
              <span className="text-[10px] text-[#737373] uppercase tracking-wider font-semibold block">
                Despesas Fixas / Mês
              </span>
              <p className="text-lg md:text-xl font-bold text-[#E29578]">
                {formatBRL(fixedTotals.expenseTotal)}
              </p>
            </div>

            <div className="p-4 bg-[#141414] border border-[#262626] rounded-2xl space-y-1">
              <span className="text-[10px] text-[#737373] uppercase tracking-wider font-semibold block">
                Receitas Fixas / Mês
              </span>
              <p className="text-lg md:text-xl font-bold text-[#A3C9A8]">
                {formatBRL(fixedTotals.incomeTotal)}
              </p>
            </div>

            <div className="col-span-2 md:col-span-1 p-4 bg-[#141414] border border-[#262626] rounded-2xl space-y-1">
              <span className="text-[10px] text-[#737373] uppercase tracking-wider font-semibold block">
                Saldo Fixo Líquido
              </span>
              <p className={`text-lg md:text-xl font-bold ${fixedTotals.netTotal >= 0 ? 'text-white' : 'text-[#E29578]'}`}>
                {formatBRL(fixedTotals.netTotal)}
              </p>
            </div>
          </div>

          {/* Filtros rápidos de Tipo */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFixedFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                  fixedFilter === 'all'
                    ? 'bg-white text-black font-semibold'
                    : 'bg-[#141414] border border-[#262626] text-[#A3A3A3] hover:text-white'
                }`}
              >
                Todos ({activeRecurring.length})
              </button>
              <button
                onClick={() => setFixedFilter('expense')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                  fixedFilter === 'expense'
                    ? 'bg-[#E29578] text-black font-semibold'
                    : 'bg-[#141414] border border-[#262626] text-[#A3A3A3] hover:text-white'
                }`}
              >
                Despesas Fixas
              </button>
              <button
                onClick={() => setFixedFilter('income')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                  fixedFilter === 'income'
                    ? 'bg-[#A3C9A8] text-black font-semibold'
                    : 'bg-[#141414] border border-[#262626] text-[#A3A3A3] hover:text-white'
                }`}
              >
                Receitas Fixas
              </button>
            </div>
          </div>

          {/* Lista de Recorrências */}
          {filteredRecurring.length === 0 ? (
            <div className="p-8 md:p-12 text-center bg-[#141414] border border-[#262626] rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#262626] text-[#737373] mx-auto flex items-center justify-center">
                <Repeat className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-semibold text-white">Nenhum compromisso fixo cadastrado</h3>
              <p className="text-xs text-[#737373] max-w-sm mx-auto">
                Cadastre seus custos recorrentes como aluguel, luz, internet, assinaturas ou seu salário mensal para projeções automáticas.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  onClick={() => handleOpenAddFixed('expense')}
                  className="px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition cursor-pointer"
                >
                  + Cadastrar Despesa Fixa
                </button>
                <button
                  onClick={() => handleOpenAddFixed('income')}
                  className="px-4 py-2.5 rounded-xl bg-[#262626] text-white font-semibold text-xs hover:bg-[#333333] border border-[#383838] transition cursor-pointer"
                >
                  + Cadastrar Receita Fixa
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredRecurring.map(item => {
                const isPaidInMonth = (item.paidMonths && item.paidMonths.includes(currentMonth)) || 
                  (item.isPaid && item.date.startsWith(currentMonth));
                const isIncome = item.type === 'income';
                const dueDay = item.date.split('-')[2] || '01';
                const startMonthFormatted = formatMonthDisplay(item.startDate || item.date.slice(0, 7));

                return (
                  <div 
                    key={item.id}
                    className="p-4 bg-[#141414] border border-[#262626] hover:border-[#383838] rounded-2xl space-y-3 transition group"
                  >
                    {/* Top Row: Description + Amount */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isIncome 
                            ? 'bg-[#A3C9A8]/15 text-[#A3C9A8]' 
                            : 'bg-[#E29578]/15 text-[#E29578]'
                        }`}>
                          {isIncome ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-white truncate">
                            {item.description}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[11px] text-[#737373] mt-0.5">
                            <span className="text-[#A3A3A3]">{item.category}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#A8B5D1]" />
                              Todo dia {dueDay}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-sm md:text-base font-bold ${
                          isIncome ? 'text-[#A3C9A8]' : 'text-[#E29578]'
                        }`}>
                          {isIncome ? '+' : '-'}{formatBRL(item.amount)}
                        </span>
                        <span className="text-[10px] text-[#737373] block">/mês</span>
                      </div>
                    </div>

                    {/* Middle Row: Badges & Vigência */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                      {item.paymentMethod === 'credit_card' && item.cardName ? (
                        <span className="px-2 py-0.5 rounded-lg bg-[#1F1F1F] text-[#A8B5D1] border border-[#2B2B2B] flex items-center gap-1">
                          <CreditCardIcon className="w-3 h-3" />
                          {item.cardName} •••• {item.cardLastFour}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-[#1F1F1F] text-[#737373] border border-[#2B2B2B]">
                          {item.paymentMethod === 'pix' ? 'PIX' : 
                           item.paymentMethod === 'boleto' ? 'Boleto' : 
                           item.paymentMethod === 'debit_card' ? 'Débito' : 'Outro'}
                        </span>
                      )}

                      <span className="px-2 py-0.5 rounded-lg bg-[#171717] text-[#737373] border border-[#262626]">
                        Ativo desde {startMonthFormatted}
                      </span>

                      {/* Status no mês atual */}
                      <button
                        onClick={() => togglePaidStatus(item.id, Boolean(isPaidInMonth))}
                        className={`ml-auto px-2 py-0.5 rounded-lg text-[11px] font-medium flex items-center gap-1 transition cursor-pointer ${
                          isPaidInMonth
                            ? 'bg-[#A3C9A8]/15 text-[#A3C9A8] border border-[#A3C9A8]/30 hover:bg-[#A3C9A8]/25'
                            : 'bg-[#262626] text-[#A3A3A3] hover:text-white border border-[#333333]'
                        }`}
                        title="Clique para alternar o status deste mês"
                      >
                        {isPaidInMonth ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{isIncome ? 'Recebido neste mês' : 'Pago neste mês'}</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-[#E5A97D]" />
                            <span>Pendente neste mês</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Bottom Row: Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1C1C1C]">
                      <button
                        onClick={() => setEditRecurring(item)}
                        className="py-1.5 px-3 rounded-xl bg-[#1C1C1C] hover:bg-[#262626] text-xs text-[#A3A3A3] hover:text-white transition flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => setDeleteRecurringTarget(item)}
                        className="py-1.5 px-3 rounded-xl bg-[#1C1C1C] hover:bg-[#262626] text-xs text-[#E29578] hover:text-[#E29578]/90 transition flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Gerenciar / Excluir</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 2: PARCELAMENTOS ATIVOS                                         */}
      {/* ==================================================================== */}
      {activeSubTab === 'installments' && (
        <div className="space-y-4">
          {/* Métricas dos Parcelamentos */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-4 bg-[#141414] border border-[#262626] rounded-2xl space-y-1">
              <span className="text-[10px] text-[#737373] uppercase tracking-wider font-semibold block">
                Saldo Devedor Total
              </span>
              <p className="text-lg md:text-xl font-bold text-[#E29578]">
                {formatBRL(installmentTotals.totalDebt)}
              </p>
            </div>

            <div className="p-4 bg-[#141414] border border-[#262626] rounded-2xl space-y-1">
              <span className="text-[10px] text-[#737373] uppercase tracking-wider font-semibold block">
                Comprometimento Mensal
              </span>
              <p className="text-lg md:text-xl font-bold text-white">
                {formatBRL(installmentTotals.monthlyCommitment)}
                <span className="text-xs text-[#737373] font-normal">/mês</span>
              </p>
            </div>

            <div className="col-span-2 md:col-span-1 p-4 bg-[#141414] border border-[#262626] rounded-2xl space-y-1">
              <span className="text-[10px] text-[#737373] uppercase tracking-wider font-semibold block">
                Compras Parceladas Ativas
              </span>
              <p className="text-lg md:text-xl font-bold text-[#A8B5D1]">
                {installmentTotals.count}
              </p>
            </div>
          </div>

          {/* Lista de Parcelamentos Ativos */}
          {activeInstallments.length === 0 ? (
            <div className="p-8 md:p-12 text-center bg-[#141414] border border-[#262626] rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#262626] text-[#737373] mx-auto flex items-center justify-center">
                <Layers className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-semibold text-white">Nenhum parcelamento ativo</h3>
              <p className="text-xs text-[#737373] max-w-sm mx-auto">
                Suas compras a prazo no cartão de crédito ou carnês aparecerão aqui com acompanhamento automático de amortizações.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleOpenAddInstallment}
                  className="px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition cursor-pointer"
                >
                  + Cadastrar Compra Parcelada
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeInstallments.map(group => {
                const currentNum = group.currentInstallment;
                const remainingToFinish = Math.max(0, group.totalInstallments - currentNum);
                const exactProgress = Math.min(100, Math.round((currentNum / group.totalInstallments) * 100));
                const endMonthDisplay = formatMonthDisplay(group.lastDate.slice(0, 7));

                return (
                  <div
                    key={group.groupId}
                    className="p-5 bg-[#141414] border border-[#262626] hover:border-[#383838] rounded-3xl space-y-4 transition group"
                  >
                    {/* Cabeçalho do Card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white truncate">
                            {group.description}
                          </h4>
                          {group.type === 'income' ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#A3C9A8]/15 text-[#A3C9A8] border border-[#A3C9A8]/30">
                              Receita
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E29578]/15 text-[#E29578] border border-[#E29578]/30">
                              Parcelamento
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#737373] mt-0.5">
                          <span>{group.category}</span>
                          {group.cardName && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-[#A8B5D1]">
                                <CreditCardIcon className="w-3 h-3" />
                                {group.cardName} •••• {group.cardLastFour}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-bold text-white">
                          {formatBRL(group.monthlyAmount)}
                        </span>
                        <span className="text-[10px] text-[#737373] block">/parcela</span>
                      </div>
                    </div>

                    {/* Barra de Progresso Visual Reconciliada */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[#E29578] font-bold">
                            Parcela {currentNum} de {group.totalInstallments}
                          </span>
                          <span className="text-[11px] text-[#737373]">
                            • Faltam {remainingToFinish} parcelas
                          </span>
                        </div>
                        <span className="text-white font-mono font-semibold">
                          {exactProgress}% concluído
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#262626] overflow-hidden">
                        <div
                          className="h-full bg-linear-to-r from-[#E29578] to-[#E5A97D] rounded-full transition-all duration-300"
                          style={{ width: `${exactProgress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#737373] pt-0.5">
                        <span>{group.paidCount} de {group.totalInstallments} parcelas quitadas</span>
                        <span>Fim previsto: {endMonthDisplay || 'Em breve'}</span>
                      </div>
                    </div>

                    {/* Grade de Detalhes Financeiros */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-[#0D0D0D] border border-[#262626] rounded-2xl text-xs">
                      <div>
                        <span className="text-[10px] text-[#737373] block uppercase tracking-wider">
                          Valor Total
                        </span>
                        <span className="font-semibold text-white">
                          {formatBRL(group.totalAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#737373] block uppercase tracking-wider">
                          Saldo Restante
                        </span>
                        <span className="font-semibold text-[#E29578]">
                          {formatBRL(group.remainingBalance)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#737373] block uppercase tracking-wider">
                          Fim Previsto
                        </span>
                        <span className="font-semibold text-[#A8B5D1]">
                          {endMonthDisplay || 'Em breve'}
                        </span>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setAdvanceGroup(group)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-[#262626] hover:bg-[#333333] border border-[#383838] text-xs font-semibold text-[#E5A97D] hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs active:scale-98"
                      >
                        <FastForward className="w-3.5 h-3.5" />
                        <span>Adiantar Parcelas</span>
                      </button>

                      <button
                        onClick={() => setEditGroup(group)}
                        title="Editar Parcelamento"
                        className="p-2.5 rounded-xl bg-[#1C1C1C] hover:bg-[#262626] text-[#A3A3A3] hover:text-white transition cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeleteGroupTarget(group)}
                        title="Excluir Parcelamento"
                        className="p-2.5 rounded-xl bg-[#1C1C1C] hover:bg-[#262626] text-[#E29578] hover:text-[#E29578]/90 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 3: HISTÓRICO / FINALIZADOS                                       */}
      {/* ==================================================================== */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          {finishedInstallments.length === 0 && discontinuedRecurring.length === 0 ? (
            <div className="p-8 md:p-12 text-center bg-[#141414] border border-[#262626] rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#262626] text-[#737373] mx-auto flex items-center justify-center">
                <History className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-semibold text-white">Histórico Limpo</h3>
              <p className="text-xs text-[#737373] max-w-sm mx-auto">
                Quando compras parceladas forem 100% quitadas ou gastos fixos forem cancelados, eles ficarão arquivados aqui para consulta histórica.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Parcelamentos Quitados */}
              {finishedInstallments.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider px-1">
                    Parcelamentos Quitados ({finishedInstallments.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {finishedInstallments.map(group => (
                      <div
                        key={group.groupId}
                        className="p-4 bg-[#141414] border border-[#262626] rounded-2xl space-y-3 opacity-80 hover:opacity-100 transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-white">
                                {group.description}
                              </h4>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#A3C9A8]/15 text-[#A3C9A8] border border-[#A3C9A8]/30 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Quitado 100%
                              </span>
                            </div>
                            <p className="text-[11px] text-[#737373] mt-0.5">
                              {group.totalInstallments} de {group.totalInstallments} parcelas pagas • Total: {formatBRL(group.totalAmount)}
                            </p>
                          </div>

                          <button
                            onClick={() => setDeleteGroupTarget(group)}
                            title="Remover do Histórico"
                            className="p-1.5 rounded-xl text-[#737373] hover:text-[#E29578] hover:bg-[#262626] transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recorrências Encerradas */}
              {discontinuedRecurring.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider px-1">
                    Recorrências Encerradas ({discontinuedRecurring.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {discontinuedRecurring.map(item => (
                      <div
                        key={item.id}
                        className="p-4 bg-[#141414] border border-[#262626] rounded-2xl space-y-2 opacity-80 hover:opacity-100 transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-white">
                                {item.description}
                              </h4>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#737373]/15 text-[#A3A3A3] border border-[#737373]/30 flex items-center gap-1">
                                <CalendarOff className="w-3 h-3" />
                                Encerrado em {formatMonthDisplay(item.endDate || '')}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#737373] mt-0.5">
                              {item.category} • {formatBRL(item.amount)}/mês
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleReactivateRecurring(item)}
                              title="Reativar Recorrência"
                              className="p-1.5 rounded-xl text-[#A3C9A8] hover:bg-[#262626] transition cursor-pointer flex items-center gap-1 text-xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Reativar</span>
                            </button>
                            <button
                              onClick={() => setDeleteRecurringTarget(item)}
                              title="Excluir Definitivo"
                              className="p-1.5 rounded-xl text-[#737373] hover:text-[#E29578] hover:bg-[#262626] transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAIS DE GESTÃO E ADIANTAMENTO                                     */}
      {/* ==================================================================== */}

      {/* Modal de Adiantamento de Parcelas */}
      <AdvanceInstallmentModal
        isOpen={Boolean(advanceGroup)}
        onClose={() => setAdvanceGroup(null)}
        installmentGroup={advanceGroup}
        onConfirmAdvance={advanceInstallments}
        currentMonth={currentMonth}
      />

      {/* Modal de Edição de Parcelamento em Lote */}
      <EditInstallmentModal
        isOpen={Boolean(editGroup)}
        onClose={() => setEditGroup(null)}
        installmentGroup={editGroup}
        onSave={updateInstallmentGroup}
      />

      {/* Modal de Edição de Recorrência Fixa */}
      <EditRecurringModal
        isOpen={Boolean(editRecurring)}
        onClose={() => setEditRecurring(null)}
        recurringItem={editRecurring}
        onSave={updateTransaction}
      />

      {/* Modal de Exclusão de Recorrência Fixa (Opções: deste mês em diante ou todo histórico) */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteRecurringTarget)}
        onClose={() => setDeleteRecurringTarget(null)}
        title="Gerenciar Recorrência Fixa"
        message="Deseja interromper este lançamento apenas a partir deste mês ou apagá-lo completamente de todo o histórico?"
        itemDetail={deleteRecurringTarget ? `${deleteRecurringTarget.description} (${formatBRL(deleteRecurringTarget.amount)}/mês)` : undefined}
        confirmLabel="Excluir Todo o Histórico"
        discontinueLabel="Encerrar deste mês em diante"
        onDiscontinueFromMonth={async () => {
          if (deleteRecurringTarget) {
            await discontinueRecurringTransaction(deleteRecurringTarget.id, currentMonth);
          }
        }}
        onConfirm={async () => {
          if (deleteRecurringTarget) {
            await deleteTransaction(deleteRecurringTarget.id);
          }
        }}
      />

      {/* Modal de Exclusão de Parcelamento */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteGroupTarget)}
        onClose={() => setDeleteGroupTarget(null)}
        title="Excluir Parcelamento"
        message="Esta ação apagará todas as parcelas deste grupo do seu extrato e projeções. Deseja prosseguir?"
        itemDetail={deleteGroupTarget ? `${deleteGroupTarget.description} (${deleteGroupTarget.totalInstallments} parcelas • Total ${formatBRL(deleteGroupTarget.totalAmount)})` : undefined}
        confirmLabel="Excluir Parcelamento"
        onConfirm={async () => {
          if (deleteGroupTarget) {
            await deleteInstallmentGroup(deleteGroupTarget.groupId);
          }
        }}
      />

      {/* Modal de Cadastro Rápido de Novo Fixo ou Parcelamento */}
      <TransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={addTransaction}
        defaultMonth={currentMonth}
        initialNature={initialNature}
        initialType={initialType}
      />
    </div>
  );
};
