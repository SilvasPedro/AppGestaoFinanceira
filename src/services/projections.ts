import { Transaction, MonthlyCashFlowProjection, FreedomProjectionPoint } from '../types/finance';

/**
 * Gera a projeção de fluxo de caixa futuro para os próximos N meses,
 * calculando o impacto exato do término progressivo dos parcelamentos ativos,
 * custos fixos recorrentes e projeção de receita.
 */
export function calculateCashFlowProjections(
  transactions: Transaction[],
  monthsAhead: number = 6,
  startMonthYear?: string
): MonthlyCashFlowProjection[] {
  // Data base de partida (ex: 2026-10)
  const now = new Date();
  let baseYear = now.getFullYear();
  let baseMonth = now.getMonth(); // 0-indexed

  if (startMonthYear) {
    const parts = startMonthYear.split('-');
    if (parts.length === 2) {
      baseYear = parseInt(parts[0], 10);
      baseMonth = parseInt(parts[1], 10) - 1;
    }
  }

  // 1. Identificar receitas recorrentes / médias
  const fixedIncomes = transactions
    .filter(t => t.type === 'income' && t.nature === 'fixed')
    .reduce((acc, t) => acc + t.amount, 0);

  // Média de receitas totais dos últimos 3 meses caso não haja receita fixada explicitamente
  const allIncomes = transactions.filter(t => t.type === 'income');
  const avgIncome = allIncomes.length > 0 
    ? allIncomes.reduce((acc, t) => acc + t.amount, 0) / Math.max(1, new Set(allIncomes.map(t => t.date.slice(0, 7))).size)
    : 0;

  const baselineMonthlyIncome = fixedIncomes > 0 ? fixedIncomes : avgIncome;

  // 2. Identificar custos fixos recorrentes
  const fixedExpensesBaseline = transactions
    .filter(t => t.type === 'expense' && t.nature === 'fixed')
    .reduce((acc, t) => acc + t.amount, 0);

  // 3. Identificar gastos diários médios dos últimos 3 meses
  const dailyExpenses = transactions.filter(t => t.type === 'expense' && t.nature === 'daily');
  const distinctExpenseMonths = new Set(dailyExpenses.map(t => t.date.slice(0, 7))).size || 1;
  const avgDailyMonthly = dailyExpenses.reduce((acc, t) => acc + t.amount, 0) / distinctExpenseMonths;

  // 4. Mapear compras parceladas ativas
  // Agrupadas por installmentDetails.groupId ou id
  const activeInstallments: Array<{
    description: string;
    monthlyAmount: number;
    remainingMonths: number;
  }> = [];

  const seenGroups = new Set<string>();
  transactions
    .filter(t => t.nature === 'installment' && t.installmentDetails)
    .forEach(t => {
      const details = t.installmentDetails!;
      const key = details.groupId || t.id;
      if (!seenGroups.has(key)) {
        seenGroups.add(key);
        const remaining = Math.max(0, details.totalInstallments - details.currentInstallment + 1);
        if (remaining > 0) {
          activeInstallments.push({
            description: t.description || 'Parcelamento',
            monthlyAmount: details.monthlyAmount,
            remainingMonths: remaining
          });
        }
      }
    });

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const projections: MonthlyCashFlowProjection[] = [];

  for (let offset = 1; offset <= monthsAhead; offset++) {
    const targetDate = new Date(baseYear, baseMonth + offset, 1);
    const y = targetDate.getFullYear();
    const m = targetDate.getMonth();
    const monthYear = `${y}-${String(m + 1).padStart(2, '0')}`;
    const displayMonth = `${monthNames[m]} ${String(y).slice(-2)}`;

    // Somar parcelas ativas neste mês futuro
    let monthInstallmentsTotal = 0;
    let activeCount = 0;

    activeInstallments.forEach(item => {
      if (item.remainingMonths >= offset) {
        monthInstallmentsTotal += item.monthlyAmount;
        activeCount++;
      }
    });

    const totalExpenses = fixedExpensesBaseline + monthInstallmentsTotal + avgDailyMonthly;
    const netSurplus = baselineMonthlyIncome - totalExpenses;

    projections.push({
      monthYear,
      displayMonth,
      fixedExpenses: Math.round(fixedExpensesBaseline),
      installmentsTotal: Math.round(monthInstallmentsTotal),
      estimatedDaily: Math.round(avgDailyMonthly),
      totalExpenses: Math.round(totalExpenses),
      projectedIncome: Math.round(baselineMonthlyIncome),
      netSurplus: Math.round(netSurplus),
      isDeficit: netSurplus < 0,
      activeInstallmentCount: activeCount
    });
  }

  return projections;
}

/**
 * Simulação de Liberdade Financeira:
 * Modela o crescimento de patrimônio por juros compostos a partir do excedente mensal investido.
 */
export function calculateFreedomSimulation(
  monthlyInvested: number,
  initialCapital: number = 0,
  annualRealInterestRate: number = 0.06, // 6% a.a. real acima da inflação
  horizonYears: number = 20,
  essentialMonthlyExpenses: number = 3000
) {
  const points: FreedomProjectionPoint[] = [];
  const monthlyRate = Math.pow(1 + annualRealInterestRate, 1 / 12) - 1;

  let currentTotal = initialCapital;
  let totalInvestedPrincipal = initialCapital;

  // Ponto inicial Ano 0
  points.push({
    year: 0,
    investedCapital: Math.round(totalInvestedPrincipal),
    compoundTotal: Math.round(currentTotal),
    passiveMonthlyIncome: Math.round(currentTotal * monthlyRate)
  });

  for (let y = 1; y <= horizonYears; y++) {
    for (let m = 0; m < 12; m++) {
      currentTotal = currentTotal * (1 + monthlyRate) + monthlyInvested;
      totalInvestedPrincipal += monthlyInvested;
    }

    points.push({
      year: y,
      investedCapital: Math.round(totalInvestedPrincipal),
      compoundTotal: Math.round(currentTotal),
      passiveMonthlyIncome: Math.round(currentTotal * (annualRealInterestRate / 12))
    });
  }

  // Metas
  // 1. Reserva de Emergência: 6 meses de gastos essenciais
  const emergencyTarget = essentialMonthlyExpenses * 6;
  let emergencyMonth = 0;
  let tempSim = initialCapital;
  while (tempSim < emergencyTarget && emergencyMonth < horizonYears * 12) {
    emergencyMonth++;
    tempSim = tempSim * (1 + monthlyRate) + monthlyInvested;
  }

  // 2. Independência Financeira (Regra dos 300 / Regra dos 4% anuais = 25x custo anual)
  // Permite cobrir os gastos essenciais perpetuamente com renda passiva
  const independenceTarget = (essentialMonthlyExpenses * 12) / annualRealInterestRate;
  let independenceYears = 0;
  tempSim = initialCapital;
  let totalMonths = 0;
  while (tempSim < independenceTarget && totalMonths < horizonYears * 12) {
    totalMonths++;
    tempSim = tempSim * (1 + monthlyRate) + monthlyInvested;
  }
  independenceYears = totalMonths < horizonYears * 12 ? Math.round((totalMonths / 12) * 10) / 10 : 0;

  return {
    points,
    emergencyTarget,
    emergencyMonthReached: emergencyMonth,
    independenceTarget: Math.round(independenceTarget),
    independenceYearsReached: independenceYears
  };
}
