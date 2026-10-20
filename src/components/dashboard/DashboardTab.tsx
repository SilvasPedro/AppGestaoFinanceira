import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Layers, 
  CalendarClock, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles,
  Wallet,
  Clock
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { TabType } from '../common/BottomNav';

interface DashboardTabProps {
  onNavigateTab: (tab: TabType) => void;
  onOpenAddModal: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ onNavigateTab, onOpenAddModal }) => {
  const {
    incomeTotal,
    expensesTotal,
    netSurplus,
    fixedExpensesTotal,
    installmentsTotal,
    dailyExpensesTotal,
    pendingBillsCount,
    healthScore,
    budgetsStatus,
    monthTransactions
  } = useFinance();

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const warningBudgets = budgetsStatus.filter(b => b.status === 'warning');
  const dangerBudgets = budgetsStatus.filter(b => b.status === 'danger');

  // Últimas 5 transações
  const recentTransactions = monthTransactions.slice(0, 5);

  const [showAlertsExpanded, setShowAlertsExpanded] = React.useState(false);

  return (
    <div className="space-y-5 pb-24 max-w-5xl mx-auto">
      {/* 1. Alertas de Estouro / Vencimento (Compacto com expansão opcional) */}
      {(dangerBudgets.length > 0 || warningBudgets.length > 0 || pendingBillsCount > 0) && (
        <div className="rounded-2xl bg-[#141414] border border-[#262626] overflow-hidden transition-all">
          <div 
            onClick={() => setShowAlertsExpanded(!showAlertsExpanded)}
            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-[#1A1A1A] transition"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#E29578]/20 text-[#E29578] shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-semibold text-white">
                  {dangerBudgets.length > 0 
                    ? `${dangerBudgets.length} categoria(s) com limite estourado` 
                    : `${warningBudgets.length} categoria(s) em alerta de limite`}
                </span>
                <span className="text-[#A3A3A3] text-[11px] block sm:inline sm:ml-2">
                  {pendingBillsCount > 0 && `• ${pendingBillsCount} conta(s) pendente(s)`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#A8B5D1]">
              <span className="hidden xs:inline">{showAlertsExpanded ? 'Ocultar' : 'Ver Detalhes'}</span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${showAlertsExpanded ? 'rotate-90' : ''}`} />
            </div>
          </div>

          {showAlertsExpanded && (
            <div className="p-3 bg-[#0D0D0D] border-t border-[#1E1E1E] space-y-2">
              {dangerBudgets.map(b => (
                <div 
                  key={b.category}
                  onClick={() => onNavigateTab('budgets')}
                  className="p-2.5 bg-[#E29578]/10 border border-[#E29578]/30 rounded-xl flex items-center justify-between cursor-pointer hover:bg-[#E29578]/20 transition"
                >
                  <div className="text-xs">
                    <span className="font-semibold text-[#E29578]">Estourado: {b.category}</span>
                    <span className="text-[#A3A3A3] text-[11px] ml-2">
                      Gasto de {formatBRL(b.spent)} ({Math.round(b.percentage)}% de {formatBRL(b.limit)})
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#E29578]" />
                </div>
              ))}

              {warningBudgets.map(b => (
                <div 
                  key={b.category}
                  onClick={() => onNavigateTab('budgets')}
                  className="p-2.5 bg-[#E5A97D]/10 border border-[#E5A97D]/25 rounded-xl flex items-center justify-between cursor-pointer hover:bg-[#E5A97D]/20 transition"
                >
                  <div className="text-xs">
                    <span className="font-semibold text-[#E5A97D]">Atenção: {b.category}</span>
                    <span className="text-[#737373] text-[11px] ml-2">
                      {Math.round(b.percentage)}% do teto • Resta {formatBRL(Math.max(0, b.limit - b.spent))}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#E5A97D]" />
                </div>
              ))}

              {pendingBillsCount > 0 && (
                <div 
                  onClick={() => onNavigateTab('transactions')}
                  className="p-2.5 bg-[#A8B5D1]/10 border border-[#A8B5D1]/25 rounded-xl flex items-center justify-between cursor-pointer hover:bg-[#A8B5D1]/20 transition"
                >
                  <div className="text-xs">
                    <span className="font-semibold text-[#A8B5D1]">Contas Pendentes</span>
                    <span className="text-[#737373] text-[11px] ml-2">
                      {pendingBillsCount} fatura(s) aguardando pagamento neste mês
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#A8B5D1]" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. Hero Cards de Saldo e Entradas/Saídas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card Saldo Líquido */}
        <div className="sm:col-span-1 p-5 rounded-3xl bg-[#141414] border border-[#262626] relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#737373] mb-1">
            <span>Sobra Líquida (Superávit)</span>
            <Wallet className="w-4 h-4 text-[#A8B5D1]" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-white mt-1">
            {formatBRL(netSurplus)}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                netSurplus >= 0
                  ? 'bg-[#A3C9A8]/15 text-[#A3C9A8] border border-[#A3C9A8]/30'
                  : 'bg-[#E29578]/15 text-[#E29578] border border-[#E29578]/30'
              }`}
            >
              {incomeTotal > 0 ? `${Math.round((netSurplus / incomeTotal) * 100)}% da renda` : '0%'}
            </span>
            <span className="text-[11px] text-[#737373]">
              {netSurplus >= 0 ? 'Economizado no mês' : 'Déficit orçamentário'}
            </span>
          </div>
        </div>

        {/* Card Receitas */}
        <div className="p-5 rounded-3xl bg-[#141414] border border-[#262626]">
          <div className="flex items-center justify-between text-xs text-[#737373] mb-1">
            <span>Receitas Totais</span>
            <div className="w-6 h-6 rounded-lg bg-[#A3C9A8]/15 flex items-center justify-center text-[#A3C9A8]">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-[#A3C9A8] mt-1">
            {formatBRL(incomeTotal)}
          </div>
          <div className="mt-3 text-[11px] text-[#737373]">
            Salário, rendimentos e extras
          </div>
        </div>

        {/* Card Despesas */}
        <div className="p-5 rounded-3xl bg-[#141414] border border-[#262626]">
          <div className="flex items-center justify-between text-xs text-[#737373] mb-1">
            <span>Despesas Totais</span>
            <div className="w-6 h-6 rounded-lg bg-[#E29578]/15 flex items-center justify-center text-[#E29578]">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-[#E29578] mt-1">
            {formatBRL(expensesTotal)}
          </div>
          <div className="mt-3 text-[11px] text-[#737373]">
            Fixos, parcelas e variáveis
          </div>
        </div>
      </div>

      {/* 3. Score de Saúde Financeira (Mini Banner Interativo) */}
      <div 
        onClick={() => onNavigateTab('projections')}
        className="p-5 rounded-3xl bg-linear-to-r from-[#171717] to-[#121212] border border-[#262626] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:border-[#383838] transition shadow-xs"
      >
        <div className="flex items-center gap-4">
          {/* Circular Score Gauge */}
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-16 h-16 -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="26"
                stroke="#262626"
                strokeWidth="5"
                fill="none"
              />
              <circle
                cx="32"
                cy="32"
                r="26"
                stroke={healthScore.statusColor}
                strokeWidth="5"
                strokeDasharray="163.3"
                strokeDashoffset={163.3 - (163.3 * (healthScore.score / 1000))}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-bold text-white font-mono leading-none">
                {healthScore.score}
              </span>
              <span className="text-[8px] text-[#737373]">/1000</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#737373] uppercase tracking-wider font-medium">
                Score de Saúde Financeira
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{ backgroundColor: `${healthScore.statusColor}22`, color: healthScore.statusColor }}
              >
                {healthScore.status}
              </span>
            </div>
            <p className="text-xs text-[#A3A3A3] mt-1 line-clamp-1">
              {healthScore.actionableTips[0] || 'Seus indicadores financeiros do mês'}
            </p>
          </div>
        </div>

        <button className="flex items-center gap-1.5 text-xs font-semibold text-[#A8B5D1] hover:text-white shrink-0">
          <span>Ver Pilares & Projeções</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 4. Estrutura de Gastos: Diários vs Fixos vs Parcelas */}
      <div className="p-5 rounded-3xl bg-[#141414] border border-[#262626]">
        <h3 className="text-xs font-semibold text-[#737373] uppercase tracking-wider mb-4">
          Composição dos Gastos
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Gastos Diários */}
          <div className="p-3.5 rounded-2xl bg-[#0D0D0D] border border-[#1E1E1E]">
            <div className="text-[11px] text-[#737373] flex items-center justify-between">
              <span>Gastos Diários</span>
              <span className="font-mono text-white">
                {expensesTotal > 0 ? `${Math.round((dailyExpensesTotal / expensesTotal) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="text-lg font-bold text-white mt-1">
              {formatBRL(dailyExpensesTotal)}
            </div>
            <div className="w-full bg-[#1A1A1A] h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-[#A8B5D1] h-full rounded-full" 
                style={{ width: `${expensesTotal > 0 ? (dailyExpensesTotal / expensesTotal) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Gastos Fixos Recorrentes */}
          <div className="p-3.5 rounded-2xl bg-[#0D0D0D] border border-[#1E1E1E]">
            <div className="text-[11px] text-[#737373] flex items-center justify-between">
              <span>Custos Fixos</span>
              <span className="font-mono text-white">
                {expensesTotal > 0 ? `${Math.round((fixedExpensesTotal / expensesTotal) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="text-lg font-bold text-white mt-1">
              {formatBRL(fixedExpensesTotal)}
            </div>
            <div className="w-full bg-[#1A1A1A] h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-[#E5A97D] h-full rounded-full" 
                style={{ width: `${expensesTotal > 0 ? (fixedExpensesTotal / expensesTotal) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Parcelamentos */}
          <div className="p-3.5 rounded-2xl bg-[#0D0D0D] border border-[#1E1E1E]">
            <div className="text-[11px] text-[#737373] flex items-center justify-between">
              <span>Parcelamentos Ativos</span>
              <span className="font-mono text-[#E29578]">
                {expensesTotal > 0 ? `${Math.round((installmentsTotal / expensesTotal) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="text-lg font-bold text-[#E29578] mt-1">
              {formatBRL(installmentsTotal)}
            </div>
            <div className="w-full bg-[#1A1A1A] h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-[#E29578] h-full rounded-full" 
                style={{ width: `${expensesTotal > 0 ? (installmentsTotal / expensesTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Acesso Rápido a Limites Orçamentários */}
      <div className="p-5 rounded-3xl bg-[#141414] border border-[#262626]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-[#737373] uppercase tracking-wider">
            Tetos Orçamentários em Tempo Real
          </h3>
          <button
            onClick={() => onNavigateTab('budgets')}
            className="text-xs font-medium text-[#A8B5D1] hover:text-white flex items-center gap-1"
          >
            <span>Gerenciar</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {budgetsStatus.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#737373]">
            Nenhum limite configurado ainda. Toque em &quot;Gerenciar&quot; para definir tetos orçamentários por categoria.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {budgetsStatus.slice(0, 4).map(b => (
              <div key={b.category} className="p-3 bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-white">{b.category}</span>
                  <span className="text-[#A3A3A3] text-[11px]">
                    {formatBRL(b.spent)} / <span className="text-[#737373]">{formatBRL(b.limit)}</span>
                  </span>
                </div>
                <div className="w-full bg-[#1E1E1E] h-2 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      b.status === 'danger'
                        ? 'bg-[#E29578]'
                        : b.status === 'warning'
                        ? 'bg-[#E5A97D]'
                        : 'bg-[#A3C9A8]'
                    }`}
                    style={{ width: `${Math.min(100, b.percentage)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] mt-1.5 text-[#737373]">
                  <span>{Math.round(b.percentage)}% consumido</span>
                  <span className={b.status === 'danger' ? 'text-[#E29578] font-semibold' : ''}>
                    {b.status === 'danger' ? 'Limite excedido' : `Resta ${formatBRL(Math.max(0, b.limit - b.spent))}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Extrato Recente */}
      <div className="p-5 rounded-3xl bg-[#141414] border border-[#262626]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[#737373] uppercase tracking-wider">
            Últimos Lançamentos
          </h3>
          <button
            onClick={() => onNavigateTab('transactions')}
            className="text-xs font-medium text-[#A8B5D1] hover:text-white flex items-center gap-1"
          >
            <span>Ver Todos</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#737373]">
            Nenhum lançamento registrado neste mês.
          </div>
        ) : (
          <div className="divide-y divide-[#1F1F1F]">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${
                      tx.type === 'income'
                        ? 'bg-[#A3C9A8]/15 text-[#A3C9A8]'
                        : 'bg-[#E29578]/15 text-[#E29578]'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {tx.description}
                    </div>
                    <div className="text-[10px] text-[#737373] flex items-center gap-1.5 mt-0.5">
                      <span>{tx.category}</span>
                      <span>•</span>
                      <span>{tx.date.slice(8, 10)}/{tx.date.slice(5, 7)}</span>
                      {tx.nature === 'installment' && tx.installmentDetails && (
                        <>
                          <span>•</span>
                          <span className="text-[#A8B5D1]">
                            {tx.installmentDetails.currentInstallment}/{tx.installmentDetails.totalInstallments}x
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-xs font-bold font-mono ${
                      tx.type === 'income' ? 'text-[#A3C9A8]' : 'text-white'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'} {formatBRL(tx.amount)}
                  </div>
                  {tx.nature === 'fixed' && (
                    <div className="text-[9px] mt-0.5">
                      {tx.isPaid ? (
                        <span className="text-[#A3C9A8]">Pago</span>
                      ) : (
                        <span className="text-[#E29578]">Pendente</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
