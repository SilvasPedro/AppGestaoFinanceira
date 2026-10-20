import React, { useEffect, useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: string;
  itemDetail?: string;
  confirmLabel?: string;
  isDestructive?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemDetail,
  confirmLabel = 'Excluir',
  isDestructive = true
}) => {
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Error confirming delete:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#141414] border border-[#262626] rounded-3xl p-6 shadow-2xl relative space-y-4"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-xl text-[#737373] hover:text-white hover:bg-[#262626] transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-[#E29578]/15 border border-[#E29578]/30 flex items-center justify-center text-[#E29578]">
          <Trash2 className="w-6 h-6 stroke-[2]" />
        </div>

        <div>
          <h3 className="text-base font-semibold text-white">
            {title}
          </h3>
          <p className="text-xs text-[#A3A3A3] mt-1.5 leading-relaxed">
            {message}
          </p>
          {itemDetail && (
            <div className="mt-3 p-2.5 rounded-xl bg-[#0D0D0D] border border-[#262626] text-xs font-mono text-white truncate">
              {itemDetail}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#262626] hover:bg-[#333333] text-xs font-semibold text-[#A3A3A3] hover:text-white transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50 ${
              isDestructive
                ? 'bg-[#E29578] hover:bg-[#E29578]/90 text-black shadow-md shadow-[#E29578]/20'
                : 'bg-white hover:bg-neutral-200 text-black'
            }`}
          >
            {submitting ? 'Aguarde...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
