import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, type LucideIcon } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
}

interface ToastOptions {
  kind?: ToastKind;
  action?: ToastAction;
  /** Duração em ms. Padrão: 4000 (6000 quando há ação). */
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const STYLES: Record<ToastKind, { color: string; Icon: LucideIcon }> = {
  success: { color: '#A3C9A8', Icon: CheckCircle2 },
  error: { color: '#E29578', Icon: AlertTriangle },
  info: { color: '#A8B5D1', Icon: Info }
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, options: ToastOptions = {}) => {
    const id = nextId.current++;
    const kind = options.kind ?? 'success';
    setToasts(prev => [...prev.slice(-2), { id, kind, message, action: options.action }]);
    const duration = options.duration ?? (options.action ? 6000 : 4000);
    timers.current.set(id, setTimeout(() => dismiss(id), duration));
  }, [dismiss]);

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach(clearTimeout);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed z-[70] left-1/2 -translate-x-1/2 bottom-24 md:bottom-6 w-[calc(100%-2rem)] max-w-sm flex flex-col gap-2 pointer-events-none"
        role="region"
        aria-label="Notificações"
      >
        {toasts.map(t => {
          const { color, Icon } = STYLES[t.kind];
          return (
            <div
              key={t.id}
              role={t.kind === 'error' ? 'alert' : 'status'}
              aria-live={t.kind === 'error' ? 'assertive' : 'polite'}
              className="pointer-events-auto flex items-center gap-2.5 rounded-xl border bg-[#181D27] px-3.5 py-2.5 text-xs text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200"
              style={{ borderColor: `${color}66` }}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color }} />
              <span className="flex-1">{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                  className="font-bold cursor-pointer rounded-md px-1.5 py-0.5 hover:bg-white/10"
                  style={{ color }}
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Fechar notificação"
                className="text-[#9AA4B5] hover:text-white cursor-pointer rounded-md p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return ctx;
};
