import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateHealthScore } from './scoreCalculator.ts';
import { calculateCashFlowProjections, calculateFreedomSimulation } from './projections.ts';
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
  assert.equal(result.status, 'Crítico');
  assert.equal(result.pillars.savingsRate.score, 0);
  assert.equal(result.pillars.incomeCommitment.score, 0);
  assert.equal(result.pillars.budgetDiscipline.score, 0);
  assert.equal(result.pillars.entryConsistency.score, 0);
  assert.ok(result.actionableTips.length > 0);
});
