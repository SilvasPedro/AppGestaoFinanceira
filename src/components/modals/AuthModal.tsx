import React, { useState } from 'react';
import { X, LogIn, UserPlus, LogOut, ShieldCheck, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { 
    user, 
    isGuest, 
    loginWithGoogle, 
    loginWithEmail, 
    registerWithEmail, 
    logout, 
    setGuestMode,
    authError,
    clearAuthError
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    clearAuthError();

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
      onClose();
    } catch {
      // Error handled in AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch {
      // error handled in context
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueGuest = () => {
    setGuestMode(true);
    onClose();
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#141414] border border-[#262626] rounded-2xl p-6 shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-xl text-[#737373] hover:text-white hover:bg-[#262626] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {user ? (
          // Já está autenticado
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-[#171717] border border-[#262626] mx-auto flex items-center justify-center">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'Avatar'} className="w-full h-full rounded-full" />
              ) : (
                <ShieldCheck className="w-7 h-7 text-[#A3C9A8]" />
              )}
            </div>

            <div>
              <h3 className="text-base font-semibold text-white">
                {user.displayName || 'Usuário Autenticado'}
              </h3>
              <p className="text-xs text-[#737373] mt-0.5">{user.email}</p>
            </div>

            <div className="p-3 bg-[#0D0D0D] border border-[#262626] rounded-xl text-left text-xs text-[#A3A3A3] space-y-1">
              <div className="flex justify-between">
                <span>UID Firebase:</span>
                <span className="font-mono text-[10px] text-white">{user.uid.slice(0, 10)}...</span>
              </div>
              <div className="flex justify-between">
                <span>Sincronização:</span>
                <span className="text-[#A3C9A8] font-medium">Firestore Nuvem Ativo</span>
              </div>
            </div>

            <button
              onClick={async () => {
                await logout();
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-[#262626] hover:bg-[#333333] text-xs font-semibold text-[#E29578] flex items-center justify-center gap-2 transition"
            >
              <LogOut className="w-4 h-4" /> Desconectar Conta
            </button>
          </div>
        ) : (
          // Formulário de Login / Registro
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-base font-semibold text-white">
                {mode === 'login' ? 'Entrar no Finances Pro' : 'Criar Nova Conta'}
              </h3>
              <p className="text-xs text-[#737373] mt-1">
                Seus dados isolados e seguros no Cloud Firestore
              </p>
            </div>

            {authError && (
              <div className="p-2.5 bg-[#E29578]/10 border border-[#E29578]/30 rounded-xl flex items-start gap-2 text-xs text-[#E29578]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {/* Google Sign In */}
            <button
              onClick={handleGoogle}
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-[#171717] hover:bg-[#262626] border border-[#262626] rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2.5 transition active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continuar com Google
            </button>

            <div className="flex items-center gap-2 my-2">
              <div className="flex-1 h-px bg-[#262626]" />
              <span className="text-[10px] text-[#737373] uppercase">ou e-mail</span>
              <div className="flex-1 h-px bg-[#262626]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] text-[#737373] uppercase tracking-wider block mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full pl-9 pr-3 py-2 bg-[#0D0D0D] border border-[#262626] rounded-xl text-xs text-white placeholder-[#525252] focus:outline-hidden focus:border-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#737373] uppercase tracking-wider block mb-1">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-[#0D0D0D] border border-[#262626] rounded-xl text-xs text-white placeholder-[#525252] focus:outline-hidden focus:border-white transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-wider transition active:scale-95 disabled:opacity-50"
              >
                {submitting
                  ? 'Aguarde...'
                  : mode === 'login'
                  ? 'Entrar com E-mail'
                  : 'Criar Conta'}
              </button>
            </form>

            <div className="pt-2 flex flex-col gap-2 text-center text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  clearAuthError();
                }}
                className="text-[#A8B5D1] hover:underline"
              >
                {mode === 'login'
                  ? 'Não tem conta? Cadastre-se'
                  : 'Já tem conta? Fazer login'}
              </button>

              <button
                type="button"
                onClick={handleContinueGuest}
                className="text-[#737373] hover:text-[#A3A3A3] text-[11px]"
              >
                Permanecer no Modo Demonstração (Convidado)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
