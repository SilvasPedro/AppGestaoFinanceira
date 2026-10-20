import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { 
  Transaction, 
  CategoryBudget, 
  HealthScoreResult, 
  MonthlyCashFlowProjection, 
  ExpenseCategory 
} from '../types/finance';
import { FinanceService } from '../services/financeService';
import { calculateHealthScore } from '../services/scoreCalculator';
import { calculateCashFlowProjections, calculateFreedomSimulation } from '../services/projections';
import { useAuth } from './AuthContext';

interface BudgetStatus {
  category: ExpenseCategory;
  limit: number;
  spent: number;
  percentage: number;
  status: 'safe' | 'warning' | 'danger';
}

interface FinanceContextType {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  currentMonth: string; // 'YYYY-MM'
  setCurrentMonth: (m: string) => void;
  nextMonth: () => void;
  prevMonth: () => void;
  isOnline: boolean;
  loading: boolean;
  // Computed values for current month
  monthTransactions: Transaction[];
  incomeTotal: number;
  expensesTotal: number;
  netSurplus: number;
  fixedExpensesTotal: number;
  installmentsTotal: number;
  dailyExpensesTotal: number;
  pendingBillsCount: number;
  healthScore: HealthScoreResult;
  budgetsStatus: BudgetStatus[];
  cashFlowProjections: MonthlyCashFlowProjection[];
  freedomSimulation: ReturnType<typeof calculateFreedomSimulation>;
  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'userId'>) => Promise<void>;
  updateTransaction: (id: string, tx: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  togglePaidStatus: (id: string, currentStatus: boolean) => Promise<void>;
  saveBudget: (category: ExpenseCategory, limitAmount: number) => Promise<void>;
  clearAllData: () => void;
  annualInterestRate: number;
  setAnnualInterestRate: (rate: number) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isGuest } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [currentMonth, setCurrentMonth] = useState<string>('2026-10'); // Data base 2026-10
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [loading, setLoading] = useState<boolean>(true);
  const [annualInterestRate, setAnnualInterestRate] = useState<number>(0.06); // 6% a.a. real acima da inflação

  // Limpeza de resíduos de dados mockados antigos
  useEffect(() => {
    localStorage.removeItem('finances_pro_guest_txs_v1');
    localStorage.removeItem('finances_pro_guest_budgets_v1');
  }, []);

  // Monitorar conectividade de rede
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Assinar transações do Firestore ou localStorage
  useEffect(() => {
    setLoading(true);
    const userId = user?.uid || 'guest_demo';
    const unsubTx = FinanceService.subscribeTransactions(userId, isGuest, (txs) => {
      setTransactions(txs);
      setLoading(false);
    });

    const unsubBudgets = FinanceService.subscribeBudgets(userId, isGuest, (b) => {
      setBudgets(b);
    });

    return () => {
      unsubTx();
      unsubBudgets();
    };
  }, [user?.uid, isGuest]);

  // Transações do mês selecionado
  const monthTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(currentMonth));
  }, [transactions, currentMonth]);

  // Totais do mês selecionado
  const incomeTotal = useMemo(() => {
    return monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const expensesTotal = useMemo(() => {
    return monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const netSurplus = useMemo(() => {
    return incomeTotal - expensesTotal;
  }, [incomeTotal, expensesTotal]);

  const fixedExpensesTotal = useMemo(() => {
    return monthTransactions
      .filter(t => t.type === 'expense' && t.nature === 'fixed')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const installmentsTotal = useMemo(() => {
    return monthTransactions
      .filter(t => t.type === 'expense' && t.nature === 'installment')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const dailyExpensesTotal = useMemo(() => {
    return monthTransactions
      .filter(t => t.type === 'expense' && t.nature === 'daily')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const pendingBillsCount = useMemo(() => {
    return monthTransactions.filter(t => t.type === 'expense' && t.nature === 'fixed' && !t.isPaid).length;
  }, [monthTransactions]);

  // Score de Saúde Financeira dinâmico
  const healthScore = useMemo(() => {
    return calculateHealthScore(transactions, budgets, currentMonth);
  }, [transactions, budgets, currentMonth]);

  // Limites por categoria com indicador visual de status
  const budgetsStatus = useMemo<BudgetStatus[]>(() => {
    const expenseMap: Record<string, number> = {};
    monthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        expenseMap[t.category] = (expenseMap[t.category] || 0) + t.amount;
      });

    return budgets.map(b => {
      const spent = expenseMap[b.category] || 0;
      const percentage = b.limitAmount > 0 ? (spent / b.limitAmount) * 100 : 0;
      let status: 'safe' | 'warning' | 'danger' = 'safe';
      if (percentage >= 100) {
        status = 'danger';
      } else if (percentage >= 80) {
        status = 'warning';
      }
      return {
        category: b.category,
        limit: b.limitAmount,
        spent,
        percentage,
        status
      };
    });
  }, [budgets, monthTransactions]);

  // Projeção futura de fluxo de caixa (6 meses)
  const cashFlowProjections = useMemo(() => {
    return calculateCashFlowProjections(transactions, 6, currentMonth);
  }, [transactions, currentMonth]);

  // Simulação de Liberdade Financeira
  const freedomSimulation = useMemo(() => {
    const monthlySavingPotential = Math.max(0, netSurplus);
    const essentialExpenses = Math.max(0, fixedExpensesTotal + dailyExpensesTotal * 0.7);
    return calculateFreedomSimulation(
      monthlySavingPotential,
      0,
      annualInterestRate,
      20,
      essentialExpenses
    );
  }, [netSurplus, fixedExpensesTotal, dailyExpensesTotal, annualInterestRate]);

  // Navegação entre meses
  const nextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const date = new Date(y, m, 1); // m já é próximo mês (0-indexed m é o mês seguinte a m-1)
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonth);
  };

  const prevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const date = new Date(y, m - 2, 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonth);
  };

  // Ações de persistência
  const addTransaction = async (tx: Omit<Transaction, 'id' | 'userId'>) => {
    const userId = user?.uid || 'guest_demo';
    
    // Se for parcelamento novo com N parcelas, podemos gerar o grupo de transações para amortização automática
    if (tx.nature === 'installment' && tx.installmentDetails && tx.installmentDetails.totalInstallments > 1) {
      const details = tx.installmentDetails;
      const groupId = details.groupId || `grp_${Date.now()}`;
      const [startYear, startMonth, startDay] = tx.date.split('-').map(Number);

      // Salva a parcela atual
      await FinanceService.saveTransaction(
        userId,
        {
          ...tx,
          installmentDetails: {
            ...details,
            groupId
          }
        },
        isGuest
      );

      // Gera as parcelas futuras automáticas correspondentes para impactar o fluxo de caixa
      for (let i = details.currentInstallment + 1; i <= details.totalInstallments; i++) {
        const futureDate = new Date(startYear, (startMonth - 1) + (i - details.currentInstallment), startDay || 1);
        const fYear = futureDate.getFullYear();
        const fMonth = String(futureDate.getMonth() + 1).padStart(2, '0');
        const fDay = String(futureDate.getDate()).padStart(2, '0');
        const dateStr = `${fYear}-${fMonth}-${fDay}`;

        await FinanceService.saveTransaction(
          userId,
          {
            ...tx,
            date: dateStr,
            description: `${tx.description} (${i}/${details.totalInstallments})`,
            installmentDetails: {
              ...details,
              currentInstallment: i,
              groupId
            }
          },
          isGuest
        );
      }
    } else {
      await FinanceService.saveTransaction(userId, tx, isGuest);
    }
  };

  const updateTransaction = async (id: string, tx: Partial<Transaction>) => {
    const userId = user?.uid || 'guest_demo';
    const existing = transactions.find(t => t.id === id);
    if (!existing) return;
    const merged = { ...existing, ...tx };
    await FinanceService.saveTransaction(userId, merged, isGuest);
  };

  const deleteTransaction = async (id: string) => {
    const userId = user?.uid || 'guest_demo';
    await FinanceService.deleteTransaction(userId, id, isGuest);
  };

  const togglePaidStatus = async (id: string, currentStatus: boolean) => {
    const userId = user?.uid || 'guest_demo';
    await FinanceService.togglePaidStatus(userId, id, currentStatus, isGuest);
  };

  const saveBudget = async (category: ExpenseCategory, limitAmount: number) => {
    const userId = user?.uid || 'guest_demo';
    const existing = budgets.find(b => b.category === category);
    await FinanceService.saveBudget(
      userId,
      {
        id: existing?.id,
        category,
        limitAmount,
        userId
      },
      isGuest
    );
  };

  const clearAllData = () => {
    FinanceService.clearLocalData();
    setTransactions([]);
    setBudgets([]);
  };

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        budgets,
        currentMonth,
        setCurrentMonth,
        nextMonth,
        prevMonth,
        isOnline,
        loading,
        monthTransactions,
        incomeTotal,
        expensesTotal,
        netSurplus,
        fixedExpensesTotal,
        installmentsTotal,
        dailyExpensesTotal,
        pendingBillsCount,
        healthScore,
        budgetsStatus,
        cashFlowProjections,
        freedomSimulation,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        togglePaidStatus,
        saveBudget,
        clearAllData,
        annualInterestRate,
        setAnnualInterestRate
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
