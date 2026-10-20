import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Wifi, 
  WifiOff, 
  User as UserIcon, 
  LogIn, 
  Sparkles
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAuth }) => {
  const { currentMonth, prevMonth, nextMonth, isOnline } = useFinance();
  const { user, isGuest } = useAuth();

  // Formatar mês para exibição (ex: "Outubro de 2026")
  const formatMonthTitle = (ym: string) => {
    const [year, month] = ym.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const str = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-[#0D0D0D]/90 backdrop-blur-md border-b border-[#1E1E1E] px-4 py-3 md:hidden">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#171717] border border-[#262626] flex items-center justify-center p-1.5 shadow-xs">
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
            <p className="text-[10px] text-[#737373] hidden sm:block">Análise & Projeções Firestore</p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-1 bg-[#171717] rounded-xl p-1 border border-[#262626]">
          <button
            onClick={prevMonth}
            title="Mês anterior"
            className="p-1 rounded-lg text-[#A3A3A3] hover:text-white hover:bg-[#262626] transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 text-xs font-medium text-white min-w-[115px] text-center select-none">
            {formatMonthTitle(currentMonth)}
          </span>
          <button
            onClick={nextMonth}
            title="Próximo mês"
            className="p-1 rounded-lg text-[#A3A3A3] hover:text-white hover:bg-[#262626] transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right Action Icons & Status */}
        <div className="flex items-center gap-2">
          {/* Online / Offline indicator */}
          <div 
            title={isOnline ? "Conectado ao Firebase Firestore" : "Modo Offline - Persistência IndexedDB ativa"}
            className="flex items-center"
          >
            {isOnline ? (
              <span className="flex items-center gap-1 text-[11px] text-[#A3C9A8] bg-[#A3C9A8]/10 border border-[#A3C9A8]/20 px-2 py-0.5 rounded-full hidden md:inline-flex">
                <Wifi className="w-3 h-3 text-[#A3C9A8]" />
                Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-[#E29578] bg-[#E29578]/10 border border-[#E29578]/20 px-2 py-0.5 rounded-full">
                <WifiOff className="w-3 h-3 text-[#E29578]" />
                Offline
              </span>
            )}
          </div>


          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* User Profile / Auth Button */}
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-[#171717] hover:bg-[#262626] border border-[#262626] transition"
          >
            {user ? (
              <>
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#A3C9A8]/20 text-[#A3C9A8] flex items-center justify-center text-[10px] font-bold">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <span className="text-xs font-medium text-white max-w-[80px] truncate hidden xs:inline">
                  {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                </span>
              </>
            ) : (
              <>
                <div className="w-5 h-5 rounded-full bg-[#A8B5D1]/20 text-[#A8B5D1] flex items-center justify-center">
                  <LogIn className="w-3 h-3" />
                </div>
                <span className="text-xs font-medium text-[#A3A3A3] hidden xs:inline">
                  {isGuest ? 'Convidado' : 'Entrar'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
