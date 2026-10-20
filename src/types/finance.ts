export type TransactionType = 'expense' | 'income';

export type TransactionNature = 'daily' | 'fixed' | 'installment';

export type PaymentMethod = 
  | 'credit_card' 
  | 'debit_card' 
  | 'pix' 
  | 'cash' 
  | 'bank_transfer' 
  | 'boleto';

export type ExpenseCategory = 
  | 'Moradia' 
  | 'Alimentação' 
  | 'Transporte' 
  | 'Lazer & Estilo' 
  | 'Saúde' 
  | 'Educação' 
  | 'Serviços & Assinaturas' 
  | 'Outros Gastos';

export type IncomeCategory = 
  | 'Salário' 
  | 'Rendimentos' 
  | 'Freelance / Extra' 
  | 'Vendas' 
  | 'Outras Receitas';

export type Category = ExpenseCategory | IncomeCategory;

export interface InstallmentDetails {
  totalAmount: number;         // Valor total da compra parcelada
  totalInstallments: number;   // Número total de parcelas (ex: 12)
  currentInstallment: number; // Parcela atual (ex: 3)
  monthlyAmount: number;      // Valor de cada parcela
  groupId: string;            // Identificador compartilhado para o grupo de parcelas
  purchaseDate: string;       // Data original da compra
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
  isPaid?: boolean; // Para contas fixas recorrentes
  installmentDetails?: InstallmentDetails;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryBudget {
  id?: string;
  userId: string;
  category: ExpenseCategory;
  limitAmount: number;
  monthYear?: string; // opcional: 'YYYY-MM'
}

export interface HealthScoreResult {
  score: number; // 0 a 1000
  status: 'Crítico' | 'Em Risco' | 'Saudável' | 'Excelente';
  statusColor: string; // Hex color: pastel sage, pastel terracotta, etc.
  pillars: {
    savingsRate: {
      score: number; // 0 to 300 (Weight 30%)
      max: number;
      percentageValue: number; // taxa % real
      label: string;
      status: string;
    };
    incomeCommitment: {
      score: number; // 0 to 300 (Weight 30%)
      max: number;
      percentageValue: number; // taxa % comprometimento
      label: string;
      status: string;
    };
    budgetDiscipline: {
      score: number; // 0 to 250 (Weight 25%)
      max: number;
      percentageValue: number; // taxa de categorias dentro do teto
      label: string;
      status: string;
    };
    entryConsistency: {
      score: number; // 0 to 150 (Weight 15%)
      max: number;
      daysWithEntries: number; // dias com lançamentos
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
