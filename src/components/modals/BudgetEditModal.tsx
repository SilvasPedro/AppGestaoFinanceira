import React, { useEffect, useState } from 'react';
import { Field, ModalShell, inputClass, parseAmountInput } from '../common/ui';
import { formatBRL } from '../../lib/format';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  /** 'YYYY-MM' do mês exibido no app. */
  month: string;
  monthLabel: string;
  defaultLimit: number | null;
  monthLimit: number | null;
  rollover: boolean;
  carry: number;
  onSave: (data: { limit: number; scope: 'default' | 'month'; rollover: boolean }) => Promise<void>;
  onRemoveMonthOverride?: () => Promise<void>;
}

const toText = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));

export const BudgetEditModal: React.FC<Props> = ({
  isOpen,
  onClose,
  category,
  monthLabel,
  defaultLimit,
  monthLimit,
  rollover: initialRollover,
  carry,
  onSave,
  onRemoveMonthOverride
}) => {
  const [scope, setScope] = useState<'default' | 'month'>('default');
  const [limit, setLimit] = useState('');
  const [rollover, setRollover] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const startScope = monthLimit !== null ? 'month' : 'default';
    setScope(startScope);
    setLimit(toText(startScope === 'month' ? monthLimit : defaultLimit));
    setRollover(initialRollover);
    setError('');
  }, [isOpen, category, defaultLimit, monthLimit, initialRollover]);

  const changeScope = (next: 'default' | 'month') => {
    setScope(next);
    const source = next === 'month' ? (monthLimit ?? defaultLimit) : defaultLimit;
    setLimit(toText(source));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseAmountInput(limit);
    if (!isFinite(value) || value <= 0) return setError('Informe um teto maior que zero.');
    setSaving(true);
    try {
      await onSave({ limit: Math.round(value * 100) / 100, scope, rollover });
      onClose();
    } catch {
      setError('Não foi possível salvar o teto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title={`Teto de ${category}`} description={`Mês exibido: ${monthLabel}`}>
      <form onSubmit={submit} className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-[11px] font-semibold text-[#AEB6C4] mb-1">Este valor vale para</legend>
          <label className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs cursor-pointer ${scope === 'default' ? 'border-white/30 bg-white/8 text-white' : 'border-white/10 text-[#AEB6C4]'}`}>
            <input type="radio" name="budget-scope" checked={scope === 'default'} onChange={() => changeScope('default')} className="accent-[#A8B5D1]" />
            Todos os meses (teto padrão)
          </label>
          <label className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs cursor-pointer ${scope === 'month' ? 'border-white/30 bg-white/8 text-white' : 'border-white/10 text-[#AEB6C4]'}`}>
            <input type="radio" name="budget-scope" checked={scope === 'month'} onChange={() => changeScope('month')} className="accent-[#A8B5D1]" />
            Somente em {monthLabel}
          </label>
        </fieldset>

        <Field label="Teto (R$)" htmlFor="budget-limit" hint={scope === 'month' && defaultLimit !== null ? `O teto padrão é ${formatBRL(defaultLimit)}.` : undefined}>
          <input id="budget-limit" className={inputClass} inputMode="decimal" value={limit} onChange={e => setLimit(e.target.value)} placeholder="0,00" />
        </Field>

        {scope === 'default' && (
          <label className="flex items-start gap-2.5 rounded-xl border border-white/10 p-3 text-xs text-[#D6DBE4] cursor-pointer">
            <input type="checkbox" checked={rollover} onChange={e => setRollover(e.target.checked)} className="mt-0.5 accent-[#A3C9A8]" />
            <span>
              <strong className="block text-white">Acumular a sobra para o mês seguinte</strong>
              <span className="text-[11px] text-[#9AA4B5]">
                O que não for gasto neste teto soma ao teto do próximo mês, a partir de {monthLabel}. Estouros não reduzem o mês seguinte.
                {carry > 0 && ` Já acumulado neste mês: ${formatBRL(carry)}.`}
              </span>
            </span>
          </label>
        )}

        {error && (
          <p role="alert" className="text-[11px] text-[#E29578]">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2">
          {monthLimit !== null && onRemoveMonthOverride && (
            <button
              type="button"
              onClick={async () => {
                setSaving(true);
                try {
                  await onRemoveMonthOverride();
                  onClose();
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className="btn-liquid-glass rounded-2xl px-4 py-3 text-xs font-semibold text-[#E29578] disabled:opacity-50 cursor-pointer"
            >
              Remover ajuste de {monthLabel}
            </button>
          )}
          <button type="submit" disabled={saving} className="btn-liquid-glass-primary flex-1 py-3 rounded-2xl text-xs font-bold disabled:opacity-50 cursor-pointer">
            {saving ? 'Salvando...' : 'Salvar teto'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};
