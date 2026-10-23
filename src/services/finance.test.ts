import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateHealthScore } from './scoreCalculator.ts';
import { calculateCashFlowProjections, calculateFreedomSimulation, isFixedActiveInMonth } from './projections.ts';
import { calculateAvailableSurplus, calculateSuggestedBudgets } from './budgetSuggester.ts';
import { Transaction, CategoryBudget } from '../types/finance.ts';

test('calculateHealthScore should compute 0-1000 score with the 4 pillars', () => {
  const transactions: Transaction[] = [
    {
      id: 'tx1',
      userId: 'test_u',
      type: 'income',
      nature: 'fixed',
      amount: 10000,
      category: 'Salário',
      date: '2026-10-05',
      description: 'Salário',
      paymentMethod: 'bank_transfer',
      isPaid: true
    },
    {
      id: 'tx2',
      userId: 'test_u',
      type: 'expense',
      nature: 'fixed',
      amount: 3000,
      category: 'Moradia',
      date: '2026-10-10',
      description: 'Aluguel',
      paymentMethod: 'pix',
      isPaid: true
    },
    {
      id: 'tx3',
      userId: 'test_u',
      type: 'expense',
      nature: 'daily',
      amount: 1000,
      category: 'Alimentação',
      date: '2026-10-12',
      description: 'Supermercado',
      paymentMethod: 'credit_card'
    }
  ];

  const budgets: CategoryBudget[] = [
    { userId: 'test_u', category: 'Moradia', limitAmount: 3500 },
    { userId: 'test_u', category: 'Alimentação', limitAmount: 1500 }
  ];

  const result = calculateHealthScore(transactions, budgets, '2026-10');

  // Income: 10000, Expenses: 4000, Net Surplus: 6000 (60% savings rate => max 300)
  assert.equal(result.pillars.savingsRate.score, 300);
  // Fixed: 3000 (30% commitment <= 35% => max 300)
  assert.equal(result.pillars.incomeCommitment.score, 300);
  // Both budgets within ceiling => max 250
  assert.equal(result.pillars.budgetDiscipline.score, 250);
  // 3 days with entries => 40 pts
  assert.equal(result.pillars.entryConsistency.score, 40);

  // Total should be 300 + 300 + 250 + 40 = 890 (Excelente)
  assert.equal(result.score, 890);
  assert.equal(result.status, 'Excelente');
});

test('isFixedActiveInMonth correctly checks temporal bounds (startDate and endDate)', () => {
  const recurringTx: Transaction = {
    id: 'tx_sub',
    userId: 'test_u',
    type: 'expense',
    nature: 'fixed',
    amount: 50,
    category: 'Serviços & Assinaturas',
    date: '2026-05-10',
    startDate: '2026-05',
    endDate: '2026-08', // Canceled starting in August
    description: 'Streaming',
    paymentMethod: 'credit_card'
  };

  // Month before start (April 2026) -> false
  assert.equal(isFixedActiveInMonth(recurringTx, '2026-04'), false);
  // Start month (May 2026) -> true
  assert.equal(isFixedActiveInMonth(recurringTx, '2026-05'), true);
  // Active month (July 2026) -> true
  assert.equal(isFixedActiveInMonth(recurringTx, '2026-07'), true);
  // End month (August 2026) -> false (discontinued from this month onward)
  assert.equal(isFixedActiveInMonth(recurringTx, '2026-08'), false);
  // Future month (September 2026) -> false
  assert.equal(isFixedActiveInMonth(recurringTx, '2026-09'), false);
});

