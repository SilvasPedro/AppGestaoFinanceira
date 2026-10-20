import React from 'react';
import { 
  LayoutDashboard, 
  ReceiptText, 
  Target, 
  TrendingUp, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Wifi, 
  WifiOff, 
  LogIn, 
  User as UserIcon,
  LogOut,
  Settings
} from 'lucide-react';
import { TabType } from './BottomNav';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenAddModal: () => void;
  onOpenAuth: () => void;
  pendingBillsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  onOpenAuth,
  pendingBillsCount
}) => {
  const { currentMonth, prevMonth, nextMonth, isOnline } = useFinance();
  const { user, isGuest } = useAuth();

  const formatMonthTitle = (ym: string) => {
    const [year, month] = ym.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const str = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const navItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Visão Geral',
      icon: LayoutDashboard,
      activeColor: 'text-[#A3C9A8]'
    },
    {
      id: 'transactions' as TabType,
      label: 'Extrato',
      icon: ReceiptText,
      activeColor: 'text-[#A8B5D1]',
      badge: pendingBillsCount > 0 ? pendingBillsCount : null
    },
    {
      id: 'budgets' as TabType,
      label: 'Orçamentos & Tetos',
      icon: Target,
      activeColor: 'text-[#E29578]'
    },
    {
      id: 'projections' as TabType,
      label: 'Score & Futuro',
      icon: TrendingUp,
      activeColor: 'text-[#A3C9A8]'
    },
    {
      id: 'settings' as TabType,
      label: 'Configurações',
      icon: Settings,
      activeColor: 'text-[#A8B5D1]'
    }
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-[#0D0D0D] border-r border-[#1E1E1E] h-screen sticky top-0 p-4 justify-between z-30 select-none">
      {/* Top Section */}
      <div className="space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-2 pt-1">
          <div className="w-9 h-9 rounded-xl bg-[#171717] border border-[#262626] flex items-center justify-center p-2 shadow-xs">
            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
              <circle cx="12" cy="12" r="10" stroke="#262626" strokeWidth="2" />
              <path d="M 12 2 A 10 10 0 0 1 22 12" stroke="#A3C9A8" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 2 12 A 10 10 0 0 1 12 2" stroke="#E29578" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 9 13 L 12 9 L 15 13" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-white">Finances</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-[#A8B5D1]/15 text-[#A8B5D1] border border-[#A8B5D1]/20">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-[#737373]">Gestão Inteligente</p>
          </div>
        </div>

        {/* Primary CTA: Novo Lançamento */}
        <button
          onClick={onOpenAddModal}
          className="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md shadow-white/5"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Novo Lançamento</span>
        </button>

        {/* Navigation Menu */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-[#525252] uppercase tracking-wider px-2 block mb-2">
            Navegação
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  isActive
                    ? 'bg-[#171717] text-white border border-[#2B2B2B] shadow-xs'
                    : 'text-[#858585] hover:text-white hover:bg-[#141414] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? item.activeColor : 'text-[#737373]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="w-4 h-4 rounded-full bg-[#E29578] text-[9px] font-bold text-black flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Month Selector in Sidebar */}
        <div className="p-3 rounded-2xl bg-[#141414] border border-[#212121]">
          <span className="text-[10px] font-semibold text-[#525252] uppercase tracking-wider block mb-2">
            Mês de Referência
          </span>
          <div className="flex items-center justify-between gap-1">
            <button
              onClick={prevMonth}
              title="Mês anterior"
              className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-white hover:bg-[#262626] transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-medium text-white truncate text-center">
              {formatMonthTitle(currentMonth)}
            </span>
            <button
              onClick={nextMonth}
              title="Próximo mês"
              className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-white hover:bg-[#262626] transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Status & User */}
      <div className="space-y-3 pt-4 border-t border-[#1C1C1C]">
        {/* Connection status */}
        <div className="flex items-center justify-between px-2 text-[11px]">
          <span className="text-[#737373]">Servidor Firestore:</span>
          {isOnline ? (
            <span className="flex items-center gap-1 text-[#A3C9A8]">
              <Wifi className="w-3 h-3" /> Online
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[#E29578]">
              <WifiOff className="w-3 h-3" /> Offline
            </span>
          )}
        </div>

        {/* User Card */}
        <div 
          onClick={onOpenAuth}
          className="p-2.5 rounded-2xl bg-[#141414] border border-[#212121] flex items-center justify-between cursor-pointer hover:border-[#383838] transition"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-7 h-7 rounded-full shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#262626] text-white flex items-center justify-center text-xs font-bold shrink-0">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-white truncate">
                {user?.displayName || (isGuest ? 'Usuário Local' : 'Conectado')}
              </div>
              <div className="text-[10px] text-[#737373] truncate">
                {user?.email || (isGuest ? 'Modo Demonstração' : 'Firebase Auth')}
              </div>
            </div>
          </div>
          <div className="text-[#737373] p-1">
            <LogIn className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </aside>
  );
};
