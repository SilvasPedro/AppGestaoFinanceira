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
  Clock,
  Plus,
  Repeat,
  Target
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { TabType } from '../common/BottomNav';
import type { AddPreset } from '../modals/TransactionModal';
import { enteredOnLabel, latestEntered } from '../../services/recent';
import { formatBRL } from '../../lib/format';

interface DashboardTabProps {
  onNavigateTab: (tab: TabType) => void;
  onOpenAddModal: (preset?: AddPreset) => void;
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
    monthTransactions,
    transactions,
    activeFixedCount,
    activeInstallmentsCount
  } = useFinance();


  const warningBudgets = budgetsStatus.filter(b => b.status === 'warning');
  const dangerBudgets = budgetsStatus.filter(b => b.status === 'danger');

  // Últimos 5 lançamentos na ordem em que foram registrados (não pela data do lançamento)
  const recentTransactions = React.useMemo(() => latestEntered(transactions, 5), [transactions]);

  const [showAlertsExpanded, setShowAlertsExpanded] = React.useState(false);
  const [budgetCategoryView, setBudgetCategoryView] = React.useState<'budgets' | 'categories'>('budgets');

  // Agrupamento detalhado de gastos por categoria no mês vigente (Diretriz 3)
  const categorySpending = React.useMemo(() => {
    const expenseTx = monthTransactions.filter(tx => tx.type === 'expense');
    const catMap: Record<string, { total: number; count: number }> = {};

    expenseTx.forEach(tx => {
      const cat = tx.category || 'Outros';
      if (!catMap[cat]) {
        catMap[cat] = { total: 0, count: 0 };
      }
      catMap[cat].total += tx.amount;
      catMap[cat].count += 1;
    });

    return Object.entries(catMap)
      .map(([category, data]) => ({
        category,
        spent: data.total,
        count: data.count,
        percentage: expensesTotal > 0 ? (data.total / expensesTotal) * 100 : 0
      }))
      .sort((a, b) => b.spent - a.spent);
  }, [monthTransactions, expensesTotal]);

  return (
    <div className="space-y-6 pb-24 w-full">
      {/* Onboarding Welcome Card (Zero-State para novo usuário ou mês sem lançamentos) */}
      {monthTransactions.length === 0 && (
        <div className="card-depth-3d p-6 rounded-3xl bg-linear-to-br from-[#181D27] to-[#131720] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[#A3C9A8] bg-[#A3C9A8]/10 border border-[#A3C9A8]/20 px-2 py-0.5 rounded-full">
                  Painel Limpo
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-2">
                Bem-vindo ao Finances PRO
              </h2>
              <p className="text-xs text-[#AEB6C4] mt-0.5 max-w-xl">
                Sua conta está pronta. Comece registrando sua primeira movimentação:
              </p>
            </div>
          </div>

          {/* 4 Ações Rápidas de Início com Liquid Glass */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <button
              onClick={() => onOpenAddModal({ type: 'income', nature: 'daily' })}
              className="btn-liquid-glass p-3.5 rounded-2xl text-left transition group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-[#A3C9A8]/15 text-[#A3C9A8] flex items-center justify-center text-xs font-bold mb-2 group-hover:scale-105 transition-transform">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-white group-hover:text-[#A3C9A8] transition">
                Cadastrar Receita
              </div>
              <div className="text-[10px] text-[#9AA4B5] mt-0.5">
                Salário ou rendimentos
              </div>
            </button>

            <button
              onClick={() => onOpenAddModal({ type: 'expense', nature: 'daily' })}
              className="btn-liquid-glass p-3.5 rounded-2xl text-left transition group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-[#A8B5D1]/15 text-[#A8B5D1] flex items-center justify-center text-xs font-bold mb-2 group-hover:scale-105 transition-transform">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-white group-hover:text-[#A8B5D1] transition">
                Gasto Diário
              </div>
              <div className="text-[10px] text-[#9AA4B5] mt-0.5">
                Alimentação, transporte...
              </div>
            </button>

            <button
              onClick={() => onOpenAddModal({ type: 'expense', nature: 'fixed' })}
              className="btn-liquid-glass p-3.5 rounded-2xl text-left transition group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-[#E5A97D]/15 text-[#E5A97D] flex items-center justify-center text-xs font-bold mb-2 group-hover:scale-105 transition-transform">
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-white group-hover:text-[#E5A97D] transition">
                Conta Fixa
              </div>
              <div className="text-[10px] text-[#9AA4B5] mt-0.5">
                Aluguel, contas recorrentes
              </div>
            </button>

            <button
              onClick={() => onNavigateTab('budgets')}
              className="btn-liquid-glass p-3.5 rounded-2xl text-left transition group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-[#E29578]/15 text-[#E29578] flex items-center justify-center text-xs font-bold mb-2 group-hover:scale-105 transition-transform">
                <Layers className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-white group-hover:text-[#E29578] transition">
                Definir Tetos
              </div>
              <div className="text-[10px] text-[#9AA4B5] mt-0.5">
                Limites por categoria
              </div>
            </button>
          </div>
        </div>
      )}
      {/* 1. Alertas de Estouro / Vencimento (Compacto com expansão opcional) */}
      {(dangerBudgets.length > 0 || warningBudgets.length > 0 || pendingBillsCount > 0) && (
        <div className="card-depth-3d rounded-2xl overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => setShowAlertsExpanded(!showAlertsExpanded)}
            aria-expanded={showAlertsExpanded}
            className="w-full text-left p-3.5 flex items-center justify-between cursor-pointer hover:bg-[#1C212C] transition"
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
                <span className="text-[#AEB6C4] text-[11px] block sm:inline sm:ml-2">
                  {pendingBillsCount > 0 && `• ${pendingBillsCount} conta(s) pendente(s)`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#A8B5D1]">
              <span className="hidden xs:inline">{showAlertsExpanded ? 'Ocultar' : 'Ver Detalhes'}</span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${showAlertsExpanded ? 'rotate-90' : ''}`} />
            </div>
          </button>

          {showAlertsExpanded && (
            <div className="p-3 bg-[#0F1218] border-t border-[#1F2531] space-y-2">
              {dangerBudgets.map(b => (
                <button
                  type="button"
                  key={b.category}
                  onClick={() => onNavigateTab('budgets')}
                  className="w-full text-left p-2.5 bg-[#E29578]/10 border border-[#E29578]/30 rounded-xl flex items-center justify-between cursor-pointer hover:bg-[#E29578]/20 transition"
                >
                  <div className="text-xs">
                    <span className="font-semibold text-[#E29578]">Estourado: {b.category}</span>
                    <span className="text-[#AEB6C4] text-[11px] ml-2">
                      Gasto de {formatBRL(b.spent)} ({Math.round(b.percentage)}% de {formatBRL(b.limit)})
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#E29578]" />
                </button>
              ))}

              {warningBudgets.map(b => (
                <button
                  type="button"
                  key={b.category}
                  onClick={() => onNavigateTab('budgets')}
                  className="w-full text-left p-2.5 bg-[#E5A97D]/10 border border-[#E5A97D]/25 rounded-xl flex items-center justify-between cursor-pointer hover:bg-[#E5A97D]/20 transition"
                >
                  <div className="text-xs">
                    <span className="font-semibold text-[#E5A97D]">Atenção: {b.category}</span>
                    <span className="text-[#9AA4B5] text-[11px] ml-2">
                      {Math.round(b.percentage)}% do teto • Resta {formatBRL(Math.max(0, b.limit - b.spent))}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#E5A97D]" />
                </button>
              ))}

              {pendingBillsCount > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('transactions')}
                  className="w-full text-left p-2.5 bg-[#A8B5D1]/10 border border-[#A8B5D1]/25 rounded-xl flex items-center justify-between cursor-pointer hover:bg-[#A8B5D1]/20 transition"
                >
                  <div className="text-xs">
                    <span className="font-semibold text-[#A8B5D1]">Contas Pendentes</span>
                    <span className="text-[#9AA4B5] text-[11px] ml-2">
                      {pendingBillsCount} fatura(s) aguardando pagamento neste mês
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#A8B5D1]" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. Hero Cards de Saldo e Entradas/Saídas (Diretriz 1: Profundidade 3D e Sombras Escalonadas) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Card Saldo Líquido */}
        <div className="card-depth-hero card-depth-3d-interactive col-span-2 sm:col-span-1 p-5 rounded-3xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-[#8E98A9] mb-1">
            <span className="font-medium">Sobra Líquida (Superávit)</span>
            <div className="w-8 h-8 rounded-xl bg-[#A8B5D1]/15 text-[#A8B5D1] flex items-center justify-center transition-transform group-hover:scale-110">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-white mt-1">
            {formatBRL(netSurplus)}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                netSurplus >= 0
                  ? 'bg-[#A3C9A8]/15 text-[#A3C9A8] border border-[#A3C9A8]/30 shadow-xs'
                  : 'bg-[#E29578]/15 text-[#E29578] border border-[#E29578]/30 shadow-xs'
              }`}
            >
              {incomeTotal > 0 ? `${Math.round((netSurplus / incomeTotal) * 100)}% da renda` : '0%'}
            </span>
            <span className="text-[11px] text-[#9AA4B5]">
              {netSurplus >= 0 ? 'Economizado no mês' : 'Déficit orçamentário'}
            </span>
          </div>
        </div>

        {/* Card Receitas */}
        <div className="card-depth-hero tint-mint card-depth-3d-interactive p-4 sm:p-5 rounded-3xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-[#8E98A9] mb-1">
            <span className="font-medium">Receitas Totais</span>
            <div className="w-8 h-8 rounded-xl bg-[#A3C9A8]/15 flex items-center justify-center text-[#A3C9A8] transition-transform group-hover:scale-110">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold tracking-tight text-[#A3C9A8] mt-1">
            {formatBRL(incomeTotal)}
          </div>
          <div className="mt-3 text-[11px] text-[#9AA4B5]">
            Salário, rendimentos e extras
          </div>
        </div>

        {/* Card Despesas */}
        <div className="card-depth-hero tint-coral card-depth-3d-interactive p-4 sm:p-5 rounded-3xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-[#8E98A9] mb-1">
            <span className="font-medium">Despesas Totais</span>
            <div className="w-8 h-8 rounded-xl bg-[#E29578]/15 flex items-center justify-center text-[#E29578] transition-transform group-hover:scale-110">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold tracking-tight text-[#E29578] mt-1">
            {formatBRL(expensesTotal)}
          </div>
          <div className="mt-3 text-[11px] text-[#9AA4B5]">
            Fixos, parcelas e variáveis
          </div>
        </div>
      </div>

      {/* 3. Score de Saúde Financeira (Banner Interativo com Profundidade 3D em Repouso e Liquid Glass) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onNavigateTab('projections')}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onNavigateTab('projections');
          }
        }}
        className="card-depth-3d card-depth-3d-interactive p-5 rounded-3xl bg-linear-to-r from-[#181D27] to-[#131720] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer group"
      >
        <div className="flex items-center gap-4">
          {/* Circular Score Gauge */}
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-16 h-16 -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="26"
                stroke="#283040"
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
                strokeDashoffset={healthScore.isEmpty ? 163.3 : 163.3 - (163.3 * (healthScore.score / 1000))}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-bold text-white font-mono leading-none">
                {healthScore.isEmpty ? '—' : healthScore.score}
              </span>
              <span className="text-[8px] text-[#9AA4B5]">{healthScore.isEmpty ? 'sem dados' : '/1000'}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#9AA4B5] uppercase tracking-wider font-medium">
                Score de Saúde Financeira
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{ backgroundColor: `${healthScore.statusColor}22`, color: healthScore.statusColor }}
              >
                {healthScore.status}
              </span>
            </div>
            <p className="text-xs text-[#AEB6C4] mt-1 line-clamp-1">
              {healthScore.isEmpty 
                ? 'Adicione sua primeira receita ou despesa para iniciar a análise do seu Score.' 
                : (healthScore.actionableTips[0] || 'Seus indicadores financeiros do mês')}
            </p>
          </div>
        </div>

        <button className="btn-liquid-glass flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#A8B5D1] group-hover:text-white shrink-0">
          <span>{healthScore.isEmpty ? 'Conhecer os 4 Pilares' : 'Ver Pilares & Projeções'}</span>
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* 4. Estrutura de Gastos: Diários vs Fixos vs Parcelas (Card 3D) */}
      <div className="card-depth-3d p-5 rounded-3xl">
        <h3 className="text-xs font-semibold text-[#9AA4B5] uppercase tracking-wider mb-4">
          Composição dos Gastos
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Gastos Diários */}
          <div className="p-3.5 rounded-2xl bg-[#0F1218] border border-[#1F2531]">
            <div className="text-[11px] text-[#9AA4B5] flex items-center justify-between">
              <span>Gastos Diários</span>
              <span className="font-mono text-white">
                {expensesTotal > 0 ? `${Math.round((dailyExpensesTotal / expensesTotal) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="text-lg font-bold text-white mt-1">
              {formatBRL(dailyExpensesTotal)}
            </div>
            <div className="w-full bg-[#1C212C] h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-[#A8B5D1] h-full rounded-full" 
                style={{ width: `${expensesTotal > 0 ? (dailyExpensesTotal / expensesTotal) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Gastos Fixos Recorrentes */}
          <div className="p-3.5 rounded-2xl bg-[#0F1218] border border-[#1F2531]">
            <div className="text-[11px] text-[#9AA4B5] flex items-center justify-between">
              <span>Custos Fixos</span>
              <span className="font-mono text-white">
                {expensesTotal > 0 ? `${Math.round((fixedExpensesTotal / expensesTotal) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="text-lg font-bold text-white mt-1">
              {formatBRL(fixedExpensesTotal)}
            </div>
            <div className="w-full bg-[#1C212C] h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-[#E5A97D] h-full rounded-full" 
                style={{ width: `${expensesTotal > 0 ? (fixedExpensesTotal / expensesTotal) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Parcelamentos */}
          <div className="p-3.5 rounded-2xl bg-[#0F1218] border border-[#1F2531]">
            <div className="text-[11px] text-[#9AA4B5] flex items-center justify-between">
              <span>Parcelamentos Ativos</span>
              <span className="font-mono text-[#E29578]">
                {expensesTotal > 0 ? `${Math.round((installmentsTotal / expensesTotal) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="text-lg font-bold text-[#E29578] mt-1">
              {formatBRL(installmentsTotal)}
            </div>
            <div className="w-full bg-[#1C212C] h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-[#E29578] h-full rounded-full" 
                style={{ width: `${expensesTotal > 0 ? (installmentsTotal / expensesTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Atalho para Compromissos Recorrentes & Parcelamentos (Card Interativo 3D em Repouso com Liquid Glass) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onNavigateTab('recurring')}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onNavigateTab('recurring');
          }
        }}
        className="card-depth-3d card-depth-3d-interactive p-4 sm:p-5 rounded-3xl bg-linear-to-r from-[#181D27] to-[#151A23] cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#E5A97D]/15 text-[#E5A97D] border border-[#E5A97D]/25 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-white group-hover:text-[#E5A97D] transition">
                Compromissos Recorrentes & Parcelamentos
              </h4>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-[#283040] text-[#AEB6C4]">
                Atalho
              </span>
            </div>
            <p className="text-xs text-[#9AA4B5] mt-0.5">
              {activeFixedCount} pagamentos fixos ativos • {activeInstallmentsCount} parcelamentos em andamento
            </p>
          </div>
        </div>

        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigateTab('recurring');
          }}
          className="btn-liquid-glass flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#E5A97D] group-hover:text-white transition shrink-0 cursor-pointer"
        >
          <span>Gerenciar & Adiantar</span>
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* 5. Alternância na Visão Geral: Tetos Orçamentários vs Gastos por Categoria (Diretriz 3) */}
      <div className="card-depth-3d p-5 rounded-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          {/* Toggle Segmentado em Liquid Glass */}
          <div className="flex items-center gap-1 p-1 bg-[#0F1218] border border-[#252C39] rounded-xl self-start">
            <button
              type="button"
              onClick={() => setBudgetCategoryView('budgets')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                budgetCategoryView === 'budgets'
                  ? 'bg-[#202733] text-white shadow-xs border border-[#363F50]'
                  : 'text-[#8892A4] hover:text-white'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-[#E29578]" />
              <span>Tetos Orçamentários</span>
            </button>
            <button
              type="button"
              onClick={() => setBudgetCategoryView('categories')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                budgetCategoryView === 'categories'
                  ? 'bg-[#202733] text-white shadow-xs border border-[#363F50]'
                  : 'text-[#8892A4] hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#A8B5D1]" />
              <span>Gastos por Categoria</span>
            </button>
          </div>

          {/* Botão de Ação contextual */}
          {budgetCategoryView === 'budgets' ? (
            <button
              onClick={() => onNavigateTab('budgets')}
              className="btn-liquid-glass px-2.5 py-1 rounded-lg text-xs font-medium text-[#A8B5D1] hover:text-white flex items-center gap-1 self-end sm:self-auto"
            >
              <span>Gerenciar Tetos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => onNavigateTab('transactions')}
              className="btn-liquid-glass px-2.5 py-1 rounded-lg text-xs font-medium text-[#A8B5D1] hover:text-white flex items-center gap-1 self-end sm:self-auto"
            >
              <span>Ver Extrato</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Visualização 1: Tetos Orçamentários */}
        {budgetCategoryView === 'budgets' && (
          <>
            {budgetsStatus.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#9AA4B5]">
                <p>Nenhum teto orçamentário configurado ainda.</p>
                <button
                  onClick={() => onNavigateTab('budgets')}
                  className="btn-liquid-glass-primary mt-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  + Definir Primeiro Teto
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {budgetsStatus.slice(0, 6).map(b => (
                  <div key={b.category} className="p-3 bg-[#0F1218] border border-[#1F2531] rounded-2xl">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-white">{b.category}</span>
                      <span className="text-[#AEB6C4] text-[11px]">
                        {formatBRL(b.spent)} / <span className="text-[#9AA4B5]">{formatBRL(b.limit)}</span>
                      </span>
                    </div>
                    <div className="w-full bg-[#1F2531] h-2 rounded-full mt-2 overflow-hidden">
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
                    <div className="flex justify-between items-center text-[10px] mt-1.5 text-[#9AA4B5]">
                      <span>{Math.round(b.percentage)}% consumido</span>
                      <span className={b.status === 'danger' ? 'text-[#E29578] font-semibold' : ''}>
                        {b.status === 'danger' ? 'Limite excedido' : `Resta ${formatBRL(Math.max(0, b.limit - b.spent))}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Visualização 2: Gastos por Categoria (Detalhamento do que foi gasto) */}
        {budgetCategoryView === 'categories' && (
          <>
            {categorySpending.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#9AA4B5]">
                <p>Nenhuma despesa registrada para categorizar neste mês.</p>
                <button
                  onClick={() => onOpenAddModal()}
                  className="btn-liquid-glass-primary mt-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  + Adicionar Despesa
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categorySpending.map(cat => (
                    <div 
                      key={cat.category}
                      className="p-3.5 bg-[#0F1218] border border-[#1F2531] rounded-2xl hover:border-[#2C2C2C] transition"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#A8B5D1]" />
                          <span className="font-semibold text-white">{cat.category}</span>
                        </div>
                        <span className="font-bold text-white font-mono">
                          {formatBRL(cat.spent)}
                        </span>
                      </div>
                      <div className="w-full bg-[#1F2531] h-2 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="bg-[#A8B5D1] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(3, cat.percentage))}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] mt-1.5 text-[#9AA4B5]">
                        <span>{cat.count} lançamento(s)</span>
                        <span className="text-[#AEB6C4] font-medium font-mono">
                          {cat.percentage.toFixed(1)}% do total gasto
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sub-rodapé informativo com totais */}
                <div className="pt-2.5 flex items-center justify-between text-[11px] text-[#9AA4B5] px-1 border-t border-[#1E2430]">
                  <span>Total de categorias com gastos: <strong className="text-white">{categorySpending.length}</strong></span>
                  <span>Total em despesas: <strong className="text-[#E29578]">{formatBRL(expensesTotal)}</strong></span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 6. Extrato Recente (Card 3D) */}
      <div className="card-depth-3d p-5 rounded-3xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[#9AA4B5] uppercase tracking-wider">
            Últimos Lançamentos
          </h3>
          <button
            onClick={() => onNavigateTab('transactions')}
            className="btn-liquid-glass px-2.5 py-1 rounded-lg text-xs font-medium text-[#A8B5D1] hover:text-white flex items-center gap-1"
          >
            <span>Ver Todos</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#9AA4B5]">
            <p>Nenhum lançamento registrado ainda.</p>
            <button
              onClick={() => onOpenAddModal()}
              className="btn-liquid-glass-primary mt-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              + Fazer Primeiro Lançamento
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#202733]">
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
                    {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {tx.description}
                    </div>
                    <div className="text-[10px] text-[#9AA4B5] flex items-center gap-1.5 mt-0.5">
                      <span>{tx.category}</span>
                      <span>•</span>
                      {enteredOnLabel(tx.createdAt) ? (
                        <>
                          <span title="Dia em que você registrou">registrado {enteredOnLabel(tx.createdAt)}</span>
                          {enteredOnLabel(tx.createdAt) !== `${tx.date.slice(8, 10)}/${tx.date.slice(5, 7)}` && (
                            <span title="Data do lançamento (mês da fatura ou do vencimento)">· para {tx.date.slice(8, 10)}/{tx.date.slice(5, 7)}</span>
                          )}
                        </>
                      ) : (
                        <span>{tx.date.slice(8, 10)}/{tx.date.slice(5, 7)}</span>
                      )}
                      {tx.nature === 'installment' && tx.installmentDetails && (
                        <>
                          <span>•</span>
                          <span className={tx.type === 'income' ? 'text-[#A3C9A8]' : 'text-[#A8B5D1]'}>
                            {tx.type === 'income' ? 'Venda ' : ''}{tx.installmentDetails.currentInstallment}/{tx.installmentDetails.totalInstallments}x
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
                  {(tx.nature === 'fixed' || tx.nature === 'installment') && (
                    <div className="text-[9px] mt-0.5">
                      {tx.isPaid ? (
                        <span className="text-[#A3C9A8]">{tx.type === 'income' ? 'Recebido' : 'Pago'}</span>
                      ) : (
                        <span className="text-[#E29578]">{tx.type === 'income' ? 'A Receber' : 'Pendente'}</span>
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
