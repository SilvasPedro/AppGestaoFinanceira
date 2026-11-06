import React from 'react';
import { X, LogOut, ShieldCheck, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  return (
    <div 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#151A23] border border-[#283040] rounded-3xl p-6 shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-xl text-[#9AA4B5] hover:text-white hover:bg-[#283040] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-5 text-center pt-2">
          <div className="w-16 h-16 rounded-full bg-[#1C212C] border-2 border-[#283040] mx-auto flex items-center justify-center overflow-hidden shadow-lg">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'Avatar'} className="w-full h-full object-cover" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-[#A3C9A8]" />
            )}
          </div>

          <div>
            <h3 className="text-base font-bold text-white">
              {user.displayName || 'Usuário Autenticado'}
            </h3>
            <p className="text-xs text-[#AEB6C4] mt-0.5 flex items-center justify-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#9AA4B5]" />
              <span>{user.email}</span>
            </p>
          </div>

          <div className="p-3.5 bg-[#0F1218] border border-[#283040] rounded-2xl text-left text-xs text-[#AEB6C4] space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[#9AA4B5]">UID Firebase:</span>
              <span className="font-mono text-[10px] text-white bg-[#1C212C] px-2 py-0.5 rounded-sm">
                {user.uid.slice(0, 12)}...
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#9AA4B5]">Sincronização:</span>
              <span className="text-[#A3C9A8] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A3C9A8] animate-pulse" />
                Firestore Nuvem Ativo
              </span>
            </div>
          </div>

          <button
            onClick={async () => {
              await logout();
              onClose();
            }}
            className="w-full min-h-[48px] rounded-2xl bg-[#283040] hover:bg-[#E29578]/20 hover:text-[#E29578] border border-[#363F50] hover:border-[#E29578]/40 text-xs font-bold text-white flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair da Conta (Logout)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
