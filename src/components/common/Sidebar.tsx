import React from 'react';
import { 
  LayoutDashboard, 
  ReceiptText, 
  Repeat, 
  Target, 
  TrendingUp, 
  Plus, 
  Wifi, 
  WifiOff, 
  LogOut,
  Settings,
  Wallet,
  CreditCard,
  BarChart3,
  Users
} from 'lucide-react';
import { TabType } from './BottomNav';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';

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
  const { 
    isOnline, 
    activeFixedCount, 
    activeInstallmentsCount
  } = useFinance();
  const { user, logout } = useAuth();

  const totalRecurringBadge = activeFixedCount + activeInstallmentsCount;

  const navItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Visão Geral',
      icon: LayoutDashboard,
      colorHex: '#A3C9A8',
      glowColor: 'rgba(163, 201, 168, 0.28)'
    },
    {
      id: 'transactions' as TabType,
      label: 'Extrato',
      icon: ReceiptText,
      colorHex: '#A8B5D1',
      glowColor: 'rgba(168, 181, 209, 0.28)',
      badge: pendingBillsCount > 0 ? pendingBillsCount : null
    },
    {
      id: 'recurring' as TabType,
      label: 'Recorrências & Parcelas',
      icon: Repeat,
      colorHex: '#E5A97D',
      glowColor: 'rgba(229, 169, 125, 0.28)',
      badge: totalRecurringBadge > 0 ? totalRecurringBadge : null
    },
    {
      id: 'budgets' as TabType,
      label: 'Orçamentos & Tetos',
      icon: Target,
      colorHex: '#E29578',
      glowColor: 'rgba(226, 149, 120, 0.28)'
    },
    {
      id: 'projections' as TabType,
      label: 'Score & Futuro',
      icon: TrendingUp,
      colorHex: '#A3C9A8',
      glowColor: 'rgba(163, 201, 168, 0.28)'
    },
    {
      id: 'accounts' as TabType,
      label: 'Contas & Metas',
      icon: Wallet,
      colorHex: '#A3C9A8',
      glowColor: 'rgba(163, 201, 168, 0.28)'
    },
    {
      id: 'cards' as TabType,
      label: 'Cartões & Faturas',
      icon: CreditCard,
      colorHex: '#A8B5D1',
      glowColor: 'rgba(168, 181, 209, 0.28)'
    },
    {
      id: 'reports' as TabType,
      label: 'Relatórios',
      icon: BarChart3,
      colorHex: '#E9C46A',
      glowColor: 'rgba(233, 196, 106, 0.28)'
    },
    {
      id: 'shared' as TabType,
      label: 'Compartilhado',
      icon: Users,
      colorHex: '#38BDF8',
      glowColor: 'rgba(56, 189, 248, 0.28)'
    },
    {
      id: 'settings' as TabType,
      label: 'Configurações',
      icon: Settings,
      colorHex: '#A8B5D1',
      glowColor: 'rgba(168, 181, 209, 0.28)'
    }
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-[#0F1218] border-r border-[#1F2531] h-screen sticky top-0 p-4 justify-between gap-4 z-30 select-none">
      {/* Top Section (rola quando a janela é baixa) */}
      <div className="space-y-6 min-h-0 overflow-y-auto no-scrollbar">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-2 pt-1">
          <div className="w-9 h-9 rounded-xl bg-[#181D27] border border-[#283040] flex items-center justify-center p-2 shadow-xs">
            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
              <circle cx="12" cy="12" r="10" stroke="#283040" strokeWidth="2" />
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
            <p className="text-[10px] text-[#9AA4B5]">Gestão Inteligente</p>
          </div>
        </div>

        {/* Primary CTA: Novo Lançamento com Apple Liquid Glass (Diretriz 3) */}
        <button
          onClick={onOpenAddModal}
          className="btn-liquid-glass-primary w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.98] transition-transform"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Novo Lançamento</span>
        </button>

        {/* Navigation Menu (Diretriz 2: Interação e Estado Ativo com Glow Neon) */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-[#5E6A7E] uppercase tracking-wider px-2 block mb-2">
            Navegação
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  '--item-color': item.colorHex,
                  '--item-glow': item.glowColor
                } as React.CSSProperties}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold sidebar-nav-item transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'sidebar-nav-active text-white'
                    : 'text-[#8E98A9] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div 
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                      isActive 
                        ? 'bg-white/10' 
                        : 'bg-transparent'
                    }`}
                  >
                    <Icon 
                      className="w-4 h-4 transition-all" 
                      style={{ 
                        color: isActive ? item.colorHex : 'currentColor',
                        filter: isActive ? `drop-shadow(0 0 6px ${item.colorHex})` : 'none'
                      }} 
                    />
                  </div>
                  <span className="tracking-tight">{item.label}</span>
                </div>
                {item.badge && (
                  <span 
                    className="px-1.5 py-0.5 rounded-full text-[9px] font-bold text-black flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: item.colorHex }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: Status & User */}
      <div className="space-y-3 pt-4 border-t border-[#1E2430]">
        {/* Connection status */}
        <div className="flex items-center justify-between px-2 text-[11px]">
          <span className="text-[#9AA4B5]">Servidor Firestore:</span>
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
        <div className="p-2.5 rounded-2xl bg-[#151A23] border border-[#212121] flex items-center justify-between">
          <div 
            onClick={onOpenAuth}
            className="flex items-center gap-2.5 overflow-hidden flex-1 cursor-pointer hover:opacity-80 transition"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full shrink-0 object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#A3C9A8]/20 text-[#A3C9A8] flex items-center justify-center text-xs font-bold shrink-0">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-white truncate">
                {user?.displayName || user?.email?.split('@')[0]}
              </div>
              <div className="text-[10px] text-[#9AA4B5] truncate">
                {user?.email}
              </div>
            </div>
          </div>
          <button 
            onClick={logout}
            title="Sair da Conta"
            className="text-[#9AA4B5] hover:text-[#E29578] hover:bg-[#283040] p-1.5 rounded-lg transition cursor-pointer ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
