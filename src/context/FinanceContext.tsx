import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { 
  Transaction, 
  CategoryBudget, 
  HealthScoreResult, 
  MonthlyCashFlowProjection, 
  CustomCategoryItem,
  CreditCard,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES
} from '../types/finance';
import { FinanceService } from '../services/financeService';
import { calculateHealthScore } from '../services/scoreCalculator';
import { calculateCashFlowProjections, calculateFreedomSimulation } from '../services/projections';
import { useAuth } from './AuthContext';

export interface BudgetStatus {
  category: string;
  limit: number;
  spent: number;
  percentage: number;
  status: 'safe' | 'warning' | 'danger';
}

export interface CardInvoiceSummary {
  card: CreditCard;
  total: number;
  count: number;
  transactions: Transaction[];
}

interface FinanceContextType {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  customCategories: CustomCategoryItem[];
  creditCards: CreditCard[];
  expenseCategories: string[];
  incomeCategories: string[];
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
  totalCreditCardInvoice: number;
  cardInvoices: Record<string, CardInvoiceSummary>;
  pendingBillsCount: number;
  healthScore: HealthScoreResult;
  budgetsStatus: BudgetStatus[];
  cashFlowProjections: MonthlyCashFlowProjection[];
  freedomSimulation: ReturnType<typeof calculateFreedomSimulation>;
  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'userId'>) => Promise<void>;
  updateTransaction: (id: string, tx: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  discontinueRecurringTransaction: (id: string, fromMonth: string) => Promise<void>;
  togglePaidStatus: (id: string, currentStatus: boolean) => Promise<void>;
  saveBudget: (category: string, limitAmount: number) => Promise<void>;
  deleteBudget: (budgetId: string) => Promise<void>;
  addCustomCategory: (name: string, type: 'expense' | 'income') => Promise<void>;
  deleteCustomCategory: (id: string) => Promise<void>;
  addCreditCard: (card: Omit<CreditCard, 'id' | 'userId'>) => Promise<void>;
  updateCreditCard: (id: string, card: Partial<CreditCard>) => Promise<void>;
  deleteCreditCard: (id: string) => Promise<void>;
  purgeAllUserData: () => Promise<void>;
  clearAllData: () => void;
  annualInterestRate: number;
  setAnnualInterestRate: (rate: number) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategoryItem[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  
  // Mês de referência persistido no localStorage para não voltar sozinho após refresh
  const [currentMonth, setCurrentMonthState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('finances_pro_selected_month');
      if (saved && /^\d{4}-\d{2}$/.test(saved)) {
        return saved;
      }
    } catch {
      // fallback
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const setCurrentMonth = (m: string) => {
    setCurrentMonthState(m);
    try {
      localStorage.setItem('finances_pro_selected_month', m);
    } catch {
      // ignore
    }
  };

  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [loading, setLoading] = useState<boolean>(true);
  const [annualInterestRate, setAnnualInterestRate] = useState<number>(0.06);

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

  // Assinar transações, limites, categorias e cartões do Firestore
  useEffect(() => {
    if (authLoading || !user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setTransactions([]);
    setBudgets([]);
    setCustomCategories([]);
    setCreditCards([]);

    const userId = user.uid;
    const unsubTx = FinanceService.subscribeTransactions(userId, false, (txs) => {
      setTransactions(txs);
      setLoading(false);
    });

    const unsubBudgets = FinanceService.subscribeBudgets(userId, false, (b) => {
      setBudgets(b);
    });

    const unsubCats = FinanceService.subscribeCustomCategories(userId, false, (cats) => {
      setCustomCategories(cats);
    });

    const unsubCards = FinanceService.subscribeCreditCards(userId, false, (cards) => {
      setCreditCards(cards);
    });

    return () => {
      unsubTx();
      unsubBudgets();
      unsubCats();
      unsubCards();
    };
  }, [user?.uid, authLoading]);

  // Lista combinada de categorias de despesa (padrão + personalizadas)
  const expenseCategories = useMemo<string[]>(() => {
    const custom = customCategories
      .filter(c => c.type === 'expense')
      .map(c => c.name);
    return [...DEFAULT_EXPENSE_CATEGORIES, ...custom];
  }, [customCategories]);

  // Lista combinada de categorias de receita (padrão + personalizadas)
  const incomeCategories = useMemo<string[]>(() => {
    const custom = customCategories
      .filter(c => c.type === 'income')
      .map(c => c.name);
    return [...DEFAULT_INCOME_CATEGORIES, ...custom];
  }, [customCategories]);

  /**
   * Transações do mês selecionado com Lógica de Recorrência Inteligente:
   * 1. Contas/Receitas Fixas (nature === 'fixed') propagam para todos os meses >= startDate
   *    até endDate (caso descontinuadas), mantendo o histórico de meses anteriores intacto.
   * 2. O status isPaid é avaliado dinamicamente mês a mês via paidMonths.
   */
  const monthTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        if (t.nature === 'fixed') {
          const startMonth = t.startDate || (t.date ? t.date.slice(0, 7) : '');
          const endMonth = t.endDate || null;
          if (!startMonth) return false;
          return currentMonth >= startMonth && (!endMonth || currentMonth < endMonth);
        }
        return t.date ? t.date.startsWith(currentMonth) : false;
      })
      .map(t => {
        if (t.nature === 'fixed') {
          const day = t.date ? t.date.slice(8, 10) : '01';
          const isPaidThisMonth = t.paidMonths
            ? t.paidMonths.includes(currentMonth)
            : (t.date && t.date.startsWith(currentMonth) ? !!t.isPaid : false);
          return {
            ...t,
            date: `${currentMonth}-${day || '01'}`,
            isPaid: isPaidThisMonth
          };
        }
        return t;
      });
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

  // Fatura de Cartões de Crédito consolidada e por cartão no mês
  const totalCreditCardInvoice = useMemo(() => {
    return monthTransactions
      .filter(t => t.type === 'expense' && t.paymentMethod === 'credit_card')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const cardInvoices = useMemo<Record<string, CardInvoiceSummary>>(() => {
    const summary: Record<string, CardInvoiceSummary> = {};
    creditCards.forEach(card => {
      summary[card.id] = {
        card,
        total: 0,
        count: 0,
        transactions: []
      };
    });

    monthTransactions
      .filter(t => t.type === 'expense' && t.paymentMethod === 'credit_card' && t.cardId)
      .forEach(t => {
        if (summary[t.cardId!]) {
          summary[t.cardId!].total += t.amount;
          summary[t.cardId!].count += 1;
          summary[t.cardId!].transactions.push(t);
        }
      });

    return summary;
  }, [creditCards, monthTransactions]);

  const pendingBillsCount = useMemo(() => {
    return monthTransactions.filter(t => t.type === 'expense' && !t.isPaid).length;
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
      essentialExpenses > 0 ? essentialExpenses : 2500
    );
  }, [netSurplus, fixedExpensesTotal, dailyExpensesTotal, annualInterestRate]);

  // Navegação de mês
  const nextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const date = new Date(y, m, 1);
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
    const userId = user?.uid || 'guest';
    
    // Tratamento de recorrência inteligente para contas fixas (receita ou despesa)
    if (tx.nature === 'fixed') {
      const startMonth = tx.startDate || tx.date.slice(0, 7);
      const initialPaid = tx.isPaid ? [startMonth] : [];
      await FinanceService.saveTransaction(
        userId,
        {
          ...tx,
          startDate: startMonth,
          endDate: null,
          paidMonths: initialPaid
        },
        false
      );
      return;
    }

    if (tx.nature === 'installment' && tx.installmentDetails && tx.installmentDetails.totalInstallments > 1) {
      const details = tx.installmentDetails;
      const groupId = details.groupId || `grp_${Date.now()}`;
      const [startYear, startMonth, startDay] = tx.date.split('-').map(Number);

      await FinanceService.saveTransaction(
        userId,
        {
          ...tx,
          installmentDetails: {
            ...details,
            groupId
          }
        },
        false
      );

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
            description: `${tx.description.replace(/\s\(\d+\/\d+\)$/, '')} (${i}/${details.totalInstallments})`,
            isPaid: false, // Parcelas futuras aguardam baixa manual do usuário
            installmentDetails: {
              ...details,
              currentInstallment: i,
              groupId
            }
          },
          false
        );
      }
    } else {
      await FinanceService.saveTransaction(userId, tx, false);
    }
  };

  const updateTransaction = async (id: string, tx: Partial<Transaction>) => {
    const userId = user?.uid || 'guest';
    const existing = transactions.find(t => t.id === id);
    if (!existing) return;
    const merged: Transaction = { ...existing, ...tx };
    if (merged.nature !== 'installment') {
      delete merged.installmentDetails;
    }
    // Atualização otimista imediata na interface
    setTransactions(prev => prev.map(t => (t.id === id ? merged : t)));
    await FinanceService.saveTransaction(userId, merged, false);
  };

  const deleteTransaction = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    const userId = user?.uid || 'guest';
    await FinanceService.deleteTransaction(userId, id, false);
  };

  const discontinueRecurringTransaction = async (id: string, fromMonth: string) => {
    setTransactions(prev => prev.map(t => (t.id === id ? { ...t, endDate: fromMonth } : t)));
    const userId = user?.uid || 'guest';
    await FinanceService.discontinueRecurringTransaction(userId, id, fromMonth, false);
  };

  const togglePaidStatus = async (id: string, currentStatus: boolean) => {
    const tx = transactions.find(t => t.id === id);
    const userId = user?.uid || 'guest';
    if (!tx) return;

    if (tx.nature === 'fixed') {
      const currentPaid = tx.paidMonths || (tx.isPaid && tx.date.startsWith(currentMonth) ? [currentMonth] : []);
      const hasMonth = currentPaid.includes(currentMonth);
      const updatedPaid = hasMonth
        ? currentPaid.filter(m => m !== currentMonth)
        : [...currentPaid, currentMonth];

      setTransactions(prev => prev.map(t => (t.id === id ? { ...t, paidMonths: updatedPaid, isPaid: !hasMonth } : t)));
      await FinanceService.togglePaidStatus(userId, id, currentStatus, false, currentMonth, currentPaid);
    } else {
      setTransactions(prev => prev.map(t => (t.id === id ? { ...t, isPaid: !currentStatus } : t)));
      await FinanceService.togglePaidStatus(userId, id, currentStatus, false);
    }
  };

  const saveBudget = async (category: string, limitAmount: number) => {
    const userId = user?.uid || 'guest';
    const existing = budgets.find(b => b.category === category);
    await FinanceService.saveBudget(
      userId,
      {
        id: existing?.id,
        category,
        limitAmount,
        userId
      },
      false
    );
  };

  const deleteBudget = async (budgetId: string) => {
    setBudgets(prev => prev.filter(b => b.id !== budgetId));
    const userId = user?.uid || 'guest';
    await FinanceService.deleteBudget(userId, budgetId, false);
  };

  const addCustomCategory = async (name: string, type: 'expense' | 'income') => {
    const userId = user?.uid || 'guest';
    await FinanceService.saveCustomCategory(userId, { name, type }, false);
  };

  const deleteCustomCategory = async (id: string) => {
    setCustomCategories(prev => prev.filter(c => c.id !== id));
    const userId = user?.uid || 'guest';
    await FinanceService.deleteCustomCategory(userId, id, false);
  };

  // Operações de Cartão de Crédito
  const addCreditCard = async (card: Omit<CreditCard, 'id' | 'userId'>) => {
    const userId = user?.uid || 'guest';
    await FinanceService.saveCreditCard(userId, card, false);
  };

  const updateCreditCard = async (id: string, card: Partial<CreditCard>) => {
    const userId = user?.uid || 'guest';
    const existing = creditCards.find(c => c.id === id);
    if (!existing) return;
    await FinanceService.saveCreditCard(userId, { ...existing, ...card }, false);
  };

  const deleteCreditCard = async (id: string) => {
    setCreditCards(prev => prev.filter(c => c.id !== id));
    const userId = user?.uid || 'guest';
    await FinanceService.deleteCreditCard(userId, id, false);
  };

  const purgeAllUserData = async () => {
    const userId = user?.uid || 'guest';
    await FinanceService.deleteAllUserData(userId, false);
    setTransactions([]);
    setBudgets([]);
    setCustomCategories([]);
    setCreditCards([]);
  };

  const clearAllData = () => {
    FinanceService.clearLocalData();
    setTransactions([]);
    setBudgets([]);
    setCustomCategories([]);
    setCreditCards([]);
  };

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        budgets,
        customCategories,
        creditCards,
        expenseCategories,
        incomeCategories,
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
        totalCreditCardInvoice,
        cardInvoices,
        pendingBillsCount,
        healthScore,
        budgetsStatus,
        cashFlowProjections,
        freedomSimulation,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        discontinueRecurringTransaction,
        togglePaidStatus,
        saveBudget,
        deleteBudget,
        addCustomCategory,
        deleteCustomCategory,
        addCreditCard,
        updateCreditCard,
        deleteCreditCard,
        purgeAllUserData,
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
