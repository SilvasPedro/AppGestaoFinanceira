import { Transaction, CategoryBudget, HealthScoreResult } from '../types/finance';

/**
 * Calcula o Score de Saúde Financeira (0 a 1000) baseado em 4 pilares:
 * 1. Taxa de Poupança (Peso 30% - até 300 pontos)
 * 2. Comprometimento de Renda (Peso 30% - até 300 pontos)
 * 3. Disciplina Orçamentária (Peso 25% - até 250 pontos)
 * 4. Consistência de Lançamentos (Peso 15% - até 150 pontos)
 */
export function calculateHealthScore(
  transactions: Transaction[],
  budgets: CategoryBudget[],
  targetMonth: string // 'YYYY-MM'
): HealthScoreResult {
  const monthTransactions = transactions.filter(t => t.date.startsWith(targetMonth));
  
  // Total de receitas do mês
  const totalIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  // Total de despesas do mês
  const totalExpenses = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  // Custos Fixos + Parcelas
  const fixedExpenses = monthTransactions
    .filter(t => t.type === 'expense' && t.nature === 'fixed')
    .reduce((acc, t) => acc + t.amount, 0);

  const installmentExpenses = monthTransactions
    .filter(t => t.type === 'expense' && t.nature === 'installment')
    .reduce((acc, t) => acc + t.amount, 0);

  const committedExpenses = fixedExpenses + installmentExpenses;

  // Gastos por categoria de despesa no mês
  const expensesByCategory: Record<string, number> = {};
  monthTransactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
    });

  // Dias com lançamentos no mês
  const distinctDaysWithEntries = new Set(
    monthTransactions.map(t => t.date)
  ).size;

  // -------------------------------------------------------------
  // PILAR 1: Taxa de Poupança (Peso 30% => Max 300 pts)
  // Relação entre sobra líquida e renda total.
  // -------------------------------------------------------------
  let savingsRate = 0;
  let savingsScore = 0;
  let savingsStatus = 'Sem Renda Registrada';

  if (totalIncome > 0) {
    const netSurplus = totalIncome - totalExpenses;
    savingsRate = (netSurplus / totalIncome) * 100;

    if (savingsRate >= 30) {
      // 30% ou mais de poupança = pontuação máxima 300 pts
      savingsScore = 300;
      savingsStatus = 'Excepcional (≥ 30%)';
    } else if (savingsRate >= 20) {
      // 20% a 30% = 240 a 300 pts
      savingsScore = Math.round(240 + ((savingsRate - 20) / 10) * 60);
      savingsStatus = 'Ótima (20% - 30%)';
    } else if (savingsRate >= 10) {
      // 10% a 20% = 170 a 240 pts
      savingsScore = Math.round(170 + ((savingsRate - 10) / 10) * 70);
      savingsStatus = 'Adequada (10% - 20%)';
    } else if (savingsRate > 0) {
      // 0% a 10% = 90 a 170 pts
      savingsScore = Math.round(90 + (savingsRate / 10) * 80);
      savingsStatus = 'Apertada (0% - 10%)';
    } else {
      // Déficit (gastos superam renda): 0 a 80 pts dependendo da gravidade
      const deficitRatio = Math.min(Math.abs(netSurplus) / totalIncome, 1);
      savingsScore = Math.round(Math.max(0, 80 * (1 - deficitRatio)));
      savingsStatus = 'Déficit no Mês (< 0%)';
    }
  } else {
    // Sem renda cadastrada: pontua zero no pilar de poupança
    savingsScore = 0;
    savingsRate = 0;
    savingsStatus = 'Sem receitas registradas';
  }

  // -------------------------------------------------------------
  // PILAR 2: Comprometimento de Renda (Peso 30% => Max 300 pts)
  // Proporção da renda consumida por custos fixos e parcelas.
  // Ideal: <= 50% da renda. Crítico: > 75%.
  // -------------------------------------------------------------
  let commitmentRate = 0;
  let commitmentScore = 0;
  let commitmentStatus = 'Sem Dados';

  if (totalIncome > 0) {
    commitmentRate = (committedExpenses / totalIncome) * 100;

    if (commitmentRate <= 35) {
      // Até 35% de custo fixo/parcelas = 300 pts
      commitmentScore = 300;
      commitmentStatus = 'Muito Seguro (≤ 35%)';
    } else if (commitmentRate <= 50) {
      // 35% a 50% = 240 a 300 pts
      commitmentScore = Math.round(300 - ((commitmentRate - 35) / 15) * 60);
      commitmentStatus = 'Equilibrado (35% - 50%)';
    } else if (commitmentRate <= 70) {
      // 50% a 70% = 120 a 240 pts
      commitmentScore = Math.round(240 - ((commitmentRate - 50) / 20) * 120);
      commitmentStatus = 'Alerta de Rigidez (50% - 70%)';
    } else if (commitmentRate <= 90) {
      // 70% a 90% = 40 a 120 pts
      commitmentScore = Math.round(120 - ((commitmentRate - 70) / 20) * 80);
      commitmentStatus = 'Alto Comprometimento (70% - 90%)';
    } else {
      // > 90%
      commitmentScore = Math.max(0, Math.round(40 - ((commitmentRate - 90) / 20) * 40));
      commitmentStatus = 'Crítico (> 90%)';
    }
  } else {
    commitmentScore = 0;
    commitmentRate = committedExpenses > 0 ? 100 : 0;
    commitmentStatus = committedExpenses > 0 ? 'Despesas sem receita cadastrada' : 'Sem renda cadastrada';
  }

  // -------------------------------------------------------------
  // PILAR 3: Disciplina Orçamentária (Peso 25% => Max 250 pts)
  // Quantidade de categorias mantidas dentro dos limites planejados.
  // -------------------------------------------------------------
  let disciplineScore = 0;
  let disciplineRate = 0;
  let disciplineStatus = 'Nenhum limite configurado';

  if (budgets.length > 0) {
    let withinBudgetCount = 0;
    let overshootPenalty = 0;

    budgets.forEach(b => {
      const spent = expensesByCategory[b.category] || 0;
      if (spent <= b.limitAmount) {
        withinBudgetCount++;
      } else {
        // Excedente
        const excess = spent - b.limitAmount;
        const excessRatio = excess / b.limitAmount;
        overshootPenalty += Math.min(excessRatio * 20, 40); // penalização suave proporcional ao estouro
      }
    });

    disciplineRate = (withinBudgetCount / budgets.length) * 100;
    const baseScore = (withinBudgetCount / budgets.length) * 250;
    disciplineScore = Math.max(0, Math.round(baseScore - (overshootPenalty / budgets.length)));

    if (disciplineRate === 100) {
      disciplineStatus = '100% Dentro do Teto';
    } else if (disciplineRate >= 75) {
      disciplineStatus = `${Math.round(disciplineRate)}% Cumprido`;
    } else {
      disciplineStatus = `${budgets.length - withinBudgetCount} categoria(s) estourada(s)`;
    }
  }

  // -------------------------------------------------------------
  // PILAR 4: Consistência de Lançamentos (Peso 15% => Max 150 pts)
  // Frequência de atualização de gastos diários.
  // -------------------------------------------------------------
  let consistencyScore = 0;
  let consistencyStatus = 'Poucos registros';

  // Base de avaliação: 15+ dias com lançamentos = 150 pts
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
    consistencyStatus = 'Sem lançamentos recentes';
  }

  // -------------------------------------------------------------
  // CÁLCULO FINAL (0 a 1000)
  // -------------------------------------------------------------
  const totalScore = Math.min(
    1000,
    Math.max(0, savingsScore + commitmentScore + disciplineScore + consistencyScore)
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
    statusColor = '#E5A97D'; // Pêssego / Terracota Suave
  } else {
    status = 'Crítico';
    statusColor = '#E29578'; // Terracota / Rosa Queimado
  }

  // -------------------------------------------------------------
  // GERAÇÃO DE DICAS PONTUAIS E ACIONÁVEIS
  // -------------------------------------------------------------
  const actionableTips: string[] = [];

  if (savingsScore < 180) {
    actionableTips.push(
      'Meta de Poupança: Seu superávit líquido está abaixo de 15%. Tente estipular a regra 50-30-20 (50% fixos, 30% estilo de vida, 20% investimento).'
    );
  }

  if (commitmentScore < 180) {
    actionableTips.push(
      `Alerta de Rigidez: Custos fixos e parcelas consom ${Math.round(commitmentRate)}% da sua renda. Evite novos parcelamentos no cartão até quitar parcelas vigentes.`
    );
  }

  if (disciplineScore < 180 && budgets.length > 0) {
    actionableTips.push(
      'Disciplina de Tetos: Você ultrapassou o teto em categorias com limite. Ajuste seu orçamento de Lazer e Alimentação nos próximos dias.'
    );
  } else if (budgets.length === 0) {
    actionableTips.push(
      'Defina Limites: Você ainda não configurou tetos por categoria. Definir metas mensais aumenta sua pontuação em até 250 pontos.'
    );
  }

  if (consistencyScore < 90) {
    actionableTips.push(
      'Consistência: Registre pequenos gastos do dia a dia logo após pagá-los para evitar perdas invisíveis no final do mês.'
    );
  }

  if (actionableTips.length === 0) {
    actionableTips.push(
      'Seu comportamento financeiro está exemplar! Considere direcionar o superávit para aportes de longo prazo e acelerar sua independência.'
    );
    actionableTips.push(
      'Mantenha o teto das categorias fixo mesmo com eventuais aumentos salariais para evitar a inflação de estilo de vida.'
    );
  }

  return {
    score: totalScore,
    status,
    statusColor,
    pillars: {
      savingsRate: {
        score: savingsScore,
        max: 300,
        percentageValue: Math.round(savingsRate),
        label: 'Taxa de Poupança (30%)',
        status: savingsStatus
      },
      incomeCommitment: {
        score: commitmentScore,
        max: 300,
        percentageValue: Math.round(commitmentRate),
        label: 'Comprometimento de Renda (30%)',
        status: commitmentStatus
      },
      budgetDiscipline: {
        score: disciplineScore,
        max: 250,
        percentageValue: Math.round(disciplineRate),
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
