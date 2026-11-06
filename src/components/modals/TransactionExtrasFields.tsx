import React, { useRef, useState } from 'react';
import { Paperclip, Tag, Wallet, X, ImagePlus } from 'lucide-react';
import { Account } from '../../types/finance';

interface Props {
  accounts: Account[];
  accountId: string;
  onAccountChange: (id: string) => void;
  /** Contas não se aplicam a compras no cartão de crédito. */
  showAccount: boolean;

  tags: string[];
  onTagsChange: (tags: string[]) => void;
  tagSuggestions: string[];

  allowAttachment: boolean;
  hasExistingAttachment: boolean;
  removeExisting: boolean;
  onToggleRemoveExisting: () => void;
  newAttachmentPreview: string | null;
  onPickFile: (file: File) => void;
  onClearNewAttachment: () => void;
}

const MAX_TAGS = 10;

export const TransactionExtrasFields: React.FC<Props> = ({
  accounts,
  accountId,
  onAccountChange,
  showAccount,
  tags,
  onTagsChange,
  tagSuggestions,
  allowAttachment,
  hasExistingAttachment,
  removeExisting,
  onToggleRemoveExisting,
  newAttachmentPreview,
  onPickFile,
  onClearNewAttachment
}) => {
  const [tagInput, setTagInput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, '').slice(0, 30);
    if (!t || tags.length >= MAX_TAGS) return;
    if (tags.some(x => x.toLowerCase() === t.toLowerCase())) return;
    onTagsChange([...tags, t]);
  };

  const commitInput = () => {
    tagInput.split(',').forEach(addTag);
    setTagInput('');
  };

  const suggestions = tagSuggestions
    .filter(s => !tags.some(t => t.toLowerCase() === s.toLowerCase()))
    .filter(s => !tagInput || s.toLowerCase().includes(tagInput.toLowerCase()))
    .slice(0, 6);

  return (
    <div className="card-depth-3d p-4 rounded-2xl border border-white/10 space-y-4 bg-[#131720]/90">
      {showAccount && accounts.length > 0 && (
        <div className="space-y-1.5">
          <label htmlFor="tx-account" className="flex items-center gap-1.5 text-[11px] font-semibold text-[#AEB6C4]">
            <Wallet className="w-3.5 h-3.5" /> Conta ou carteira
          </label>
          <select
            id="tx-account"
            value={accountId}
            onChange={e => onAccountChange(e.target.value)}
            className="w-full bg-[#0F1218] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="">Sem conta vinculada</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="tx-tags" className="flex items-center gap-1.5 text-[11px] font-semibold text-[#AEB6C4]">
          <Tag className="w-3.5 h-3.5" /> Etiquetas
        </label>
        <div className="flex flex-wrap gap-1.5">
          {tags.map(t => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[#A8B5D1]/15 border border-[#A8B5D1]/30 px-2 py-0.5 text-[11px] text-[#A8B5D1]">
              #{t}
              <button
                type="button"
                aria-label={`Remover etiqueta ${t}`}
                onClick={() => onTagsChange(tags.filter(x => x !== t))}
                className="hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <input
          id="tx-tags"
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commitInput();
            } else if (e.key === 'Backspace' && !tagInput && tags.length) {
              onTagsChange(tags.slice(0, -1));
            }
          }}
          onBlur={commitInput}
          disabled={tags.length >= MAX_TAGS}
          placeholder={tags.length >= MAX_TAGS ? 'Limite de etiquetas atingido' : 'Ex: viagem, reembolsável (Enter para adicionar)'}
          className="w-full bg-[#0F1218] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30"
        />
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  addTag(s);
                  setTagInput('');
                }}
                className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-[#AEB6C4] hover:text-white hover:border-white/30 cursor-pointer"
              >
                #{s}
              </button>
            ))}
          </div>
        )}
      </div>

      {allowAttachment && (
        <div className="space-y-1.5">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#AEB6C4]">
            <Paperclip className="w-3.5 h-3.5" /> Comprovante ou nota fiscal
          </span>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) onPickFile(f);
              e.target.value = '';
            }}
          />

          {newAttachmentPreview ? (
            <div className="flex items-center gap-3">
              <img src={newAttachmentPreview} alt="Prévia do comprovante" className="h-16 w-16 rounded-lg object-cover border border-white/10" />
              <button
                type="button"
                onClick={onClearNewAttachment}
                className="text-[11px] text-[#E29578] hover:underline cursor-pointer"
              >
                Remover foto
              </button>
            </div>
          ) : hasExistingAttachment && !removeExisting ? (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#A3C9A8] flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" /> Comprovante anexado
              </span>
              <span className="flex gap-3">
                <button type="button" onClick={() => fileRef.current?.click()} className="text-[#A8B5D1] hover:underline cursor-pointer">
                  Trocar
                </button>
                <button type="button" onClick={onToggleRemoveExisting} className="text-[#E29578] hover:underline cursor-pointer">
                  Remover
                </button>
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn-liquid-glass flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-white cursor-pointer"
            >
              <ImagePlus className="w-4 h-4" />
              {removeExisting ? 'Anexar outra foto (o atual será removido)' : 'Tirar foto ou escolher imagem'}
            </button>
          )}
          <p className="text-[10px] text-[#9AA4B5]">A imagem é reduzida antes de salvar. Disponível para lançamentos avulsos.</p>
        </div>
      )}
    </div>
  );
};
