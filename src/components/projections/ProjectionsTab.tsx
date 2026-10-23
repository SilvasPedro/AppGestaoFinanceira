import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles, 
  Info, 
  Percent, 
  Calendar, 
  Layers,
  ChevronRight,
  Target,
  Sliders,
  PiggyBank,
  CheckCircle2,
  TrendingDown,
  ArrowRight
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { calculateFreedomSimulation } from '../../services/projections';

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

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

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
      {/* Sub Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[#141414] border border-[#262626] rounded-2xl overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab('score')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl whitespace-nowrap transition cursor-pointer ${
            activeSubTab === 'score'
              ? 'bg-white text-black shadow-xs'
              : 'text-[#A3A3A3] hover:text-white'
          }`}
        >
          Score de Saúde (0-1000)
        </button>

        <button
          onClick={() => setActiveSubTab('debt_curve')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl whitespace-nowrap transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'debt_curve'
              ? 'bg-white text-black shadow-xs'
              : 'text-[#A3A3A3] hover:text-white'
          }`}
        >
          <span>Curva de Parcelas & Déficit</span>
          {hasAnyDeficit && (
            <span className="w-2 h-2 rounded-full bg-[#E29578] animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('freedom_curve')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl whitespace-nowrap transition cursor-pointer ${
            activeSubTab === 'freedom_curve'
              ? 'bg-white text-black shadow-xs'
              : 'text-[#A3A3A3] hover:text-white'
          }`}
        >
          Liberdade Financeira
        </button>
      </div>

      {/* ============================================================= */}
      {/* SEÇÃO 1: SCORE DE SAÚDE FINANCEIRA (4 PILARES) */}
      {/* ============================================================= */}
      {activeSubTab === 'score' && (
        <div className="space-y-4">
          {/* Main Score Hero Card */}
          <div className="p-6 rounded-3xl bg-[#141414] border border-[#262626] flex flex-col md:flex-row items-center gap-6">
            {/* Visual Gauge */}
            <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
              <svg className="w-40 h-40 -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="66"
                  stroke="#1E1E1E"
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
                <span className="text-xs text-[#737373]">{healthScore.isEmpty ? 'sem dados' : 'de 1000'}</span>
                <span
                  className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                  style={{ backgroundColor: `${healthScore.statusColor}22`, color: healthScore.statusColor }}
                >
                  {healthScore.status}
                </span>
              </div>
            </div>

            {/* Score Explanation & Status description */}
            <div className="space-y-3 flex-1 text-center md:text-left">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Diagnóstico Comportamental
                </h3>
                <p className="text-xs text-[#A3A3A3] mt-1 leading-relaxed">
                  {healthScore.isEmpty
                    ? 'Sem dados suficientes para calcular o score neste mês. Assim que você cadastrar suas receitas e gastos, o algoritmo avaliará seu equilíbrio financeiro automaticamente.'
                    : 'Algoritmo dinâmico e transparente que avalia seu padrão mensal com base em 4 pilares ponderados de finanças pessoais sólidas.'}
                </p>
              </div>

              {/* Status scale bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[#737373]">
                  <span>0 (Crítico)</span>
                  <span>400 (Em Risco)</span>
                  <span>650 (Saudável)</span>
                  <span>1000 (Excelente)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#1E1E1E] flex overflow-hidden">
                  <div className="w-[40%] bg-[#E29578]/50" />
                  <div className="w-[25%] bg-[#E5A97D]/50" />
                  <div className="w-[20%] bg-[#A8B5D1]/50" />
                  <div className="w-[15%] bg-[#A3C9A8]/50" />
                </div>
              </div>
            </div>
          </div>

          {/* 4 Pillars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Pilar 1: Taxa de Poupança */}
            <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Taxa de Poupança (30%)</span>
                <span className="text-xs font-mono font-bold text-[#A3C9A8]">
                  {healthScore.pillars.savingsRate.score}/300
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#1E1E1E] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#A3C9A8] transition-all duration-500"
                  style={{ width: `${(healthScore.pillars.savingsRate.score / 300) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-[#737373]">
                {healthScore.pillars.savingsRate.label} • {healthScore.pillars.savingsRate.status}
              </p>
            </div>

            {/* Pilar 2: Comprometimento da Renda */}
            <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Comprometimento com Fixos (30%)</span>
                <span className="text-xs font-mono font-bold text-[#A8B5D1]">
                  {healthScore.pillars.incomeCommitment.score}/300
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#1E1E1E] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#A8B5D1] transition-all duration-500"
                  style={{ width: `${(healthScore.pillars.incomeCommitment.score / 300) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-[#737373]">
                {healthScore.pillars.incomeCommitment.label} • {healthScore.pillars.incomeCommitment.status}
              </p>
            </div>

            {/* Pilar 3: Disciplina de Orçamento */}
            <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Disciplina de Tetos (25%)</span>
                <span className="text-xs font-mono font-bold text-[#E5A97D]">
                  {healthScore.pillars.budgetDiscipline.score}/250
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#1E1E1E] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#E5A97D] transition-all duration-500"
                  style={{ width: `${(healthScore.pillars.budgetDiscipline.score / 250) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-[#737373]">
                {healthScore.pillars.budgetDiscipline.label} • {healthScore.pillars.budgetDiscipline.status}
              </p>
            </div>

            {/* Pilar 4: Consistência de Lançamentos */}
            <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Consistência de Registro (15%)</span>
                <span className="text-xs font-mono font-bold text-[#E29578]">
                  {healthScore.pillars.entryConsistency.score}/150
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#1E1E1E] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#E29578] transition-all duration-500"
                  style={{ width: `${(healthScore.pillars.entryConsistency.score / 150) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-[#737373]">
                {healthScore.pillars.entryConsistency.label} • {healthScore.pillars.entryConsistency.status}
              </p>
            </div>
          </div>

          {/* Actionable Tips */}
          {healthScore.actionableTips.length > 0 && (
            <div className="p-5 rounded-3xl bg-[#141414] border border-[#262626] space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Sparkles className="w-4 h-4 text-[#A3C9A8]" />
                <span>Recomendações Comportamentais para o seu Perfil</span>
              </div>
              <div className="space-y-2">
                {healthScore.actionableTips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-[#A3A3A3] p-2.5 rounded-xl bg-[#0D0D0D]">
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
      {/* SEÇÃO 2: CURVA DE PARCELAS & DÉFICIT FUTURO */}
      {/* ============================================================= */}
      {activeSubTab === 'debt_curve' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-[#141414] border border-[#262626] space-y-3">
            <h3 className="text-sm font-semibold text-white">
              Projeção Futura de Caixa (Próximos 6 Meses)
            </h3>
            <p className="text-xs text-[#737373] leading-relaxed">
              Simulação considerando as receitas fixas, parcelamentos de compras e vendas ativas e média de gastos.
            </p>
          </div>

          {/* Month by month projection table */}
          <div className="p-5 rounded-3xl bg-[#141414] border border-[#262626]">
            <h4 className="text-xs font-semibold text-[#737373] uppercase tracking-wider mb-3">
              Amortização Progressiva de Parcelas
            </h4>
            <div className="divide-y divide-[#1F1F1F]">
              {cashFlowProjections.map((p) => (
                <div key={p.monthYear} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span>{p.displayMonth}</span>
                      {p.isDeficit && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-[#E29578]/20 text-[#E29578]">
                          Déficit
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#737373] mt-0.5">
                      Fixos: {formatBRL(p.fixedExpenses)} • Parcelas: <strong className="text-[#E29578]">{formatBRL(p.installmentsTotal)}</strong> ({p.activeInstallmentCount} ativas)
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-mono font-bold ${p.isDeficit ? 'text-[#E29578]' : 'text-[#A3C9A8]'}`}>
                      {p.netSurplus >= 0 ? '+' : ''}{formatBRL(p.netSurplus)}
                    </div>
                    <div className="text-[10px] text-[#737373]">
                      Sobra prevista
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* SEÇÃO 3: LIBERDADE FINANCEIRA & METAS SIMPLIFICADAS */}
      {/* ============================================================= */}
      {activeSubTab === 'freedom_curve' && (
        <div className="space-y-4">
          {/* 1. Card Destaque: Aporte Mensal Realista */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#141414] border border-[#262626] space-y-4">
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
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
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
              <div className="p-4 rounded-2xl bg-[#0D0D0D] border border-[#1E1E1E]">
                <div className="flex items-center justify-between text-xs text-[#737373]">
                  <span>Aporte Atual Real (Sobra Líquida)</span>
                  <span className="text-[10px]">Receitas - Despesas</span>
                </div>
                <div className={`text-2xl font-bold font-mono mt-1 ${netSurplus >= 0 ? 'text-[#A3C9A8]' : 'text-[#E29578]'}`}>
                  {netSurplus >= 0 ? '+' : ''}{formatBRL(netSurplus)}
                </div>
                <p className="text-[11px] text-[#737373] mt-1.5 leading-snug">
                  {netSurplus > 0
                    ? `Representa ${incomeTotal > 0 ? Math.round((netSurplus / incomeTotal) * 100) : 0}% da sua renda deste mês.`
                    : 'Suas despesas totais superaram as receitas neste mês.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0D0D0D] border border-[#1E1E1E]">
                <div className="flex items-center justify-between text-xs text-[#737373]">
                  <span>Aporte Recomendado (Regra 20%)</span>
                  <span className="text-[10px] text-[#A8B5D1]">Alvo Saudável</span>
                </div>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {formatBRL(recommendedSaving)}
                </div>
                <p className="text-[11px] text-[#737373] mt-1.5 leading-snug">
                  {incomeTotal > 0
                    ? `Guardando ${formatBRL(recommendedSaving)}/mês você atinge sua reserva em ${freedomWithRecommended.emergencyMonthReached || 6} meses.`
                    : 'Cadastre sua renda para calibrar o aporte recomendado.'}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Simulador Interativo Simples (Slider de Aporte Mensal) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#141414] border border-[#262626] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#A8B5D1]" />
                  Simulador Interativo de Aportes
                </h3>
                <p className="text-xs text-[#737373] mt-0.5">
                  Arraste o slider para simular quanto poupar por mês e veja os prazos se ajustarem em tempo real.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-[#0D0D0D] px-3 py-1.5 rounded-xl border border-[#262626] self-start sm:self-auto">
                <span className="text-xs text-[#737373]">Aporte Simulado:</span>
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
                className="w-full accent-white cursor-pointer h-2 bg-[#262626] rounded-lg"
              />

              {/* Botões de atalho rápido */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {netSurplus > 0 && (
                  <button
                    type="button"
                    onClick={() => setCustomMonthlySaving(Math.round(netSurplus))}
                    className="px-2.5 py-1 rounded-lg bg-[#0D0D0D] hover:bg-[#1E1E1E] border border-[#262626] text-[11px] text-[#A3C9A8] cursor-pointer"
                  >
                    Usar Sobra Real ({formatBRL(netSurplus)})
                  </button>
                )}
                {incomeTotal > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setCustomMonthlySaving(Math.round(incomeTotal * 0.10))}
                      className="px-2.5 py-1 rounded-lg bg-[#0D0D0D] hover:bg-[#1E1E1E] border border-[#262626] text-[11px] text-[#A3A3A3] hover:text-white cursor-pointer"
                    >
                      10% da Renda ({formatBRL(incomeTotal * 0.10)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomMonthlySaving(Math.round(incomeTotal * 0.20))}
                      className="px-2.5 py-1 rounded-lg bg-[#0D0D0D] hover:bg-[#1E1E1E] border border-[#262626] text-[11px] text-[#A8B5D1] hover:text-white cursor-pointer"
                    >
                      20% da Renda ({formatBRL(incomeTotal * 0.20)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomMonthlySaving(Math.round(incomeTotal * 0.30))}
                      className="px-2.5 py-1 rounded-lg bg-[#0D0D0D] hover:bg-[#1E1E1E] border border-[#262626] text-[11px] text-[#A3A3A3] hover:text-white cursor-pointer"
                    >
                      30% da Renda ({formatBRL(incomeTotal * 0.30)})
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Slider de Taxa de Juros Real */}
            <div className="pt-2 border-t border-[#1F1F1F] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#737373]">
              <div className="flex items-center gap-2">
                <span>Rendimento Real Anual (acima da inflação):</span>
                <strong className="text-white font-mono">{Math.round(annualInterestRate * 100)}% a.a.</strong>
              </div>
              <div className="flex gap-1">
                {[0.04, 0.06, 0.08, 0.10].map(rate => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setAnnualInterestRate(rate)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono cursor-pointer ${
                      annualInterestRate === rate
                        ? 'bg-white text-black font-bold'
                        : 'bg-[#0D0D0D] text-[#737373] hover:text-white border border-[#262626]'
                    }`}
                  >
                    {rate * 100}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Metas em Cartões Modulares e Objetivos (Substituindo tabelas densas) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Reserva de Emergência */}
            <div className="p-5 rounded-3xl bg-[#141414] border border-[#262626] space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#A8B5D1] font-semibold">
                  <div className="w-7 h-7 rounded-lg bg-[#A8B5D1]/15 flex items-center justify-center">
                    <PiggyBank className="w-4 h-4 text-[#A8B5D1]" />
                  </div>
                  <span>Card 1: Reserva de Emergência</span>
                </div>
                <span className="text-[10px] text-[#737373] bg-[#0D0D0D] px-2 py-0.5 rounded-full border border-[#262626]">
                  6 Meses de Custo
                </span>
              </div>

              <div>
                <span className="text-[11px] text-[#737373] block">Valor Alvo da Reserva</span>
                <div className="text-2xl font-bold font-mono text-white mt-0.5">
                  {formatBRL(simulatedFreedom.emergencyTarget)}
                </div>
              </div>

              <div className="p-3 bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#737373]">Aporte mensal planejado:</span>
                  <span className="font-mono text-white font-semibold">{formatBRL(simulatedSaving)}/mês</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#737373]">Tempo estimado:</span>
                  <span className="font-bold text-[#A8B5D1]">
                    {simulatedSaving > 0 && simulatedFreedom.emergencyMonthReached > 0
                      ? `${simulatedFreedom.emergencyMonthReached} meses (${Math.round((simulatedFreedom.emergencyMonthReached / 12) * 10) / 10} anos)`
                      : 'Defina um aporte mensal'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[#737373] leading-relaxed">
                Protege você contra imprevistos sem precisar resgatar investimentos de longo prazo.
              </p>
            </div>

            {/* Card 2: Independência / Liberdade Financeira (Renda Passiva) */}
            <div className="p-5 rounded-3xl bg-[#141414] border border-[#262626] space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#A3C9A8] font-semibold">
                  <div className="w-7 h-7 rounded-lg bg-[#A3C9A8]/15 flex items-center justify-center">
                    <Target className="w-4 h-4 text-[#A3C9A8]" />
                  </div>
                  <span>Card 2: Independência Financeira</span>
                </div>
                <span className="text-[10px] text-[#A3C9A8] bg-[#A3C9A8]/10 px-2 py-0.5 rounded-full border border-[#A3C9A8]/20">
                  Regra dos 4% (300x)
                </span>
              </div>

              <div>
                <span className="text-[11px] text-[#737373] block">Patrimônio Alvo para Viver de Renda</span>
                <div className="text-2xl font-bold font-mono text-[#A3C9A8] mt-0.5">
                  {formatBRL(simulatedFreedom.independenceTarget)}
                </div>
              </div>

              {/* Destaque tipográfico solicitado */}
              <div className="p-3 bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl">
                <p className="text-xs text-white leading-relaxed">
                  Guardando <strong className="text-[#A3C9A8] font-mono">{formatBRL(simulatedSaving)}/mês</strong>, você atinge esta meta em{' '}
                  <strong className="text-white font-mono underline decoration-[#A3C9A8]">
                    {simulatedSaving > 0 && simulatedFreedom.independenceYearsReached > 0
                      ? `${simulatedFreedom.independenceYearsReached} anos`
                      : '—'}
                  </strong>.
                </p>
                <div className="flex justify-between items-center text-[11px] text-[#737373] mt-2 pt-2 border-t border-[#1A1A1A]">
                  <span>Renda Passiva Mensal Gerada:</span>
                  <span className="font-mono text-[#A3C9A8] font-semibold">
                    +{formatBRL(essentialCost)}/mês
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[#737373] leading-relaxed">
                Permite cobrir 100% dos seus custos essenciais exclusivamente através da rentabilidade da sua carteira.
              </p>
            </div>
          </div>

          {/* 4. Trajetória de Acumulação em Cards Modulares (5, 10 e 20 anos) */}
          <div className="p-5 rounded-3xl bg-[#141414] border border-[#262626] space-y-3">
            <h4 className="text-xs font-semibold text-[#737373] uppercase tracking-wider">
              Evolução Patrimonial com Juros Compostos
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[5, 10, 20].map((years) => {
                const pt = simulatedFreedom.points.find(p => p.year === years);
                return (
                  <div key={years} className="p-3.5 bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">Em {years} anos</span>
                      <span className="text-[10px] text-[#737373] font-mono">
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

            <p className="text-[10px] text-[#525252] pt-1">
              * Simulação calculada com retorno real líquido de inflação ({Math.round(annualInterestRate * 100)}% a.a.) e capitalização composta contínua.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
