import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { 
  Search, 
  Trash2, 
  Pencil, 
  CheckCircle, 
  Clock, 
  Plus, 
  CreditCard as CreditCardIcon, 
  Filter, 
  X,
  Wifi,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  Layers,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Paperclip,
  FileDown,
  FileUp
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Transaction } from '../../types/finance';
import { DeleteConfirmModal } from '../modals/DeleteConfirmModal';
import { TransactionModal } from '../modals/TransactionModal';
import { BANK_DEFAULT_COLORS } from '../modals/CreditCardModal';
import { formatBRL } from '../../lib/format';
import { useExtras } from '../../context/ExtrasContext';
import { useToast } from '../../context/ToastContext';
import { AdvancedFilters } from './AdvancedFilters';
import { ImportModal } from '../modals/ImportModal';
import { AttachmentViewer } from '../modals/AttachmentViewer';
import {
  applyFilter,
  countActiveFilters,
  EMPTY_FILTER,
  hasCustomPeriod,
  loadSavedFilters,
  persistSavedFilters,
  SavedFilter,
  TransactionFilter
} from '../../services/filters';
import { currentMonthKey, firstActiveMonth } from '../../services/monthView';
import { flattenMonths } from '../../services/reports';
import { downloadTextFile, transactionsToCSV } from '../../services/importExport';

interface TransactionsTabProps {
  onOpenAddModal: () => void;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({ onOpenAddModal }) => {
  const { 
    monthTransactions, 
    deleteTransaction, 
    updateTransaction,
    discontinueRecurringTransaction,
    togglePaidStatus, 
    currentMonth,
    creditCards,
    cardInvoices,
    totalCreditCardInvoice,
    expenseCategories,
    incomeCategories,
    transactions
  } = useFinance();
  const { accounts } = useExtras();
  const { showToast } = useToast();

  // 1. Abas de Visualização: Todos vs Só Receitas vs Só Despesas
  const [viewMode, setViewMode] = useState<'all' | 'income' | 'expense'>('all');

  // 2. Filtro Rápido por Categoria (Chips)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // 3. Filtro por Miniatura de Cartão de Crédito
  const [selectedCardFilter, setSelectedCardFilter] = useState<string | null>(null);

  // 4. Busca textual
  const [searchQuery, setSearchQuery] = useState('');

  // Filtros avançados (valor, período, conta, etiquetas, situação) e filtros salvos
  const [advanced, setAdvanced] = useState<TransactionFilter>(EMPTY_FILTER);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(loadSavedFilters);
  const [importOpen, setImportOpen] = useState(false);
  const [attachmentTx, setAttachmentTx] = useState<Transaction | null>(null);

  // Modais de exclusão e edição
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);

