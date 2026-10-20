import { Transaction, MonthlyCashFlowProjection, FreedomProjectionPoint } from '../types/finance';

/**
 * Gera a projeção de fluxo de caixa futuro para os próximos N meses,
 * calculando o impacto exato do término progressivo dos parcelamentos ativos,
 * custos fixos recorrentes e projeção de receita.
 * Lida graciosamente com ausência de dados (Zero-State).
 */
export function calculateCashFlowProjections(
  transactions: Transaction[] = [],
  monthsAhead: number = 6,
  startMonthYear?: string
): MonthlyCashFlowProjection[] {
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  // Data base de partida (ex: 2026-10)
  const now = new Date();
  let baseYear = now.getFullYear();
  let baseMonth = now.getMonth(); // 0-indexed

  if (startMonthYear) {
    const parts = startMonthYear.split('-');
    if (parts.length === 2) {
      baseYear = parseInt(parts[0], 10) || baseYear;
      baseMonth = (parseInt(parts[1], 10) - 1) || baseMonth;
    }
  }

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const projections: MonthlyCashFlowProjection[] = [];

  // Se não há nenhuma transação registrada, retorna projeção limpa zerada
  if (safeTransactions.length === 0) {
    for (let offset = 1; offset <= monthsAhead; offset++) {
      const targetDate = new Date(baseYear, baseMonth + offset, 1);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth();
      const monthYear = `${y}-${String(m + 1).padStart(2, '0')}`;
      const displayMonth = `${monthNames[m]} ${String(y).slice(-2)}`;

      projections.push({
        monthYear,
        displayMonth,
        fixedExpenses: 0,
        installmentsTotal: 0,
        estimatedDaily: 0,
        totalExpenses: 0,
        projectedIncome: 0,
        netSurplus: 0,
        isDeficit: false,
        activeInstallmentCount: 0
      });
    }
    return projections;
  }

  // 1. Identificar receitas recorrentes / médias
  const fixedIncomes = safeTransactions
    .filter(t => t.type === 'income' && t.nature === 'fixed')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const allIncomes = safeTransactions.filter(t => t.type === 'income');
  const distinctIncomeMonths = new Set(allIncomes.map(t => t.date ? t.date.slice(0, 7) : '')).size || 1;
  const avgIncome = allIncomes.length > 0 
    ? allIncomes.reduce((acc, t) => acc + (Number(t.amount) || 0), 0) / distinctIncomeMonths
    : 0;

  const baselineMonthlyIncome = fixedIncomes > 0 ? fixedIncomes : avgIncome;

  // 2. Identificar custos fixos recorrentes
  const fixedExpensesBaseline = safeTransactions
    .filter(t => t.type === 'expense' && t.nature === 'fixed')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  // 3. Identificar gastos diários médios dos últimos meses
  const dailyExpenses = safeTransactions.filter(t => t.type === 'expense' && t.nature === 'daily');
  const distinctExpenseMonths = new Set(dailyExpenses.map(t => t.date ? t.date.slice(0, 7) : '')).size || 1;
  const avgDailyMonthly = dailyExpenses.length > 0
    ? dailyExpenses.reduce((acc, t) => acc + (Number(t.amount) || 0), 0) / distinctExpenseMonths
    : 0;

  // 4. Mapear compras e vendas parceladas ativas
  const activeExpenseInstallments: Array<{
    description: string;
    monthlyAmount: number;
    remainingMonths: number;
  }> = [];

  const activeIncomeInstallments: Array<{
    description: string;
    monthlyAmount: number;
    remainingMonths: number;
  }> = [];

  const seenGroups = new Set<string>();
  safeTransactions
    .filter(t => t.nature === 'installment' && t.installmentDetails)
    .forEach(t => {
      const details = t.installmentDetails!;
      const key = details.groupId || t.id;
      if (!seenGroups.has(key)) {
        seenGroups.add(key);
        const remaining = Math.max(0, (details.totalInstallments || 1) - (details.currentInstallment || 1) + 1);
        if (remaining > 0) {
          const item = {
            description: t.description || 'Parcelamento',
            monthlyAmount: Number(details.monthlyAmount) || 0,
            remainingMonths: remaining
          };
          if (t.type === 'income') {
            activeIncomeInstallments.push(item);
          } else {
            activeExpenseInstallments.push(item);
          }
        }
      }
    });

  for (let offset = 1; offset <= monthsAhead; offset++) {
    const targetDate = new Date(baseYear, baseMonth + offset, 1);
    const y = targetDate.getFullYear();
    const m = targetDate.getMonth();
    const monthYear = `${y}-${String(m + 1).padStart(2, '0')}`;
    const displayMonth = `${monthNames[m]} ${String(y).slice(-2)}`;

    // Somar parcelas de despesas ativas neste mês futuro
    let monthExpenseInstallmentsTotal = 0;
    let activeExpenseCount = 0;
    activeExpenseInstallments.forEach(item => {
      if (item.remainingMonths >= offset) {
        monthExpenseInstallmentsTotal += item.monthlyAmount;
        activeExpenseCount++;
      }
    });

    // Somar parcelas de receitas a receber neste mês futuro (vendas para amigos)
    let monthIncomeInstallmentsTotal = 0;
    activeIncomeInstallments.forEach(item => {
      if (item.remainingMonths >= offset) {
        monthIncomeInstallmentsTotal += item.monthlyAmount;
      }
    });

    const projectedIncome = baselineMonthlyIncome + monthIncomeInstallmentsTotal;
    const totalExpenses = fixedExpensesBaseline + monthExpenseInstallmentsTotal + avgDailyMonthly;
    const netSurplus = projectedIncome - totalExpenses;

    projections.push({
      monthYear,
      displayMonth,
      fixedExpenses: Math.round(fixedExpensesBaseline),
      installmentsTotal: Math.round(monthExpenseInstallmentsTotal),
      estimatedDaily: Math.round(avgDailyMonthly),
      totalExpenses: Math.round(totalExpenses),
      projectedIncome: Math.round(projectedIncome),
      netSurplus: Math.round(netSurplus),
      isDeficit: projectedIncome > 0 ? netSurplus < 0 : totalExpenses > 0,
      activeInstallmentCount: activeExpenseCount
    });
  }

  return projections;
}

