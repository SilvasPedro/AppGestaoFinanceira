export type TransactionType = 'expense' | 'income';

export type TransactionNature = 'daily' | 'fixed' | 'installment';

export type PaymentMethod = 
  | 'credit_card' 
  | 'debit_card' 
  | 'pix' 
  | 'cash' 
  | 'bank_transfer' 
  | 'boleto';

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Alimentação',
  'Moradia',
  'Transporte',
  'Lazer & Estilo',
  'Saúde',
  'Educação',
  'Serviços & Assinaturas',
  'Outros Gastos'
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  'Salário',
  'Rendimentos',
  'Freelance / Extra',
  'Vendas',
  'Outras Receitas'
] as const;

export type DefaultExpenseCategory = typeof DEFAULT_EXPENSE_CATEGORIES[number];
export type DefaultIncomeCategory = typeof DEFAULT_INCOME_CATEGORIES[number];

export type ExpenseCategory = DefaultExpenseCategory | string;
export type IncomeCategory = DefaultIncomeCategory | string;
export type Category = string;

export interface InstallmentDetails {
  totalAmount: number;         // Valor total da compra parcelada
  totalInstallments: number;   // Número total de parcelas (ex: 12)
  currentInstallment: number; // Parcela atual (ex: 3)
  monthlyAmount: number;      // Valor de cada parcela
  groupId: string;            // Identificador compartilhado para o grupo de parcelas
  purchaseDate: string;       // Data original da compra
  initialInstallmentNumber?: number; // Parcela no início do registro (ex: 30)
  startMonth?: string;        // Mês inicial de registro (ex: '2026-11')
}

export interface CreditCard {
  id: string;
  userId: string;
  cardName: string;         // ex: "Nubank Ultravioleta", "Inter Black"
  lastFourDigits: string;   // ex: "1234"
  bankName: string;         // ex: "Nubank", "Inter", "Itaú", "Bradesco"
  color?: string;           // ex: "#A8B5D1" ou "#E29578"
  limitAmount?: number;     // Limite total do cartão (R$)
  closingDay?: number;      // Dia de fechamento da fatura
  dueDay?: number;          // Dia de vencimento da fatura
  createdAt?: string;
  updatedAt?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  nature: TransactionNature;
  amount: number;
  category: Category;
  date: string; // ISO 'YYYY-MM-DD'
  description: string;
  paymentMethod: PaymentMethod;
  isPaid?: boolean; // Para contas fixas recorrentes ou parceladas
  installmentDetails?: InstallmentDetails;

  // Lógica de Recorrência Inteligente (nature === 'fixed')
  startDate?: string;        // 'YYYY-MM' ou 'YYYY-MM-DD'
  endDate?: string | null;   // 'YYYY-MM' (mês a partir do qual foi cancelada/descontinuada)
  paidMonths?: string[];     // Lista de meses ['2026-08', '2026-09'] em que a conta foi marcada como paga/recebida

  // Associação com Cartão de Crédito
  cardId?: string;
  cardName?: string;
  cardLastFour?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface InstallmentGroupSummary {
  groupId: string;
  description: string;
  type: TransactionType;
  category: Category;
  paymentMethod: PaymentMethod;
  cardId?: string;
  cardName?: string;
  cardLastFour?: string;
  totalAmount: number;
  monthlyAmount: number;
  totalInstallments: number;
  currentInstallment: number;       // Parcela sincronizada com o mês atual M ou último lançamento
  initialInstallmentNumber: number; // Parcela inicial cadastrada
  startMonth: string;               // Mês inicial de cadastro (YYYY-MM)
  paidCount: number;                // Total de parcelas efetivamente pagas (anteriores + no app)
  remainingCount: number;           // totalInstallments - paidCount
  remainingBalance: number;
  progressPercentage: number;       // (currentInstallment / totalInstallments) * 100
  purchaseDate: string;
  firstDate: string;
  lastDate: string;
  isFinished: boolean;
  transactions: Transaction[];
}

export interface CategoryBudget {
  id?: string;
  userId: string;
  category: string;
  limitAmount: number;
  monthYear?: string; // opcional: 'YYYY-MM'
}

export interface HealthScoreResult {
  score: number; // 0 a 1000
  status: 'Crítico' | 'Em Risco' | 'Saudável' | 'Excelente' | 'Aguardando Lançamentos';
  statusColor: string; // Hex color
  isEmpty?: boolean;
  pillars: {
    savingsRate: {
      score: number; // 0 to 300 (Weight 30%)
      max: number;
      percentageValue: number;
      label: string;
      status: string;
    };
    incomeCommitment: {
      score: number; // 0 to 300 (Weight 30%)
      max: number;
      percentageValue: number;
      label: string;
      status: string;
    };
    budgetDiscipline: {
      score: number; // 0 to 250 (Weight 25%)
      max: number;
      percentageValue: number;
      label: string;
      status: string;
    };
    entryConsistency: {
      score: number; // 0 to 150 (Weight 15%)
      max: number;
      daysWithEntries: number;
      label: string;
      status: string;
    };
  };
  actionableTips: string[];
}

export interface MonthlyCashFlowProjection {
  monthYear: string;        // '2026-11'
  displayMonth: string;     // 'Nov 26'
  fixedExpenses: number;
  installmentsTotal: number;
  estimatedDaily: number;
  totalExpenses: number;
  projectedIncome: number;
  netSurplus: number;
  isDeficit: boolean;
  activeInstallmentCount: number;
}

export interface FreedomProjectionPoint {
  year: number;
  investedCapital: number;
  compoundTotal: number;
  passiveMonthlyIncome: number;
}

export interface CustomCategoryItem {
  id: string;
  name: string;
  type: TransactionType;
}
