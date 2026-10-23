import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2,
  Plus,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { TabType } from './BottomNav';

interface DesktopHeaderProps {
  activeTab: TabType;
  onOpenAddModal: () => void;
  onOpenAuth?: () => void;
}

const TAB_TITLES: Record<TabType, { title: string; subtitle: string }> = {
  dashboard: { title: 'Visão Geral', subtitle: 'Resumo financeiro e fluxo de caixa' },
  transactions: { title: 'Extrato Financeiro', subtitle: 'Histórico de receitas, despesas e faturas' },
  recurring: { title: 'Recorrências & Parcelas', subtitle: 'Compromissos fixos, assinaturas e crediários' },
  budgets: { title: 'Orçamentos & Tetos', subtitle: 'Metas de contenção e planejamento por categoria' },
  projections: { title: 'Score & Projeções', subtitle: 'Saúde financeira, simulação de liberdade e futuro' },
  settings: { title: 'Configurações', subtitle: 'Categorias, cartões e preferências do sistema' }
};

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  activeTab,
  onOpenAddModal
}) => {
  const { currentMonth, prevMonth, nextMonth, layoutMode, setLayoutMode } = useFinance();

  const formatMonthTitle = (ym: string) => {
    const [year, month] = ym.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const str = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const tabInfo = TAB_TITLES[activeTab] || { title: 'Painel', subtitle: '' };

  return (
    <header className="hidden md:grid grid-cols-3 items-center sticky top-0 z-20 w-full bg-[#0D0D0D]/85 backdrop-blur-xl border-b border-[#1A1A1A] px-6 py-3 select-none">
      {/* 1. Esquerda: Título da Aba & Breadcrumb */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white tracking-tight">
              {tabInfo.title}
            </h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#1A1A1A] text-[#A3A3A3] border border-[#2B2B2B]">
              <Sparkles className="w-2.5 h-2.5 text-[#A3C9A8]" />
              Finances PRO
            </span>
          </div>
          <p className="text-[11px] text-[#737373] mt-0.5 leading-none">
            {tabInfo.subtitle}
          </p>
        </div>
      </div>

      {/* 2. Centro: Seletor de Mês Centralizado e com Maior Destaque (Diretriz 1) */}
      <div className="flex items-center justify-center">
        <div className="card-depth-3d flex items-center gap-1.5 bg-[#141414]/90 backdrop-blur-md rounded-2xl p-1.5 border border-white/10 shadow-lg">
          <button
            onClick={prevMonth}
            title="Mês anterior"
            className="btn-liquid-glass p-2 rounded-xl text-[#A3A3A3] hover:text-white transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 px-3 py-1">
            <Calendar className="w-4 h-4 text-[#A8B5D1]" />
            <span className="text-sm font-bold text-white min-w-[130px] text-center tracking-tight capitalize select-none">
              {formatMonthTitle(currentMonth)}
            </span>
          </div>
          <button
            onClick={nextMonth}
            title="Próximo mês"
            className="btn-liquid-glass p-2 rounded-xl text-[#A3A3A3] hover:text-white transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Direita: Modo de Tela Liquid Glass 3D & Novo Lançamento (Limpo, sem avatar nem online) */}
      <div className="flex items-center justify-end gap-3">
        {/* Toggle de Modo Normal / Expandido estilizado com Liquid Glass Apple e 3D */}
        <div 
          className="card-depth-3d flex items-center p-1 bg-[#141414]/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-md gap-1"
          title="Alternar entre visualização contida e 100% da largura da tela"
        >
          <button
            type="button"
            onClick={() => setLayoutMode('normal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              layoutMode === 'normal'
                ? 'btn-liquid-glass text-white border-white/30 shadow-md'
                : 'text-[#8C8C8C] hover:text-white hover:bg-white/5'
            }`}
            title="Modo Normal: Largura centralizada e contida (max-w-6xl)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Normal</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode('expanded')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              layoutMode === 'expanded'
                ? 'btn-liquid-glass text-white border-white/30 shadow-md'
                : 'text-[#8C8C8C] hover:text-white hover:bg-white/5'
            }`}
            title="Modo Expandido: Ocupa 100% da largura da tela"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Expandido</span>
          </button>
        </div>

        {/* Liquid Glass Primary CTA Button */}
        <button
          onClick={onOpenAddModal}
          className="btn-liquid-glass-primary flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold shadow-md active:scale-95 transition-transform"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Lançamento</span>
        </button>
      </div>
    </header>
  );
};
