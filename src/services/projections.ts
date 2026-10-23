import { Transaction, MonthlyCashFlowProjection, FreedomProjectionPoint } from '../types/finance';

/**
 * Auxiliar para verificar se um lançamento fixo está ativo em determinado mês 'YYYY-MM'
 */
export function isFixedActiveInMonth(t: Transaction, monthYear: string): boolean {
  const start = t.startDate || (t.date ? t.date.slice(0, 7) : '');
  const end = t.endDate || null;
  if (!start) return false;
  return monthYear >= start && (!end || monthYear < end);
}

/**
 * Calcula projeções mensais de fluxo de caixa baseadas em:
 * 1. Receitas fixas recorrentes ativas mês a mês
 * 2. Custos fixos recorrentes ativos mês a mês (respeitando startDate e endDate)
 * 3. Amortização progressiva de parcelamentos ativos (compras e vendas)
 * 4. Média móvel dos gastos diários
 */
export function calculateCashFlowProjections(
  transactions: Transaction[],
  monthsAhead: number = 6,
  baseMonthYear?: string // 'YYYY-MM'
): MonthlyCashFlowProjection[] {
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const now = new Date();
  let baseYear = now.getFullYear();
  let baseMonth = now.getMonth(); // 0-indexed

  if (baseMonthYear && /^\d{4}-\d{2}$/.test(baseMonthYear)) {
    const [y, m] = baseMonthYear.split('-').map(Number);
    baseYear = y;
    baseMonth = m - 1;
  }

  const monthNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  // Caso não existam transações (zero-state limpo)
  if (safeTransactions.length === 0) {
    const projections: MonthlyCashFlowProjection[] = [];
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

  // 1. Receita real do mês base (para usar como baseline imediato de renda mensal)
  const baseMonthIncomes = (baseMonthYear && /^\d{4}-\d{2}$/.test(baseMonthYear))
    ? safeTransactions
        .filter(t => t.type === 'income' && t.date && t.date.startsWith(baseMonthYear))
        .reduce((acc, t) => acc + (Number(t.amount) || 0), 0)
    : 0;

  // 2. Média histórica de receitas mensais em meses com receita
  const incomeMonthMap = new Map<string, number>();
  safeTransactions
    .filter(t => t.type === 'income')
    .forEach(t => {
      const ym = t.date ? t.date.slice(0, 7) : '';
      if (ym) incomeMonthMap.set(ym, (incomeMonthMap.get(ym) || 0) + (Number(t.amount) || 0));
    });
  const avgIncome = incomeMonthMap.size > 0 
    ? Array.from(incomeMonthMap.values()).reduce((sum, v) => sum + v, 0) / incomeMonthMap.size
    : 0;

  // 3. Gastos diários médios dos últimos meses (informativo)
  const dailyExpensesMonthMap = new Map<string, number>();
  safeTransactions
    .filter(t => t.type === 'expense' && t.nature === 'daily')
    .forEach(t => {
      const ym = t.date ? t.date.slice(0, 7) : '';
      if (ym) dailyExpensesMonthMap.set(ym, (dailyExpensesMonthMap.get(ym) || 0) + (Number(t.amount) || 0));
    });
  const avgDailyMonthly = dailyExpensesMonthMap.size > 0
    ? Array.from(dailyExpensesMonthMap.values()).reduce((sum, v) => sum + v, 0) / dailyExpensesMonthMap.size
    : 0;

  // Mapear grupos de parcelamento para conciliação fiel entre extrato e projeção
  const installmentGroupsMap = new Map<string, Transaction[]>();
  safeTransactions
    .filter(t => t.nature === 'installment')
    .forEach(t => {
      const key = t.installmentDetails?.groupId || t.id;
      const list = installmentGroupsMap.get(key) || [];
      list.push(t);
      installmentGroupsMap.set(key, list);
    });

  const projections: MonthlyCashFlowProjection[] = [];

  for (let offset = 1; offset <= monthsAhead; offset++) {
    const targetDate = new Date(baseYear, baseMonth + offset, 1);
    const y = targetDate.getFullYear();
    const m = targetDate.getMonth();
    const monthYear = `${y}-${String(m + 1).padStart(2, '0')}`;
    const displayMonth = `${monthNames[m]} ${String(y).slice(-2)}`;

    // 1. Receitas do mês:
    // a. Se o usuário já cadastrou transações de receita no próprio mês futuro (ex: já tem salário lançado em Dezembro)
    const actualIncomesInMonth = safeTransactions
      .filter(t => t.type === 'income' && t.nature !== 'installment' && t.date && t.date.startsWith(monthYear))
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    // b. Receitas fixas ativas neste mês futuro (recorrências com startDate / sem endDate)
    const fixedIncomesInMonth = safeTransactions
      .filter(t => t.type === 'income' && t.nature === 'fixed' && isFixedActiveInMonth(t, monthYear))
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    // c. Linha de base da renda mensal (se não houver fixa ativa nem lançamento real no mês, herda a renda do mês base ou média)
    const recurringOrBase = fixedIncomesInMonth > 0 ? fixedIncomesInMonth : (baseMonthIncomes > 0 ? baseMonthIncomes : avgIncome);
    const monthBaselineIncome = actualIncomesInMonth > 0 ? actualIncomesInMonth : recurringOrBase;

    // 2. Custos fixos e despesas comprometidas no mês:
    const actualFixedInMonth = safeTransactions
      .filter(t => t.type === 'expense' && t.nature === 'fixed' && t.date && t.date.startsWith(monthYear))
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const recurringFixedInMonth = safeTransactions
      .filter(t => t.type === 'expense' && t.nature === 'fixed' && isFixedActiveInMonth(t, monthYear))
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const fixedExpensesInMonth = Math.max(actualFixedInMonth, recurringFixedInMonth);

    // 3. Somar parcelas de despesas ativas neste mês futuro
    let monthExpenseInstallmentsTotal = 0;
    let activeExpenseCount = 0;

    installmentGroupsMap.forEach(txList => {
      const first = txList[0];
      if (first.type !== 'expense') return;

      // Verificar se há lançamento agendado no extrato para este mês
      const txInMonth = txList.find(t => t.date.startsWith(monthYear));
      if (txInMonth) {
        monthExpenseInstallmentsTotal += Number(txInMonth.amount) || 0;
        activeExpenseCount++;
      } else if (txList.length === 1 && first.installmentDetails) {
        // Fallback para modelos sintéticos (ex: testes com transação única)
        const details = first.installmentDetails;
        const total = details.totalInstallments || 1;
        const cur = details.currentInstallment || 1;
        const remaining = Math.max(0, total - cur + 1);
        if (remaining >= offset) {
          monthExpenseInstallmentsTotal += Number(details.monthlyAmount) || Number(first.amount) || 0;
          activeExpenseCount++;
        }
      }
    });

    // 4. Somar parcelas de receitas a receber neste mês futuro (vendas para amigos)
    let monthIncomeInstallmentsTotal = 0;
    installmentGroupsMap.forEach(txList => {
      const first = txList[0];
      if (first.type !== 'income') return;

      const txInMonth = txList.find(t => t.date.startsWith(monthYear));
      if (txInMonth) {
        monthIncomeInstallmentsTotal += Number(txInMonth.amount) || 0;
      } else if (txList.length === 1 && first.installmentDetails) {
        const details = first.installmentDetails;
        const total = details.totalInstallments || 1;
        const cur = details.currentInstallment || 1;
        const remaining = Math.max(0, total - cur + 1);
        if (remaining >= offset) {
          monthIncomeInstallmentsTotal += Number(details.monthlyAmount) || Number(first.amount) || 0;
        }
      }
    });

    const projectedIncome = monthBaselineIncome + monthIncomeInstallmentsTotal;

    // Despesas já lançadas no mês que não sejam parcelas (para sincronizar exatamente com a Visão Geral caso o mês já tenha lançamentos)
    const actualOtherExpensesInMonth = safeTransactions
      .filter(t => t.type === 'expense' && t.nature !== 'installment' && t.date && t.date.startsWith(monthYear))
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    const committedExpenses = fixedExpensesInMonth + monthExpenseInstallmentsTotal;
    const totalExpenses = Math.max(committedExpenses, actualOtherExpensesInMonth + monthExpenseInstallmentsTotal);
    const netSurplus = projectedIncome - totalExpenses;

    projections.push({
      monthYear,
      displayMonth,
      fixedExpenses: Math.round(fixedExpensesInMonth),
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
 * Simula a curva de Liberdade Financeira (Reserva de Emergência e Independência)
 * usando capitalização de juros compostos.
 */
export function calculateFreedomSimulation(
  monthlySaving: number,
  initialCapital: number = 0,
  annualRealRate: number = 0.06, // 6% a.a. real
  simulationYears: number = 20,
  monthlyEssentialCost: number = 3000
) {
  const safeMonthlySaving = Math.max(0, monthlySaving || 0);
  const safeInitialCapital = Math.max(0, initialCapital || 0);
  const safeRate = Math.max(0.01, annualRealRate || 0.06);
  const monthlyRate = Math.pow(1 + safeRate, 1 / 12) - 1;

  // 1. Meta Reserva de Emergência: 6 meses de custo fixo / essencial
  const emergencyTarget = monthlyEssentialCost * 6;
  let emergencyMonthReached = -1;

  // 2. Meta Independência Financeira (Regra dos 4% anuais ou inverso da taxa de retirada segura)
  // Renda Passiva = Patrimônio * 4% / 12 => Patrimônio = (Custo Mensal * 12) / 0.04 = Custo Mensal * 300
  const independenceTarget = monthlyEssentialCost * 300;
  let independenceYearsReached = -1;

  // 3. Trajetória ano a ano
  const points: FreedomProjectionPoint[] = [];
  let currentBalance = safeInitialCapital;
  let totalInvested = safeInitialCapital;

  // Ponto inicial Ano 0
  points.push({
    year: 0,
    investedCapital: Math.round(totalInvested),
    compoundTotal: Math.round(currentBalance),
    passiveMonthlyIncome: Math.round((currentBalance * safeRate) / 12)
  });

  const totalMonths = simulationYears * 12;

  for (let m = 1; m <= totalMonths; m++) {
    currentBalance = currentBalance * (1 + monthlyRate) + safeMonthlySaving;
    totalInvested += safeMonthlySaving;

    // Checar alcance da reserva de emergência
    if (emergencyMonthReached === -1 && currentBalance >= emergencyTarget && emergencyTarget > 0) {
      emergencyMonthReached = m;
    }

    // Checar alcance da independência financeira
    if (independenceYearsReached === -1 && currentBalance >= independenceTarget && independenceTarget > 0) {
      independenceYearsReached = Math.round((m / 12) * 10) / 10;
    }

    // Salvar pontos anuais
    if (m % 12 === 0) {
      const year = m / 12;
      points.push({
        year,
        investedCapital: Math.round(totalInvested),
        compoundTotal: Math.round(currentBalance),
        passiveMonthlyIncome: Math.round((currentBalance * 0.04) / 12) // Regra de retirada 4%
      });
    }
  }

  return {
    emergencyTarget: Math.round(emergencyTarget),
    emergencyMonthReached: emergencyMonthReached === -1 ? 0 : emergencyMonthReached,
    independenceTarget: Math.round(independenceTarget),
    independenceYearsReached: independenceYearsReached === -1 ? 0 : independenceYearsReached,
    points
  };
}
