import React from 'react';
import { 
  LayoutDashboard, 
  ReceiptText, 
  Repeat, 
  Plus, 
  Target, 
  TrendingUp,
  Settings
} from 'lucide-react';

export type TabType = 'dashboard' | 'transactions' | 'recurring' | 'budgets' | 'projections' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenAddModal: () => void;
  pendingBillsCount: number;
  recurringBadgeCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  pendingBillsCount,
  recurringBadgeCount = 0
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D0D0D]/95 backdrop-blur-xl border-t border-[#1F1F1F] pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-2 px-1">
      {/* 7-Column Grid para Centralização Matemática Perfeita do FAB (3 abas à esquerda, 3 à direita) */}
      <div className="max-w-md mx-auto grid grid-cols-7 items-center relative">
        {/* 1. Dashboard / Geral */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-white font-semibold'
              : 'text-[#737373] hover:text-[#A3A3A3]'
          }`}
        >
          <div className="relative">
            <LayoutDashboard className={`w-4.5 h-4.5 ${activeTab === 'dashboard' ? 'text-[#A3C9A8]' : ''}`} />
          </div>
          <span className="text-[9px] mt-1 tracking-tight truncate">Geral</span>
        </button>

        {/* 2. Extrato / Lançamentos */}
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            activeTab === 'transactions'
              ? 'text-white font-semibold'
              : 'text-[#737373] hover:text-[#A3A3A3]'
          }`}
        >
          <div className="relative">
            <ReceiptText className={`w-4.5 h-4.5 ${activeTab === 'transactions' ? 'text-[#A8B5D1]' : ''}`} />
            {pendingBillsCount > 0 && (
              <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-[#E29578] text-[8.5px] font-bold text-black flex items-center justify-center shadow-xs">
                {pendingBillsCount}
              </span>
            )}
          </div>
          <span className="text-[9px] mt-1 tracking-tight truncate">Extrato</span>
        </button>

        {/* 3. Recorrências & Parcelas */}
        <button
          onClick={() => setActiveTab('recurring')}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            activeTab === 'recurring'
              ? 'text-white font-semibold'
              : 'text-[#737373] hover:text-[#A3A3A3]'
          }`}
        >
          <div className="relative">
            <Repeat className={`w-4.5 h-4.5 ${activeTab === 'recurring' ? 'text-[#E5A97D]' : ''}`} />
            {recurringBadgeCount > 0 && (
              <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-[#E5A97D] text-[8.5px] font-bold text-black flex items-center justify-center shadow-xs">
                {recurringBadgeCount}
              </span>
            )}
          </div>
          <span className="text-[9px] mt-1 tracking-tight truncate">Fixas</span>
        </button>

        {/* 4. BOTÃO CENTRAL DESTACADO (FAB - Floating Action Button com Liquid Glass) */}
        <div className="flex items-center justify-center -mt-6">
          <button
            onClick={onOpenAddModal}
            title="Novo Lançamento Rápido"
            className="btn-liquid-glass-primary w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-transform cursor-pointer"
          >
            <Plus className="w-5.5 h-5.5 stroke-[2.5]" />
          </button>
        </div>

        {/* 5. Orçamentos & Tetos */}
        <button
          onClick={() => setActiveTab('budgets')}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            activeTab === 'budgets'
              ? 'text-white font-semibold'
              : 'text-[#737373] hover:text-[#A3A3A3]'
          }`}
        >
          <div className="relative">
            <Target className={`w-4.5 h-4.5 ${activeTab === 'budgets' ? 'text-[#E29578]' : ''}`} />
          </div>
          <span className="text-[9px] mt-1 tracking-tight truncate">Tetos</span>
        </button>

        {/* 6. Score & Futuro */}
        <button
          onClick={() => setActiveTab('projections')}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            activeTab === 'projections'
              ? 'text-white font-semibold'
              : 'text-[#737373] hover:text-[#A3A3A3]'
          }`}
        >
          <div className="relative">
            <TrendingUp className={`w-4.5 h-4.5 ${activeTab === 'projections' ? 'text-[#A3C9A8]' : ''}`} />
          </div>
          <span className="text-[9px] mt-1 tracking-tight truncate">Score</span>
        </button>

        {/* 7. Configurações / Ajustes */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'text-white font-semibold'
              : 'text-[#737373] hover:text-[#A3A3A3]'
          }`}
        >
          <div className="relative">
            <Settings className={`w-4.5 h-4.5 ${activeTab === 'settings' ? 'text-[#A8B5D1]' : ''}`} />
          </div>
          <span className="text-[9px] mt-1 tracking-tight truncate">Ajustes</span>
        </button>
      </div>
    </nav>
  );
};
