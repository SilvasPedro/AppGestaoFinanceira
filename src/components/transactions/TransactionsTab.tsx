import React, { useState } from 'react';
import { 
  Search, 
  Trash2, 
  Pencil,
  CheckCircle, 
  Clock, 
  Plus, 
  CreditCard as CreditCardIcon, 
  CalendarOff,
  Filter,
  X
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Transaction } from '../../types/finance';
import { DeleteConfirmModal } from '../modals/DeleteConfirmModal';
import { TransactionModal } from '../modals/TransactionModal';

interface TransactionsTabProps {
  onOpenAddModal: () => void;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({ onOpenAddModal }) => {
  const { 
    monthTransactions, 
    deleteTransaction, 
    updateTransaction,
    discontinueRecurringTransaction,
    togglePaidStatus, 
    currentMonth,
    creditCards,
    cardInvoices,
    totalCreditCardInvoice
  } = useFinance();

  const [filterType, setFilterType] = useState<'all' | 'daily' | 'fixed' | 'installment' | 'income'>('all');
  const [selectedCardFilter, setSelectedCardFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Filtragem combinada (Busca textual + Filtro por Tipo + Filtro por Cartão de Crédito)
  const filteredList = monthTransactions.filter((tx) => {
    // Filtro estrito por cartão de crédito selecionado
    if (selectedCardFilter) {
      if (tx.type !== 'expense' || tx.paymentMethod !== 'credit_card' || tx.cardId !== selectedCardFilter) {
        return false;
      }
    }

    // Busca por texto
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = tx.description.toLowerCase().includes(q);
      const matchCat = tx.category.toLowerCase().includes(q);
      const matchCard = tx.cardName?.toLowerCase().includes(q) || tx.cardLastFour?.includes(q);
      if (!matchDesc && !matchCat && !matchCard) return false;
    }

    // Filtro por natureza/tipo (se não estiver em modo de fatura de cartão específica)
    if (!selectedCardFilter) {
      if (filterType === 'all') return true;
      if (filterType === 'income') return tx.type === 'income';
      if (filterType === 'daily') return tx.type === 'expense' && tx.nature === 'daily';
      if (filterType === 'fixed') return tx.type === 'expense' && tx.nature === 'fixed';
      if (filterType === 'installment') return tx.type === 'expense' && tx.nature === 'installment';
    }

    return true;
  });

  const activeFilteredCard = selectedCardFilter 
    ? creditCards.find(c => c.id === selectedCardFilter)
    : null;

  const activeCardSummary = selectedCardFilter && cardInvoices[selectedCardFilter]
    ? cardInvoices[selectedCardFilter]
    : null;

  return (
    <div className="space-y-4 pb-24 max-w-5xl mx-auto">
      {/* 1. Módulo Unificado de Faturas de Cartão de Crédito */}
      {(creditCards.length > 0 || totalCreditCardInvoice > 0) && (
        <div className="p-4 rounded-3xl bg-[#141414] border border-[#262626] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#A8B5D1]/15 text-[#A8B5D1] flex items-center justify-center">
                <CreditCardIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">Faturas de Cartões de Crédito</span>
                <span className="text-[11px] text-[#737373]">
                  Consolidado do mês: <strong className="text-white font-mono">{formatBRL(totalCreditCardInvoice)}</strong>
                </span>
              </div>
            </div>

            {selectedCardFilter && (
              <button
                type="button"
                onClick={() => setSelectedCardFilter(null)}
                className="text-xs text-[#A8B5D1] hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                <X className="w-3.5 h-3.5" />
                <span>Ver todos os lançamentos</span>
              </button>
            )}
          </div>

          {/* Seletor rápido de faturas por cartão */}
          {creditCards.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
              <button
                type="button"
                onClick={() => setSelectedCardFilter(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition border cursor-pointer ${
                  selectedCardFilter === null
                    ? 'bg-white text-black border-white font-semibold shadow-xs'
                    : 'bg-[#0D0D0D] text-[#A3A3A3] border-[#262626] hover:text-white'
                }`}
              >
                Todas as Despesas
              </button>

              {creditCards.map(card => {
                const summary = cardInvoices[card.id];
                const isSelected = selectedCardFilter === card.id;
                const totalAmount = summary ? summary.total : 0;

                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedCardFilter(isSelected ? null : card.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition border flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-[#1C1C1C] text-white border-white shadow-xs font-semibold'
                        : 'bg-[#0D0D0D] text-[#A3A3A3] border-[#262626] hover:text-white'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: card.color || '#A8B5D1' }} />
                    <span>{card.cardName} •••• {card.lastFourDigits}</span>
                    <span className="font-mono text-[11px] text-white font-bold ml-1">
                      {formatBRL(totalAmount)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Banner de Fatura Filtrada Ativa */}
      {activeFilteredCard && (
        <div className="p-3.5 bg-[#171717] border border-[#333333] rounded-2xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: activeFilteredCard.color || '#A8B5D1' }} 
            />
            <div className="text-xs">
              <span className="font-semibold text-white">
                Fatura Filtrada: {activeFilteredCard.cardName} •••• {activeFilteredCard.lastFourDigits}
              </span>
              <span className="text-[#A3A3A3] ml-2 block sm:inline">
                ({activeCardSummary?.count || 0} lançamentos • Total: <strong className="text-white font-mono">{formatBRL(activeCardSummary?.total || 0)}</strong>)
              </span>
            </div>
          </div>
          <button
            onClick={() => setSelectedCardFilter(null)}
            className="p-1 rounded-lg text-[#737373] hover:text-white hover:bg-[#262626] transition cursor-pointer"
            title="Limpar filtro de fatura"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Top Controls: Search & Add button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por descrição, categoria ou cartão..."
            className="w-full pl-9 pr-3 py-2.5 bg-[#141414] border border-[#262626] rounded-2xl text-xs text-white placeholder-[#737373] focus:outline-hidden focus:border-white transition"
          />
        </div>
        <button
          onClick={onOpenAddModal}
          className="px-3.5 py-2.5 rounded-2xl bg-white hover:bg-neutral-200 text-black text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shrink-0 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Novo Lançamento</span>
        </button>
      </div>

      {/* 3. Filter Tabs (apenas quando não estiver filtrando por um cartão específico) */}
      {!selectedCardFilter && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'daily', label: 'Diários' },
            { id: 'fixed', label: 'Fixos / Recorrentes' },
            { id: 'installment', label: 'Parcelados' },
            { id: 'income', label: 'Receitas' },
          ].map((tab) => {
            const isActive = filterType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as typeof filterType)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition border cursor-pointer ${
                  isActive
                    ? 'bg-white text-black border-white shadow-xs font-semibold'
                    : 'bg-[#141414] text-[#A3A3A3] border-[#262626] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-[#737373] px-1">
        <span>{filteredList.length} lançamento(s) exibido(s)</span>
        <span className="font-mono">
          Total: {formatBRL(filteredList.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0))}
        </span>
      </div>

      {/* List of Transactions */}
      <div className="space-y-2">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[#141414] border border-[#262626] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1E1E1E] mx-auto flex items-center justify-center text-[#737373]">
              <Filter className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Nenhum lançamento encontrado</p>
              <p className="text-xs text-[#737373] mt-1 max-w-sm mx-auto">
                {selectedCardFilter 
                  ? 'Nenhum gasto ou parcela vinculado a este cartão de crédito neste mês.'
                  : 'Nenhum lançamento corresponde aos filtros ou ao mês selecionado. Adicione sua primeira despesa ou receita!'}
              </p>
            </div>
            <button
              onClick={onOpenAddModal}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-semibold transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Lançamento</span>
            </button>
          </div>
        ) : (
          filteredList.map((tx) => {
            const isIncome = tx.type === 'income';
            const isFixed = tx.nature === 'fixed';
            const isInstallment = tx.nature === 'installment';

            return (
              <div
                key={tx.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-[#141414] border border-[#212121] hover:border-[#2D2D2D] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Lado esquerdo: Detalhes do lançamento */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      isIncome
                        ? 'bg-[#A3C9A8]/15 text-[#A3C9A8] border border-[#A3C9A8]/30'
                        : 'bg-[#E29578]/15 text-[#E29578] border border-[#E29578]/30'
                    }`}
                  >
                    {isIncome ? '+' : '-'}
                  </div>

                  {/* Informações centrais */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-white">
                        {tx.description}
                      </span>

                      {/* Nature Pill */}
                      {isFixed && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1E1E1E] text-[#A8B5D1] border border-[#2B2B2B]">
                          Recorrente Mensal
                        </span>
                      )}

                      {isInstallment && tx.installmentDetails && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isIncome
                            ? 'bg-[#A3C9A8]/15 text-[#A3C9A8] border border-[#A3C9A8]/30'
                            : 'bg-[#E29578]/15 text-[#E29578] border border-[#E29578]/30'
                        }`}>
                          {isIncome ? 'Venda' : 'Parcela'} {tx.installmentDetails.currentInstallment} de {tx.installmentDetails.totalInstallments}
                        </span>
                      )}

                      {/* Cartão de Crédito Badge */}
                      {tx.paymentMethod === 'credit_card' && (tx.cardName || tx.cardLastFour) && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#A8B5D1]/15 text-[#A8B5D1] border border-[#A8B5D1]/30 flex items-center gap-1 font-mono">
                          <CreditCardIcon className="w-2.5 h-2.5" />
                          <span>{tx.cardName || 'Cartão'} •••• {tx.cardLastFour || ''}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#737373] flex-wrap">
                      <span className="px-1.5 py-0.5 rounded-sm bg-[#1A1A1A] text-[#A3A3A3]">{tx.category}</span>
                      <span>•</span>
                      <span>{tx.date}</span>
                      <span>•</span>
                      <span className="capitalize">{tx.paymentMethod.replace('_', ' ')}</span>
                      {isInstallment && tx.installmentDetails && (
                        <>
                          <span>•</span>
                          <span>Total: {formatBRL(tx.installmentDetails.totalAmount)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lado direito: Valor e Ações */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1E1E1E]">
                  {/* Toggle Pago/Recebido para contas fixas e parceladas */}
                  {(isFixed || isInstallment) && (
                    <button
                      onClick={() => togglePaidStatus(tx.id, !!tx.isPaid)}
                      title={`Clique para alternar ${isIncome ? 'Recebido / A Receber' : 'Pago / Pendente'}`}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                        tx.isPaid
                          ? 'bg-[#A3C9A8]/15 text-[#A3C9A8] hover:bg-[#A3C9A8]/25 border border-[#A3C9A8]/30'
                          : 'bg-[#E29578]/15 text-[#E29578] hover:bg-[#E29578]/25 border border-[#E29578]/30'
                      }`}
                    >
                      {tx.isPaid ? (
                        <>
                          <CheckCircle className="w-3 h-3" /> {isIncome ? 'Recebido' : 'Pago'}
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" /> {isIncome ? 'A Receber' : 'Pendente'}
                        </>
                      )}
                    </button>
                  )}

                  {/* Valor */}
                  <div className="text-right">
                    <span
                      className={`text-sm font-bold font-mono ${
                        isIncome ? 'text-[#A3C9A8]' : 'text-white'
                      }`}
                    >
                      {isIncome ? '+' : '-'} {formatBRL(tx.amount)}
                    </span>
                  </div>

                  {/* Botão de Editar */}
                  <button
                    onClick={() => setTxToEdit(tx)}
                    title="Editar informações do lançamento"
                    className="p-1.5 rounded-lg text-[#737373] hover:text-[#A8B5D1] hover:bg-[#262626] transition cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {/* Botão de Excluir com Confirmação */}
                  <button
                    onClick={() => setTxToDelete(tx)}
                    title="Excluir lançamento"
                    className="p-1.5 rounded-lg text-[#737373] hover:text-[#E29578] hover:bg-[#262626] transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Confirmação de Exclusão com Suporte a Descontinuação Recorrente */}
      <DeleteConfirmModal
        isOpen={!!txToDelete}
        onClose={() => setTxToDelete(null)}
        onConfirm={async () => {
          if (txToDelete) {
            await deleteTransaction(txToDelete.id);
            setTxToDelete(null);
          }
        }}
        onDiscontinueFromMonth={
          txToDelete?.nature === 'fixed'
            ? async () => {
                if (txToDelete) {
                  await discontinueRecurringTransaction(txToDelete.id, currentMonth);
                  setTxToDelete(null);
                }
              }
            : undefined
        }
        title={txToDelete?.nature === 'fixed' ? 'Gerenciar Recorrência Fixa' : 'Excluir Lançamento'}
        message={
          txToDelete?.nature === 'fixed'
            ? 'Este lançamento é uma conta ou receita recorrente. Você pode descontinuá-lo a partir deste mês (mantendo os meses passados intactos no seu histórico) ou excluir todo o registro permanentemente.'
            : 'Tem certeza que deseja remover este lançamento? O valor será excluído do seu histórico e os saldos serão recalculados automaticamente.'
        }
        discontinueLabel={`Descontinuar a partir deste mês (${currentMonth})`}
        itemDetail={txToDelete ? `${txToDelete.description} • ${formatBRL(txToDelete.amount)} (${txToDelete.category})` : undefined}
        confirmLabel="Sim, Excluir Registro"
      />

      {/* Modal de Edição de Lançamento */}
      <TransactionModal
        isOpen={!!txToEdit}
        onClose={() => setTxToEdit(null)}
        transactionToEdit={txToEdit}
        onUpdate={async (id, data) => {
          await updateTransaction(id, data);
          setTxToEdit(null);
        }}
        onSave={async () => {}}
        defaultMonth={currentMonth}
      />
    </div>
  );
};
