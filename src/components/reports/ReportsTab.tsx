import React, { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, BarChart3, FileDown, FileSpreadsheet, FileUp, Minus, Printer } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useExtras } from '../../context/ExtrasContext';
import { useToast } from '../../context/ToastContext';
import { ImportModal } from '../modals/ImportModal';
import { PageHeader, inputClass } from '../common/ui';
import { formatBRL } from '../../lib/format';
import { currentMonthKey, firstActiveMonth, shiftMonth } from '../../services/monthView';
import {
  availableYears,
  compareCategories,
  flattenMonths,
  MonthSummary,
  pctChange,
  summarizeMonth,
  summarizeRange,
  summarizeYear
} from '../../services/reports';
import {
  buildPrintableReportHTML,
  downloadTextFile,
  openPrintWindow,
  ReportTable,
  transactionsToCSV
} from '../../services/importExport';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const monthTitle = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const pctText = (p: number | null) => (p === null ? 'novo' : `${p > 0 ? '+' : ''}${p.toFixed(0)}%`);

/** Para despesas, subir é ruim; para receitas e saldo, subir é bom. */
const Delta: React.FC<{ prev: number; cur: number; goodWhenUp: boolean }> = ({ prev, cur, goodWhenUp }) => {
  const p = pctChange(prev, cur);
  if (p === 0 || (p !== null && Math.abs(p) < 0.5)) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-[#9AA4B5]">
        <Minus className="w-3 h-3" /> igual
      </span>
    );
  }
  const up = cur > prev;
  const good = up === goodWhenUp;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${good ? 'text-[#A3C9A8]' : 'text-[#E29578]'}`}>
      <Icon className="w-3 h-3" />
      {pctText(p)}
      <span className="sr-only">{good ? ' (melhor)' : ' (pior)'}</span>
    </span>
  );
};

export const ReportsTab: React.FC = () => {
  const { transactions, currentMonth } = useFinance();
  const { accounts } = useExtras();
  const { showToast } = useToast();

  const thisMonth = currentMonthKey();
  const [monthB, setMonthB] = useState(currentMonth);
  const [monthA, setMonthA] = useState(shiftMonth(currentMonth, -1));
  const years = useMemo(() => availableYears(transactions), [transactions]);
  const [year, setYear] = useState(years[0]);
  const [scope, setScope] = useState<'month' | 'year' | 'all'>('month');
  const [importOpen, setImportOpen] = useState(false);

  const a = useMemo(() => summarizeMonth(transactions, monthA), [transactions, monthA]);
  const b = useMemo(() => summarizeMonth(transactions, monthB), [transactions, monthB]);
  const categoryCmp = useMemo(() => compareCategories(a, b), [a, b]);
  const trend = useMemo(() => summarizeRange(transactions, shiftMonth(monthB, -11), monthB), [transactions, monthB]);
  const ys = useMemo(() => summarizeYear(transactions, year), [transactions, year]);

  const trendMax = Math.max(1, ...trend.map(m => Math.max(m.income, m.expenses)));
  const yearMax = Math.max(1, ...ys.months.map(m => Math.max(m.income, m.expenses)));
  const hasData = transactions.length > 0;

  // ------------------------------------------------------------- exportação
  const exportRange = (): { from: string; to: string; label: string; file: string } => {
    if (scope === 'year') return { from: `${year}-01`, to: `${year}-12`, label: `Ano ${year}`, file: `financas-${year}` };
    if (scope === 'all') {
      const from = firstActiveMonth(transactions);
      return { from, to: thisMonth, label: `Tudo até ${monthTitle(thisMonth)}`, file: 'financas-completo' };
    }
    return { from: monthB, to: monthB, label: monthTitle(monthB), file: `financas-${monthB}` };
  };

  const exportCSV = () => {
    const { from, to, file } = exportRange();
    const rows = flattenMonths(transactions, from, to);
    if (rows.length === 0) {
      showToast('Não há lançamentos neste período.', { kind: 'info' });
      return;
    }
    downloadTextFile(`${file}.csv`, transactionsToCSV(rows, accounts));
    showToast(`${rows.length} lançamento(s) exportado(s).`);
  };

  const exportPDF = () => {
    const { from, to, label } = exportRange();
    const rows = flattenMonths(transactions, from, to);
    if (rows.length === 0) {
      showToast('Não há lançamentos neste período.', { kind: 'info' });
      return;
    }
    const income = rows.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = rows.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const byCat: Record<string, number> = {};
    rows.filter(t => t.type === 'expense').forEach(t => (byCat[t.category] = (byCat[t.category] || 0) + t.amount));
    const tables: ReportTable[] = [
      {
        heading: 'Resumo',
        columns: ['Indicador', 'Valor'],
        rows: [
          ['Receitas', formatBRL(income)],
          ['Despesas', formatBRL(expenses)],
          ['Saldo', formatBRL(income - expenses)]
        ],
        rightAligned: [1]
      },
      {
        heading: 'Despesas por categoria',
        columns: ['Categoria', 'Total', '% das despesas'],
        rows: Object.entries(byCat)
          .sort((x, y) => y[1] - x[1])
          .map(([c, v]) => [c, formatBRL(v), expenses ? `${((v / expenses) * 100).toFixed(1)}%` : '-']),
        rightAligned: [1, 2]
      },
      {
        heading: `Lançamentos (${rows.length})`,
        columns: ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor'],
        rows: rows.slice(0, 1500).map(t => [
          `${t.date.slice(8, 10)}/${t.date.slice(5, 7)}/${t.date.slice(0, 4)}`,
          t.description,
          t.category,
          t.type === 'income' ? 'Receita' : 'Despesa',
          formatBRL(t.amount)
        ]),
        rightAligned: [4]
      }
    ];
    const html = buildPrintableReportHTML('Finances PRO — Relatório', label, tables);
    if (!openPrintWindow(html)) showToast('O navegador bloqueou a nova janela. Permita pop-ups para gerar o PDF.', { kind: 'error' });
  };

  const printYear = () => {
    const tables: ReportTable[] = [
      {
        heading: 'Resumo do ano',
        columns: ['Indicador', 'Valor'],
        rows: [
          ['Receitas', formatBRL(ys.totalIncome)],
          ['Despesas', formatBRL(ys.totalExpenses)],
          ['Saldo', formatBRL(ys.net)],
          ['Taxa de poupança', `${ys.savingsRate.toFixed(1)}%`],
          ['Despesa média mensal', formatBRL(ys.avgMonthlyExpense)],
          ['Melhor mês', ys.bestMonth ? `${monthTitle(ys.bestMonth.month)} (${formatBRL(ys.bestMonth.net)})` : '-'],
          ['Pior mês', ys.worstMonth ? `${monthTitle(ys.worstMonth.month)} (${formatBRL(ys.worstMonth.net)})` : '-']
        ],
        rightAligned: [1]
      },
      {
        heading: 'Mês a mês',
        columns: ['Mês', 'Receitas', 'Despesas', 'Saldo'],
        rows: ys.months.map(m => [monthTitle(m.month), formatBRL(m.income), formatBRL(m.expenses), formatBRL(m.net)]),
        rightAligned: [1, 2, 3]
      },
      {
        heading: 'Despesas por categoria',
        columns: ['Categoria', 'Total', '% do total'],
        rows: ys.categories.map(c => [c.category, formatBRL(c.total), `${c.share.toFixed(1)}%`]),
        rightAligned: [1, 2]
      }
    ];
    if (!openPrintWindow(buildPrintableReportHTML(`Finances PRO — Relatório anual ${year}`, `Ano ${year}`, tables))) {
      showToast('O navegador bloqueou a nova janela. Permita pop-ups para gerar o PDF.', { kind: 'error' });
    }
  };

  const Kpi: React.FC<{ label: string; prev: number; cur: number; goodWhenUp: boolean; tone?: string }> = ({ label, prev, cur, goodWhenUp, tone }) => (
    <div className="rounded-2xl border border-white/8 bg-[#0F1218] p-4">
      <div className="text-[10px] text-[#9AA4B5]">{label}</div>
      <div className={`text-lg font-bold font-mono ${tone || 'text-white'}`}>{formatBRL(cur)}</div>
      <div className="flex items-center justify-between text-[10px] text-[#9AA4B5]">
        <span>antes: {formatBRL(prev)}</span>
        <Delta prev={prev} cur={cur} goodWhenUp={goodWhenUp} />
      </div>
    </div>
  );

  const Bars: React.FC<{ months: MonthSummary[]; max: number; label: (m: MonthSummary) => string }> = ({ months, max, label }) => (
    <div className="flex items-end gap-1.5 h-36" role="img" aria-label="Gráfico de receitas e despesas por mês">
      {months.map(m => (
        <div key={m.month} className="flex-1 min-w-0 flex flex-col items-center gap-1">
          <div className="flex items-end gap-0.5 h-28 w-full justify-center">
            <div className="w-1/2 max-w-3 rounded-t bg-[#A3C9A8]" style={{ height: `${(m.income / max) * 100}%` }} title={`Receitas ${formatBRL(m.income)}`} />
            <div className="w-1/2 max-w-3 rounded-t bg-[#E29578]" style={{ height: `${(m.expenses / max) * 100}%` }} title={`Despesas ${formatBRL(m.expenses)}`} />
          </div>
          <span className="text-[9px] text-[#9AA4B5] truncate">{label(m)}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 pb-24 w-full">
      <PageHeader
        icon={<BarChart3 className="w-5 h-5 text-[#E9C46A]" />}
        title="Relatórios"
        subtitle="Compare períodos, veja o ano inteiro e leve seus dados para planilhas ou PDF."
        actions={
          <button type="button" onClick={() => setImportOpen(true)} className="btn-liquid-glass px-3.5 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer">
            <FileUp className="w-3.5 h-3.5" /> Importar extrato
          </button>
        }
      />

      {!hasData && <p className="text-xs text-[#9AA4B5]">Cadastre lançamentos para ver comparativos e relatórios.</p>}

      {/* ---------------------------------------------------------- Exportar */}
      <section className="card-depth-3d p-5 rounded-3xl space-y-3" aria-labelledby="export-title">
        <h3 id="export-title" className="text-sm font-semibold text-white flex items-center gap-2">
          <FileDown className="w-4 h-4 text-[#A8B5D1]" /> Exportar lançamentos
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="sm:w-64">
            <label htmlFor="export-scope" className="block text-[11px] font-semibold text-[#AEB6C4] mb-1">
              Período
            </label>
            <select id="export-scope" className={inputClass} value={scope} onChange={e => setScope(e.target.value as typeof scope)}>
              <option value="month">Mês: {monthTitle(monthB)}</option>
              <option value="year">Ano: {year}</option>
              <option value="all">Tudo até hoje</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={exportCSV} className="btn-liquid-glass px-3.5 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#A3C9A8]" /> CSV (Excel)
            </button>
            <button type="button" onClick={exportPDF} className="btn-liquid-glass px-3.5 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer">
              <Printer className="w-3.5 h-3.5 text-[#E29578]" /> PDF
            </button>
          </div>
        </div>
        <p className="text-[10px] text-[#9AA4B5]">
          O PDF abre uma página pronta para impressão: escolha "Salvar como PDF" na janela de impressão. Contas fixas e parcelas aparecem em cada mês em que valem.
        </p>
      </section>

      {/* -------------------------------------------------------- Comparativo */}
      <section className="card-depth-3d p-5 rounded-3xl space-y-4" aria-labelledby="compare-title">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <h3 id="compare-title" className="text-sm font-semibold text-white">
            Comparativo entre meses
          </h3>
          <div className="flex items-end gap-2">
            <div>
              <label htmlFor="cmp-a" className="block text-[10px] text-[#9AA4B5] mb-1">
                Mês base
              </label>
              <input id="cmp-a" type="month" className={inputClass} value={monthA} onChange={e => e.target.value && setMonthA(e.target.value)} />
            </div>
            <div>
              <label htmlFor="cmp-b" className="block text-[10px] text-[#9AA4B5] mb-1">
                Comparar com
              </label>
              <input id="cmp-b" type="month" className={inputClass} value={monthB} onChange={e => e.target.value && setMonthB(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Kpi label={`Receitas em ${monthTitle(monthB)}`} prev={a.income} cur={b.income} goodWhenUp tone="text-[#A3C9A8]" />
          <Kpi label={`Despesas em ${monthTitle(monthB)}`} prev={a.expenses} cur={b.expenses} goodWhenUp={false} tone="text-[#E29578]" />
          <Kpi label={`Saldo em ${monthTitle(monthB)}`} prev={a.net} cur={b.net} goodWhenUp tone={b.net < 0 ? 'text-[#E29578]' : 'text-white'} />
        </div>

        {categoryCmp.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-white/8 bg-[#0F1218]">
            <table className="w-full text-xs">
              <caption className="sr-only">Despesas por categoria nos dois meses</caption>
              <thead>
                <tr className="text-left text-[10px] text-[#9AA4B5]">
                  <th scope="col" className="px-3 py-2 font-medium">
                    Categoria
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium text-right">
                    {monthTitle(monthA)}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium text-right">
                    {monthTitle(monthB)}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium text-right">
                    Variação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {categoryCmp.map(c => (
                  <tr key={c.category}>
                    <th scope="row" className="px-3 py-2 text-left font-medium text-white">
                      {c.category}
                    </th>
                    <td className="px-3 py-2 text-right font-mono text-[#AEB6C4]">{formatBRL(c.previous)}</td>
                    <td className="px-3 py-2 text-right font-mono text-white">{formatBRL(c.current)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`font-mono ${c.diff > 0 ? 'text-[#E29578]' : c.diff < 0 ? 'text-[#A3C9A8]' : 'text-[#9AA4B5]'}`}>
                        {c.diff > 0 ? '+' : ''}
                        {formatBRL(c.diff)}
                      </span>
                      <span className="ml-2 text-[10px] text-[#9AA4B5]">{pctText(c.pct)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-white">Últimos 12 meses até {monthTitle(monthB)}</h4>
            <span className="flex items-center gap-3 text-[10px] text-[#9AA4B5]">
              <span className="flex items-center gap-1">
                <i className="w-2 h-2 rounded-sm bg-[#A3C9A8]" /> Receitas
              </span>
              <span className="flex items-center gap-1">
                <i className="w-2 h-2 rounded-sm bg-[#E29578]" /> Despesas
              </span>
            </span>
          </div>
          <Bars months={trend} max={trendMax} label={m => MONTH_NAMES[Number(m.month.slice(5)) - 1]} />
        </div>
      </section>

      {/* ------------------------------------------------------ Relatório anual */}
      <section className="card-depth-3d p-5 rounded-3xl space-y-4" aria-labelledby="year-title">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 id="year-title" className="text-sm font-semibold text-white">
            Relatório anual
          </h3>
          <div className="flex items-center gap-2">
            <label htmlFor="year-select" className="sr-only">
              Ano
            </label>
            <select id="year-select" className={`${inputClass} w-28`} value={year} onChange={e => setYear(Number(e.target.value))}>
              {years.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button type="button" onClick={printYear} className="btn-liquid-glass px-3 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer">
              <Printer className="w-3.5 h-3.5" /> PDF do ano
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-white/8 bg-[#0F1218] p-4">
            <div className="text-[10px] text-[#9AA4B5]">Receitas</div>
            <div className="text-base font-bold font-mono text-[#A3C9A8]">{formatBRL(ys.totalIncome)}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-[#0F1218] p-4">
            <div className="text-[10px] text-[#9AA4B5]">Despesas</div>
            <div className="text-base font-bold font-mono text-[#E29578]">{formatBRL(ys.totalExpenses)}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-[#0F1218] p-4">
            <div className="text-[10px] text-[#9AA4B5]">Saldo do ano</div>
            <div className={`text-base font-bold font-mono ${ys.net < 0 ? 'text-[#E29578]' : 'text-white'}`}>{formatBRL(ys.net)}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-[#0F1218] p-4">
            <div className="text-[10px] text-[#9AA4B5]">Taxa de poupança</div>
            <div className="text-base font-bold font-mono text-white">{ys.totalIncome > 0 ? `${ys.savingsRate.toFixed(1)}%` : '—'}</div>
          </div>
        </div>

        <Bars months={ys.months} max={yearMax} label={m => MONTH_NAMES[Number(m.month.slice(5)) - 1]} />

        {(ys.bestMonth || ys.worstMonth) && (
          <p className="text-[11px] text-[#AEB6C4]">
            {ys.bestMonth && (
              <>
                Melhor mês: <strong className="text-[#A3C9A8]">{monthTitle(ys.bestMonth.month)}</strong> ({formatBRL(ys.bestMonth.net)}).{' '}
              </>
            )}
            {ys.worstMonth && (
              <>
                Pior mês: <strong className="text-[#E29578]">{monthTitle(ys.worstMonth.month)}</strong> ({formatBRL(ys.worstMonth.net)}).{' '}
              </>
            )}
            Despesa média: <strong className="text-white">{formatBRL(ys.avgMonthlyExpense)}</strong> por mês com movimento.
          </p>
        )}

        {ys.categories.length > 0 && (
          <ul className="space-y-2" aria-label="Despesas por categoria no ano">
            {ys.categories.slice(0, 8).map(c => (
              <li key={c.category} className="text-xs">
                <div className="flex justify-between mb-1">
                  <span className="text-white">{c.category}</span>
                  <span className="text-[#AEB6C4] font-mono">
                    {formatBRL(c.total)} <span className="text-[#9AA4B5]">({c.share.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[#1C212C] overflow-hidden">
                  <div className="h-full rounded-full bg-[#A8B5D1]" style={{ width: `${c.share}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
};
