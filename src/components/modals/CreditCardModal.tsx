import React, { useState } from 'react';
import { X, CreditCard as CardIcon, Building2, Hash, DollarSign, Calendar } from 'lucide-react';
import { CreditCard } from '../../types/finance';

interface CreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (card: Omit<CreditCard, 'id' | 'userId'>) => Promise<void>;
  cardToEdit?: CreditCard | null;
}

const COMMON_BANKS = [
  'Nubank',
  'Inter',
  'Itaú',
  'Bradesco',
  'Santander',
  'Banco do Brasil',
  'C6 Bank',
  'BTG Pactual',
  'XP Investimentos',
  'Outro'
];

const CARD_COLORS = [
  { name: 'Lavanda Grafite', hex: '#A8B5D1' },
  { name: 'Verde Sálvia', hex: '#A3C9A8' },
  { name: 'Terracota', hex: '#E29578' },
  { name: 'Dourado Suave', hex: '#E5A97D' },
  { name: 'Monocromático', hex: '#525252' },
  { name: 'Roxo Nubank', hex: '#8A05BE' }
];

export const CreditCardModal: React.FC<CreditCardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  cardToEdit
}) => {
  const [cardName, setCardName] = useState('');
  const [lastFourDigits, setLastFourDigits] = useState('');
  const [bankName, setBankName] = useState('Nubank');
  const [customBank, setCustomBank] = useState('');
  const [color, setColor] = useState('#A8B5D1');
  const [limitStr, setLimitStr] = useState('');
  const [closingDay, setClosingDay] = useState<number | ''>('');
  const [dueDay, setDueDay] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (cardToEdit) {
      setCardName(cardToEdit.cardName);
      setLastFourDigits(cardToEdit.lastFourDigits);
      if (COMMON_BANKS.includes(cardToEdit.bankName)) {
        setBankName(cardToEdit.bankName);
        setCustomBank('');
      } else {
        setBankName('Outro');
        setCustomBank(cardToEdit.bankName);
      }
      setColor(cardToEdit.color || '#A8B5D1');
      setLimitStr(cardToEdit.limitAmount ? cardToEdit.limitAmount.toString() : '');
      setClosingDay(cardToEdit.closingDay || '');
      setDueDay(cardToEdit.dueDay || '');
    } else {
      setCardName('');
      setLastFourDigits('');
      setBankName('Nubank');
      setCustomBank('');
      setColor('#A8B5D1');
      setLimitStr('');
      setClosingDay('');
      setDueDay('');
    }
  }, [cardToEdit, isOpen]);

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
    if (!cardName.trim() || !lastFourDigits.trim()) return;

    setSubmitting(true);
    try {
      const finalBank = bankName === 'Outro' ? (customBank.trim() || 'Outro') : bankName;
      const parsedLimit = limitStr ? parseFloat(limitStr.replace(',', '.')) : undefined;

      await onSave({
        cardName: cardName.trim(),
        lastFourDigits: lastFourDigits.trim().slice(-4),
        bankName: finalBank,
        color,
        limitAmount: parsedLimit && !isNaN(parsedLimit) ? parsedLimit : undefined,
        closingDay: closingDay ? Number(closingDay) : undefined,
        dueDay: dueDay ? Number(dueDay) : undefined
      });

      onClose();
    } catch (err) {
      console.error('Error saving credit card:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#141414] border border-[#262626] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#A8B5D1]/15 text-[#A8B5D1] flex items-center justify-center">
              <CardIcon className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white">
              {cardToEdit ? 'Editar Cartão' : 'Cadastrar Cartão de Crédito'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-[#737373] hover:text-white hover:bg-[#262626] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Preview Miniature */}
        <div 
          className="mt-4 p-4 rounded-2xl border border-white/10 relative overflow-hidden shadow-lg transition-all"
          style={{ 
            background: `linear-gradient(135deg, #1C1C1C 0%, #121212 100%)`,
            borderLeft: `4px solid ${color}` 
          }}
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider">
              {bankName === 'Outro' ? (customBank || 'Banco Emissor') : bankName}
            </span>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          </div>
          <div className="mt-4">
            <div className="text-sm font-bold text-white tracking-wide">
              {cardName || 'Nome do Cartão'}
            </div>
            <div className="text-xs font-mono text-[#737373] mt-1">
              •••• •••• •••• {lastFourDigits ? lastFourDigits.slice(-4) : '••••'}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block mb-1">
              Nome do Cartão (Apelido)
            </label>
            <input
              type="text"
              required
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="Ex: Nubank Ultravioleta, Inter Black..."
              className="w-full px-3.5 py-2.5 bg-[#0D0D0D] border border-[#262626] rounded-xl text-xs text-white placeholder-[#525252] focus:outline-hidden focus:border-white transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block mb-1">
                Últimos 4 Dígitos
              </label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={lastFourDigits}
                  onChange={(e) => setLastFourDigits(e.target.value.replace(/\D/g, ''))}
                  placeholder="1234"
                  className="w-full pl-8 pr-3 py-2.5 bg-[#0D0D0D] border border-[#262626] rounded-xl text-xs font-mono text-white placeholder-[#525252] focus:outline-hidden focus:border-white transition"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block mb-1">
                Banco Emissor
              </label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#0D0D0D] border border-[#262626] rounded-xl text-xs text-white focus:outline-hidden focus:border-white transition"
              >
                {COMMON_BANKS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {bankName === 'Outro' && (
            <div>
              <label className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block mb-1">
                Nome do Banco
              </label>
              <input
                type="text"
                required
                value={customBank}
                onChange={(e) => setCustomBank(e.target.value)}
                placeholder="Ex: Sicredi, Safra, etc."
                className="w-full px-3.5 py-2 bg-[#0D0D0D] border border-[#262626] rounded-xl text-xs text-white placeholder-[#525252] focus:outline-hidden focus:border-white transition"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block mb-1">
                Dia Fechamento (Fatura)
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value ? Number(e.target.value) : '')}
                placeholder="Ex: 25"
                className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#262626] rounded-xl text-xs text-white placeholder-[#525252] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block mb-1">
                Dia Vencimento
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value ? Number(e.target.value) : '')}
                placeholder="Ex: 5"
                className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#262626] rounded-xl text-xs text-white placeholder-[#525252] focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block mb-1">
              Limite do Cartão (Opcional)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#737373]">R$</span>
              <input
                type="number"
                step="0.01"
                value={limitStr}
                onChange={(e) => setLimitStr(e.target.value)}
                placeholder="5000,00"
                className="w-full pl-9 pr-3.5 py-2 bg-[#0D0D0D] border border-[#262626] rounded-xl text-xs text-white placeholder-[#525252] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Color tag selector */}
          <div>
            <label className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block mb-1.5">
              Cor de Destaque
            </label>
            <div className="flex items-center gap-2">
              {CARD_COLORS.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  title={c.name}
                  className={`w-7 h-7 rounded-full border-2 transition cursor-pointer flex items-center justify-center ${
                    color === c.hex ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || !cardName || !lastFourDigits}
              className="w-full min-h-[48px] rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-wider transition active:scale-[0.98] disabled:opacity-40 cursor-pointer shadow-md"
            >
              {submitting ? 'Salvando...' : cardToEdit ? 'Salvar Alterações' : 'Cadastrar Cartão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
