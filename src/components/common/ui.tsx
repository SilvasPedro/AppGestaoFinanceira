import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export const inputClass =
  'w-full bg-[#0F1218] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 disabled:opacity-50';

export const labelClass = 'block text-[11px] font-semibold text-[#AEB6C4] mb-1';

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({ label, htmlFor, hint, children }) => (
  <div>
    <label htmlFor={htmlFor} className={labelClass}>
      {label}
    </label>
    {children}
    {hint && <p className="mt-1 text-[10px] text-[#9AA4B5]">{hint}</p>}
  </div>
);

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

/** Janela modal acessível: Esc fecha, foco entra no diálogo e volta ao elemento anterior ao fechar. */
export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-md'
}) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      // mantém o foco dentro do diálogo
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>('input,select,textarea') || panelRef.current;
      target?.focus();
    }, 30);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
      previous?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        className={`w-full ${maxWidth} max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/12 p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 focus:outline-hidden`}
        style={{ background: 'linear-gradient(180deg, #191E28 0%, #10141B 100%)' }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 id={titleId} className="text-sm font-bold text-white">
              {title}
            </h3>
            {description && <p className="text-[11px] text-[#9AA4B5] mt-0.5">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-[#9AA4B5] hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const PageHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; actions?: React.ReactNode }> = ({
  icon,
  title,
  subtitle,
  actions
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div>
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        {icon} {title}
      </h2>
      <p className="text-xs text-[#9AA4B5] mt-1">{subtitle}</p>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const EmptyState: React.FC<{ icon: React.ReactNode; text: string; action?: React.ReactNode }> = ({ icon, text, action }) => (
  <div className="p-8 rounded-2xl bg-[#0F1218] border border-[#1F2531] text-center space-y-3">
    <div className="w-10 h-10 rounded-full bg-[#1C212C] text-[#9AA4B5] flex items-center justify-center mx-auto">{icon}</div>
    <p className="text-xs text-[#9AA4B5] max-w-sm mx-auto">{text}</p>
    {action}
  </div>
);

export const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Converte texto digitado ("12,50" ou "12.50") em número; NaN se inválido. */
export const parseAmountInput = (raw: string): number => {
  const s = raw.trim();
  // com vírgula, o ponto é separador de milhar ("1.234,56"); sem vírgula, o ponto é decimal ("12.50")
  return s.includes(',') ? parseFloat(s.replace(/\./g, '').replace(',', '.')) : parseFloat(s);
};
