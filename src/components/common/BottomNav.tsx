import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  Repeat,
  Plus,
  Target,
  TrendingUp,
  Settings,
  Wallet,
  CreditCard,
  BarChart3,
  Users,
  Menu,
  X,
  type LucideIcon
} from 'lucide-react';

export type TabType =
  | 'dashboard'
  | 'transactions'
  | 'recurring'
  | 'budgets'
  | 'projections'
  | 'accounts'
  | 'cards'
  | 'reports'
  | 'shared'
  | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenAddModal: () => void;
  pendingBillsCount: number;
  recurringBadgeCount?: number;
}

const MORE_ITEMS: { id: TabType; label: string; icon: LucideIcon; color: string }[] = [
  { id: 'recurring', label: 'Fixas e parcelas', icon: Repeat, color: '#E5A97D' },
  { id: 'accounts', label: 'Contas e metas', icon: Wallet, color: '#A3C9A8' },
  { id: 'cards', label: 'Cartões e faturas', icon: CreditCard, color: '#A8B5D1' },
  { id: 'reports', label: 'Relatórios', icon: BarChart3, color: '#E9C46A' },
  { id: 'shared', label: 'Compartilhado', icon: Users, color: '#38BDF8' },
  { id: 'projections', label: 'Score e futuro', icon: TrendingUp, color: '#A3C9A8' },
  { id: 'settings', label: 'Ajustes', icon: Settings, color: '#A8B5D1' }
];

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  pendingBillsCount,
  recurringBadgeCount = 0
}) => {
  const [moreOpen, setMoreOpen] = useState(false);

  // Fecha o painel ao trocar de aba ou apertar Esc
  useEffect(() => {
    setMoreOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMoreOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const inMore = MORE_ITEMS.some(i => i.id === activeTab);

  const tabClass = (active: boolean) =>
    `flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
      active ? 'text-white font-semibold' : 'text-[#9AA4B5] hover:text-[#AEB6C4]'
    }`;

  return (
    <>
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-xs"
          onClick={() => setMoreOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Mais seções"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="absolute left-0 right-0 bottom-[calc(env(safe-area-inset-bottom,0px)+72px)] mx-3 rounded-3xl border border-white/10 bg-[#151A23] p-3 shadow-2xl animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between px-2 pb-2">
              <span className="text-xs font-semibold text-white">Mais seções</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Fechar"
                className="p-1 rounded-lg text-[#9AA4B5] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MORE_ITEMS.map(item => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`relative flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-[11px] transition cursor-pointer ${
                      active ? 'border-white/25 bg-white/8 text-white' : 'border-white/8 bg-[#0F1218] text-[#AEB6C4] hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" style={{ color: item.color }} />
                    <span className="leading-tight text-center">{item.label}</span>
                    {item.id === 'recurring' && recurringBadgeCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#E5A97D] text-[9px] font-bold text-black flex items-center justify-center">
                        {recurringBadgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0F1218]/95 backdrop-blur-xl border-t border-[#202733] pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-2 px-1">
        <div className="max-w-md mx-auto grid grid-cols-5 items-center relative">
          <button onClick={() => setActiveTab('dashboard')} className={tabClass(activeTab === 'dashboard')}>
            <LayoutDashboard className={`w-4.5 h-4.5 ${activeTab === 'dashboard' ? 'text-[#A3C9A8]' : ''}`} />
            <span className="text-[10px] mt-1 tracking-tight truncate">Geral</span>
          </button>

          <button onClick={() => setActiveTab('transactions')} className={tabClass(activeTab === 'transactions')}>
            <div className="relative">
              <ReceiptText className={`w-4.5 h-4.5 ${activeTab === 'transactions' ? 'text-[#A8B5D1]' : ''}`} />
              {pendingBillsCount > 0 && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-[#E29578] text-[9px] font-bold text-black flex items-center justify-center shadow-xs">
                  {pendingBillsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight truncate">Extrato</span>
          </button>

          <div className="flex items-center justify-center -mt-6">
            <button
              onClick={onOpenAddModal}
              title="Novo lançamento rápido"
              aria-label="Novo lançamento"
              className="btn-liquid-glass-primary w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-transform cursor-pointer"
            >
              <Plus className="w-5.5 h-5.5 stroke-[2.5]" />
            </button>
          </div>

          <button onClick={() => setActiveTab('budgets')} className={tabClass(activeTab === 'budgets')}>
            <Target className={`w-4.5 h-4.5 ${activeTab === 'budgets' ? 'text-[#E29578]' : ''}`} />
            <span className="text-[10px] mt-1 tracking-tight truncate">Tetos</span>
          </button>

          <button
            onClick={() => setMoreOpen(o => !o)}
            aria-expanded={moreOpen}
            className={tabClass(inMore || moreOpen)}
          >
            <div className="relative">
              <Menu className={`w-4.5 h-4.5 ${inMore || moreOpen ? 'text-[#A8B5D1]' : ''}`} />
              {recurringBadgeCount > 0 && !inMore && (
                <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-[#E5A97D]" />
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight truncate">Mais</span>
          </button>
        </div>
      </nav>
    </>
  );
};
