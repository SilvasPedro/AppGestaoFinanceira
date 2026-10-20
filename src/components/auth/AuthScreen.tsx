import React, { useState } from 'react';
import { Mail, Lock, AlertCircle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AuthScreen: React.FC = () => {
  const { 
    loginWithGoogle, 
    loginWithEmail, 
    registerWithEmail, 
    authError, 
    clearAuthError 
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    } catch {
      // Error is caught and set in AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    clearAuthError();
    try {
      await loginWithGoogle();
    } catch {
      // Error handled in AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0D0D0D] text-white flex flex-col justify-center items-center px-4 py-8 selection:bg-[#A3C9A8]/20">
      {/* Background ambient gradient glow */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[320px] h-[320px] bg-[#A3C9A8]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm mx-auto">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#141414] border border-[#262626] mx-auto flex items-center justify-center p-2.5 shadow-xl mb-3">
            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
              <circle cx="12" cy="12" r="10" stroke="#262626" strokeWidth="2" />
              <path d="M 12 2 A 10 10 0 0 1 22 12" stroke="#A3C9A8" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 2 12 A 10 10 0 0 1 12 2" stroke="#E29578" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 9 13 L 12 9 L 15 13" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-lg font-bold tracking-tight text-white">Finances</h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-[#A8B5D1]/15 text-[#A8B5D1] border border-[#A8B5D1]/20">
              PRO
            </span>
          </div>
          <p className="text-xs text-[#737373] mt-1">
            Gestão Financeira Pessoal Inteligente
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
          {/* Tabs: Entrar vs Cadastrar */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#0D0D0D] rounded-2xl border border-[#262626]">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                clearAuthError();
              }}
              className={`min-h-[44px] text-xs font-semibold rounded-xl transition cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-[#A3A3A3] hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                clearAuthError();
              }}
              className={`min-h-[44px] text-xs font-semibold rounded-xl transition cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-[#A3A3A3] hover:text-white'
              }`}
            >
              Criar Conta
            </button>
          </div>

          {authError && (
            <div className="p-3 bg-[#E29578]/10 border border-[#E29578]/30 rounded-2xl flex items-start gap-2.5 text-xs text-[#E29578] animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{authError}</span>
            </div>
          )}

          {/* Botão Google (Touch target >= 48px) */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={submitting}
            className="w-full min-h-[48px] px-4 bg-[#1A1A1A] hover:bg-[#242424] active:bg-[#2A2A2A] border border-[#2B2B2B] rounded-2xl text-xs font-semibold text-white flex items-center justify-center gap-3 transition cursor-pointer active:scale-[0.98] disabled:opacity-50"
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
            <span>Continuar com Google</span>
          </button>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-[#262626]" />
            <span className="text-[10px] text-[#737373] uppercase tracking-wider font-medium">ou e-mail</span>
            <div className="flex-1 h-px bg-[#262626]" />
          </div>

          {/* Formulário Email / Senha */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full min-h-[48px] pl-10 pr-3.5 bg-[#0D0D0D] border border-[#262626] rounded-2xl text-xs text-white placeholder-[#525252] focus:outline-hidden focus:border-white transition"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full min-h-[48px] pl-10 pr-3.5 bg-[#0D0D0D] border border-[#262626] rounded-2xl text-xs text-white placeholder-[#525252] focus:outline-hidden focus:border-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] mt-2 rounded-2xl bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black text-xs font-bold uppercase tracking-wider transition active:scale-[0.98] disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 shadow-lg"
            >
              <span>{submitting ? 'Processando...' : mode === 'login' ? 'Entrar' : 'Criar Minha Conta'}</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </form>

          {/* Segurança & Proteção */}
          <div className="pt-2 text-center">
            <p className="text-[11px] text-[#737373] flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#A3C9A8]" />
              <span>Dados 100% isolados e sincronizados no Firestore</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
