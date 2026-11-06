import test from 'node:test';
import assert from 'node:assert/strict';
import {
  csvToImportRows,
  markDuplicates,
  parseCSV,
  parseDateFlexible,
  parseMoney,
  parseOFX,
  transactionsToCSV
} from './importExport';
import { applyFilter, countActiveFilters, EMPTY_FILTER } from './filters';
import { summarizeMonth, summarizeYear, compareCategories, pctChange } from './reports';
import { computeBudgetStatuses } from './budgetRollover';
import { computeAccountBalances } from './accounts';
import { buildInvoiceCycle, computeLimitUsage, cycleDates, invoiceMonthForDate } from './cardCycles';
import { buildReminders } from './reminders';
import { computeBalances, splitCents, suggestSettlements } from './household';
import { Account, CategoryBudget, CreditCard, SharedExpense, Transaction, Transfer } from '../types/finance';

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 't' + Math.random().toString(36).slice(2, 8),
  userId: 'u',
  type: 'expense',
  nature: 'daily',
  amount: 100,
  category: 'Alimentação',
  date: '2026-03-10',
  description: 'Teste',
  paymentMethod: 'pix',
  isPaid: true,
  ...over
});

// ----------------------------------------------------------------- importação

test('parseMoney entende formatos brasileiro e americano', () => {
  assert.equal(parseMoney('1.234,56'), 1234.56);
  assert.equal(parseMoney('1,234.56'), 1234.56);
  assert.equal(parseMoney('-45,90'), -45.9);
  assert.equal(parseMoney('R$ 12,00'), 12);
  assert.equal(parseMoney('(12.00)'), -12);
  assert.equal(parseMoney('1.234'), 1234);
  assert.equal(parseMoney('12.5'), 12.5);
  assert.equal(parseMoney('abc'), null);
});

test('parseDateFlexible aceita formatos comuns e rejeita datas impossíveis', () => {
  assert.equal(parseDateFlexible('05/03/2026'), '2026-03-05');
  assert.equal(parseDateFlexible('5-3-26'), '2026-03-05');
  assert.equal(parseDateFlexible('2026-03-05'), '2026-03-05');
  assert.equal(parseDateFlexible('20260305120000'), '2026-03-05');
  assert.equal(parseDateFlexible('31/02/2026'), null);
});

test('parseCSV respeita aspas e detecta o separador', () => {
  const rows = parseCSV('a;b;c\r\n"x;y";"he said ""hi""";3\r\n');
  assert.deepEqual(rows, [['a', 'b', 'c'], ['x;y', 'he said "hi"', '3']]);
});

test('csvToImportRows importa extrato com sinal no valor', () => {
  const csv = 'Data;Histórico;Valor\n01/03/2026;Mercado;-150,25\n02/03/2026;Salário;5.000,00\nxx;Ruim;1';
  const { rows, errors } = csvToImportRows(csv);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { date: '2026-03-01', description: 'Mercado', amount: 150.25, type: 'expense' });
  assert.equal(rows[1].type, 'income');
  assert.equal(errors.length, 1);
});

test('exportar e reimportar preserva os dados', () => {
  const original = [
    tx({ date: '2026-03-02', description: 'Café, pão', amount: 12.5 }),
    tx({ date: '2026-03-03', description: 'Salário', amount: 3000, type: 'income', category: 'Salário' })
  ];
  const { rows, errors } = csvToImportRows(transactionsToCSV(original));
  assert.equal(errors.length, 0);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].description, 'Café, pão');
  assert.equal(rows[0].amount, 12.5);
  assert.equal(rows[0].type, 'expense');
  assert.equal(rows[1].type, 'income');
});

test('exportação neutraliza fórmulas de planilha', () => {
  const csv = transactionsToCSV([tx({ description: '=HYPERLINK("http://x")' })]);
  assert.ok(csv.includes("'=HYPERLINK"));
});

