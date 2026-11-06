import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useExtras } from '../../context/ExtrasContext';
import { useToast } from '../../context/ToastContext';
import { ImportRow, markDuplicates, parseStatementFile } from '../../services/importExport';
import { PaymentMethod, Transaction } from '../../types/finance';
import { formatBRL } from '../../lib/format';
import { Field, ModalShell, inputClass } from '../common/ui';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 5000;
const MAX_LISTED = 200;

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string }[] = [
  { id: 'bank_transfer', label: 'Transferência / débito em conta' },
  { id: 'pix', label: 'PIX' },
  { id: 'debit_card', label: 'Cartão de débito' },
  { id: 'cash', label: 'Dinheiro' },
  { id: 'boleto', label: 'Boleto' }
];

/** Lê o arquivo como UTF-8 e, se houver caracteres inválidos, tenta Windows-1252 (comum em bancos). */
async function readTextFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  if (!utf8.includes('�')) return utf8;
  return new TextDecoder('windows-1252').decode(buffer);
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { transactions, importTransactions, expenseCategories, incomeCategories } = useFinance();
  const { accounts } = useExtras();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [accountId, setAccountId] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('bank_transfer');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [incomeCategory, setIncomeCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFileName('');
    setRows([]);
    setErrors([]);
    setSelected([]);
    setAccountId('');
    setPayment('bank_transfer');
    setExpenseCategory(expenseCategories.includes('Outros Gastos') ? 'Outros Gastos' : expenseCategories[0] || '');
    setIncomeCategory(incomeCategories.includes('Outras Receitas') ? 'Outras Receitas' : incomeCategories[0] || '');
  }, [isOpen, expenseCategories, incomeCategories]);

  const duplicates = useMemo(() => markDuplicates(rows, transactions), [rows, transactions]);

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      showToast('Arquivo muito grande (máximo de 5 MB).', { kind: 'error' });
      return;
    }
    setLoading(true);
    try {
      const text = await readTextFile(file);
      const result = parseStatementFile(file.name, text);
      const limited = result.rows.slice(0, MAX_ROWS);
      const errs = [...result.errors];
      if (result.rows.length > MAX_ROWS) errs.push(`O arquivo tem ${result.rows.length} linhas; importando só as primeiras ${MAX_ROWS}.`);
      setFileName(file.name);
      setRows(limited);
      setErrors(errs);
      const dups = markDuplicates(limited, transactions);
      setSelected(dups.map(d => !d));
    } catch {
      showToast('Não foi possível ler o arquivo.', { kind: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const chosen = rows.filter((_, i) => selected[i]);
  const dupCount = duplicates.filter(Boolean).length;
  const totals = chosen.reduce(
    (acc, r) => {
      if (r.type === 'income') acc.income += r.amount;
      else acc.expense += r.amount;
      return acc;
    },
    { income: 0, expense: 0 }
  );

  const submit = async () => {
    if (chosen.length === 0) return;
    setSaving(true);
    try {
      const items: Omit<Transaction, 'id' | 'userId'>[] = chosen.map(r => ({
        type: r.type,
        nature: 'daily',
        amount: r.amount,
        category: r.type === 'income' ? incomeCategory : expenseCategory,
        date: r.date,
        description: r.description.slice(0, 300),
        paymentMethod: payment,
        isPaid: true,
        accountId: accountId || '',
        tags: ['importado']
      }));
      const saved = await importTransactions(items);
      showToast(`${saved} lançamento(s) importado(s).`);
      onClose();
    } catch {
      showToast('A importação falhou. Nada foi duplicado se você tentar de novo com os mesmos itens desmarcados como "já existe".', { kind: 'error', duration: 8000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Importar extrato"
      description="Aceita arquivos OFX (internet banking) e CSV com colunas Data, Descrição e Valor."
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.ofx,.qfx,.txt,text/csv"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="btn-liquid-glass w-full rounded-2xl border border-dashed border-white/20 py-5 text-xs text-white flex flex-col items-center gap-1.5 cursor-pointer"
        >
          <FileUp className="w-5 h-5 text-[#A8B5D1]" />
          {loading ? 'Lendo arquivo...' : fileName ? `Arquivo: ${fileName} (clique para trocar)` : 'Escolher arquivo OFX ou CSV'}
        </button>

        {errors.length > 0 && (
          <div role="alert" className="rounded-xl border border-[#E5A97D]/30 bg-[#E5A97D]/10 p-3 text-[11px] text-[#E5A97D] space-y-0.5">
            {errors.slice(0, 4).map((e, i) => (
              <p key={i}>{e}</p>
            ))}
            {errors.length > 4 && <p>…e mais {errors.length - 4} aviso(s).</p>}
          </div>
        )}

        {rows.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Conta" htmlFor="imp-account">
                <select id="imp-account" className={inputClass} value={accountId} onChange={e => setAccountId(e.target.value)}>
                  <option value="">Sem conta vinculada</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Forma de pagamento" htmlFor="imp-payment">
                <select id="imp-payment" className={inputClass} value={payment} onChange={e => setPayment(e.target.value as PaymentMethod)}>
                  {PAYMENT_OPTIONS.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Categoria das despesas" htmlFor="imp-exp-cat">
                <select id="imp-exp-cat" className={inputClass} value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)}>
                  {expenseCategories.map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Categoria das receitas" htmlFor="imp-inc-cat">
                <select id="imp-inc-cat" className={inputClass} value={incomeCategory} onChange={e => setIncomeCategory(e.target.value)}>
                  {incomeCategories.map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#AEB6C4]">
              <span>
                {rows.length} linha(s) lida(s) • {dupCount} já existe(m)
              </span>
              <span className="flex gap-3">
                <button type="button" onClick={() => setSelected(duplicates.map(d => !d))} className="text-[#A8B5D1] hover:underline cursor-pointer">
                  Só novas
                </button>
                <button type="button" onClick={() => setSelected(rows.map(() => true))} className="text-[#A8B5D1] hover:underline cursor-pointer">
                  Todas
                </button>
                <button type="button" onClick={() => setSelected(rows.map(() => false))} className="text-[#A8B5D1] hover:underline cursor-pointer">
                  Nenhuma
                </button>
              </span>
            </div>

            <ul className="max-h-64 overflow-y-auto divide-y divide-white/6 rounded-2xl border border-white/8 bg-[#0F1218]">
              {rows.slice(0, MAX_LISTED).map((r, i) => (
                <li key={i} className="flex items-center gap-3 px-3 py-2 text-xs">
                  <input
                    type="checkbox"
                    checked={!!selected[i]}
                    onChange={e => setSelected(prev => prev.map((v, j) => (j === i ? e.target.checked : v)))}
                    aria-label={`Importar: ${r.description}`}
                    className="w-4 h-4 accent-[#A3C9A8] cursor-pointer"
                  />
                  <span className="w-20 shrink-0 font-mono text-[#9AA4B5]">{r.date.slice(8, 10) + '/' + r.date.slice(5, 7) + '/' + r.date.slice(2, 4)}</span>
                  <span className="flex-1 truncate text-white">
                    {r.description}
                    {duplicates[i] && <span className="ml-2 rounded-full bg-[#E5A97D]/15 px-1.5 py-0.5 text-[9px] text-[#E5A97D]">já existe</span>}
                  </span>
                  <span className={`font-mono font-semibold ${r.type === 'income' ? 'text-[#A3C9A8]' : 'text-[#E29578]'}`}>
                    {r.type === 'income' ? '+' : '-'}
                    {formatBRL(r.amount)}
                  </span>
                </li>
              ))}
            </ul>
            {rows.length > MAX_LISTED && <p className="text-[10px] text-[#9AA4B5]">Mostrando as primeiras {MAX_LISTED} linhas; a seleção "Todas/Só novas" vale para o arquivo inteiro.</p>}

            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-[#AEB6C4]">
                {chosen.length} selecionada(s): <span className="text-[#A3C9A8] font-mono">+{formatBRL(totals.income)}</span> /{' '}
                <span className="text-[#E29578] font-mono">-{formatBRL(totals.expense)}</span>
              </span>
              <button
                type="button"
                onClick={submit}
                disabled={saving || chosen.length === 0}
                className="btn-liquid-glass-primary rounded-2xl px-5 py-2.5 text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                {saving ? 'Importando...' : `Importar ${chosen.length}`}
              </button>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
};
