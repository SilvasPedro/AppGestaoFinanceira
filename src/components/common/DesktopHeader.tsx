import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Wifi, 
  WifiOff, 
  Maximize2, 
  Minimize2,
  Plus,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { TabType } from './BottomNav';

interface DesktopHeaderProps {
  activeTab: TabType;
  onOpenAddModal: () => void;
  onOpenAuth: () => void;
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
  onOpenAddModal,
  onOpenAuth
}) => {
  const { currentMonth, prevMonth, nextMonth, isOnline, layoutMode, setLayoutMode } = useFinance();
  const { user } = useAuth();

  const formatMonthTitle = (ym: string) => {
    const [year, month] = ym.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const str = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const tabInfo = TAB_TITLES[activeTab] || { title: 'Painel', subtitle: '' };

  return (
    <header className="hidden md:flex items-center justify-between sticky top-0 z-20 w-full bg-[#0D0D0D]/80 backdrop-blur-xl border-b border-[#1A1A1A] px-6 py-3 select-none">
      {/* Left: Tab Title & Breadcrumb */}
      <div className="flex items-center gap-4">
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

      {/* Center / Right Controls */}
      <div className="flex items-center gap-3">
        {/* Month Selector with subtle glass container */}
        <div className="flex items-center gap-1 bg-[#141414]/90 backdrop-blur-md rounded-xl p-1 border border-[#262626] shadow-xs">
          <button
            onClick={prevMonth}
            title="Mês anterior"
            className="p-1 rounded-lg text-[#858585] hover:text-white hover:bg-[#222222] transition cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5 px-2">
            <Calendar className="w-3 h-3 text-[#A8B5D1]" />
            <span className="text-xs font-semibold text-white min-w-[105px] text-center">
              {formatMonthTitle(currentMonth)}
            </span>
          </div>
          <button
            onClick={nextMonth}
            title="Próximo mês"
            className="p-1 rounded-lg text-[#858585] hover:text-white hover:bg-[#222222] transition cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Layout Toggle Segmented Control (Diretriz 4: Normal vs. Expandido) */}
        <div 
          className="toggle-segmented-glass"
          title="Alternar entre visualização contida e 100% da largura da tela"
        >
          <button
            type="button"
            onClick={() => setLayoutMode('normal')}
            className={`toggle-segment-btn ${layoutMode === 'normal' ? 'toggle-segment-active' : ''}`}
            title="Modo Normal: Largura centralizada e contida (max-w-6xl)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Normal</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode('expanded')}
            className={`toggle-segment-btn ${layoutMode === 'expanded' ? 'toggle-segment-active' : ''}`}
            title="Modo Expandido: Ocupa 100% da largura da tela para máxima imersão"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Expandido</span>
          </button>
        </div>

        {/* Liquid Glass Primary CTA Button (Diretriz 3) */}
        <button
          onClick={onOpenAddModal}
          className="btn-liquid-glass-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Lançamento</span>
        </button>

        {/* Cloud Status Indicator */}
        <div 
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141414] border border-[#212121] text-[11px]"
          title={isOnline ? 'Sincronizado com Firebase' : 'Modo offline com cache local'}
        >
          {isOnline ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#A3C9A8] animate-pulse" />
              <span className="text-[#A3C9A8] font-medium">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-[#E29578]" />
              <span className="text-[#E29578] font-medium">Offline</span>
            </>
          )}
        </div>

        {/* User Avatar */}
        <button
          onClick={onOpenAuth}
          title="Ver perfil de usuário"
          className="flex items-center p-0.5 rounded-xl bg-[#141414] hover:bg-[#212121] border border-[#262626] transition cursor-pointer hover:border-[#383838]"
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || 'User'} className="w-7 h-7 rounded-lg object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-[#A3C9A8]/20 text-[#A3C9A8] flex items-center justify-center text-xs font-bold">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
        </button>
      </div>
    </header>
  );
};
