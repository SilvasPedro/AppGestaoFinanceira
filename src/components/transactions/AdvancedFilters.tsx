import React, { useState } from 'react';
import { Bookmark, BookmarkPlus, RotateCcw, X } from 'lucide-react';
import { Account } from '../../types/finance';
import { SavedFilter, TransactionFilter } from '../../services/filters';
import { inputClass, labelClass, parseAmountInput } from '../common/ui';

interface Props {
  filter: TransactionFilter;
  onChange: (next: TransactionFilter) => void;
  onReset: () => void;
  accounts: Account[];
  tagOptions: string[];
  saved: SavedFilter[];
  onSaveCurrent: (name: string) => void;
  onApplySaved: (s: SavedFilter) => void;
  onDeleteSaved: (id: string) => void;
}

const amountToText = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));

export const AdvancedFilters: React.FC<Props> = ({
  filter,
  onChange,
  onReset,
  accounts,
  tagOptions,
  saved,
  onSaveCurrent,
  onApplySaved,
  onDeleteSaved
}) => {
  const [name, setName] = useState('');
  const set = <K extends keyof TransactionFilter>(key: K, value: TransactionFilter[K]) => onChange({ ...filter, [key]: value });

  const setAmount = (key: 'minAmount' | 'maxAmount', raw: string) => {
    if (!raw.trim()) return set(key, null);
    const n = parseAmountInput(raw);
    set(key, isFinite(n) && n >= 0 ? n : null);
  };

  const toggleTag = (tag: string) =>
    set('tags', filter.tags.includes(tag) ? filter.tags.filter(t => t !== tag) : [...filter.tags, tag]);

  return (
    <section className="card-depth-3d p-4 rounded-2xl space-y-4" aria-label="Filtros avançados">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label htmlFor="f-min" className={labelClass}>
            Valor mínimo (R$)
          </label>
          <input id="f-min" className={inputClass} inputMode="decimal" defaultValue={amountToText(filter.minAmount)} key={`min-${filter.minAmount === null}`} onBlur={e => setAmount('minAmount', e.target.value)} placeholder="0,00" />
        </div>
        <div>
          <label htmlFor="f-max" className={labelClass}>
            Valor máximo (R$)
          </label>
          <input id="f-max" className={inputClass} inputMode="decimal" defaultValue={amountToText(filter.maxAmount)} key={`max-${filter.maxAmount === null}`} onBlur={e => setAmount('maxAmount', e.target.value)} placeholder="sem limite" />
        </div>
        <div>
          <label htmlFor="f-from" className={labelClass}>
            De
          </label>
          <input id="f-from" type="date" className={inputClass} value={filter.dateFrom} onChange={e => set('dateFrom', e.target.value)} />
        </div>
        <div>
          <label htmlFor="f-to" className={labelClass}>
            Até
          </label>
          <input id="f-to" type="date" className={inputClass} value={filter.dateTo} onChange={e => set('dateTo', e.target.value)} />
        </div>
        <div>
          <label htmlFor="f-account" className={labelClass}>
            Conta
          </label>
          <select id="f-account" className={inputClass} value={filter.accountId || ''} onChange={e => set('accountId', e.target.value || null)}>
            <option value="">Todas</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-paid" className={labelClass}>
            Situação
          </label>
          <select id="f-paid" className={inputClass} value={filter.paid} onChange={e => set('paid', e.target.value as TransactionFilter['paid'])}>
            <option value="all">Pagos e pendentes</option>
            <option value="paid">Só pagos/recebidos</option>
            <option value="pending">Só pendentes</option>
          </select>
        </div>
      </div>

      {(filter.dateFrom || filter.dateTo) && (
        <p className="text-[10px] text-[#E5A97D]">Com período personalizado, a lista deixa de seguir o mês selecionado no topo.</p>
      )}

      {tagOptions.length > 0 && (
        <fieldset>
          <legend className={labelClass}>Etiquetas (todas as marcadas)</legend>
          <div className="flex flex-wrap gap-1.5">
            {tagOptions.map(tag => {
              const on = filter.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] cursor-pointer ${on ? 'border-[#A8B5D1] bg-[#A8B5D1]/20 text-white' : 'border-white/10 text-[#AEB6C4] hover:text-white'}`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="border-t border-white/8 pt-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Bookmark className="w-3.5 h-3.5 text-[#9AA4B5]" />
          <span className="text-[11px] font-semibold text-[#AEB6C4]">Filtros salvos</span>
          {saved.length === 0 && <span className="text-[10px] text-[#9AA4B5]">nenhum ainda</span>}
          {saved.map(s => (
            <span key={s.id} className="inline-flex items-center rounded-full border border-white/10 bg-[#0F1218] text-[11px]">
              <button type="button" onClick={() => onApplySaved(s)} className="pl-2.5 pr-1.5 py-1 text-white hover:text-[#A8B5D1] cursor-pointer">
                {s.name}
              </button>
              <button type="button" aria-label={`Excluir filtro ${s.name}`} onClick={() => onDeleteSaved(s.id)} className="pr-2 py-1 text-[#9AA4B5] hover:text-[#E29578] cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        <form
          className="flex items-center gap-2"
          onSubmit={e => {
            e.preventDefault();
            const n = name.trim();
            if (!n) return;
            onSaveCurrent(n);
            setName('');
          }}
        >
          <label htmlFor="f-save-name" className="sr-only">
            Nome do filtro
          </label>
          <input id="f-save-name" className={`${inputClass} max-w-56`} value={name} onChange={e => setName(e.target.value)} placeholder="Nome para salvar este filtro" maxLength={40} />
          <button type="submit" disabled={!name.trim()} className="btn-liquid-glass rounded-xl px-3 py-2 text-[11px] font-semibold text-white flex items-center gap-1.5 disabled:opacity-40 cursor-pointer">
            <BookmarkPlus className="w-3.5 h-3.5" /> Salvar
          </button>
          <button type="button" onClick={onReset} className="ml-auto rounded-xl px-3 py-2 text-[11px] text-[#AEB6C4] hover:text-white flex items-center gap-1.5 cursor-pointer">
            <RotateCcw className="w-3.5 h-3.5" /> Limpar tudo
          </button>
        </form>
        <p className="text-[10px] text-[#9AA4B5]">Filtros salvos ficam neste aparelho e incluem busca, tipo, categoria, cartão e os campos acima.</p>
      </div>
    </section>
  );
};
