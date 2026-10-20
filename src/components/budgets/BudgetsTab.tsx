import React, { useState } from 'react';
import { Target, Plus, AlertTriangle, CheckCircle, Edit2, Trash2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { BudgetModal } from '../modals/BudgetModal';
import { DeleteConfirmModal } from '../modals/DeleteConfirmModal';

export const BudgetsTab: React.FC = () => {
  const { budgets, budgetsStatus, saveBudget, deleteBudget, expenseCategories } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<{ id: string; category: string } | null>(null);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const totalBudgeted = budgetsStatus.reduce((acc, b) => acc + b.limit, 0);
  const totalSpentInBudgets = budgetsStatus.reduce((acc, b) => acc + b.spent, 0);
  const overallPercentage = totalBudgeted > 0 ? (totalSpentInBudgets / totalBudgeted) * 100 : 0;

  // Mapa atual de limites para o modal
  const currentBudgetsMap = budgetsStatus.reduce((acc, b) => {
    acc[b.category] = b.limit;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5 pb-24 max-w-5xl mx-auto">
      {/* Top Banner: Global Budget Summary */}
      <div className="p-5 rounded-3xl bg-[#141414] border border-[#262626]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#737373] uppercase tracking-wider font-semibold">
                Teto Orçamentário Mensal
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1E1E1E] text-[#A8B5D1]">
                {budgetsStatus.length} Categorias Monitoradas
              </span>
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {formatBRL(totalSpentInBudgets)} <span className="text-xs font-normal text-[#737373]">de {formatBRL(totalBudgeted)}</span>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Configurar Tetos</span>
          </button>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-[#0D0D0D] h-3 rounded-full overflow-hidden p-0.5 border border-[#1F1F1F]">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                overallPercentage >= 100
                  ? 'bg-[#E29578]'
                  : overallPercentage >= 80
                  ? 'bg-[#E5A97D]'
                  : 'bg-[#A3C9A8]'
              }`}
              style={{ width: `${Math.min(100, overallPercentage)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-[#737373] mt-1.5">
            <span>{Math.round(overallPercentage)}% do orçamento total consumido</span>
            <span>
              {totalSpentInBudgets > totalBudgeted
                ? `Estouro de ${formatBRL(totalSpentInBudgets - totalBudgeted)}`
                : `Disponível: ${formatBRL(totalBudgeted - totalSpentInBudgets)}`}
            </span>
          </div>
        </div>
      </div>

      {/* Categorias Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold text-[#737373] uppercase tracking-wider">
            Detalhamento por Categoria
          </h3>
          <span className="text-[11px] text-[#737373]">
            Avisos em 80% e 100%
          </span>
        </div>

        {budgetsStatus.length === 0 ? (
          <div className="p-8 text-center bg-[#141414] border border-[#262626] rounded-3xl space-y-3">
            <p className="text-xs text-[#737373]">
              Nenhum limite configurado ainda. Defina metas mensais por categoria para monitorar seus limites em tempo real.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#262626] hover:bg-[#333333] text-xs font-semibold text-white inline-flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Configurar Primeiro Limite
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {budgetsStatus.map((b) => {
              const isDanger = b.status === 'danger';
              const isWarning = b.status === 'warning';
              const remaining = b.limit - b.spent;
              const matchingBudgetDoc = budgets.find(bg => bg.category === b.category);

              return (
                <div
                  key={b.category}
                  className={`p-4 rounded-2xl bg-[#141414] border transition ${
                    isDanger
                      ? 'border-[#E29578]/40 shadow-xs shadow-[#E29578]/5'
                      : isWarning
                      ? 'border-[#E5A97D]/40'
                      : 'border-[#262626] hover:border-[#383838]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">
                        {b.category}
                      </span>
                      {/* Status Pill */}
                      {isDanger && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E29578]/15 text-[#E29578] border border-[#E29578]/30">
                          <AlertTriangle className="w-3 h-3" /> 100%+ Estourado
                        </span>
                      )}
                      {isWarning && (
                        <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#E5A97D]/15 text-[#E5A97D] border border-[#E5A97D]/30">
                          <AlertTriangle className="w-3 h-3" /> 80%+ Alerta
                        </span>
                      )}
                      {!isDanger && !isWarning && (
                        <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#A3C9A8]/10 text-[#A3C9A8]">
                          <CheckCircle className="w-3 h-3" /> Saudável
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setIsModalOpen(true)}
                        title="Editar teto"
                        className="p-1 rounded-lg text-[#737373] hover:text-white hover:bg-[#262626] transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {matchingBudgetDoc?.id && (
                        <button
                          onClick={() => setBudgetToDelete({ id: matchingBudgetDoc.id!, category: b.category })}
                          title="Remover teto desta categoria"
                          className="p-1 rounded-lg text-[#525252] hover:text-[#E29578] hover:bg-[#262626] transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Spent vs Limit Numbers */}
                  <div className="flex justify-between items-baseline text-xs mb-2">
                    <span className="text-white font-mono font-semibold">
                      {formatBRL(b.spent)}
                    </span>
                    <span className="text-[#737373] text-[11px]">
                      Teto: <strong className="text-[#A3A3A3] font-mono">{formatBRL(b.limit)}</strong>
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-[#0D0D0D] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDanger
                          ? 'bg-[#E29578]'
                          : isWarning
                          ? 'bg-[#E5A97D]'
                          : 'bg-[#A3C9A8]'
                      }`}
                      style={{ width: `${Math.min(100, b.percentage)}%` }}
                    />
                  </div>

                  {/* Footer notes */}
                  <div className="flex justify-between items-center text-[10px] text-[#737373] mt-2">
                    <span className="font-mono">{Math.round(b.percentage)}% utilizado</span>
                    <span className={isDanger ? 'text-[#E29578] font-semibold' : ''}>
                      {isDanger
                        ? `Excesso de ${formatBRL(Math.abs(remaining))}`
                        : `Resta ${formatBRL(remaining)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal para configurar tetos */}
      <BudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categories={expenseCategories}
        currentBudgets={currentBudgetsMap}
        onSaveBudget={saveBudget}
      />

      {/* Modal de Confirmação para exclusão de teto */}
      <DeleteConfirmModal
        isOpen={!!budgetToDelete}
        onClose={() => setBudgetToDelete(null)}
        onConfirm={async () => {
          if (budgetToDelete) {
            await deleteBudget(budgetToDelete.id);
            setBudgetToDelete(null);
          }
        }}
        title="Remover Teto Orçamentário"
        message="Tem certeza que deseja remover este teto orçamentário? A categoria deixará de ser monitorada com barras de progresso e alertas."
        itemDetail={budgetToDelete ? `Categoria: ${budgetToDelete.category}` : undefined}
        confirmLabel="Remover Limite"
      />
    </div>
  );
};
