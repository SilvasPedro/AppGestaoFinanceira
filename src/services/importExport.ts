import { Account, Transaction } from '../types/finance';

// ---------------------------------------------------------------------------
// Exportação
// ---------------------------------------------------------------------------

const PAYMENT_LABELS: Record<string, string> = {
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  pix: 'PIX',
  cash: 'Dinheiro',
  bank_transfer: 'Transferência',
  boleto: 'Boleto'
};

const NATURE_LABELS: Record<string, string> = {
  daily: 'Diário',
  fixed: 'Fixo',
  installment: 'Parcelado'
};

/** Evita que planilhas interpretem texto do usuário como fórmula (CSV injection). */
function safeCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvEscape(value: string, delimiter: string): string {
  const needsQuotes = value.includes(delimiter) || /["\n\r]/.test(value);
  return needsQuotes ? `"${value.replace(/"/g, '""')}"` : value;
}

export function formatDecimalBR(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

/** Gera CSV (separador ";" e vírgula decimal, como o Excel em português espera). */
export function transactionsToCSV(txs: Transaction[], accounts: Account[] = []): string {
  const delimiter = ';';
  const accountName = new Map(accounts.map(a => [a.id, a.name]));
  const header = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Forma de pagamento', 'Natureza', 'Pago', 'Cartão', 'Conta', 'Tags'];
  const lines = [header.join(delimiter)];

  const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
  for (const t of sorted) {
    const row = [
      t.date,
      t.type === 'income' ? 'Receita' : 'Despesa',
      safeCell(t.description || ''),
      safeCell(t.category || ''),
      formatDecimalBR(t.amount),
      PAYMENT_LABELS[t.paymentMethod] || t.paymentMethod,
      NATURE_LABELS[t.nature] || t.nature,
      t.isPaid === false ? 'Não' : 'Sim',
      safeCell(t.cardName ? `${t.cardName}${t.cardLastFour ? ` ****${t.cardLastFour}` : ''}` : ''),
      safeCell(t.accountId ? accountName.get(t.accountId) || '' : ''),
      safeCell((t.tags || []).join(', '))
    ];
    lines.push(row.map(c => csvEscape(c, delimiter)).join(delimiter));
  }
  return lines.join('\r\n');
}

// ---------------------------------------------------------------------------
// Importação
// ---------------------------------------------------------------------------

export interface ImportRow {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // sempre positivo
  type: 'income' | 'expense';
  externalId?: string;
}

export interface ParseResult {
  rows: ImportRow[];
  errors: string[];
}

/** Divide um texto CSV em linhas/colunas respeitando aspas. */
export function parseCSV(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] || '';
  const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0 };
  let inQ = false;
  for (const ch of firstLine) {
    if (ch === '"') inQ = !inQ;
    else if (!inQ && ch in counts) counts[ch]++;
  }
  const delimiter = (Object.keys(counts) as string[]).sort((a, b) => counts[b] - counts[a])[0];

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  inQ = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQ) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some(c => c.trim() !== '')) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some(c => c.trim() !== '')) rows.push(row);
  return rows;
}

/** Converte "1.234,56", "1,234.56", "-45,90", "R$ 12,00" ou "(12.00)" em número. */
export function parseMoney(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (/-/.test(s)) negative = true;
  s = s.replace(/[^\d.,]/g, '');
  if (!s) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    // o último separador é o decimal
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastComma >= 0) {
    s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastDot >= 0) {
    // "1.234" e "1.234.567" são milhares; "12.50" é decimal
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  if (!isFinite(n)) return null;
  return negative ? -n : n;
}