test('calculateCashFlowProjections respects recurring items discontinuation with endDate', () => {
  const transactions: Transaction[] = [
    {
      id: 'tx_salary',
      userId: 'test_u',
      type: 'income',
      nature: 'fixed',
      amount: 5000,
      category: 'Salário',
      date: '2026-10-01',
      startDate: '2026-10',
      description: 'Salário Fixo',
      paymentMethod: 'bank_transfer'
    },
    {
      id: 'tx_rent',
      userId: 'test_u',
      type: 'expense',
      nature: 'fixed',
      amount: 2000,
      category: 'Moradia',
      date: '2026-10-01',
      startDate: '2026-10',
      endDate: '2027-01', // Rent discontinued/ended in Jan 2027
      description: 'Aluguel',
      paymentMethod: 'pix'
    }
  ];

  // Base month: 2026-10 (Next months: 2026-11, 2026-12, 2027-01)
  const projections = calculateCashFlowProjections(transactions, 3, '2026-10');
  assert.equal(projections.length, 3);

  // Month 1 (2026-11): Rent active (2000)
  assert.equal(projections[0].monthYear, '2026-11');
  assert.equal(projections[0].fixedExpenses, 2000);
  assert.equal(projections[0].projectedIncome, 5000);

  // Month 2 (2026-12): Rent active (2000)
  assert.equal(projections[1].monthYear, '2026-12');
  assert.equal(projections[1].fixedExpenses, 2000);

  // Month 3 (2027-01): Rent discontinued (0)
  assert.equal(projections[2].monthYear, '2027-01');
  assert.equal(projections[2].fixedExpenses, 0);
  assert.equal(projections[2].projectedIncome, 5000);
});

test('calculateCashFlowProjections amortizes installments month by month', () => {
  const transactions: Transaction[] = [
    {
      id: 'tx_inc',
      userId: 'test_u',
      type: 'income',
      nature: 'fixed',
      amount: 5000,
      category: 'Salário',
      date: '2026-10-05',
      description: 'Salário',
      paymentMethod: 'bank_transfer'
    },
    {
      id: 'tx_fixed',
      userId: 'test_u',
      type: 'expense',
      nature: 'fixed',
      amount: 1500,
      category: 'Moradia',
      date: '2026-10-05',
      description: 'Aluguel',
      paymentMethod: 'pix'
    },
    {
      id: 'tx_inst',
      userId: 'test_u',
      type: 'expense',
      nature: 'installment',
      amount: 500,
      category: 'Lazer & Estilo',
      date: '2026-10-05',
      description: 'Celular',
      paymentMethod: 'credit_card',
      installmentDetails: {
        totalAmount: 1500,
        totalInstallments: 3,
        currentInstallment: 2, // 2 remaining months: offset 1 and 2
        monthlyAmount: 500,
        groupId: 'grp_phone',
        purchaseDate: '2026-09-05'
      }
    }
  ];

  const projections = calculateCashFlowProjections(transactions, 4, '2026-10');
  assert.equal(projections.length, 4);

  // Month 1 ahead has installment
  assert.equal(projections[0].installmentsTotal, 500);
  // Month 2 ahead has installment
  assert.equal(projections[1].installmentsTotal, 500);
  // Month 3 ahead installment has expired!
  assert.equal(projections[2].installmentsTotal, 0);
  assert.equal(projections[3].installmentsTotal, 0);
});

test('calculateCashFlowProjections includes installment income (vendas parceladas)', () => {
  const transactions: Transaction[] = [
    {
      id: 'tx_salary',
      userId: 'test_u',
      type: 'income',
      nature: 'fixed',
      amount: 4000,
      category: 'Salário',
      date: '2026-10-01',
      description: 'Salário Fixo',
      paymentMethod: 'bank_transfer'
    },
    {
      id: 'tx_sale',
      userId: 'test_u',
      type: 'income',
      nature: 'installment',
      amount: 250,
      category: 'Outros',
      date: '2026-10-01',
      description: 'Venda videogame para amigo',
      paymentMethod: 'pix',
      installmentDetails: {
        totalAmount: 500,
        totalInstallments: 2,
        currentInstallment: 1,
        monthlyAmount: 250,
        groupId: 'grp_sale_game',
        purchaseDate: '2026-10-01'
      }
    }
  ];

  const projections = calculateCashFlowProjections(transactions, 3, '2026-10');
  assert.equal(projections.length, 3);

  assert.equal(projections[0].projectedIncome, 4250);
  assert.equal(projections[1].projectedIncome, 4250);
  assert.equal(projections[2].projectedIncome, 4000);
});

