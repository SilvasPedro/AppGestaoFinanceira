import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  CheckCircle, 
  Clock, 
  Plus, 
  CreditCard, 
  Repeat, 
  Layers,
  Sparkles
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Transaction, TransactionNature, TransactionType } from '../../types/finance';
import { DeleteConfirmModal } from '../modals/DeleteConfirmModal';

interface TransactionsTabProps {
  onOpenAddModal: () => void;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({ onOpenAddModal }) => {
  const { 
    monthTransactions, 
    deleteTransaction, 
    togglePaidStatus, 
    incomeTotal, 
    expensesTotal 
  } = useFinance();

  const [filterType, setFilterType] = useState<'all' | 'daily' | 'fixed' | 'installment' | 'income'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Filtragem
  const filteredList = monthTransactions.filter((tx) => {
    // Busca por texto
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = tx.description.toLowerCase().includes(q);
      const matchCat = tx.category.toLowerCase().includes(q);
      if (!matchDesc && !matchCat) return false;
    }

    // Filtro por natureza/tipo
    if (filterType === 'all') return true;
    if (filterType === 'income') return tx.type === 'income';
    if (filterType === 'daily') return tx.type === 'expense' && tx.nature === 'daily';
    if (filterType === 'fixed') return tx.type === 'expense' && tx.nature === 'fixed';
    if (filterType === 'installment') return tx.type === 'expense' && tx.nature === 'installment';

    return true;
  });

  return (
    <div className="space-y-4 pb-24 max-w-5xl mx-auto">
      {/* Top Controls: Search & Add button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por descrição ou categoria..."
            className="w-full pl-9 pr-3 py-2.5 bg-[#141414] border border-[#262626] rounded-2xl text-xs text-white placeholder-[#737373] focus:outline-hidden focus:border-white transition"
          />
        </div>
        <button
          onClick={onOpenAddModal}
          className="px-3.5 py-2.5 rounded-2xl bg-white hover:bg-neutral-200 text-black text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Novo Lançamento</span>
        </button>
      </div>

      {/* Filter Tabs */}
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
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition border ${
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

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-[#737373] px-1">
        <span>{filteredList.length} lançamento(s) exibido(s)</span>
        <span className="font-mono">
          Total: {formatBRL(filteredList.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0))}
        </span>
      </div>

      {/* List */}
      <div className="space-y-2.5">
        {filteredList.length === 0 ? (
          <div className="p-8 text-center bg-[#141414] border border-[#262626] rounded-3xl">
            <p className="text-xs text-[#737373]">
              Nenhum lançamento encontrado para os filtros selecionados.
            </p>
            <button
              onClick={onOpenAddModal}
              className="mt-3 px-3 py-1.5 rounded-xl bg-[#262626] hover:bg-[#333333] text-xs font-medium text-[#A8B5D1] inline-flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Lançamento
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
                className="p-3.5 sm:p-4 rounded-2xl bg-[#141414] border border-[#262626] hover:border-[#383838] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="flex items-start gap-3">
                  {/* Badge de tipo */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 ${
                      isIncome
                        ? 'bg-[#A3C9A8]/15 text-[#A3C9A8]'
                        : isInstallment
                        ? 'bg-[#E29578]/15 text-[#E29578]'
                        : isFixed
                        ? 'bg-[#E5A97D]/15 text-[#E5A97D]'
                        : 'bg-[#262626] text-[#A8B5D1]'
                    }`}
                  >
                    {isIncome ? '+' : isInstallment ? 'x' : isFixed ? '∞' : '-'}
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
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E29578]/15 text-[#E29578] border border-[#E29578]/30 font-medium">
                          Parcela {tx.installmentDetails.currentInstallment} de {tx.installmentDetails.totalInstallments}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#737373] flex-wrap">
                      <span>{tx.category}</span>
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
                  {/* Toggle Pago/Pendente para contas fixas */}
                  {isFixed && !isIncome && (
                    <button
                      onClick={() => togglePaidStatus(tx.id, !!tx.isPaid)}
                      title="Clique para alternar Pago / Pendente"
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                        tx.isPaid
                          ? 'bg-[#A3C9A8]/15 text-[#A3C9A8] hover:bg-[#A3C9A8]/25 border border-[#A3C9A8]/30'
                          : 'bg-[#E29578]/15 text-[#E29578] hover:bg-[#E29578]/25 border border-[#E29578]/30'
                      }`}
                    >
                      {tx.isPaid ? (
                        <>
                          <CheckCircle className="w-3 h-3" /> Pago
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" /> Pendente
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

                  {/* Botão de Excluir com Confirmação */}
                  <button
                    onClick={() => setTxToDelete(tx)}
                    title="Excluir lançamento"
                    className="p-1.5 rounded-lg text-[#525252] hover:text-[#E29578] hover:bg-[#262626] transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <DeleteConfirmModal
        isOpen={!!txToDelete}
        onClose={() => setTxToDelete(null)}
        onConfirm={async () => {
          if (txToDelete) {
            await deleteTransaction(txToDelete.id);
            setTxToDelete(null);
          }
        }}
        title="Excluir Lançamento"
        message="Tem certeza que deseja remover este lançamento? O valor será excluído do seu histórico e os saldos serão recalculados automaticamente."
        itemDetail={txToDelete ? `${txToDelete.description} • ${formatBRL(txToDelete.amount)} (${txToDelete.category})` : undefined}
        confirmLabel="Sim, Excluir"
      />
    </div>
  );
};