/** Aceita dd/mm/aaaa, dd-mm-aaaa, dd/mm/aa, aaaa-mm-dd e aaaammdd. Devolve YYYY-MM-DD ou null. */
export function parseDateFlexible(raw: string): string | null {
  const s = raw.trim();
  let y: number, m: number, d: number;
  let match = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    [y, m, d] = [+match[1], +match[2], +match[3]];
  } else if ((match = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/))) {
    [d, m, y] = [+match[1], +match[2], +match[3]];
    if (y < 100) y += 2000;
  } else if ((match = s.match(/^(\d{4})(\d{2})(\d{2})/))) {
    [y, m, d] = [+match[1], +match[2], +match[3]];
  } else {
    return null;
  }
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export interface CSVMapping {
  date: number;
  description: number;
  amount: number;
  type: number; // -1 quando não existe
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export function detectCSVMapping(header: string[]): CSVMapping | null {
  const h = header.map(norm);
  const find = (...keys: string[]) => h.findIndex(c => keys.some(k => c === k || c.includes(k)));
  const date = find('data', 'date');
  const description = find('descricao', 'historico', 'description', 'memo', 'lancamento', 'estabelecimento');
  const amount = find('valor', 'amount', 'quantia');
  const type = h.findIndex(c => c === 'tipo' || c === 'type');
  if (date < 0 || amount < 0) return null;
  return { date, description: description >= 0 ? description : -1, amount, type };
}

function typeFromLabel(label: string): 'income' | 'expense' | null {
  const l = norm(label);
  if (/^(receita|entrada|credito|income|c)$/.test(l)) return 'income';
  if (/^(despesa|saida|debito|expense|d)$/.test(l)) return 'expense';
  return null;
}

/** Lê um CSV de extrato. Linhas inválidas viram mensagens em `errors`. */
export function csvToImportRows(text: string, mappingOverride?: CSVMapping): ParseResult {
  const table = parseCSV(text);
  const errors: string[] = [];
  if (table.length < 2) return { rows: [], errors: ['O arquivo não tem linhas de dados.'] };

  const mapping = mappingOverride || detectCSVMapping(table[0]);
  if (!mapping) {
    return { rows: [], errors: ['Não encontrei as colunas de data e valor. O cabeçalho precisa ter "Data" e "Valor".'] };
  }

  const rows: ImportRow[] = [];
  for (let i = 1; i < table.length; i++) {
    const r = table[i];
    const date = parseDateFlexible(r[mapping.date] || '');
    const money = parseMoney(r[mapping.amount] || '');
    if (!date || money === null || money === 0) {
      errors.push(`Linha ${i + 1}: data ou valor inválido.`);
      continue;
    }
    let type: 'income' | 'expense' = money < 0 ? 'expense' : 'income';
    if (mapping.type >= 0) {
      const t = typeFromLabel(r[mapping.type] || '');
      if (t) type = t;
    }
    rows.push({
      date,
      description: (mapping.description >= 0 ? r[mapping.description] : '')?.trim() || 'Importado',
      amount: Math.abs(money),
      type
    });
  }
  return { rows, errors };
}

/** Lê um arquivo OFX (SGML ou XML) e devolve as transações do extrato. */
export function parseOFX(text: string): ParseResult {
  const errors: string[] = [];
  const rows: ImportRow[] = [];
  const blocks = text.match(/<STMTTRN>[\s\S]*?(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>|<\/CCSTMTRS>|$)/gi) || [];
  if (blocks.length === 0) return { rows, errors: ['Nenhuma transação encontrada no arquivo OFX.'] };

  const tag = (block: string, name: string) => {
    const m = block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, 'i'));
    return m ? m[1].trim() : '';
  };

  blocks.forEach((b, idx) => {
    const date = parseDateFlexible(tag(b, 'DTPOSTED').slice(0, 8));
    const amount = parseFloat(tag(b, 'TRNAMT').replace(',', '.'));
    if (!date || !isFinite(amount) || amount === 0) {
      errors.push(`Transação ${idx + 1}: data ou valor inválido.`);
      return;
    }
    const description = tag(b, 'MEMO') || tag(b, 'NAME') || 'Importado';
    rows.push({
      date,
      description,
      amount: Math.abs(amount),
      type: amount < 0 ? 'expense' : 'income',
      externalId: tag(b, 'FITID') || undefined
    });
  });
  return { rows, errors };
}

/** Escolhe o parser pelo conteúdo/extensão do arquivo. */
export function parseStatementFile(fileName: string, text: string): ParseResult {
  const isOFX = /\.(ofx|qfx)$/i.test(fileName) || /<OFX>/i.test(text.slice(0, 2000)) || /OFXHEADER/i.test(text.slice(0, 200));
  return isOFX ? parseOFX(text) : csvToImportRows(text);
}

const dupKey = (date: string, amount: number, description: string, type: string) =>
  `${date}|${type}|${Math.round(amount * 100)}|${norm(description)}`;

/** Marca as linhas que já existem nos lançamentos (mesma data, valor, tipo e descrição). */
export function markDuplicates(rows: ImportRow[], existing: Transaction[]): boolean[] {
  const seen = new Set(existing.map(t => dupKey(t.date, t.amount, t.description || '', t.type)));
  const inFile = new Set<string>();
  return rows.map(r => {
    const key = dupKey(r.date, r.amount, r.description, r.type);
    const isDup = seen.has(key) || inFile.has(key);
    inFile.add(key);
    return isDup;
  });
}

// ---------------------------------------------------------------------------
// Relatório imprimível (PDF via "Salvar como PDF" do navegador)
// ---------------------------------------------------------------------------

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface ReportTable {
  heading: string;
  columns: string[];
  rows: string[][];
  /** Índices de colunas alinhadas à direita (valores). */
  rightAligned?: number[];
}

export function buildPrintableReportHTML(title: string, subtitle: string, tables: ReportTable[]): string {
  const sections = tables
    .map(t => {
      const right = new Set(t.rightAligned || []);
      const head = t.columns
        .map((c, i) => `<th${right.has(i) ? ' class="r"' : ''}>${escapeHtml(c)}</th>`)
        .join('');
      const body = t.rows
        .map(r => `<tr>${r.map((c, i) => `<td${right.has(i) ? ' class="r"' : ''}>${escapeHtml(c)}</td>`).join('')}</tr>`)
        .join('');
      return `<h2>${escapeHtml(t.heading)}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    })
    .join('');

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:32px;font-size:12px}
  h1{font-size:20px;margin:0 0 2px} .sub{color:#555;margin-bottom:20px}
  h2{font-size:14px;margin:22px 0 6px;border-bottom:1px solid #ccc;padding-bottom:4px}
  table{width:100%;border-collapse:collapse} th,td{padding:5px 6px;border-bottom:1px solid #e5e5e5;text-align:left}
  th{background:#f3f3f3;font-weight:600} .r{text-align:right;font-variant-numeric:tabular-nums}
  @media print{body{margin:12mm} tr{page-break-inside:avoid}}
</style></head><body><h1>${escapeHtml(title)}</h1><div class="sub">${escapeHtml(subtitle)}</div>${sections}</body></html>`;
}

// ---------------------------------------------------------------------------
// Utilitários de navegador
// ---------------------------------------------------------------------------

export function downloadTextFile(fileName: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  // BOM para o Excel reconhecer UTF-8
  const blob = new Blob([mime.startsWith('text/csv') ? '﻿' + content : content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Abre o relatório em uma nova janela e dispara a impressão (o usuário escolhe "Salvar como PDF"). */
export function openPrintWindow(html: string): boolean {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}