/**
 * Simulação de Liberdade Financeira:
 * Modela o crescimento de patrimônio por juros compostos a partir do excedente mensal investido.
 * Trata estados vazios com segurança total.
 */
export function calculateFreedomSimulation(
  monthlyInvested: number,
  initialCapital: number = 0,
  annualRealInterestRate: number = 0.06, // 6% a.a. real acima da inflação
  horizonYears: number = 20,
  essentialMonthlyExpenses: number = 0
) {
  const safeRate = Math.max(0.001, isNaN(annualRealInterestRate) ? 0.06 : annualRealInterestRate);
  const safeMonthlyInvested = Math.max(0, isNaN(monthlyInvested) ? 0 : monthlyInvested);
  const safeInitialCapital = Math.max(0, isNaN(initialCapital) ? 0 : initialCapital);
  const safeEssential = Math.max(0, isNaN(essentialMonthlyExpenses) ? 0 : essentialMonthlyExpenses);

  const points: FreedomProjectionPoint[] = [];
  const monthlyRate = Math.pow(1 + safeRate, 1 / 12) - 1;

  let currentTotal = safeInitialCapital;
  let totalInvestedPrincipal = safeInitialCapital;

  // Ponto inicial Ano 0
  points.push({
    year: 0,
    investedCapital: Math.round(totalInvestedPrincipal),
    compoundTotal: Math.round(currentTotal),
    passiveMonthlyIncome: Math.round(currentTotal * (safeRate / 12))
  });

  for (let y = 1; y <= horizonYears; y++) {
    for (let m = 0; m < 12; m++) {
      currentTotal = currentTotal * (1 + monthlyRate) + safeMonthlyInvested;
      totalInvestedPrincipal += safeMonthlyInvested;
    }

    points.push({
      year: y,
      investedCapital: Math.round(totalInvestedPrincipal),
      compoundTotal: Math.round(currentTotal),
      passiveMonthlyIncome: Math.round(currentTotal * (safeRate / 12))
    });
  }

  // Metas
  const emergencyTarget = safeEssential * 6;
  let emergencyMonth = 0;
  if (emergencyTarget > 0 && (safeMonthlyInvested > 0 || safeInitialCapital > 0)) {
    let tempSim = safeInitialCapital;
    while (tempSim < emergencyTarget && emergencyMonth < horizonYears * 12) {
      emergencyMonth++;
      tempSim = tempSim * (1 + monthlyRate) + safeMonthlyInvested;
    }
  }

  const independenceTarget = safeEssential > 0 ? (safeEssential * 12) / safeRate : 0;
  let independenceYears = 0;
  if (independenceTarget > 0 && (safeMonthlyInvested > 0 || safeInitialCapital > 0)) {
    let tempSim = safeInitialCapital;
    let totalMonths = 0;
    while (tempSim < independenceTarget && totalMonths < horizonYears * 12) {
      totalMonths++;
      tempSim = tempSim * (1 + monthlyRate) + safeMonthlyInvested;
    }
    independenceYears = totalMonths < horizonYears * 12 ? Math.round((totalMonths / 12) * 10) / 10 : 0;
  }

  return {
    points,
    emergencyTarget: Math.round(emergencyTarget),
    emergencyMonthReached: emergencyMonth,
    independenceTarget: Math.round(independenceTarget),
    independenceYearsReached: independenceYears
  };
}
