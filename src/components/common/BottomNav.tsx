import React from 'react';
import { 
  LayoutDashboard, 
  ReceiptText, 
  Repeat,
  Plus, 
  Target, 
  TrendingUp 
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D0D0D]/95 backdrop-blur-lg border-t border-[#1F1F1F] pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-2 px-2">
      <div className="max-w-md mx-auto flex items-center justify-between relative">
        {/* Tab 1: Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === 'dashboard'
              ? 'text-white'
              : 'text-[#737373] hover:text-[#A3A3A3]'
          }`}
        >
          <div className="relative">
            <LayoutDashboard className={`w-5 h-5 ${activeTab === 'dashboard' ? 'text-[#A3C9A8]' : ''}`} />
          </div>
          <span className="text-[9.5px] font-medium mt-1">Geral</span>
        </button>

        {/* Tab 2: Lançamentos / Extrato */}
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === 'transactions'
              ? 'text-white'
              : 'text-[#737373] hover:text-[#A3A3A3]'
          }`}
        >
          <div className="relative">
            <ReceiptText className={`w-5 h-5 ${activeTab === 'transactions' ? 'text-[#A8B5D1]' : ''}`} />
            {pendingBillsCount > 0 && (
              <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-[#E29578] text-[9px] font-bold text-black flex items-center justify-center">
                {pendingBillsCount}
              </span>
            )}
          </div>
          <span className="text-[9.5px] font-medium mt-1">Extrato</span>
        </button>

        {/* Tab 3: Recorrências & Parcelas */}
        <button
          onClick={() => setActiveTab('recurring')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === 'recurring'
              ? 'text-white'
              : 'text-[#737373] hover:text-[#A3A3A3]'
          }`}
        >
          <div className="relative">
            <Repeat className={`w-5 h-5 ${activeTab === 'recurring' ? 'text-[#E5A97D]' : ''}`} />
            {recurringBadgeCount > 0 && (
              <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-[#E5A97D] text-[9px] font-bold text-black flex items-center justify-center">
                {recurringBadgeCount}
              </span>
            )}
          </div>
          <span className="text-[9.5px] font-medium mt-1">Fixas</span>
        </button>

        {/* Action Button: Quick Add (+) */}
        <div className="flex-none px-1 -mt-5">
          <button
            onClick={onOpenAddModal}
            title="Novo Lançamento Rápido"
            className="w-12 h-12 rounded-2xl bg-white text-black shadow-lg shadow-white/10 flex items-center justify-center transition active:scale-90 hover:bg-[#F2F2F2]"
          >
            <Plus className="w-5.5 h-5.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 4: Orçamentos / Limites */}
        <button
          onClick={() => setActiveTab('budgets')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === 'budgets'
              ? 'text-white'
              : 'text-[#737373] hover:text-[#A3A3A3]'
          }`}
        >
          <div className="relative">
            <Target className={`w-5 h-5 ${activeTab === 'budgets' ? 'text-[#E29578]' : ''}`} />
          </div>
          <span className="text-[9.5px] font-medium mt-1">Limites</span>
        </button>

        {/* Tab 5: Score & Projeções */}
        <button
          onClick={() => setActiveTab('projections')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === 'projections'
              ? 'text-white'
              : 'text-[#737373] hover:text-[#A3A3A3]'
          }`}
        >
          <div className="relative">
            <TrendingUp className={`w-5 h-5 ${activeTab === 'projections' ? 'text-[#A3C9A8]' : ''}`} />
          </div>
          <span className="text-[9.5px] font-medium mt-1">Futuro</span>
        </button>
      </div>
    </nav>
  );
};