test('parseOFX lê transações e sinais', () => {
  const ofx = `OFXHEADER:100
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260305120000[-3:BRT]<TRNAMT>-89.90<FITID>A1<MEMO>PADARIA
</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260306<TRNAMT>1500.00<FITID>A2<NAME>PIX RECEBIDO
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
  const { rows, errors } = parseOFX(ofx);
  assert.equal(errors.length, 0);
  assert.deepEqual(rows[0], { date: '2026-03-05', description: 'PADARIA', amount: 89.9, type: 'expense', externalId: 'A1' });
  assert.equal(rows[1].type, 'income');
  assert.equal(rows[1].description, 'PIX RECEBIDO');
});

test('markDuplicates detecta repetidos no app e dentro do arquivo', () => {
  const existing = [tx({ date: '2026-03-05', amount: 89.9, description: 'Padaria' })];
  const rows = [
    { date: '2026-03-05', description: 'PADARIA', amount: 89.9, type: 'expense' as const },
    { date: '2026-03-06', description: 'Outro', amount: 10, type: 'expense' as const },
    { date: '2026-03-06', description: 'outro', amount: 10, type: 'expense' as const }
  ];
  assert.deepEqual(markDuplicates(rows, existing), [true, false, true]);
});

// -------------------------------------------------------------------- filtros

test('filtros combinam texto, faixa de valor, categoria, tags e período', () => {
  const list = [
    tx({ description: 'Pizza', amount: 80, tags: ['Lazer'], date: '2026-03-02' }),
    tx({ description: 'Mercado', amount: 300, category: 'Moradia', date: '2026-03-15' }),
    tx({ description: 'Salário', amount: 4000, type: 'income', date: '2026-03-20' })
  ];
  assert.equal(applyFilter(list, { ...EMPTY_FILTER, text: 'pizza' }).length, 1);
  assert.equal(applyFilter(list, { ...EMPTY_FILTER, text: 'PÍZZA'.replace('Z', 'z') }).length, 1);
  assert.equal(applyFilter(list, { ...EMPTY_FILTER, minAmount: 100, maxAmount: 500 }).length, 1);
  assert.equal(applyFilter(list, { ...EMPTY_FILTER, categories: ['Moradia'] }).length, 1);
  assert.equal(applyFilter(list, { ...EMPTY_FILTER, tags: ['lazer'] }).length, 1);
  assert.equal(applyFilter(list, { ...EMPTY_FILTER, dateFrom: '2026-03-10', dateTo: '2026-03-31' }).length, 2);
  assert.equal(applyFilter(list, { ...EMPTY_FILTER, type: 'income' }).length, 1);
  assert.equal(countActiveFilters({ ...EMPTY_FILTER, text: 'a', minAmount: 1 }), 2);
});

// ------------------------------------------------------------------ relatórios

test('summarizeMonth e comparações', () => {
  const list = [
    tx({ date: '2026-02-10', amount: 100, category: 'Alimentação' }),
    tx({ date: '2026-03-10', amount: 150, category: 'Alimentação' }),
    tx({ date: '2026-03-11', amount: 50, category: 'Lazer & Estilo' }),
    tx({ date: '2026-03-01', amount: 1000, type: 'income', category: 'Salário' })
  ];
  const feb = summarizeMonth(list, '2026-02');
  const mar = summarizeMonth(list, '2026-03');
  assert.equal(mar.expenses, 200);
  assert.equal(mar.net, 800);
  const cmp = compareCategories(feb, mar);
  assert.equal(cmp[0].category, 'Alimentação');
  assert.equal(cmp[0].diff, 50);
  assert.equal(pctChange(100, 150), 50);
  assert.equal(pctChange(0, 10), null);
});

test('summarizeYear agrega meses, melhor e pior mês', () => {
  const list = [
    tx({ date: '2026-01-05', amount: 500 }),
    tx({ date: '2026-01-01', amount: 2000, type: 'income', category: 'Salário' }),
    tx({ date: '2026-02-05', amount: 2500 }),
    tx({ date: '2026-02-01', amount: 2000, type: 'income', category: 'Salário' })
  ];
  const y = summarizeYear(list, 2026);
  assert.equal(y.totalIncome, 4000);
  assert.equal(y.totalExpenses, 3000);
  assert.equal(y.bestMonth?.month, '2026-01');
  assert.equal(y.worstMonth?.month, '2026-02');
  assert.equal(Math.round(y.savingsRate), 25);
});

// ----------------------------------------------------------- orçamento / rollover

test('teto específico do mês substitui o padrão', () => {
  const budgets: CategoryBudget[] = [
    { id: 'b1', userId: 'u', category: 'Alimentação', limitAmount: 500 },
    { id: 'b2', userId: 'u', category: 'Alimentação', limitAmount: 800, monthYear: '2026-03' }
  ];
  const list = [tx({ date: '2026-03-10', amount: 400 })];
  const [mar] = computeBudgetStatuses(budgets, list, '2026-03');
  assert.equal(mar.baseLimit, 800);
  assert.equal(mar.isMonthOverride, true);
  const [apr] = computeBudgetStatuses(budgets, list, '2026-04');
  assert.equal(apr.baseLimit, 500);
});

test('rollover acumula a sobra dos meses anteriores', () => {
  const budgets: CategoryBudget[] = [
    { id: 'b1', userId: 'u', category: 'Alimentação', limitAmount: 500, rollover: true, rolloverFrom: '2026-01' }
  ];
  const list = [
    tx({ date: '2026-01-10', amount: 300 }), // sobra 200
    tx({ date: '2026-02-10', amount: 600 }) // limite 700, sobra 100
  ];
  const [feb] = computeBudgetStatuses(budgets, list, '2026-02');
  assert.equal(feb.carry, 200);
  assert.equal(feb.limit, 700);
  const [mar] = computeBudgetStatuses(budgets, list, '2026-03');
  assert.equal(mar.carry, 100);
  assert.equal(mar.limit, 600);
  const [jan] = computeBudgetStatuses(budgets, list, '2026-01');
  assert.equal(jan.carry, 0);
});

test('estouro não gera carry negativo', () => {
  const budgets: CategoryBudget[] = [
    { id: 'b1', userId: 'u', category: 'Alimentação', limitAmount: 100, rollover: true, rolloverFrom: '2026-01' }
  ];
  const [feb] = computeBudgetStatuses(budgets, [tx({ date: '2026-01-10', amount: 900 })], '2026-02');
  assert.equal(feb.carry, 0);
});

// ----------------------------------------------------------------------- contas

test('saldo da conta soma pagos, ignora cartão, pendentes e futuros, e aplica transferências', () => {
  const accounts: Account[] = [
    { id: 'a1', userId: 'u', name: 'Banco', type: 'checking', initialBalance: 1000 },
    { id: 'a2', userId: 'u', name: 'Poupança', type: 'savings', initialBalance: 0 }
  ];
  const now = new Date(2026, 2, 20);
  const list = [
    tx({ accountId: 'a1', type: 'income', amount: 500, date: '2026-03-01' }),
    tx({ accountId: 'a1', amount: 200, date: '2026-03-05' }),
    tx({ accountId: 'a1', amount: 999, date: '2026-03-06', paymentMethod: 'credit_card' }),
    tx({ accountId: 'a1', amount: 888, date: '2026-03-07', isPaid: false }),
    tx({ accountId: 'a1', amount: 777, date: '2026-03-28' }),
    tx({ amount: 555, date: '2026-03-08' }) // sem conta
  ];
  const transfers: Transfer[] = [{ id: 'tr1', userId: 'u', fromAccountId: 'a1', toAccountId: 'a2', amount: 300, date: '2026-03-10' }];
  const bal = computeAccountBalances(accounts, list, transfers, now);
  assert.equal(bal.a1.balance, 1000 + 500 - 200 - 300);
  assert.equal(bal.a2.balance, 300);
});

// ---------------------------------------------------------------------- cartões

const card: CreditCard = { id: 'c1', userId: 'u', cardName: 'Nu', lastFourDigits: '1234', bankName: 'Nubank', closingDay: 10, dueDay: 17, limitAmount: 1000 };

test('ciclo da fatura: datas de fechamento e vencimento', () => {
  const d = cycleDates(card, '2026-03');
  assert.deepEqual(d, { start: '2026-02-11', end: '2026-03-10', dueDate: '2026-03-17' });
  const wrap = cycleDates({ ...card, closingDay: 25, dueDay: 5 }, '2026-03');
  assert.equal(wrap.dueDate, '2026-04-05');
  assert.equal(invoiceMonthForDate(card, '2026-03-10'), '2026-03');
  assert.equal(invoiceMonthForDate(card, '2026-03-11'), '2026-04');
});

test('fatura reúne compras do ciclo e limite considera o não pago', () => {
  const purchases = [
    tx({ paymentMethod: 'credit_card', cardId: 'c1', date: '2026-02-11', amount: 100, isPaid: true }),
    tx({ paymentMethod: 'credit_card', cardId: 'c1', date: '2026-03-10', amount: 50, isPaid: false }),
    tx({ paymentMethod: 'credit_card', cardId: 'c1', date: '2026-03-11', amount: 70, isPaid: false })
  ];
  const cycle = buildInvoiceCycle(card, '2026-03', purchases, '2026-03-12');
  assert.equal(cycle.total, 150);
  assert.equal(cycle.isClosed, true);
  assert.equal(cycle.isPaid, false);
  const usage = computeLimitUsage(card, purchases, new Date(2026, 2, 12));
  assert.equal(usage.committed, 120);
  assert.equal(usage.status, 'safe');
  const hot = computeLimitUsage({ ...card, limitAmount: 130 }, purchases, new Date(2026, 2, 12));
  assert.equal(hot.status, 'warning');
});

// -------------------------------------------------------------------- lembretes

test('lembretes incluem contas a vencer e faturas fechadas', () => {
  const now = new Date(2026, 2, 15);
  const list = [
    tx({ nature: 'fixed', description: 'Aluguel', date: '2026-03-16', startDate: '2026-03', isPaid: false, paidMonths: [] }),
    tx({ nature: 'fixed', description: 'Internet', date: '2026-03-25', startDate: '2026-03', paidMonths: [] }),
    tx({ nature: 'daily', description: 'Café', date: '2026-03-16', isPaid: false }),
    tx({ paymentMethod: 'credit_card', cardId: 'c1', date: '2026-03-05', amount: 400, isPaid: false })
  ];
  const r = buildReminders(list, [card], now, 3);
  const titles = r.map(x => x.title);
  assert.ok(titles.includes('Aluguel'));
  assert.ok(!titles.includes('Internet')); // vence só em 10 dias
  assert.ok(!titles.includes('Café'));
  assert.ok(titles.includes('Fatura Nu'));
  assert.equal(r.find(x => x.kind === 'card')?.dueDate, '2026-03-17');
});

// ---------------------------------------------------------------- compartilhado

test('splitCents distribui centavos sem perder nem criar dinheiro', () => {
  const parts = splitCents(100, 3);
  assert.deepEqual(parts, [3334, 3333, 3333]);
  assert.equal(parts.reduce((a, b) => a + b, 0), 10000);
});

test('saldos e acertos entre membros', () => {
  const expenses: SharedExpense[] = [
    { id: 'e1', householdId: 'h', description: 'Jantar', amount: 120, date: '2026-03-01', category: 'Alimentação', paidBy: 'ana', splitWith: ['ana', 'beto', 'caio'] },
    { id: 'e2', householdId: 'h', description: 'Uber', amount: 30, date: '2026-03-02', category: 'Transporte', paidBy: 'beto', splitWith: ['ana', 'beto'] }
  ];
  const bal = computeBalances(expenses, ['ana', 'beto', 'caio']);
  assert.equal(bal.ana, 120 - 40 - 15);
  assert.equal(bal.beto, 30 - 40 - 15);
  assert.equal(bal.caio, -40);
  assert.equal(Math.round(Object.values(bal).reduce((a, b) => a + b, 0) * 100), 0);

  const pay = suggestSettlements(bal);
  assert.equal(pay.reduce((s, p) => s + p.amount, 0), 25 + 40);
  assert.ok(pay.every(p => p.to === 'ana'));

  // após o acerto, todos ficam zerados
  const settled: SharedExpense[] = [
    ...expenses,
    ...pay.map((p, i) => ({
      id: `s${i}`, householdId: 'h', description: 'Acerto', amount: p.amount, date: '2026-03-03', category: 'Acerto',
      paidBy: p.from, splitWith: [p.to], isSettlement: true
    }))
  ];
  const after = computeBalances(settled, ['ana', 'beto', 'caio']);
  Object.values(after).forEach(v => assert.equal(v, 0));
});

// ------------------------------------------------------------ últimos lançamentos

import { latestEntered } from './recent';

test('últimos lançamentos seguem a ordem de registro, não a data do lançamento', () => {
  const list = [
    // lançado ontem, mas com data de dezembro (fatura do cartão)
    tx({ id: 'a', description: 'Compra no cartão', date: '2026-12-05', createdAt: '2026-11-05T10:00:00.000Z' }),
    // lançado em outubro, com data de novembro
    tx({ id: 'b', description: 'Antigo', date: '2026-11-20', createdAt: '2026-10-20T10:00:00.000Z' }),
    // lançado hoje, com data de hoje
    tx({ id: 'c', description: 'Hoje', date: '2026-11-06', createdAt: '2026-11-06T09:00:00.000Z' }),
    tx({ id: 'd', description: 'Sem createdAt', date: '2026-11-30' })
  ];
  assert.deepEqual(latestEntered(list).map(t => t.id), ['c', 'a', 'b', 'd']);
});

test('últimos lançamentos mostram uma linha por compra parcelada e ignoram parcelas sintetizadas', () => {
  const base = { nature: 'installment' as const, createdAt: '2026-11-06T10:00:00.000Z' };
  const details = (n: number) => ({ totalAmount: 300, totalInstallments: 3, currentInstallment: n, monthlyAmount: 100, groupId: 'g1', purchaseDate: '2026-11-06' });
  const list = [
    tx({ ...base, id: 'p3', installmentDetails: details(3), date: '2027-01-06' }),
    tx({ ...base, id: 'p1', installmentDetails: details(1), date: '2026-11-06' }),
    tx({ ...base, id: 'p2', installmentDetails: details(2), date: '2026-12-06' }),
    tx({ id: 'synth_x_2026-11', date: '2026-11-06', createdAt: '2026-12-01T00:00:00.000Z' })
  ];
  assert.deepEqual(latestEntered(list).map(t => t.id), ['p1']);
});
