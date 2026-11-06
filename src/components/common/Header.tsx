import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Wifi, 
  WifiOff, 
  Settings,
  LogOut
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';
import { TabType } from './BottomNav';

interface HeaderProps {
  onOpenAuth: () => void;
  onNavigateTab?: (tab: TabType) => void;
  activeTab?: TabType;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAuth, onNavigateTab, activeTab }) => {
  const { currentMonth, prevMonth, nextMonth, isOnline } = useFinance();
  const { user, logout } = useAuth();

  // Formatar mês para exibição (ex: "Outubro de 2026")
  const formatMonthTitle = (ym: string) => {
    const [year, month] = ym.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const str = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-[#0F1218]/90 backdrop-blur-md border-b border-[#1F2531] px-4 py-3 md:hidden">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#181D27] border border-[#283040] flex items-center justify-center p-1.5 shadow-xs">
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
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-1 bg-[#181D27] rounded-xl p-1 border border-[#283040]">
          <button
            onClick={prevMonth}
            title="Mês anterior"
            className="p-1 rounded-lg text-[#AEB6C4] hover:text-white hover:bg-[#283040] transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 text-xs font-medium text-white min-w-[110px] text-center select-none">
            {formatMonthTitle(currentMonth)}
          </span>
          <button
            onClick={nextMonth}
            title="Próximo mês"
            className="p-1 rounded-lg text-[#AEB6C4] hover:text-white hover:bg-[#283040] transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1.5">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Settings Button */}
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('settings')}
              title="Configurações"
              className={`p-1.5 rounded-xl border transition cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#202733] text-white border-[#3B4558]'
                  : 'bg-[#181D27] hover:bg-[#283040] text-[#AEB6C4] hover:text-white border-[#283040]'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* User Profile Avatar */}
          <button
            onClick={onOpenAuth}
            title="Ver Perfil"
            className="flex items-center p-0.5 rounded-xl bg-[#181D27] hover:bg-[#283040] border border-[#283040] transition cursor-pointer"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="w-7 h-7 rounded-xl object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-xl bg-[#A3C9A8]/20 text-[#A3C9A8] flex items-center justify-center text-xs font-bold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </button>

          {/* Direct Logout Button on Mobile */}
          <button
            onClick={logout}
            title="Sair da Conta (Logout)"
            className="p-1.5 rounded-xl bg-[#181D27] hover:bg-[#E29578]/15 hover:text-[#E29578] text-[#9AA4B5] border border-[#283040] transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
