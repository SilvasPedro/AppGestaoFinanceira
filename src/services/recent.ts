import { Transaction } from '../types/finance';

/**
 * Últimos lançamentos na ordem em que foram registrados (createdAt, gravado no banco),
 * e não pela data do lançamento. Assim, uma compra no cartão feita hoje para a fatura
 * de dezembro aparece no topo, mesmo com data de dezembro.
 *
 * - Parcelas de uma mesma compra viram uma única linha (a primeira parcela cadastrada).
 * - Lançamentos antigos sem createdAt vão para o fim, ordenados pela data.
 */
export function latestEntered(transactions: Transaction[], limit = 5): Transaction[] {
  const seenGroups = new Set<string>();
  const real = transactions
    .filter(t => !t.id.startsWith('synth_'))
    .sort((a, b) => (a.installmentDetails?.currentInstallment ?? 0) - (b.installmentDetails?.currentInstallment ?? 0));

  const unique: Transaction[] = [];
  for (const t of real) {
    const group = t.nature === 'installment' ? t.installmentDetails?.groupId : undefined;
    if (group) {
      if (seenGroups.has(group)) continue;
      seenGroups.add(group);
    }
    unique.push(t);
  }

  return unique
    .sort((a, b) => {
      const ca = a.createdAt || '';
      const cb = b.createdAt || '';
      if (ca !== cb) return cb.localeCompare(ca);
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.id.localeCompare(a.id);
    })
    .slice(0, limit);
}

/** Data (dd/mm) em que o lançamento foi registrado, no fuso do usuário. */
export function enteredOnLabel(createdAt?: string): string | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return null;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
