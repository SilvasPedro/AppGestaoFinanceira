import { Transaction, CategoryBudget } from '../types/finance';
import { isFixedActiveInMonth } from './projections';

export interface BudgetSuggestionResult {
  availableSurplus: number;    // Renda disponível comprometível (S_disponivel)
  totalIncome: number;         // Renda fixa / recorrente base
  fixedExpenses: number;       // Despesas fixas do mês
  installmentsTotal: number;   // Fatura / parcelas do mês
  isDeficit: boolean;          // Verdadeiro se S_disponivel <= 0
  safetyReserve: number;       // 15% - 20% preservado como margem de segurança/investimento
  allocableBudget: number;     // 80% alocável para categorias flexíveis
  suggestedLimits: Record<string, number>; // categoria -> valor sugerido (R$)
  breakdown: Array<{
    category: string;
    suggestedAmount: number;
    percentageOfSurplus: number;
    group: 'essential' | 'lifestyle';
  }>;
  totalSuggested: number;
  warningMessage?: string;
}

const ESSENTIAL_CATEGORIES = new Set([
  'Alimentação',
  'Supermercado',
  'Transporte',
  'Saúde',
  'Farmácia',
  'Moradia',
  'Educação'
]);

/**
 * Calcula a Renda Líquida Comprometível (Sobra Líquida Disponível):
 * S_disponivel = Total de Receitas Recorrentes/Fixas - (Despesas Fixas Mensais + Fatura/Parcelas do Mês)
 */
export function calculateAvailableSurplus(
  transactions: Transaction[],
  currentMonth: string
): {
  availableSurplus: number;
  totalIncome: number;
  fixedExpenses: number;
  installmentsTotal: number;
} {
  // 1. Receitas fixas ativas no mês + parcelas de receitas a receber
  const fixedIncomes = transactions
    .filter(t => t.type === 'income' && t.nature === 'fixed' && isFixedActiveInMonth(t, currentMonth))
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const installmentIncomes = transactions
    .filter(t => t.type === 'income' && t.nature === 'installment' && t.date.startsWith(currentMonth))
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  // Fallback: se não houver receita fixa cadastrada, usar a receita pontual do mês
  const actualMonthIncomes = transactions
    .filter(t => t.type === 'income' && t.date.startsWith(currentMonth))
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const totalIncome = Math.max(fixedIncomes + installmentIncomes, actualMonthIncomes);

  // 2. Despesas fixas mensais
  const fixedExpenses = transactions
    .filter(t => t.type === 'expense' && t.nature === 'fixed' && isFixedActiveInMonth(t, currentMonth))
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  // 3. Faturas / Parcelas de compras do mês
  const installmentsTotal = transactions
    .filter(t => t.type === 'expense' && t.nature === 'installment' && t.date.startsWith(currentMonth))
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const availableSurplus = Math.round((totalIncome - (fixedExpenses + installmentsTotal)) * 100) / 100;

  return {
    availableSurplus,
    totalIncome,
    fixedExpenses,
    installmentsTotal
  };
}

/**
 * Calcula a sugestão ponderada de limites orçamentários por categoria
 * baseando-se na sobra líquida real e regras orçamentárias equilibradas (ex: 50/30/20).
 */
export function calculateSuggestedBudgets(
  availableSurplus: number,
  categories: string[],
  historicalSpending?: Record<string, number>,
  totalIncome?: number,
  fixedExpenses?: number,
  installmentsTotal?: number
): BudgetSuggestionResult {
  const isDeficit = availableSurplus <= 0;

  if (isDeficit) {
    return {
      availableSurplus,
      totalIncome: totalIncome || 0,
      fixedExpenses: fixedExpenses || 0,
      installmentsTotal: installmentsTotal || 0,
      isDeficit: true,
      safetyReserve: 0,
      allocableBudget: 0,
      suggestedLimits: {},
      breakdown: [],
      totalSuggested: 0,
      warningMessage: 'Suas despesas fixas e parcelas consom 100% da sua renda atual. Reduza custos antes de fixar novos limites.'
    };
  }

  // Margem de segurança / reserva de 20%
  const safetyReserve = Math.round(availableSurplus * 0.20 * 100) / 100;
  // 80% da sobra líquida alocável para consumo flexível
  const allocableBudget = Math.max(0, availableSurplus - safetyReserve);

  // Separar categorias entre Essenciais Flexíveis e Estilo de Vida
  const essentialCats: string[] = [];
  const lifestyleCats: string[] = [];

  categories.forEach(cat => {
    if (ESSENTIAL_CATEGORIES.has(cat)) {
      essentialCats.push(cat);
    } else {
      lifestyleCats.push(cat);
    }
  });

  // Se uma das listas estiver vazia, distribuir proporcionalmente
  const hasEssentials = essentialCats.length > 0;
  const hasLifestyle = lifestyleCats.length > 0;

  // Proporção alvo: 60% essenciais flexíveis, 40% estilo de vida do orçamento alocável
  const essentialBudgetTotal = hasEssentials && hasLifestyle 
    ? allocableBudget * 0.65 
    : hasEssentials ? allocableBudget : 0;

  const lifestyleBudgetTotal = hasLifestyle && hasEssentials 
    ? allocableBudget * 0.35 
    : hasLifestyle ? allocableBudget : 0;

  const suggestedLimits: Record<string, number> = {};
  const breakdown: BudgetSuggestionResult['breakdown'] = [];

  // Helper para distribuir dentro de um grupo usando histórico ponderado se disponível
  const distributeGroup = (
    groupCats: string[], 
    groupTotal: number, 
    groupType: 'essential' | 'lifestyle'
  ) => {
    if (groupCats.length === 0 || groupTotal <= 0) return;

    // Calcular pesos históricos
    let totalHistoricInGroup = 0;
    const weights: Record<string, number> = {};

    groupCats.forEach(cat => {
      const spend = (historicalSpending && historicalSpending[cat]) || 0;
      totalHistoricInGroup += spend;
    });

    groupCats.forEach(cat => {
      if (totalHistoricInGroup > 0) {
        weights[cat] = ((historicalSpending && historicalSpending[cat]) || 0) / totalHistoricInGroup;
      } else {
        // Distribuição equitativa se não houver histórico
        weights[cat] = 1 / groupCats.length;
      }
    });

    groupCats.forEach(cat => {
      const rawAmount = groupTotal * (weights[cat] || 1 / groupCats.length);
      // Arredondar para múltiplos de R$ 10 mais próximos (mínimo de R$ 30)
      const rounded = Math.max(30, Math.round(rawAmount / 10) * 10);
      suggestedLimits[cat] = rounded;

      breakdown.push({
        category: cat,
        suggestedAmount: rounded,
        percentageOfSurplus: Math.round((rounded / availableSurplus) * 100),
        group: groupType
      });
    });
  };

  distributeGroup(essentialCats, essentialBudgetTotal, 'essential');
  distributeGroup(lifestyleCats, lifestyleBudgetTotal, 'lifestyle');

  const totalSuggested = Object.values(suggestedLimits).reduce((acc, v) => acc + v, 0);

  return {
    availableSurplus,
    totalIncome: totalIncome || 0,
    fixedExpenses: fixedExpenses || 0,
    installmentsTotal: installmentsTotal || 0,
    isDeficit: false,
    safetyReserve,
    allocableBudget,
    suggestedLimits,
    breakdown,
    totalSuggested
  };
}
