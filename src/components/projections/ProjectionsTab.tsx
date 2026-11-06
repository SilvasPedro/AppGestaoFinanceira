import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles, 
  Calendar, 
  Layers,
  ChevronRight,
  Target,
  Sliders,
  PiggyBank,
  CheckCircle2,
  TrendingDown,
  ArrowRight,
  ArrowUpRight,
  Repeat,
  Wallet,
  Zap,
  Info
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { calculateFreedomSimulation } from '../../services/projections';
import { formatBRLRounded as formatBRL } from '../../lib/format';

export const ProjectionsTab: React.FC = () => {
  const { 
    healthScore, 
    cashFlowProjections, 
    annualInterestRate, 
    setAnnualInterestRate,
    netSurplus,
    incomeTotal,
    fixedExpensesTotal,
    dailyExpensesTotal
  } = useFinance();

  const [activeSubTab, setActiveSubTab] = useState<'score' | 'debt_curve' | 'freedom_curve'>('score');
  const [customMonthlySaving, setCustomMonthlySaving] = useState<number | null>(null);


  const hasAnyDeficit = cashFlowProjections.some(p => p.isDeficit);

  // Cálculos para Liberdade Financeira
  const recommendedSaving = Math.max(300, Math.round(incomeTotal ? incomeTotal * 0.20 : 600));
  const simulatedSaving = customMonthlySaving !== null 
    ? customMonthlySaving 
    : (netSurplus > 0 ? Math.round(netSurplus) : recommendedSaving);

  const essentialCost = Math.max(0, fixedExpensesTotal + dailyExpensesTotal * 0.7) || 2500;

  const simulatedFreedom = useMemo(() => {
    return calculateFreedomSimulation(
      simulatedSaving,
      0,
      annualInterestRate,
      20,
      essentialCost
    );
  }, [simulatedSaving, annualInterestRate, essentialCost]);

  const freedomWithRecommended = useMemo(() => {
    return calculateFreedomSimulation(
      recommendedSaving,
      0,
      annualInterestRate,
      20,
      essentialCost
    );
  }, [recommendedSaving, annualInterestRate, essentialCost]);

  return (
    <div className="space-y-5 pb-24 w-full">
      {/* Sub Navigation Tabs com Estilo Liquid Glass */}
      <div className="card-depth-3d flex items-center gap-1.5 p-1.5 rounded-2xl overflow-x-auto no-scrollbar border border-white/10">
        <button
          onClick={() => setActiveSubTab('score')}
          className={`flex-1 py-2.5 px-3.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeSubTab === 'score'
              ? 'btn-liquid-glass-primary text-black shadow-md'
              : 'btn-liquid-glass text-[#8E98A9] hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Score de Saúde</span>
        </button>

        <button
          onClick={() => setActiveSubTab('debt_curve')}
          className={`flex-1 py-2.5 px-3.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeSubTab === 'debt_curve'
              ? 'btn-liquid-glass-primary text-black shadow-md'
              : 'btn-liquid-glass text-[#8E98A9] hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Curva de Parcelas & Déficit</span>
          {hasAnyDeficit && (
            <span className="w-2 h-2 rounded-full bg-[#E29578] animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('freedom_curve')}
          className={`flex-1 py-2.5 px-3.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeSubTab === 'freedom_curve'
              ? 'btn-liquid-glass-primary text-black shadow-md'
              : 'btn-liquid-glass text-[#8E98A9] hover:text-white'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Liberdade Financeira</span>
        </button>
      </div>

      {/* ============================================================= */}
      {/* SEÇÃO 1: SCORE DE SAÚDE FINANCEIRA (4 PILARES) */}
      {/* ============================================================= */}
      {activeSubTab === 'score' && (
        <div className="space-y-4">
          {/* Main Score Hero Card (3D Depth) */}
          <div className="card-depth-hero p-6 rounded-3xl flex flex-col md:flex-row items-center gap-6">
            {/* Visual Gauge */}
            <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
              <svg className="w-40 h-40 -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="66"
                  stroke="#1F2531"
                  strokeWidth="10"
                  fill="none"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="66"
                  stroke={healthScore.statusColor}
                  strokeWidth="10"
                  strokeDasharray="414.7"
                  strokeDashoffset={healthScore.isEmpty ? 414.7 : 414.7 - (414.7 * (healthScore.score / 1000))}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white font-mono">
                  {healthScore.isEmpty ? '—' : healthScore.score}
                </span>
                <span className="text-xs text-[#9AA4B5]">{healthScore.isEmpty ? 'sem dados' : 'de 1000'}</span>
                <span
                  className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                  style={{ backgroundColor: `${healthScore.statusColor}22`, color: healthScore.statusColor }}
                >
                  {healthScore.status}
                </span>
              </div>
            </div>

            {/* Score Context */}
            <div className="space-y-2 text-center md:text-left flex-1">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <ShieldCheck className="w-5 h-5 text-[#A3C9A8]" />
                <h3 className="text-base font-bold text-white">Score de Governança Pessoal</h3>
              </div>
              <p className="text-xs text-[#AEB6C4] leading-relaxed">
                Calculado com base em 4 pilares: taxa de poupança (35%), comprometimento de renda (25%), disciplina de tetos (25%) e consistência de registros (15%).
              </p>
              <div className="pt-2 flex flex-wrap gap-2 justify-center md:justify-start">
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[#151A23] border border-[#283040] text-[#AEB6C4]">
                  Poupança: <strong className="text-white font-mono">{healthScore.pillars.savingsRate.score}/350</strong>
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[#151A23] border border-[#283040] text-[#AEB6C4]">
                  Comprometimento: <strong className="text-white font-mono">{healthScore.pillars.incomeCommitment.score}/250</strong>
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[#151A23] border border-[#283040] text-[#AEB6C4]">
                  Tetos: <strong className="text-white font-mono">{healthScore.pillars.budgetDiscipline.score}/250</strong>
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[#151A23] border border-[#283040] text-[#AEB6C4]">
                  Registros: <strong className="text-white font-mono">{healthScore.pillars.entryConsistency.score}/150</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Detailed 4 Pillars Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pilar 1: Taxa de Poupança */}
            <div className="card-depth-3d p-4 rounded-2xl space-y-2 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Taxa de Poupança (35%)</span>
                <span className="text-xs font-mono font-bold text-[#A3C9A8]">
                  {healthScore.pillars.savingsRate.score}/350
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#1F2531] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#A3C9A8] transition-all duration-500"
                  style={{ width: `${(healthScore.pillars.savingsRate.score / 350) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-[#9AA4B5]">
                {healthScore.pillars.savingsRate.label} • {healthScore.pillars.savingsRate.status}
              </p>
            </div>

            {/* Pilar 2: Comprometimento de Renda */}
            <div className="card-depth-3d p-4 rounded-2xl space-y-2 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Comprometimento de Renda (25%)</span>
                <span className="text-xs font-mono font-bold text-[#A8B5D1]">
                  {healthScore.pillars.incomeCommitment.score}/250
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#1F2531] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#A8B5D1] transition-all duration-500"
                  style={{ width: `${(healthScore.pillars.incomeCommitment.score / 250) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-[#9AA4B5]">
                {healthScore.pillars.incomeCommitment.label} • {healthScore.pillars.incomeCommitment.status}
              </p>
            </div>

            {/* Pilar 3: Disciplina de Tetos */}
            <div className="card-depth-3d p-4 rounded-2xl space-y-2 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Disciplina de Tetos (25%)</span>
                <span className="text-xs font-mono font-bold text-[#E5A97D]">
                  {healthScore.pillars.budgetDiscipline.score}/250
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#1F2531] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#E5A97D] transition-all duration-500"
                  style={{ width: `${(healthScore.pillars.budgetDiscipline.score / 250) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-[#9AA4B5]">
                {healthScore.pillars.budgetDiscipline.label} • {healthScore.pillars.budgetDiscipline.status}
              </p>
            </div>

            {/* Pilar 4: Consistência de Lançamentos */}
            <div className="card-depth-3d p-4 rounded-2xl space-y-2 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Consistência de Registro (15%)</span>
                <span className="text-xs font-mono font-bold text-[#E29578]">
                  {healthScore.pillars.entryConsistency.score}/150
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#1F2531] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#E29578] transition-all duration-500"
                  style={{ width: `${(healthScore.pillars.entryConsistency.score / 150) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-[#9AA4B5]">
                {healthScore.pillars.entryConsistency.label} • {healthScore.pillars.entryConsistency.status}
              </p>
            </div>
          </div>

          {/* Actionable Tips com Estilo Liquid Glass */}
          {healthScore.actionableTips.length > 0 && (
            <div className="card-depth-3d p-5 rounded-3xl space-y-3 border border-white/10">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Sparkles className="w-4 h-4 text-[#A3C9A8]" />
                <span>Recomendações Comportamentais para o seu Perfil</span>
              </div>
              <div className="space-y-2">
                {healthScore.actionableTips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-[#AEB6C4] p-3 rounded-2xl bg-[#131720] border border-white/5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#A3C9A8] mt-1.5 shrink-0" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* SEÇÃO 2: CURVA DE PARCELAS & DÉFICIT FUTURO (RECALCULADA & 3D) */}
      {/* ============================================================= */}
      {activeSubTab === 'debt_curve' && (
        <div className="space-y-4">
          {/* Header Hero Card */}
          <div className="card-depth-3d p-5 sm:p-6 rounded-3xl space-y-4 border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl btn-liquid-glass flex items-center justify-center text-[#A8B5D1] shadow-md">
                  <Layers className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Projeção de Fluxo de Caixa (Próximos 6 Meses)
                  </h3>
                  <p className="text-xs text-[#8E98A9] mt-0.5">
                    Amortização progressiva de parcelamentos, custos fixos e conciliação do saldo futuro.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className={`text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 ${
                  hasAnyDeficit
                    ? 'bg-[#E29578]/15 text-[#E29578] border border-[#E29578]/30 shadow-xs'
                    : 'bg-[#A3C9A8]/15 text-[#A3C9A8] border border-[#A3C9A8]/30 shadow-xs'
                }`}>
                  {hasAnyDeficit ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Atenção a meses com déficit</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Superávit em todos os meses</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="p-3 rounded-2xl bg-[#131720] border border-white/8">
                <span className="text-[10px] text-[#9AA4B5] uppercase tracking-wider block font-semibold">Horizonte</span>
                <span className="text-sm font-bold font-mono text-white mt-0.5 block">6 Meses</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#131720] border border-white/8">
                <span className="text-[10px] text-[#9AA4B5] uppercase tracking-wider block font-semibold">Parcelas no Início</span>
                <span className="text-sm font-bold font-mono text-[#E29578] mt-0.5 block">
                  {formatBRL(cashFlowProjections[0]?.installmentsTotal || 0)}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#131720] border border-white/8">
                <span className="text-[10px] text-[#9AA4B5] uppercase tracking-wider block font-semibold">Parcelas no Final</span>
                <span className="text-sm font-bold font-mono text-[#A3C9A8] mt-0.5 block">
                  {formatBRL(cashFlowProjections[cashFlowProjections.length - 1]?.installmentsTotal || 0)}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#131720] border border-white/8">
                <span className="text-[10px] text-[#9AA4B5] uppercase tracking-wider block font-semibold">Alívio Projetado</span>
                <span className="text-sm font-bold font-mono text-white mt-0.5 block">
                  {formatBRL(Math.max(0, (cashFlowProjections[0]?.installmentsTotal || 0) - (cashFlowProjections[cashFlowProjections.length - 1]?.installmentsTotal || 0)))}
                </span>
              </div>
            </div>
          </div>

          {/* Month by Month Projection Modular Cards (Visual 3D & Liquid Glass) */}
          <div className="space-y-3">
            {cashFlowProjections.map((p) => {
              const isPositive = p.netSurplus >= 0;
              const commitmentPercent = p.projectedIncome > 0
                ? Math.min(100, Math.round((p.totalExpenses / p.projectedIncome) * 100))
                : 0;

              return (
                <div 
                  key={p.monthYear} 
                  className="card-depth-3d-interactive p-4 sm:p-5 rounded-2xl transition-all border border-white/10 hover:border-white/20 bg-[#151A23]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-[#A8B5D1]" />
                          {p.displayMonth}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          p.isDeficit
                            ? 'bg-[#E29578]/20 text-[#E29578] border border-[#E29578]/40 shadow-xs'
                            : 'bg-[#A3C9A8]/20 text-[#A3C9A8] border border-[#A3C9A8]/40 shadow-xs'
                        }`}>
                          {p.isDeficit ? (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              <span>Déficit Previsto</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Superávit Previsto</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Subtitle breakdown with clean badges */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8E98A9]">
                        <span className="flex items-center gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#A3C9A8]" />
                          Receita: <strong className="text-white font-mono">{formatBRL(p.projectedIncome)}</strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Repeat className="w-3.5 h-3.5 text-[#9AA4B5]" />
                          Fixos: <strong className="text-white font-mono">{formatBRL(p.fixedExpenses)}</strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-[#E29578]" />
                          Parcelas: <strong className="text-[#E29578] font-mono">{formatBRL(p.installmentsTotal)}</strong>
                          <span className="text-[10px] text-[#9AA4B5]">({p.activeInstallmentCount} {p.activeInstallmentCount === 1 ? 'ativa' : 'ativas'})</span>
                        </span>
                      </div>

                      {/* Commitment Progress Bar */}
                      {p.projectedIncome > 0 && (
                        <div className="pt-1 max-w-md">
                          <div className="flex justify-between text-[10px] text-[#9AA4B5] mb-1">
                            <span>Renda Comprometida: {commitmentPercent}%</span>
                            <span>Sobra Livre: {100 - commitmentPercent}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#283040] rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                commitmentPercent > 100
                                  ? 'bg-[#E29578]'
                                  : commitmentPercent > 70
                                  ? 'bg-[#E5A97D]'
                                  : 'bg-[#A3C9A8]'
                              }`}
                              style={{ width: `${Math.min(100, commitmentPercent)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Net Surplus */}
                    <div className="text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      <span className="text-[10px] uppercase tracking-wider text-[#9AA4B5] block font-semibold">
                        Sobra Prevista
                      </span>
                      <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${
                        isPositive ? 'text-[#A3C9A8]' : 'text-[#E29578]'
                      }`}>
                        {isPositive ? '+' : ''}{formatBRL(p.netSurplus)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* SEÇÃO 3: LIBERDADE FINANCEIRA (ESTILO LIQUID GLASS & 3D)        */}
      {/* ============================================================= */}
      {activeSubTab === 'freedom_curve' && (
        <div className="space-y-4">
          {/* 1. Card Destaque: Diagnóstico de Aporte Mensal */}
          <div className="card-depth-3d p-5 sm:p-6 rounded-3xl space-y-4 border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold text-[#A8B5D1] uppercase tracking-wider block">
                  Diagnóstico de Aporte Mensal
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Capacidade Real vs. Aporte Recomendado
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs px-3 py-1.5 rounded-full font-bold shadow-xs ${
                  netSurplus >= recommendedSaving && incomeTotal > 0
                    ? 'bg-[#A3C9A8]/15 text-[#A3C9A8] border border-[#A3C9A8]/30'
                    : netSurplus > 0
                    ? 'bg-[#E5A97D]/15 text-[#E5A97D] border border-[#E5A97D]/30'
                    : 'bg-[#E29578]/15 text-[#E29578] border border-[#E29578]/30'
                }`}>
                  {netSurplus >= recommendedSaving && incomeTotal > 0
                    ? 'Superávit Saudável (>= 20%)'
                    : netSurplus > 0
                    ? 'Superávit Abaixo da Meta'
                    : 'Ajuste Necessário'}
                </span>
              </div>
            </div>

            {/* Comparação Direta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-4 rounded-2xl bg-[#131720] border border-white/8 space-y-1">
                <div className="flex items-center justify-between text-xs text-[#9AA4B5]">
                  <span>Aporte Atual Real (Sobra Líquida)</span>
                  <span className="text-[10px]">Receitas - Despesas</span>
                </div>
                <div className={`text-2xl font-bold font-mono mt-1 ${netSurplus >= 0 ? 'text-[#A3C9A8]' : 'text-[#E29578]'}`}>
                  {netSurplus >= 0 ? '+' : ''}{formatBRL(netSurplus)}
                </div>
                <p className="text-[11px] text-[#9AA4B5] mt-1.5 leading-snug">
                  {netSurplus > 0
                    ? `Representa ${incomeTotal > 0 ? Math.round((netSurplus / incomeTotal) * 100) : 0}% da sua renda deste mês.`
                    : 'Suas despesas totais superaram as receitas neste mês.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#131720] border border-white/8 space-y-1">
                <div className="flex items-center justify-between text-xs text-[#9AA4B5]">
                  <span>Aporte Recomendado (Regra 20%)</span>
                  <span className="text-[10px] text-[#A8B5D1]">Alvo Saudável</span>
                </div>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {formatBRL(recommendedSaving)}
                </div>
                <p className="text-[11px] text-[#9AA4B5] mt-1.5 leading-snug">
                  {incomeTotal > 0
                    ? `Guardando ${formatBRL(recommendedSaving)}/mês você atinge sua reserva em ${freedomWithRecommended.emergencyMonthReached || 6} meses.`
                    : 'Cadastre sua renda para calibrar o aporte recomendado.'}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Simulador Interativo Simples (Slider de Aporte Mensal) */}
          <div className="card-depth-3d p-5 sm:p-6 rounded-3xl space-y-4 border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#A8B5D1]" />
                  Simulador Interativo de Aportes
                </h3>
                <p className="text-xs text-[#9AA4B5] mt-0.5">
                  Arraste o slider para simular quanto poupar por mês e veja os prazos se ajustarem em tempo real.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-[#131720] px-3.5 py-1.5 rounded-xl border border-white/10 self-start sm:self-auto shadow-xs">
                <span className="text-xs text-[#9AA4B5]">Aporte Simulado:</span>
                <span className="text-sm font-bold font-mono text-[#A3C9A8]">{formatBRL(simulatedSaving)}/mês</span>
              </div>
            </div>

            {/* Slider de Aporte */}
            <div className="space-y-2 pt-1">
              <input
                type="range"
                min="50"
                max={Math.max(8000, Math.round(incomeTotal ? incomeTotal * 1.5 : 5000))}
                step="50"
                value={simulatedSaving}
                onChange={(e) => setCustomMonthlySaving(Number(e.target.value))}
                className="w-full accent-white cursor-pointer h-2 bg-[#283040] rounded-lg"
              />

              {/* Botões de atalho rápido com estilo Liquid Glass */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {netSurplus > 0 && (
                  <button
                    type="button"
                    onClick={() => setCustomMonthlySaving(Math.round(netSurplus))}
                    className="btn-liquid-glass px-3 py-1 rounded-xl text-[11px] text-[#A3C9A8] cursor-pointer"
                  >
                    Usar Sobra Real ({formatBRL(netSurplus)})
                  </button>
                )}
                {incomeTotal > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setCustomMonthlySaving(Math.round(incomeTotal * 0.10))}
                      className="btn-liquid-glass px-3 py-1 rounded-xl text-[11px] text-[#AEB6C4] hover:text-white cursor-pointer"
                    >
                      10% da Renda ({formatBRL(incomeTotal * 0.10)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomMonthlySaving(Math.round(incomeTotal * 0.20))}
                      className="btn-liquid-glass px-3 py-1 rounded-xl text-[11px] text-[#A8B5D1] hover:text-white cursor-pointer"
                    >
                      20% da Renda ({formatBRL(incomeTotal * 0.20)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomMonthlySaving(Math.round(incomeTotal * 0.30))}
                      className="btn-liquid-glass px-3 py-1 rounded-xl text-[11px] text-[#AEB6C4] hover:text-white cursor-pointer"
                    >
                      30% da Renda ({formatBRL(incomeTotal * 0.30)})
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Slider de Taxa de Juros Real com Toggle Segmented Glass */}
            <div className="pt-2 border-t border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#9AA4B5]">
              <div className="flex items-center gap-2">
                <span>Rendimento Real Anual (acima da inflação):</span>
                <strong className="text-white font-mono">{Math.round(annualInterestRate * 100)}% a.a.</strong>
              </div>
              <div className="toggle-segmented-glass p-0.5 flex gap-1">
                {[0.04, 0.06, 0.08, 0.10].map(rate => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setAnnualInterestRate(rate)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono cursor-pointer transition-all ${
                      annualInterestRate === rate
                        ? 'toggle-segment-active text-white'
                        : 'text-[#9AA4B5] hover:text-white'
                    }`}
                  >
                    {rate * 100}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Metas em Cartões Modulares e Objetivos (Estilo 3D Hero) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Reserva de Emergência */}
            <div className="card-depth-3d p-5 rounded-3xl space-y-3 relative overflow-hidden border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#A8B5D1] font-semibold">
                  <div className="w-8 h-8 rounded-xl btn-liquid-glass flex items-center justify-center">
                    <PiggyBank className="w-4 h-4 text-[#A8B5D1]" />
                  </div>
                  <span>Reserva de Emergência</span>
                </div>
                <span className="text-[10px] text-[#A8B5D1] bg-[#A8B5D1]/10 px-2.5 py-0.5 rounded-full border border-[#A8B5D1]/20 font-semibold">
                  6 Meses de Custo
                </span>
              </div>

              <div>
                <span className="text-[11px] text-[#9AA4B5] block">Valor Alvo da Reserva</span>
                <div className="text-2xl font-bold font-mono text-white mt-0.5">
                  {formatBRL(simulatedFreedom.emergencyTarget)}
                </div>
              </div>

              <div className="p-3.5 bg-[#131720] border border-white/8 rounded-2xl space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#9AA4B5]">Aporte mensal planejado:</span>
                  <span className="font-mono text-white font-semibold">{formatBRL(simulatedSaving)}/mês</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#9AA4B5]">Tempo estimado:</span>
                  <span className="font-bold text-[#A8B5D1]">
                    {simulatedSaving > 0 && simulatedFreedom.emergencyMonthReached > 0
                      ? `${simulatedFreedom.emergencyMonthReached} meses (${Math.round((simulatedFreedom.emergencyMonthReached / 12) * 10) / 10} anos)`
                      : 'Defina um aporte mensal'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[#9AA4B5] leading-relaxed">
                Protege você contra imprevistos sem precisar resgatar investimentos de longo prazo.
              </p>
            </div>

            {/* Card 2: Independência / Liberdade Financeira (Renda Passiva) */}
            <div className="card-depth-3d p-5 rounded-3xl space-y-3 relative overflow-hidden border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#A3C9A8] font-semibold">
                  <div className="w-8 h-8 rounded-xl btn-liquid-glass flex items-center justify-center">
                    <Target className="w-4 h-4 text-[#A3C9A8]" />
                  </div>
                  <span>Independência Financeira</span>
                </div>
                <span className="text-[10px] text-[#A3C9A8] bg-[#A3C9A8]/10 px-2.5 py-0.5 rounded-full border border-[#A3C9A8]/20 font-semibold">
                  Regra dos 4% (300x)
                </span>
              </div>

              <div>
                <span className="text-[11px] text-[#9AA4B5] block">Patrimônio Alvo para Viver de Renda</span>
                <div className="text-2xl font-bold font-mono text-[#A3C9A8] mt-0.5">
                  {formatBRL(simulatedFreedom.independenceTarget)}
                </div>
              </div>

              <div className="p-3.5 bg-[#131720] border border-white/8 rounded-2xl">
                <p className="text-xs text-white leading-relaxed">
                  Guardando <strong className="text-[#A3C9A8] font-mono">{formatBRL(simulatedSaving)}/mês</strong>, você atinge esta meta em{' '}
                  <strong className="text-white font-mono underline decoration-[#A3C9A8]">
                    {simulatedSaving > 0 && simulatedFreedom.independenceYearsReached > 0
                      ? `${simulatedFreedom.independenceYearsReached} anos`
                      : '—'}
                  </strong>.
                </p>
                <div className="flex justify-between items-center text-[11px] text-[#9AA4B5] mt-2 pt-2 border-t border-white/8">
                  <span>Renda Passiva Mensal Gerada:</span>
                  <span className="font-mono text-[#A3C9A8] font-semibold">
                    +{formatBRL(essentialCost)}/mês
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[#9AA4B5] leading-relaxed">
                Permite cobrir 100% dos seus custos essenciais exclusivamente através da rentabilidade da sua carteira.
              </p>
            </div>
          </div>

          {/* 4. Trajetória de Acumulação em Cards Modulares (5, 10 e 20 anos) */}
          <div className="card-depth-3d p-5 rounded-3xl space-y-3 border border-white/10">
            <h4 className="text-xs font-semibold text-[#9AA4B5] uppercase tracking-wider">
              Evolução Patrimonial com Juros Compostos
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[5, 10, 20].map((years) => {
                const pt = simulatedFreedom.points.find(p => p.year === years);
                return (
                  <div key={years} className="card-depth-3d-interactive p-4 bg-[#131720] border border-white/8 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">Em {years} anos</span>
                      <span className="text-[10px] text-[#9AA4B5] font-mono">
                        Aportado: {formatBRL(pt?.investedCapital || 0)}
                      </span>
                    </div>
                    <div className="text-base font-bold font-mono text-white pt-1">
                      {formatBRL(pt?.compoundTotal || 0)}
                    </div>
                    <div className="text-[11px] text-[#A3C9A8] font-mono font-medium">
                      +{formatBRL(pt?.passiveMonthlyIncome || 0)}/mês passivo
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-[#5E6A7E] pt-1">
              * Simulação calculada com retorno real líquido de inflação ({Math.round(annualInterestRate * 100)}% a.a.) e capitalização composta contínua.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
