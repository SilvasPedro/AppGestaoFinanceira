import React, { useState } from 'react';
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
  PiggyBank
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export const ProjectionsTab: React.FC = () => {
  const { 
    healthScore, 
    cashFlowProjections, 
    freedomSimulation, 
    annualInterestRate, 
    setAnnualInterestRate,
    netSurplus,
    incomeTotal
  } = useFinance();

  const [activeSubTab, setActiveSubTab] = useState<'score' | 'debt_curve' | 'freedom_curve'>('score');

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const hasAnyDeficit = cashFlowProjections.some(p => p.isDeficit);

  return (
    <div className="space-y-5 pb-24 max-w-5xl mx-auto">
      {/* Sub Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[#141414] border border-[#262626] rounded-2xl overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab('score')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl whitespace-nowrap transition ${
            activeSubTab === 'score'
              ? 'bg-white text-black shadow-xs'
              : 'text-[#A3A3A3] hover:text-white'
          }`}
        >
          Score de Saúde (0-1000)
        </button>

        <button
          onClick={() => setActiveSubTab('debt_curve')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl whitespace-nowrap transition flex items-center justify-center gap-1.5 ${
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
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl whitespace-nowrap transition ${
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

          {/* 4 Pillars Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Pilar 1: Taxa de Poupança */}
            <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626]">
              <div className="flex justify-between items-start text-xs">
                <div>
                  <span className="text-[11px] text-[#737373] uppercase tracking-wider font-semibold block">
                    Pilar 1 (Peso 30%)
                  </span>
                  <span className="text-xs font-semibold text-white mt-0.5 block">
                    Taxa de Poupança
                  </span>
                </div>
                <span className="text-sm font-bold font-mono text-white">
                  {healthScore.pillars.savingsRate.score} <span className="text-[10px] text-[#737373]">/ {healthScore.pillars.savingsRate.max}</span>
                </span>
              </div>
              <div className="w-full bg-[#0D0D0D] h-2 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-[#A3C9A8] h-full rounded-full transition-all duration-700"
                  style={{ width: `${(healthScore.pillars.savingsRate.score / healthScore.pillars.savingsRate.max) * 100}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-[#737373] mt-2">
                <span>Sobra líquida / Renda</span>
                <span className="text-white font-medium">{healthScore.pillars.savingsRate.status}</span>
              </div>
            </div>

            {/* Pilar 2: Comprometimento de Renda */}
            <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626]">
              <div className="flex justify-between items-start text-xs">
                <div>
                  <span className="text-[11px] text-[#737373] uppercase tracking-wider font-semibold block">
                    Pilar 2 (Peso 30%)
                  </span>
                  <span className="text-xs font-semibold text-white mt-0.5 block">
                    Comprometimento de Renda
                  </span>
                </div>
                <span className="text-sm font-bold font-mono text-white">
                  {healthScore.pillars.incomeCommitment.score} <span className="text-[10px] text-[#737373]">/ {healthScore.pillars.incomeCommitment.max}</span>
                </span>
              </div>
              <div className="w-full bg-[#0D0D0D] h-2 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-[#E5A97D] h-full rounded-full transition-all duration-700"
                  style={{ width: `${(healthScore.pillars.incomeCommitment.score / healthScore.pillars.incomeCommitment.max) * 100}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-[#737373] mt-2">
                <span>Fixos + Parcelas</span>
                <span className="text-white font-medium">{healthScore.pillars.incomeCommitment.status}</span>
              </div>
            </div>

            {/* Pilar 3: Disciplina Orçamentária */}
            <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626]">
              <div className="flex justify-between items-start text-xs">
                <div>
                  <span className="text-[11px] text-[#737373] uppercase tracking-wider font-semibold block">
                    Pilar 3 (Peso 25%)
                  </span>
                  <span className="text-xs font-semibold text-white mt-0.5 block">
                    Disciplina Orçamentária
                  </span>
                </div>
                <span className="text-sm font-bold font-mono text-white">
                  {healthScore.pillars.budgetDiscipline.score} <span className="text-[10px] text-[#737373]">/ {healthScore.pillars.budgetDiscipline.max}</span>
                </span>
              </div>
              <div className="w-full bg-[#0D0D0D] h-2 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-[#A8B5D1] h-full rounded-full transition-all duration-700"
                  style={{ width: `${(healthScore.pillars.budgetDiscipline.score / healthScore.pillars.budgetDiscipline.max) * 100}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-[#737373] mt-2">
                <span>Cumprimento de limites</span>
                <span className="text-white font-medium">{healthScore.pillars.budgetDiscipline.status}</span>
              </div>
            </div>

            {/* Pilar 4: Consistência de Lançamentos */}
            <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626]">
              <div className="flex justify-between items-start text-xs">
                <div>
                  <span className="text-[11px] text-[#737373] uppercase tracking-wider font-semibold block">
                    Pilar 4 (Peso 15%)
                  </span>
                  <span className="text-xs font-semibold text-white mt-0.5 block">
                    Consistência de Lançamentos
                  </span>
                </div>
                <span className="text-sm font-bold font-mono text-white">
                  {healthScore.pillars.entryConsistency.score} <span className="text-[10px] text-[#737373]">/ {healthScore.pillars.entryConsistency.max}</span>
                </span>
              </div>
              <div className="w-full bg-[#0D0D0D] h-2 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-[#A3C9A8] h-full rounded-full transition-all duration-700"
                  style={{ width: `${(healthScore.pillars.entryConsistency.score / healthScore.pillars.entryConsistency.max) * 100}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-[#737373] mt-2">
                <span>{healthScore.pillars.entryConsistency.daysWithEntries} dias com registros</span>
                <span className="text-white font-medium">{healthScore.pillars.entryConsistency.status}</span>
              </div>
            </div>
          </div>

          {/* Dicas Pontuais e Acionáveis */}
          <div className="p-5 rounded-3xl bg-[#141414] border border-[#262626] space-y-3">
            <h4 className="text-xs font-semibold text-[#A8B5D1] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#A8B5D1]" />
              Recomendações Comportamentais para Melhorar sua Pontuação
            </h4>
            <div className="space-y-2">
              {healthScore.actionableTips.map((tip, idx) => (
                <div key={idx} className="p-3 bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl text-xs text-[#A3A3A3] leading-relaxed flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#262626] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* SEÇÃO 2: CURVA DE PARCELAS & DÉFICIT (6 MESES FUTUROS) */}
      {/* ============================================================= */}
      {activeSubTab === 'debt_curve' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-[#141414] border border-[#262626]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Projeção de Fluxo de Caixa & Descompressão de Parcelas
                </h3>
                <p className="text-xs text-[#737373] mt-0.5">
                  Simulação dos próximos 6 meses considerando o vencimento progressivo das parcelas ativas.
                </p>
              </div>

              {hasAnyDeficit ? (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E29578]/15 text-[#E29578] border border-[#E29578]/30 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Risco de Déficit Detectado
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#A3C9A8]/15 text-[#A3C9A8] border border-[#A3C9A8]/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Fluxo Seguro sem Déficit
                </span>
              )}
            </div>

            {cashFlowProjections.every(p => p.projectedIncome === 0 && p.totalExpenses === 0) && (
              <div className="p-4 my-3 rounded-2xl bg-[#0D0D0D] border border-[#1E1E1E] text-center text-xs text-[#737373]">
                Nenhum parcelamento ativo ou custo fixo cadastrado. Cadastre suas compras parceladas ou contas fixas para projetar o fluxo futuro mês a mês.
              </div>
            )}

            {/* Visual Bar Graph */}
            <div className="mt-6 pt-4 border-t border-[#1E1E1E]">
              <div className="grid grid-cols-6 gap-2 items-end h-48 px-1">
                {cashFlowProjections.map((month) => {
                  const maxVal = Math.max(...cashFlowProjections.map(m => Math.max(m.projectedIncome, m.totalExpenses)), 6000);
                  const incomeHeight = (month.projectedIncome / maxVal) * 100;
                  const expenseHeight = (month.totalExpenses / maxVal) * 100;
                  const isDeficit = month.isDeficit;

                  return (
                    <div key={month.monthYear} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                      <div className="text-[10px] text-[#A3A3A3] font-mono opacity-0 group-hover:opacity-100 transition">
                        {formatBRL(month.netSurplus)}
                      </div>

                      {/* Twin Bars: Income & Expenses */}
                      <div className="w-full flex items-end justify-center gap-1 h-32">
                        {/* Income bar */}
                        <div
                          className="w-2.5 sm:w-4 rounded-t-sm bg-[#A3C9A8]/40 transition-all duration-500"
                          style={{ height: `${incomeHeight}%` }}
                          title={`Receita Projetada: ${formatBRL(month.projectedIncome)}`}
                        />
                        {/* Expense bar */}
                        <div
                          className={`w-2.5 sm:w-4 rounded-t-sm transition-all duration-500 ${
                            isDeficit ? 'bg-[#E29578]' : 'bg-[#E5A97D]'
                          }`}
                          style={{ height: `${expenseHeight}%` }}
                          title={`Despesa Total: ${formatBRL(month.totalExpenses)} (Parcelas: ${formatBRL(month.installmentsTotal)})`}
                        />
                      </div>

                      {/* Month Label */}
                      <span className="text-[10px] font-medium text-white truncate max-w-full">
                        {month.displayMonth}
                      </span>
                      <span className={`text-[9px] font-mono ${isDeficit ? 'text-[#E29578] font-bold' : 'text-[#737373]'}`}>
                        {formatBRL(month.netSurplus)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-[#737373] mt-4 pt-3 border-t border-[#1E1E1E]">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-xs bg-[#A3C9A8]/50" />
                  <span>Receita Prevista</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-xs bg-[#E5A97D]" />
                  <span>Despesa Total Projetada</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-xs bg-[#E29578]" />
                  <span>Déficit / Alerta</span>
                </div>
              </div>
            </div>
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
      {/* SEÇÃO 3: CURVA DE LIBERDADE FINANCEIRA (JUROS COMPOSTOS) */}
      {/* ============================================================= */}
      {activeSubTab === 'freedom_curve' && (
        <div className="space-y-4">
          {/* Controls & Rates */}
          <div className="p-5 rounded-3xl bg-[#141414] border border-[#262626] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Simulação de Liberdade Financeira (Independência & Reserva)
                </h3>
                <p className="text-xs text-[#737373] mt-0.5">
                  Projeção do excedente mensal investido sob taxas de juros reais médias (acima da inflação).
                </p>
              </div>

              <div className="flex items-center gap-2 bg-[#0D0D0D] px-3 py-1.5 rounded-xl border border-[#262626]">
                <Sliders className="w-3.5 h-3.5 text-[#A8B5D1]" />
                <span className="text-xs text-[#A3A3A3]">
                  Taxa Real: <strong className="text-white">{Math.round(annualInterestRate * 100)}% a.a.</strong>
                </span>
              </div>
            </div>

            {/* Slider de Taxa de Juros Real */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-[#737373]">
                <span>Taxa de Juros Real Média (Selic - IPCA):</span>
                <span className="text-white font-mono">{Math.round(annualInterestRate * 100)}% ao ano</span>
              </div>
              <input
                type="range"
                min="0.03"
                max="0.12"
                step="0.01"
                value={annualInterestRate}
                onChange={(e) => setAnnualInterestRate(parseFloat(e.target.value))}
                className="w-full accent-white cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#525252]">
                <span>3% (Conservador)</span>
                <span>6% (Histórico Tesouro IPCA+)</span>
                <span>12% (Arrojado)</span>
              </div>
            </div>

            {/* Metas Principais */}
            {incomeTotal === 0 && (
              <div className="p-3.5 rounded-2xl bg-[#0D0D0D] border border-[#1E1E1E] text-xs text-[#737373] mt-2">
                <strong className="text-white">Aguardando receitas:</strong> Cadastre sua renda mensal e custos essenciais no Extrato para calcular o prazo exato da sua reserva de emergência e independência financeira.
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Meta 1: Reserva de Emergência */}
              <div className="p-3.5 rounded-2xl bg-[#0D0D0D] border border-[#1E1E1E]">
                <div className="flex items-center gap-2 text-xs text-[#A8B5D1] font-medium">
                  <PiggyBank className="w-4 h-4 text-[#A8B5D1]" />
                  <span>Reserva de Emergência (6 meses)</span>
                </div>
                <div className="text-xl font-bold text-white mt-1.5 font-mono">
                  {formatBRL(freedomSimulation.emergencyTarget)}
                </div>
                <div className="text-[11px] text-[#737373] mt-1">
                  {freedomSimulation.emergencyTarget > 0 && freedomSimulation.emergencyMonthReached > 0 ? (
                    <>Tempo estimado: <strong className="text-[#A3C9A8]">{freedomSimulation.emergencyMonthReached} meses</strong> de aportes</>
                  ) : (
                    <span>Cadastre seus custos essenciais para calcular</span>
                  )}
                </div>
              </div>

              {/* Meta 2: Independência Financeira (Regra dos 300 / 4% anuais) */}
              <div className="p-3.5 rounded-2xl bg-[#0D0D0D] border border-[#1E1E1E]">
                <div className="flex items-center gap-2 text-xs text-[#A3C9A8] font-medium">
                  <Target className="w-4 h-4 text-[#A3C9A8]" />
                  <span>Independência Financeira (Regra 4%)</span>
                </div>
                <div className="text-xl font-bold text-[#A3C9A8] mt-1.5 font-mono">
                  {formatBRL(freedomSimulation.independenceTarget)}
                </div>
                <div className="text-[11px] text-[#737373] mt-1">
                  {freedomSimulation.independenceTarget > 0 && freedomSimulation.independenceYearsReached > 0 ? (
                    <>Tempo estimado: <strong className="text-white">{freedomSimulation.independenceYearsReached} anos</strong> de acumulação</>
                  ) : (
                    <span>Cadastre receitas e despesas para projetar</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Compound Interest Progression Table (1, 3, 5, 10, 15, 20 anos) */}
          <div className="p-5 rounded-3xl bg-[#141414] border border-[#262626]">
            <h4 className="text-xs font-semibold text-[#737373] uppercase tracking-wider mb-4">
              Crescimento de Patrimônio com Aportes Contínuos
            </h4>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1E1E1E] text-[#737373] text-[11px]">
                    <th className="text-left pb-2 font-medium">Prazo</th>
                    <th className="text-right pb-2 font-medium">Total Aportado</th>
                    <th className="text-right pb-2 font-medium">Patrimônio Acumulado</th>
                    <th className="text-right pb-2 font-medium">Renda Passiva Mensal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]">
                  {freedomSimulation.points
                    .filter(pt => [1, 3, 5, 10, 15, 20].includes(pt.year))
                    .map((pt) => (
                      <tr key={pt.year} className="hover:bg-[#1A1A1A]/50 transition">
                        <td className="py-2.5 font-semibold text-white">
                          Ano {pt.year}
                        </td>
                        <td className="py-2.5 text-right font-mono text-[#A3A3A3]">
                          {formatBRL(pt.investedCapital)}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-white">
                          {formatBRL(pt.compoundTotal)}
                        </td>
                        <td className="py-2.5 text-right font-mono text-[#A3C9A8] font-semibold">
                          +{formatBRL(pt.passiveMonthlyIncome)}/mês
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-[11px] text-[#737373] leading-relaxed">
              * A simulação reinveste todo o excedente mensal com capitalização composta e considera retorno real líquido de inflação. A renda passiva mensal é calculada com taxa segura de retirada anual.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