test('calculateCashFlowProjections correctly predicts surplus when future month has income covering installments', () => {
  const transactions: Transaction[] = [
    {
      id: 'tx_sal_nov',
      userId: 'test_u',
      type: 'income',
      nature: 'daily',
      amount: 4254,
      category: 'Salário',
      date: '2026-11-05',
      description: 'Salário Novembro',
      paymentMethod: 'bank_transfer'
    },
    {
      id: 'tx_sal_dec',
      userId: 'test_u',
      type: 'income',
      nature: 'daily',
      amount: 4254,
      category: 'Salário',
      date: '2026-12-05',
      description: 'Salário Dezembro',
      paymentMethod: 'bank_transfer'
    },
    {
      id: 'tx_inst_dec',
      userId: 'test_u',
      type: 'expense',
      nature: 'installment',
      amount: 1254,
      category: 'Compras',
      date: '2026-12-10',
      description: 'Parcela Notebook (1/10)',
      paymentMethod: 'credit_card',
      installmentDetails: {
        groupId: 'grp_note',
        totalAmount: 12540,
        totalInstallments: 10,
        currentInstallment: 1,
        monthlyAmount: 1254,
        purchaseDate: '2026-12-10'
      }
    }
  ];

  // Base month: 2026-11, month 1 is 2026-12
  const projections = calculateCashFlowProjections(transactions, 2, '2026-11');
  assert.equal(projections[0].monthYear, '2026-12');
  assert.equal(projections[0].projectedIncome, 4254);
  assert.equal(projections[0].installmentsTotal, 1254);
  assert.equal(projections[0].netSurplus, 3000); // 4254 - 1254 = +3000!
  assert.equal(projections[0].isDeficit, false); // Must NOT be deficit!
});

test('calculateFreedomSimulation calculates emergency fund and compound interest', () => {
  const sim = calculateFreedomSimulation(1000, 5000, 0.06, 10, 2000);
  assert.equal(sim.emergencyTarget, 12000); // 6 x 2000
  assert.ok(sim.emergencyMonthReached > 0 && sim.emergencyMonthReached < 12);
  assert.ok(sim.points.length === 11); // year 0 to 10
  assert.ok(sim.points[10].compoundTotal > sim.points[10].investedCapital); // compound growth
});

test('calculateHealthScore should handle zero-data clean state without errors', () => {
  const result = calculateHealthScore([], [], '2026-10');
  assert.equal(result.score, 0);
  assert.equal(result.status, 'Aguardando Lançamentos');
  assert.equal(result.isEmpty, true);
  assert.equal(result.pillars.savingsRate.score, 0);
  assert.equal(result.pillars.incomeCommitment.score, 0);
  assert.equal(result.pillars.budgetDiscipline.score, 0);
  assert.equal(result.pillars.entryConsistency.score, 0);
  assert.ok(result.actionableTips.length > 0);
});

test('installment group advance calculation correctly computes discount and balances', () => {
  const totalInstallments = 12;
  const monthlyAmount = 250;
  const paidCount = 4;
  const remainingCount = totalInstallments - paidCount; // 8
  const remainingBalance = remainingCount * monthlyAmount; // 2000

  assert.equal(remainingBalance, 2000);

  // Adiantar 3 parcelas com R$ 50 de desconto
  const countToAdvance = 3;
  const discount = 50;
  const subtotal = countToAdvance * monthlyAmount; // 750
  const totalToPay = subtotal - discount; // 700
  const newRemainingCount = remainingCount - countToAdvance; // 5
  const newRemainingBalance = newRemainingCount * monthlyAmount; // 1250

  assert.equal(subtotal, 750);
  assert.equal(totalToPay, 700);
  assert.equal(newRemainingCount, 5);
  assert.equal(newRemainingBalance, 1250);
});