  // 5. Scroll Horizontal e Navegação Magnética dos Cartões de Crédito (Diretriz 2)
  const cardsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = cardsScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const hasOverflow = scrollWidth > clientWidth + 4;
    setCanScrollLeft(hasOverflow && scrollLeft > 8);
    setCanScrollRight(hasOverflow && scrollLeft + clientWidth < scrollWidth - 8);
  }, []);

  useEffect(() => {
    const timer = setTimeout(updateScrollButtons, 60);
    const el = cardsScrollRef.current;
    if (!el) return () => clearTimeout(timer);

    const handleResize = () => updateScrollButtons();
    window.addEventListener('resize', handleResize);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updateScrollButtons());
      ro.observe(el);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      ro?.disconnect();
    };
  }, [creditCards, cardInvoices, updateScrollButtons]);

  const scrollCards = (direction: 'left' | 'right') => {
    const el = cardsScrollRef.current;
    if (!el) return;
    const scrollAmount = 304;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
    setTimeout(updateScrollButtons, 360);
  };


  // Lista unificada e ordenada de categorias do sistema
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    expenseCategories.forEach(c => set.add(c));
    incomeCategories.forEach(c => set.add(c));
    monthTransactions.forEach(t => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [expenseCategories, incomeCategories, monthTransactions]);

  // Todos os critérios juntos, no formato usado pelos filtros salvos
  const combinedFilter = useMemo<TransactionFilter>(
    () => ({
      ...advanced,
      text: searchQuery,
      type: viewMode,
      categories: selectedCategory ? [selectedCategory] : [],
      cardId: selectedCardFilter
    }),
    [advanced, searchQuery, viewMode, selectedCategory, selectedCardFilter]
  );

  const customPeriod = hasCustomPeriod(advanced);

  // Fonte dos lançamentos: o mês selecionado ou, com período personalizado, todos os meses do intervalo
  const sourceList = useMemo(() => {
    if (!customPeriod) return monthTransactions;
    const from = advanced.dateFrom ? advanced.dateFrom.slice(0, 7) : firstActiveMonth(transactions);
    const to = advanced.dateTo ? advanced.dateTo.slice(0, 7) : currentMonthKey();
    if (from > to) return [];
    return flattenMonths(transactions, from, to).reverse();
  }, [customPeriod, advanced.dateFrom, advanced.dateTo, monthTransactions, transactions]);

  const filteredList = useMemo(() => applyFilter(sourceList, combinedFilter), [sourceList, combinedFilter]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => (t.tags || []).forEach(tag => set.add(tag)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const activeFilterCount = countActiveFilters(combinedFilter);

  const resetFilters = () => {
    setAdvanced(EMPTY_FILTER);
    setSearchQuery('');
    setViewMode('all');
    setSelectedCategory(null);
    setSelectedCardFilter(null);
  };

  const applySaved = (f: SavedFilter) => {
    const { text, type, categories, cardId, ...rest } = f.filter;
    setAdvanced({ ...EMPTY_FILTER, ...rest });
    setSearchQuery(text);
    setViewMode(type);
    setSelectedCategory(categories[0] || null);
    setSelectedCardFilter(cardId && creditCards.some(c => c.id === cardId) ? cardId : null);
    showToast(`Filtro "${f.name}" aplicado.`, { kind: 'info' });
  };

  const saveCurrentFilter = (name: string) => {
    const next = [...savedFilters.filter(f => f.name.toLowerCase() !== name.toLowerCase()), { id: `flt_${Date.now()}`, name, filter: combinedFilter }];
    setSavedFilters(next);
    persistSavedFilters(next);
    showToast(`Filtro "${name}" salvo neste aparelho.`);
  };

  const deleteSavedFilter = (id: string) => {
    const next = savedFilters.filter(f => f.id !== id);
    setSavedFilters(next);
    persistSavedFilters(next);
  };

  const exportList = () => {
    if (filteredList.length === 0) return;
    downloadTextFile(`lancamentos-${customPeriod ? 'periodo' : currentMonth}.csv`, transactionsToCSV(filteredList, accounts));
    showToast(`${filteredList.length} lançamento(s) exportado(s).`);
  };

  const activeFilteredCard = selectedCardFilter 
    ? creditCards.find(c => c.id === selectedCardFilter)
    : null;

  const activeCardSummary = selectedCardFilter && cardInvoices[selectedCardFilter]
    ? cardInvoices[selectedCardFilter]
    : null;

  return (
    <div className="space-y-5 pb-24 w-full">
      {/* ======================================================================== */}
      {/* 1. MÓDULO DE FATURAS COM MINIATURAS 3D DE CARTÃO DE CRÉDITO (Diretriz 3) */}
      {/* ======================================================================== */}
      {(creditCards.length > 0 || totalCreditCardInvoice > 0) && (
        <div className="card-depth-3d p-5 rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#A8B5D1]/15 text-[#A8B5D1] flex items-center justify-center">
                <CreditCardIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">Faturas de Cartões de Crédito</span>
                <span className="text-[11px] text-[#9AA4B5]">
                  Consolidado do mês: <strong className="text-white font-mono">{formatBRL(totalCreditCardInvoice)}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {selectedCardFilter && (
                <button
                  type="button"
                  onClick={() => setSelectedCardFilter(null)}
                  className="btn-liquid-glass px-3 py-1 rounded-xl text-xs text-[#A8B5D1] hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpar filtro de cartão</span>
                </button>
              )}

              {/* Setas de Navegação Dinâmicas Desktop no Header (Diretriz 2) */}
              <div className="hidden md:flex items-center gap-1.5">
                {canScrollLeft && (
                  <button
                    type="button"
                    onClick={() => scrollCards('left')}
                    aria-label="Ver cartões anteriores"
                    title="Cartões anteriores"
                    className="btn-liquid-glass p-1.5 rounded-xl text-white hover:text-[#A8B5D1] hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                  </button>
                )}
                {canScrollRight && (
                  <button
                    type="button"
                    onClick={() => scrollCards('right')}
                    aria-label="Ver próximos cartões"
                    title="Próximos cartões"
                    className="btn-liquid-glass p-1.5 rounded-xl text-white hover:text-[#A8B5D1] hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
                  >
                    <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Carrossel de Miniaturas 3D de Cartões de Crédito (Diretriz 2 & 3) */}
          <div className="relative group/cards">
            {/* Seta Flutuante Esquerda (Desktop - Dinâmica) */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollCards('left')}
                aria-label="Rolar para cartões anteriores"
                title="Cartões anteriores"
                className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 items-center justify-center rounded-full btn-liquid-glass text-white shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer backdrop-blur-md border border-white/20"
                style={{
                  boxShadow: '0 8px 24px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.35)'
                }}
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
              </button>
            )}

            {/* Seta Flutuante Direita (Desktop - Dinâmica) */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollCards('right')}
                aria-label="Rolar para próximos cartões"
                title="Próximos cartões"
                className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 items-center justify-center rounded-full btn-liquid-glass text-white shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer backdrop-blur-md border border-white/20"
                style={{
                  boxShadow: '0 8px 24px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.35)'
                }}
              >
                <ChevronRight className="w-5 h-5 stroke-[2.5]" />
              </button>
            )}

            <div 
              ref={cardsScrollRef}
              onScroll={updateScrollButtons}
              className="flex items-stretch gap-3.5 overflow-x-auto no-scrollbar scrollbar-hide py-2 px-1 snap-x snap-mandatory scroll-smooth scroll-px-1 touch-pan-x"
              style={{
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {/* Miniatura 0: Todos os Cartões (Visão Consolidada) */}
              <div
                onClick={() => setSelectedCardFilter(null)}
                className={`w-64 sm:w-72 h-40 shrink-0 snap-start rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all duration-300 cursor-pointer ${
                  selectedCardFilter === null
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F1218] scale-[1.02] shadow-2xl'
                    : 'opacity-75 hover:opacity-100 hover:-translate-y-1'
                }`}
                style={{
                  background: 'linear-gradient(135deg, #232A36 0%, #131720 100%)',
                  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                }}
              >
                {/* Brilho radial plástico */}
                <div className="absolute inset-0 bg-radial from-white/10 to-transparent opacity-50 pointer-events-none" />

                {/* Top Row: Nome + Status */}
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <span className="text-[10px] text-[#9AA4B5] uppercase tracking-wider block font-semibold">
                      Visão Consolidada
                    </span>
                    <h4 className="text-sm font-bold text-white tracking-tight">
                      Todas as Faturas
                    </h4>
                  </div>
                  {selectedCardFilter === null && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-white text-black shadow-xs">
                      <Check className="w-2.5 h-2.5 stroke-[3]" /> Ativo
                    </span>
                  )}
                </div>

                {/* Middle Row: Digits */}
                <div className="text-[11px] font-mono tracking-widest text-[#8E98A9] relative z-10">
                  •••• •••• •••• TODAS
                </div>

                {/* Bottom Row: Valor consolidado */}
                <div className="flex items-end justify-between relative z-10">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-[#9AA4B5] block font-semibold">
                      Total Faturas
                    </span>
                    <span className="text-base font-bold font-mono text-white">
                      {formatBRL(totalCreditCardInvoice)}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#8E98A9]">
                    {creditCards.length} {creditCards.length === 1 ? 'cartão' : 'cartões'}
                  </span>
                </div>
              </div>

              {/* Miniaturas dos Cartões Individuais */}
              {creditCards.map(card => {
                const summary = cardInvoices[card.id];
                const isSelected = selectedCardFilter === card.id;
                const totalAmount = summary ? summary.total : 0;
                const baseColor = card.color || (card.bankName && BANK_DEFAULT_COLORS[card.bankName]) || '#3B82F6';
                const cardLogo = card.logoUrl || card.bankLogo;

                return (
                  <div
                    key={card.id}
                    onClick={() => setSelectedCardFilter(isSelected ? null : card.id)}
                    className={`w-64 sm:w-72 h-40 shrink-0 snap-start rounded-2xl p-4.5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F1218] scale-[1.02] shadow-2xl'
                        : 'opacity-85 hover:opacity-100 hover:-translate-y-1'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${baseColor} 0%, #10141B 95%)`,
                      boxShadow: isSelected
                        ? `0 12px 28px -4px ${baseColor}40, 0 4px 12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255, 255, 255, 0.4)`
                        : '0 6px 18px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                    }}
                  >
                    {/* Gloss Reflection Overlay */}
                    <div 
                      className="absolute inset-0 pointer-events-none opacity-40"
                      style={{
                        background: 'radial-gradient(ellipse at 85% 0%, rgba(255,255,255,0.4) 0%, transparent 65%)'
                      }}
                    />

                    {/* Top Row: Chip Metálico + Wifi + Nome do Banco + Logo */}
                    <div className="flex items-start justify-between relative z-10 gap-2">
                      <div className="flex items-center gap-2">
                        {/* Sim Chip Dourado */}
                        <div className="w-8 h-6 rounded-md bg-linear-to-tr from-amber-400 via-amber-200 to-amber-500 border border-amber-600/50 p-0.5 shadow-sm relative overflow-hidden shrink-0">
                          <div className="w-full h-full border border-amber-800/30 rounded-xs flex flex-col justify-around">
                            <div className="h-[1px] bg-amber-800/40 w-full" />
                            <div className="h-[1px] bg-amber-800/40 w-full" />
                          </div>
                        </div>
                        <Wifi className="w-3.5 h-3.5 text-white/70 rotate-90 shrink-0" />
                        {card.bankName && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/95 px-2 py-0.5 rounded-md bg-black/45 backdrop-blur-xs border border-white/15 truncate max-w-[95px] sm:max-w-[110px]">
                            {card.bankName}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        {cardLogo ? (
                          <div className="h-6 max-w-[70px] flex items-center justify-end">
                            <img
                              src={cardLogo}
                              alt={card.bankName || card.cardName}
                              className="max-h-6 max-w-[70px] object-contain drop-shadow"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <span className="text-xs font-extrabold text-white tracking-tight uppercase block drop-shadow-xs">
                            {card.cardName}
                          </span>
                        )}
                        {cardLogo && (
                          <span className="text-[10px] font-semibold text-white/90 tracking-tight uppercase block drop-shadow-xs">
                            {card.cardName}
                          </span>
                        )}
                        {isSelected && (
                          <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold px-1.5 py-0.2 rounded-full bg-white text-black shadow-xs">
                            <Check className="w-2.5 h-2.5 stroke-[3]" /> Filtrado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Digits */}
                    <div className="text-xs font-mono tracking-widest text-white/85 relative z-10 drop-shadow-xs">
                      •••• •••• •••• {card.lastFourDigits}
                    </div>

                    {/* Bottom Row: Fatura & Vencimento */}
                    <div className="flex items-end justify-between relative z-10">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-white/70 block font-semibold">
                          Fatura Atual
                        </span>
                        <span className="text-base font-bold font-mono text-white drop-shadow-xs">
                          {formatBRL(totalAmount)}
                        </span>
                      </div>

                      <div className="text-right text-[10px] text-white/80">
                        <span>Vence dia <strong>{card.dueDay || '—'}</strong></span>
                        {card.limitAmount && card.limitAmount > 0 && (
                          <span className="block text-[9px] text-white/60">
                            Lim: {formatBRL(card.limitAmount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================== */}
      {/* 2. BARRA DE BUSCA & BOTÃO NOVO LANÇAMENTO                                */}
      {/* ======================================================================== */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#9AA4B5] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por descrição, categoria, valor ou cartão..."
            className="w-full pl-9 pr-3 py-2.5 bg-[#151A23] border border-[#283040] rounded-2xl text-xs text-white placeholder-[#8F8F8F] focus:outline-hidden focus:border-white transition"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          aria-expanded={showAdvanced}
          aria-label="Filtros avançados"
          className={`btn-liquid-glass relative px-3 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer ${showAdvanced ? 'text-white' : 'text-[#AEB6C4]'}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filtros</span>
          {activeFilterCount > 0 && (
            <span className="min-w-4 h-4 px-1 rounded-full bg-[#A8B5D1] text-[9px] font-bold text-black flex items-center justify-center">{activeFilterCount}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          aria-label="Importar extrato"
          title="Importar extrato (OFX ou CSV)"
          className="btn-liquid-glass px-3 py-2.5 rounded-2xl text-xs font-semibold text-[#AEB6C4] hover:text-white flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <FileUp className="w-4 h-4" />
          <span className="hidden lg:inline">Importar</span>
        </button>
        <button
          onClick={onOpenAddModal}
          className="btn-liquid-glass-primary px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shrink-0 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Novo Lançamento</span>
        </button>
      </div>

      {showAdvanced && (
        <AdvancedFilters
          filter={advanced}
          onChange={setAdvanced}
          onReset={resetFilters}
          accounts={accounts}
          tagOptions={tagOptions}
          saved={savedFilters}
          onSaveCurrent={saveCurrentFilter}
          onApplySaved={applySaved}
          onDeleteSaved={deleteSavedFilter}
        />
      )}

      {/* ======================================================================== */}
      {/* 3. FILTROS RÁPIDOS POR CATEGORIA (Chips Roláveis - Diretriz 2)           */}
      {/* ======================================================================== */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          type="button"
          onClick={() => setSelectedCategory(null)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedCategory === null
              ? 'bg-white text-black shadow-sm font-bold'
              : 'btn-liquid-glass text-[#AEB6C4] hover:text-white'
          }`}
        >
          Todas as categorias
        </button>

        {availableCategories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(isSelected ? null : cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#A8B5D1] text-black shadow-sm font-bold'
                  : 'btn-liquid-glass text-[#AEB6C4] hover:text-white'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* ======================================================================== */}
      {/* 4. ABAS DE VISUALIZAÇÃO: Todos vs Só Receitas vs Só Despesas (Diretriz 2)*/}
      {/* ======================================================================== */}
      <div className="card-depth-3d p-1 rounded-2xl flex items-center gap-1 overflow-hidden">
        <button
          type="button"
          onClick={() => setViewMode('all')}
          className={`flex-1 py-2 px-3 rounded-l-xl rounded-r-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            viewMode === 'all'
              ? 'btn-liquid-glass text-white shadow-sm'
              : 'text-[#8E98A9] hover:text-white'
          }`}
        >
          <span>Todos os lançamentos</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#202733] text-[#AEB6C4] font-mono">
            {monthTransactions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('income')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            viewMode === 'income'
              ? 'btn-liquid-glass text-[#A3C9A8] shadow-sm'
              : 'text-[#8E98A9] hover:text-white'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-[#A3C9A8]" />
          <span>Só receitas</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#202733] text-[#A3C9A8] font-mono">
            {monthTransactions.filter(t => t.type === 'income').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('expense')}
          className={`flex-1 py-2 px-3 rounded-r-xl rounded-l-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            viewMode === 'expense'
              ? 'btn-liquid-glass text-[#E29578] shadow-sm'
              : 'text-[#8E98A9] hover:text-white'
          }`}
        >
          <ArrowDownRight className="w-3.5 h-3.5 text-[#E29578]" />
          <span>Só despesas</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#202733] text-[#E29578] font-mono">
            {monthTransactions.filter(t => t.type === 'expense').length}
          </span>
        </button>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-[#9AA4B5] px-1">
        <span>
          {filteredList.length} lançamento(s) exibido(s)
          {customPeriod && <span className="text-[#E5A97D]"> · período personalizado</span>}
        </span>
        <span className="flex items-center gap-3">
          <button
            type="button"
            onClick={exportList}
            disabled={filteredList.length === 0}
            className="flex items-center gap-1 text-[#A8B5D1] hover:text-white disabled:opacity-40 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" /> CSV
          </button>
          <span className="font-mono">
            Total: {formatBRL(filteredList.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0))}
          </span>
        </span>
      </div>

      {/* ======================================================================== */}
      {/* 5. LISTA DE LANÇAMENTOS COM CARDS 3D E BOTÕES LIQUID GLASS              */}
      {/* ======================================================================== */}
      <div className="space-y-2.5">
        {filteredList.length === 0 ? (
          <div className="card-depth-3d p-12 text-center rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1F2531] mx-auto flex items-center justify-center text-[#9AA4B5]">
              <Filter className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Nenhum lançamento encontrado</p>
              <p className="text-xs text-[#9AA4B5] mt-1 max-w-sm mx-auto">
                {selectedCardFilter 
                  ? 'Nenhum gasto ou parcela vinculado a este cartão de crédito no filtro atual.'
                  : selectedCategory
                  ? `Nenhum lançamento encontrado para a categoria "${selectedCategory}".`
                  : 'Nenhum lançamento corresponde aos filtros ou ao mês selecionado. Adicione sua primeira despesa ou receita!'}
              </p>
            </div>
            <button
              onClick={onOpenAddModal}
              className="btn-liquid-glass-primary mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Lançamento</span>
            </button>
          </div>
        ) : (
          filteredList.map((tx) => {
            const isIncome = tx.type === 'income';
            const isFixed = tx.nature === 'fixed';
            const isInstallment = tx.nature === 'installment';

            return (
              <div
                key={`${tx.id}_${tx.date}`}
                className="card-depth-3d-interactive p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
              >
                {/* Lado esquerdo: Detalhes do lançamento */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      isIncome
                        ? 'bg-[#A3C9A8]/15 text-[#A3C9A8] border border-[#A3C9A8]/30'
                        : 'bg-[#E29578]/15 text-[#E29578] border border-[#E29578]/30'
                    }`}
                  >
                    {isIncome ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>

                  {/* Informações centrais */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-white">
                        {tx.description}
                      </span>

                      {/* Nature Pill */}
                      {isFixed && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1F2531] text-[#A8B5D1] border border-[#2D3544]">
                          Recorrente Mensal
                        </span>
                      )}

                      {isInstallment && tx.installmentDetails && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isIncome
                            ? 'bg-[#A3C9A8]/15 text-[#A3C9A8] border border-[#A3C9A8]/30'
                            : 'bg-[#E29578]/15 text-[#E29578] border border-[#E29578]/30'
                        }`}>
                          {isIncome ? 'Venda' : 'Parcela'} {tx.installmentDetails.currentInstallment} de {tx.installmentDetails.totalInstallments}
                        </span>
                      )}

                      {tx.hasAttachment && (
                        <button
                          type="button"
                          onClick={() => setAttachmentTx(tx)}
                          aria-label={`Ver comprovante de ${tx.description}`}
                          title="Ver comprovante"
                          className="text-[#A8B5D1] hover:text-white cursor-pointer"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {(tx.tags || []).map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setAdvanced(a => (a.tags.includes(tag) ? a : { ...a, tags: [...a.tags, tag] }))}
                          title="Filtrar por esta etiqueta"
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1F2531] text-[#AEB6C4] border border-[#2D3544] hover:text-white cursor-pointer"
                        >
                          #{tag}
                        </button>
                      ))}

                      {/* Cartão de Crédito Badge */}
                      {tx.paymentMethod === 'credit_card' && (tx.cardName || tx.cardLastFour) && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#A8B5D1]/15 text-[#A8B5D1] border border-[#A8B5D1]/30 flex items-center gap-1 font-mono">
                          <CreditCardIcon className="w-2.5 h-2.5" />
                          <span>{tx.cardName || 'Cartão'} •••• {tx.cardLastFour || ''}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#9AA4B5]">
                      <span className="text-[#AEB6C4] font-medium">{tx.category}</span>
                      <span>•</span>
                      <span>{tx.date.slice(8, 10)}/{tx.date.slice(5, 7)}/{tx.date.slice(0, 4)}</span>
                      <span>•</span>
                      <span>
                        {tx.paymentMethod === 'credit_card' ? 'Cartão de Crédito' :
                         tx.paymentMethod === 'debit_card' ? 'Débito' :
                         tx.paymentMethod === 'pix' ? 'PIX' :
                         tx.paymentMethod === 'cash' ? 'Dinheiro' :
                         tx.paymentMethod === 'bank_transfer' ? 'Transferência' : 'Boleto'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lado direito: Valor e Ações */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-[#1E2430] sm:border-0">
                  {/* Status Pago / Pendente */}
                  {(isFixed || isInstallment) && (
                    <button
                      onClick={() => {
                        if (isFixed && tx.date.slice(0, 7) !== currentMonth) {
                          showToast('Para marcar uma conta fixa como paga, navegue até o mês dela no topo da tela.', { kind: 'info' });
                          return;
                        }
                        togglePaidStatus(tx.id, !!tx.isPaid);
                      }}
                      title={`Clique para alternar ${isIncome ? 'Recebido / A Receber' : 'Pago / Pendente'}`}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                        tx.isPaid
                          ? 'bg-[#A3C9A8]/15 text-[#A3C9A8] hover:bg-[#A3C9A8]/25 border border-[#A3C9A8]/30'
                          : 'bg-[#E29578]/15 text-[#E29578] hover:bg-[#E29578]/25 border border-[#E29578]/30'
                      }`}
                    >
                      {tx.isPaid ? (
                        <>
                          <CheckCircle className="w-3 h-3" /> {isIncome ? 'Recebido' : 'Pago'}
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" /> {isIncome ? 'A Receber' : 'Pendente'}
                        </>
                      )}
                    </button>
                  )}

                  {/* Valor */}
                  <div className="text-right">
                    <span
                      className={`text-sm font-bold font-mono ${
                        isIncome ? 'text-[#A3C9A8]' : 'text-white'
                      }`}
                    >
                      {isIncome ? '+' : '-'} {formatBRL(tx.amount)}
                    </span>
                  </div>

                  {/* Botão de Editar */}
                  <button
                    onClick={() => setTxToEdit(tx)}
                    title="Editar informações do lançamento"
                    className="btn-liquid-glass p-1.5 rounded-lg text-[#AEB6C4] hover:text-[#A8B5D1] cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {/* Botão de Excluir com Confirmação */}
                  <button
                    onClick={() => setTxToDelete(tx)}
                    title="Excluir lançamento"
                    className="btn-liquid-glass p-1.5 rounded-lg text-[#E29578] hover:text-[#E29578] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <DeleteConfirmModal
        isOpen={!!txToDelete}
        onClose={() => setTxToDelete(null)}
        onConfirm={async () => {
          if (txToDelete) {
            await deleteTransaction(txToDelete.id);
            setTxToDelete(null);
          }
        }}
        onDiscontinueFromMonth={
          txToDelete?.nature === 'fixed'
            ? async () => {
                if (txToDelete) {
                  await discontinueRecurringTransaction(txToDelete.id, currentMonth);
                  setTxToDelete(null);
                }
              }
            : undefined
        }
        title={txToDelete?.nature === 'fixed' ? 'Gerenciar Recorrência Fixa' : 'Excluir Lançamento'}
        message={
          txToDelete?.nature === 'fixed'
            ? 'Este lançamento é uma conta ou receita recorrente. Você pode descontinuá-lo a partir deste mês (mantendo os meses passados intactos no seu histórico) ou excluir todo o registro permanentemente.'
            : 'Tem certeza que deseja remover este lançamento? O valor será excluído do seu histórico e os saldos serão recalculados automaticamente.'
        }
        discontinueLabel={`Descontinuar a partir deste mês (${currentMonth})`}
        itemDetail={txToDelete ? `${txToDelete.description} • ${formatBRL(txToDelete.amount)} (${txToDelete.category})` : undefined}
        confirmLabel="Sim, Excluir Registro"
      />

      {/* Modal de Edição de Lançamento */}
      <TransactionModal
        isOpen={!!txToEdit}
        onClose={() => setTxToEdit(null)}
        transactionToEdit={txToEdit}
        onUpdate={async (id, data, extras) => {
          await updateTransaction(id, data, extras);
          setTxToEdit(null);
        }}
        onSave={async () => {}}
        defaultMonth={currentMonth}
      />

      <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
      <AttachmentViewer transactionId={attachmentTx?.id || null} title={attachmentTx?.description} onClose={() => setAttachmentTx(null)} />
    </div>
  );
};
