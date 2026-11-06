import { Transaction } from '../types/finance';

/**
 * Lançamentos efetivos de um mês, já com a lógica de recorrência e parcelamento:
 * - Contas fixas (nature === 'fixed') se repetem em todos os meses entre startDate e endDate.
 * - O status pago de contas fixas é lido de paidMonths.
 * - Parcelas ainda não registradas no mês são sintetizadas (id começando com "synth_").
 */
export function buildMonthTransactions(transactions: Transaction[], month: string): Transaction[] {
  // 1. Transações com correspondência direta no mês ou itens fixos recorrentes
  const directTransactions = transactions
    .filter(t => {
      if (t.nature === 'fixed') {
        const startMonth = t.startDate || (t.date ? t.date.slice(0, 7) : '');
        const endMonth = t.endDate || null;
        if (!startMonth) return false;
        return month >= startMonth && (!endMonth || month < endMonth);
      }
      return t.date ? t.date.startsWith(month) : false;
    })
    .map(t => {
      if (t.nature === 'fixed') {
        const day = t.date ? t.date.slice(8, 10) : '01';
        const isPaidThisMonth = t.paidMonths
          ? t.paidMonths.includes(month)
          : (t.date && t.date.startsWith(month) ? !!t.isPaid : false);
        return {
          ...t,
          date: `${month}-${day || '01'}`,
          isPaid: isPaidThisMonth
        };
      }
      return t;
    });

  // 2. Mapear grupos de parcelamento existentes
  const installmentGroupsMap = new Map<string, Transaction[]>();
  transactions
    .filter(t => t.nature === 'installment' && t.installmentDetails)
    .forEach(t => {
      const gid = t.installmentDetails!.groupId || t.id;
      const list = installmentGroupsMap.get(gid) || [];
      list.push(t);
      installmentGroupsMap.set(gid, list);
    });

  // Identificar grupos que já possuem lançamento registrado para este mês
  const groupsWithDirectTx = new Set<string>();
  directTransactions.forEach(t => {
    if (t.nature === 'installment' && t.installmentDetails?.groupId) {
      groupsWithDirectTx.add(t.installmentDetails.groupId);
    }
  });

  const synthesizedInstallments: Transaction[] = [];

  installmentGroupsMap.forEach((txList, gid) => {
    if (groupsWithDirectTx.has(gid)) return;

    txList.sort((a, b) => (a.installmentDetails?.currentInstallment || 0) - (b.installmentDetails?.currentInstallment || 0));
    const first = txList[0];
    const details = first.installmentDetails!;

    const descMatch = first.description.match(/\((\d+)\/(\d+)\)/);
    const parsedCurFromDesc = descMatch ? parseInt(descMatch[1], 10) : undefined;
    const parsedTotalFromDesc = descMatch ? parseInt(descMatch[2], 10) : undefined;

    const initialInstallmentNumber = details.initialInstallmentNumber 
      || details.currentInstallment 
      || parsedCurFromDesc 
      || 1;

    const totalInstallments = details.totalInstallments 
      || parsedTotalFromDesc 
      || (initialInstallmentNumber + txList.length - 1);

    const startMonth = details.startMonth || first.date.slice(0, 7);
    const monthlyAmount = details.monthlyAmount || first.amount;

    // Calcular qual índice de parcela corresponde ao month
    const [curYear, curMonthNum] = month.split('-').map(Number);
    const [sYear, sMonthNum] = startMonth.split('-').map(Number);
    const deltaMonths = (curYear - sYear) * 12 + (curMonthNum - sMonthNum);
    const calculatedInstallment = initialInstallmentNumber + deltaMonths;

    // Se o mês está dentro do ciclo e ainda restam parcelas a pagar
    if (calculatedInstallment >= 1 && calculatedInstallment <= totalInstallments) {
      const priorPaid = Math.max(0, initialInstallmentNumber - 1);
      const inAppPaid = txList.filter(t => t.isPaid).length;
      const totalPaid = priorPaid + inAppPaid;

      if (calculatedInstallment > totalPaid) {
        const cleanDesc = first.description.replace(/\s\(\d+\/\d+\).*$/, '').trim() || (first.type === 'income' ? 'Receita Parcelada' : 'Compra Parcelada');
        const day = first.date ? first.date.slice(8, 10) : '01';

        synthesizedInstallments.push({
          ...first,
          id: `synth_${gid}_${month}`,
          date: `${month}-${day}`,
          amount: monthlyAmount,
          description: `${cleanDesc} (${calculatedInstallment}/${totalInstallments})`,
          isPaid: false,
          installmentDetails: {
            ...details,
            groupId: gid,
            currentInstallment: calculatedInstallment,
            totalInstallments,
            monthlyAmount,
            totalAmount: details.totalAmount || (totalInstallments * monthlyAmount)
          }
        });
      }
    }
  });

  return [...directTransactions, ...synthesizedInstallments];
}

/** Soma `delta` meses a um mês 'YYYY-MM'. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Lista os meses de `from` até `to`, inclusive. */
export function monthsBetween(from: string, to: string): string[] {
  const list: string[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard++ < 600) {
    list.push(cur);
    cur = shiftMonth(cur, 1);
  }
  return list;
}

/** Mês 'YYYY-MM' de hoje. */
export function currentMonthKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Primeiro mês com algum lançamento (ou o mês atual se não houver). */
export function firstActiveMonth(transactions: Transaction[]): string {
  let first = '';
  for (const t of transactions) {
    const m = t.nature === 'fixed' ? (t.startDate || t.date?.slice(0, 7)) : t.date?.slice(0, 7);
    if (m && (!first || m < first)) first = m;
  }
  return first || currentMonthKey();
}
