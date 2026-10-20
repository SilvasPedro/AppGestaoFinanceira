import { Transaction, CategoryBudget, HealthScoreResult } from '../types/finance';

/**
 * Calcula o Score de Saúde Financeira (0 a 1000) baseado em 4 pilares:
 * 1. Taxa de Poupança (Peso 30% - até 300 pontos)
 * 2. Comprometimento de Renda (Peso 30% - até 300 pontos)
 * 3. Disciplina Orçamentária (Peso 25% - até 250 pontos)
 * 4. Consistência de Lançamentos (Peso 15% - até 150 pontos)
 *
 * Trata com total segurança estados vazios (Zero-State), divisões por zero e ausência de dados.
 */
export function calculateHealthScore(
  transactions: Transaction[] = [],
  budgets: CategoryBudget[] = [],
  targetMonth: string // 'YYYY-MM'
): HealthScoreResult {
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeBudgets = Array.isArray(budgets) ? budgets : [];
  const monthTransactions = safeTransactions.filter(t => t.date && t.date.startsWith(targetMonth));

  // Estado Vazio (Zero-State): nenhum lançamento no mês selecionado
  if (monthTransactions.length === 0) {
    return {
      score: 0,
      status: 'Aguardando Lançamentos',
      statusColor: '#A8B5D1', // Lavanda pastel neutro
      isEmpty: true,
      pillars: {
        savingsRate: {
          score: 0,
          max: 300,
          percentageValue: 0,
          label: 'Taxa de Poupança (30%)',
          status: 'Aguardando registro de receitas'
        },
        incomeCommitment: {
          score: 0,
          max: 300,
          percentageValue: 0,
          label: 'Comprometimento de Renda (30%)',
          status: 'Aguardando registro de despesas'
        },
        budgetDiscipline: {
          score: 0,
          max: 250,
          percentageValue: 0,
          label: 'Disciplina Orçamentária (25%)',
          status: safeBudgets.length > 0 ? `${safeBudgets.length} teto(s) aguardando lançamentos` : 'Nenhum teto configurado'
        },
        entryConsistency: {
          score: 0,
          max: 150,
          daysWithEntries: 0,
          label: 'Consistência de Lançamentos (15%)',
          status: 'Sem movimentações no mês'
        }
      },
      actionableTips: [
        'Cadastre sua renda mensal (salário ou rendimentos) para calcular sua taxa real de poupança.',
        'Lance seus custos fixos e compras parceladas para acompanhar o percentual de comprometimento da sua renda.',
        'Defina limites orçamentários por categoria para habilitar o indicador de disciplina financeira.'
      ]
    };
  }

  // Total de receitas do mês
  const totalIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  // Total de despesas do mês
  const totalExpenses = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  // Custos Fixos + Parcelas
  const fixedExpenses = monthTransactions
    .filter(t => t.type === 'expense' && t.nature === 'fixed')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const installmentExpenses = monthTransactions
    .filter(t => t.type === 'expense' && t.nature === 'installment')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const committedExpenses = fixedExpenses + installmentExpenses;

  // Gastos por categoria de despesa no mês
  const expensesByCategory: Record<string, number> = {};
  monthTransactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const cat = t.category || 'Outros';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (Number(t.amount) || 0);
    });

  // Dias com lançamentos no mês
  const distinctDaysWithEntries = new Set(
    monthTransactions.map(t => t.date)
  ).size;

  // -------------------------------------------------------------
  // PILAR 1: Taxa de Poupança (Peso 30% => Max 300 pts)
  // -------------------------------------------------------------
  let savingsRate = 0;
  let savingsScore = 0;
  let savingsStatus = 'Sem Renda Registrada';

  if (totalIncome > 0) {
    const netSurplus = totalIncome - totalExpenses;
    savingsRate = Math.round((netSurplus / totalIncome) * 100);

    if (savingsRate >= 30) {
      savingsScore = 300;
      savingsStatus = 'Excepcional (≥ 30%)';
    } else if (savingsRate >= 20) {
      savingsScore = Math.round(240 + ((savingsRate - 20) / 10) * 60);
      savingsStatus = 'Ótima (20% - 30%)';
    } else if (savingsRate >= 10) {
      savingsScore = Math.round(170 + ((savingsRate - 10) / 10) * 70);
      savingsStatus = 'Adequada (10% - 20%)';
    } else if (savingsRate > 0) {
      savingsScore = Math.round(90 + (savingsRate / 10) * 80);
      savingsStatus = 'Apertada (0% - 10%)';
    } else {
      const deficitRatio = Math.min(Math.abs(netSurplus) / totalIncome, 1);
      savingsScore = Math.round(Math.max(0, 80 * (1 - deficitRatio)));
      savingsStatus = 'Déficit no Mês (< 0%)';
    }
  } else {
    savingsScore = 0;
    savingsRate = 0;
    savingsStatus = totalExpenses > 0 ? 'Despesas sem receitas registradas' : 'Sem receitas no mês';
  }

  // -------------------------------------------------------------
  // PILAR 2: Comprometimento de Renda (Peso 30% => Max 300 pts)
  // -------------------------------------------------------------
  let commitmentRate = 0;
  let commitmentScore = 0;
  let commitmentStatus = 'Sem Dados';

  if (totalIncome > 0) {
    commitmentRate = Math.round((committedExpenses / totalIncome) * 100);

    if (commitmentRate <= 35) {
      commitmentScore = 300;
      commitmentStatus = 'Muito Seguro (≤ 35%)';
    } else if (commitmentRate <= 50) {
      commitmentScore = Math.round(300 - ((commitmentRate - 35) / 15) * 60);
      commitmentStatus = 'Equilibrado (35% - 50%)';
    } else if (commitmentRate <= 70) {
      commitmentScore = Math.round(240 - ((commitmentRate - 50) / 20) * 120);
      commitmentStatus = 'Alerta de Rigidez (50% - 70%)';
    } else if (commitmentRate <= 90) {
      commitmentScore = Math.round(120 - ((commitmentRate - 70) / 20) * 80);
      commitmentStatus = 'Alto Comprometimento (70% - 90%)';
    } else {
      commitmentScore = Math.max(0, Math.round(40 - ((commitmentRate - 90) / 20) * 40));
      commitmentStatus = 'Crítico (> 90%)';
    }
  } else {
    commitmentScore = 0;
    commitmentRate = committedExpenses > 0 ? 100 : 0;
    commitmentStatus = committedExpenses > 0 ? 'Custos fixos sem receita cadastrada' : 'Sem renda cadastrada';
  }

  // -------------------------------------------------------------
  // PILAR 3: Disciplina Orçamentária (Peso 25% => Max 250 pts)
  // -------------------------------------------------------------
  let disciplineScore = 0;
  let disciplineRate = 0;
  let disciplineStatus = 'Nenhum limite configurado';

  if (safeBudgets.length > 0) {
    let withinBudgetCount = 0;
    let overshootPenalty = 0;

    safeBudgets.forEach(b => {
      const spent = expensesByCategory[b.category] || 0;
      const limit = Number(b.limitAmount) || 0;
      if (spent <= limit) {
        withinBudgetCount++;
      } else if (limit > 0) {
        const excess = spent - limit;
        const excessRatio = excess / limit;
        overshootPenalty += Math.min(excessRatio * 20, 40);
      } else {
        overshootPenalty += 40;
      }
    });

    disciplineRate = Math.round((withinBudgetCount / safeBudgets.length) * 100);
    const baseScore = (withinBudgetCount / safeBudgets.length) * 250;
    disciplineScore = Math.max(0, Math.round(baseScore - (overshootPenalty / safeBudgets.length)));

    if (disciplineRate === 100) {
      disciplineStatus = '100% Dentro do Teto';
    } else if (disciplineRate >= 75) {
      disciplineStatus = `${disciplineRate}% Cumprido`;
    } else {
      disciplineStatus = `${safeBudgets.length - withinBudgetCount} categoria(s) estourada(s)`;
    }
  }

  // -------------------------------------------------------------
  // PILAR 4: Consistência de Lançamentos (Peso 15% => Max 150 pts)
  // -------------------------------------------------------------
  let consistencyScore = 0;
  let consistencyStatus = 'Poucos registros';

  if (distinctDaysWithEntries >= 14) {
    consistencyScore = 150;
    consistencyStatus = 'Excelente hábito (≥14 dias)';
  } else if (distinctDaysWithEntries >= 8) {
    consistencyScore = Math.round(90 + ((distinctDaysWithEntries - 8) / 6) * 60);
    consistencyStatus = 'Boa regularidade (8-13 dias)';
  } else if (distinctDaysWithEntries >= 3) {
    consistencyScore = Math.round(40 + ((distinctDaysWithEntries - 3) / 5) * 50);
    consistencyStatus = 'Moderada (3-7 dias)';
  } else if (distinctDaysWithEntries >= 1) {
    consistencyScore = 30;
    consistencyStatus = 'Incipiente (1-2 dias)';
  } else {
    consistencyScore = 0;
    consistencyStatus = 'Sem lançamentos no mês';
  }

  // -------------------------------------------------------------
  // CÁLCULO FINAL (0 a 1000)
  // -------------------------------------------------------------
  const totalScore = Math.min(
    1000,
    Math.max(0, Math.round(savingsScore + commitmentScore + disciplineScore + consistencyScore))
  );

  let status: 'Crítico' | 'Em Risco' | 'Saudável' | 'Excelente';
  let statusColor: string;

  if (totalScore >= 850) {
    status = 'Excelente';
    statusColor = '#A3C9A8'; // Verde Sálvia Pastel
  } else if (totalScore >= 650) {
    status = 'Saudável';
    statusColor = '#A8B5D1'; // Lavanda / Azul Acinzentado
  } else if (totalScore >= 400) {
    status = 'Em Risco';
    statusColor = '#E5A97D'; // Pêssego Suave
  } else {
    status = 'Crítico';
    statusColor = '#E29578'; // Terracota / Rosa Queimado
  }

  // Dicas acionáveis
  const actionableTips: string[] = [];

  if (totalIncome === 0) {
    actionableTips.push('Cadastre sua principal fonte de renda para calcular sua taxa de poupança e superávit.');
  } else if (savingsScore < 180) {
    actionableTips.push('Meta de Poupança: Seu superávit líquido está abaixo de 15%. Tente estipular a regra 50-30-20.');
  }

  if (commitmentScore < 180 && committedExpenses > 0) {
    actionableTips.push(
      `Alerta de Rigidez: Custos fixos e parcelas consom ${commitmentRate}% da sua renda. Evite novos parcelamentos até quitar os atuais.`
    );
  }

  if (safeBudgets.length === 0) {
    actionableTips.push('Defina Limites: Você ainda não configurou tetos por categoria. Definir metas mensais aumenta sua pontuação em até 250 pontos.');
  } else if (disciplineScore < 180) {
    actionableTips.push('Disciplina de Tetos: Você ultrapassou o teto em categorias com limite. Reduza gastos variáveis nos próximos dias.');
  }

  if (consistencyScore < 90) {
    actionableTips.push('Consistência: Registre pequenos gastos do dia a dia logo após realizá-los.');
  }

  if (actionableTips.length === 0) {
    actionableTips.push('Seu comportamento financeiro está exemplar! Considere direcionar o superávit para aportes de longo prazo.');
  }

  return {
    score: totalScore,
    status,
    statusColor,
    isEmpty: false,
    pillars: {
      savingsRate: {
        score: savingsScore,
        max: 300,
        percentageValue: savingsRate,
        label: 'Taxa de Poupança (30%)',
        status: savingsStatus
      },
      incomeCommitment: {
        score: commitmentScore,
        max: 300,
        percentageValue: commitmentRate,
        label: 'Comprometimento de Renda (30%)',
        status: commitmentStatus
      },
      budgetDiscipline: {
        score: disciplineScore,
        max: 250,
        percentageValue: disciplineRate,
        label: 'Disciplina Orçamentária (25%)',
        status: disciplineStatus
      },
      entryConsistency: {
        score: consistencyScore,
        max: 150,
        daysWithEntries: distinctDaysWithEntries,
        label: 'Consistência de Lançamentos (15%)',
        status: consistencyStatus
      }
    },
    actionableTips
  };
}
