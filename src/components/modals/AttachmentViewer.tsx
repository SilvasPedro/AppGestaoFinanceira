import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Attachment, loadAttachment } from '../../services/userCollections';
import { ModalShell } from '../common/ui';

interface Props {
  transactionId: string | null;
  title?: string;
  onClose: () => void;
}

export const AttachmentViewer: React.FC<Props> = ({ transactionId, title, onClose }) => {
  const { user } = useAuth();
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'missing' | 'error'>('idle');

  useEffect(() => {
    if (!transactionId || !user?.uid) return;
    let cancelled = false;
    setAttachment(null);
    setState('loading');
    loadAttachment(user.uid, transactionId)
      .then(a => {
        if (cancelled) return;
        setAttachment(a);
        setState(a ? 'idle' : 'missing');
      })
      .catch(() => !cancelled && setState('error'));
    return () => {
      cancelled = true;
    };
  }, [transactionId, user?.uid]);

  return (
    <ModalShell isOpen={!!transactionId} onClose={onClose} title={title ? `Comprovante — ${title}` : 'Comprovante'} maxWidth="max-w-xl">
      {state === 'loading' && <p className="text-xs text-[#9AA4B5]">Carregando imagem...</p>}
      {state === 'missing' && <p className="text-xs text-[#9AA4B5]">Este lançamento não tem mais um comprovante salvo.</p>}
      {state === 'error' && (
        <p role="alert" className="text-xs text-[#E29578]">
          Não foi possível carregar o comprovante. Verifique a conexão.
        </p>
      )}
      {attachment && (
        <div className="space-y-3">
          <img src={attachment.dataUrl} alt={`Comprovante: ${title || attachment.fileName}`} className="w-full max-h-[60vh] object-contain rounded-xl bg-black" />
          <a
            href={attachment.dataUrl}
            download={`comprovante-${attachment.fileName.replace(/[^\w.-]+/g, '_') || 'imagem'}.jpg`}
            className="btn-liquid-glass inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white"
          >
            <Download className="w-3.5 h-3.5" /> Baixar imagem
          </a>
        </div>
      )}
    </ModalShell>
  );
};