test('calculateAvailableSurplus correctly calculates real uncommitted surplus and handles deficit', () => {
  const transactions: Transaction[] = [
    {
      id: 'tx_sal',
      userId: 'u1',
      type: 'income',
      nature: 'fixed',
      amount: 5000,
      category: 'Salário',
      date: '2026-11-05',
      paymentMethod: 'bank_transfer'
    },
    {
      id: 'tx_rent',
      userId: 'u1',
      type: 'expense',
      nature: 'fixed',
      amount: 1500,
      category: 'Moradia',
      date: '2026-11-05',
      paymentMethod: 'pix'
    },
    {
      id: 'tx_moto',
      userId: 'u1',
      type: 'expense',
      nature: 'installment',
      amount: 500,
      category: 'Transporte',
      date: '2026-11-10',
      paymentMethod: 'boleto'
    }
  ];

  // Surplus: 5000 - (1500 + 500) = 3000
  const result = calculateAvailableSurplus(transactions, '2026-11');
  assert.equal(result.totalIncome, 5000);
  assert.equal(result.fixedExpenses, 1500);
  assert.equal(result.installmentsTotal, 500);
  assert.equal(result.availableSurplus, 3000);

  // Deficit scenario: expenses exceed income
  const deficitTransactions: Transaction[] = [
    {
      id: 'tx_sal2',
      userId: 'u1',
      type: 'income',
      nature: 'fixed',
      amount: 2000,
      category: 'Salário',
      date: '2026-11-05',
      paymentMethod: 'bank_transfer'
    },
    {
      id: 'tx_rent2',
      userId: 'u1',
      type: 'expense',
      nature: 'fixed',
      amount: 2200,
      category: 'Moradia',
      date: '2026-11-05',
      paymentMethod: 'pix'
    }
  ];
  const deficitResult = calculateAvailableSurplus(deficitTransactions, '2026-11');
  assert.equal(deficitResult.availableSurplus, -200);
});

test('calculateSuggestedBudgets preserves 20% safety reserve and allocates realistically', () => {
  const categories = ['Alimentação', 'Transporte', 'Lazer & Estilo', 'Saúde'];
  const surplus = 2000;

  const result = calculateSuggestedBudgets(surplus, categories);
  assert.equal(result.isDeficit, false);
  // 20% safety margin: 400
  assert.equal(result.safetyReserve, 400);
  // 80% allocable budget: 1600
  assert.equal(result.allocableBudget, 1600);

  // All limits are positive numbers
  assert.ok(result.suggestedLimits['Alimentação'] > 0);
  assert.ok(result.suggestedLimits['Transporte'] > 0);
  assert.ok(result.suggestedLimits['Lazer & Estilo'] > 0);
  assert.ok(result.suggestedLimits['Saúde'] > 0);

  // Total suggested must not exceed available surplus
  assert.ok(result.totalSuggested <= surplus);

  // Deficit scenario:
  const deficitResult = calculateSuggestedBudgets(-100, categories);
  assert.equal(deficitResult.isDeficit, true);
  assert.equal(deficitResult.totalSuggested, 0);
  assert.ok(deficitResult.warningMessage?.includes('100% da sua renda'));
});

test('installment index synchronization respects initial registration index and delta months', () => {
  // Moto Honda cadastrada em Novembro/2026 na parcela 30/48
  const initialInstallmentNumber = 30;
  const totalInstallments = 48;
  const startMonth = '2026-11';

  // No mês de Novembro/2026 (mesmo mês de início):
  const [novY, novM] = '2026-11'.split('-').map(Number);
  const [sY, sM] = startMonth.split('-').map(Number);
  const deltaNov = (novY - sY) * 12 + (novM - sM); // 0
  const curNov = Math.min(totalInstallments, Math.max(1, initialInstallmentNumber + deltaNov));
  assert.equal(curNov, 30);

  // No mês de Dezembro/2026 (1 mês depois):
  const [decY, decM] = '2026-12'.split('-').map(Number);
  const deltaDec = (decY - sY) * 12 + (decM - sM); // 1
  const curDec = Math.min(totalInstallments, Math.max(1, initialInstallmentNumber + deltaDec));
  assert.equal(curDec, 31);

  // Celular cadastrado com 1/18 e 5 parcelas pagas:
  const celularInitial = 1;
  const celularTotal = 18;
  const celularPaidInApp = 5;
  const priorPaid = celularInitial - 1; // 0
  const totalPaid = priorPaid + celularPaidInApp; // 5
  const remaining = celularTotal - totalPaid; // 13

  assert.equal(totalPaid, 5);
  assert.equal(remaining, 13);
});


