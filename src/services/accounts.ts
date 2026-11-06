import { Account, Transaction, Transfer } from '../types/finance';
import { buildMonthTransactions, currentMonthKey, firstActiveMonth, monthsBetween } from './monthView';

export interface AccountBalance {
  balance: number;
  income: number;
  expense: number;
  transfersIn: number;
  transfersOut: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Lançamentos que afetam o saldo de uma conta: já pagos/recebidos, com data até hoje,
 * vinculados à conta e que não sejam compras no cartão (essas saem da conta quando a fatura é paga).
 */
export function accountTransactions(transactions: Transaction[], upTo: Date = new Date()): Transaction[] {
  const today = isoDay(upTo);
  const months = monthsBetween(firstActiveMonth(transactions), currentMonthKey(upTo));
  const list: Transaction[] = [];
  for (const m of months) {
    for (const t of buildMonthTransactions(transactions, m)) {
      if (!t.accountId) continue;
      if (t.paymentMethod === 'credit_card') continue;
      if (t.isPaid === false) continue;
      if (t.date > today) continue;
      list.push(t);
    }
  }
  return list;
}

export function computeAccountBalances(
  accounts: Account[],
  transactions: Transaction[],
  transfers: Transfer[],
  upTo: Date = new Date()
): Record<string, AccountBalance> {
  const today = isoDay(upTo);
  const result: Record<string, AccountBalance> = {};
  accounts.forEach(a => {
    result[a.id] = { balance: a.initialBalance, income: 0, expense: 0, transfersIn: 0, transfersOut: 0 };
  });

  for (const t of accountTransactions(transactions, upTo)) {
    const r = result[t.accountId!];
    if (!r) continue;
    if (t.type === 'income') {
      r.income += t.amount;
      r.balance += t.amount;
    } else {
      r.expense += t.amount;
      r.balance -= t.amount;
    }
  }
  for (const tr of transfers) {
    if (tr.date > today) continue;
    if (result[tr.fromAccountId]) {
      result[tr.fromAccountId].transfersOut += tr.amount;
      result[tr.fromAccountId].balance -= tr.amount;
    }
    if (result[tr.toAccountId]) {
      result[tr.toAccountId].transfersIn += tr.amount;
      result[tr.toAccountId].balance += tr.amount;
    }
  }
  Object.values(result).forEach(r => {
    r.balance = round2(r.balance);
    r.income = round2(r.income);
    r.expense = round2(r.expense);
    r.transfersIn = round2(r.transfersIn);
    r.transfersOut = round2(r.transfersOut);
  });
  return result;
}

export interface StatementEntry {
  key: string;
  date: string;
  description: string;
  amount: number; // com sinal: entrada positiva, saída negativa
  kind: 'transaction' | 'transfer';
  transactionId?: string; // só para lançamentos avulsos (permite conciliar)
  reconciled?: boolean;
}

/** Movimentos de uma conta (lançamentos + transferências), do mais recente para o mais antigo. */
export function accountStatement(
  accountId: string,
  accounts: Account[],
  transactions: Transaction[],
  transfers: Transfer[],
  upTo: Date = new Date()
): StatementEntry[] {
  const names = new Map(accounts.map(a => [a.id, a.name]));
  const today = isoDay(upTo);
  const entries: StatementEntry[] = [];

  for (const t of accountTransactions(transactions, upTo)) {
    if (t.accountId !== accountId) continue;
    entries.push({
      key: `tx_${t.id}_${t.date}`,
      date: t.date,
      description: t.description || t.category,
      amount: t.type === 'income' ? t.amount : -t.amount,
      kind: 'transaction',
      // Itens fixos repetem o mesmo id todo mês: a conciliação só vale para lançamentos avulsos
      transactionId: t.nature === 'fixed' || t.id.startsWith('synth_') ? undefined : t.id,
      reconciled: !!t.reconciled
    });
  }
  for (const tr of transfers) {
    if (tr.date > today) continue;
    if (tr.fromAccountId === accountId) {
      entries.push({
        key: `tr_${tr.id}_out`,
        date: tr.date,
        description: `Transferência para ${names.get(tr.toAccountId) || 'outra conta'}`,
        amount: -tr.amount,
        kind: 'transfer'
      });
    }
    if (tr.toAccountId === accountId) {
      entries.push({
        key: `tr_${tr.id}_in`,
        date: tr.date,
        description: `Transferência de ${names.get(tr.fromAccountId) || 'outra conta'}`,
        amount: tr.amount,
        kind: 'transfer'
      });
    }
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

/** Diferença entre o saldo informado no extrato do banco e o saldo do app. */
export function reconciliationDifference(appBalance: number, statementBalance: number): number {
  return round2(statementBalance - appBalance);
}
