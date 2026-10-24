import React, { useState } from 'react';
import { X, CreditCard as CardIcon, Building2, Hash, DollarSign, Calendar, Image as ImageIcon, Sparkles, Check } from 'lucide-react';
import { CreditCard } from '../../types/finance';

interface CreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (card: Omit<CreditCard, 'id' | 'userId'>) => Promise<void>;
  cardToEdit?: CreditCard | null;
}

export const BANK_DEFAULT_COLORS: Record<string, string> = {
  'Nubank': '#820AD1',
  'Inter': '#FF7A00',
  'Itaú': '#EC7000',
  'Santander': '#CC0000',
  'Bradesco': '#CC092F',
  'Banco do Brasil': '#003882',
  'C6 Bank': '#1C1C1C',
  'BTG Pactual': '#001E62',
  'XP Investimentos': '#121212',
  'Caixa': '#005CA9',
  'Sicredi': '#007E33',
  'Sicoob': '#003641'
};

const COMMON_BANKS = [
  'Nubank',
  'Inter',
  'Itaú',
  'Santander',
  'Bradesco',
  'Banco do Brasil',
  'C6 Bank',
  'BTG Pactual',
  'XP Investimentos',
  'Caixa',
  'Sicredi',
  'Sicoob',
  'Outro'
];

const CARD_COLORS = [
  { name: 'Roxo Nubank', hex: '#820AD1' },
  { name: 'Laranja Inter', hex: '#FF7A00' },
  { name: 'Laranja Itaú', hex: '#EC7000' },
  { name: 'Vermelho Santander', hex: '#CC0000' },
  { name: 'Vermelho Bradesco', hex: '#CC092F' },
  { name: 'Azul Banco do Brasil', hex: '#003882' },
  { name: 'Azul Caixa', hex: '#005CA9' },
  { name: 'Verde Sicredi', hex: '#007E33' },
  { name: 'Preto Black / C6', hex: '#1C1C1C' },
  { name: 'Lavanda Grafite', hex: '#A8B5D1' },
  { name: 'Dourado Suave', hex: '#E5A97D' },
  { name: 'Verde Sálvia', hex: '#A3C9A8' }
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
  const [color, setColor] = useState('#820AD1');
  const [logoUrl, setLogoUrl] = useState('');
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
      setColor(cardToEdit.color || BANK_DEFAULT_COLORS[cardToEdit.bankName] || '#820AD1');
      setLogoUrl(cardToEdit.logoUrl || cardToEdit.bankLogo || '');
      setLimitStr(cardToEdit.limitAmount ? cardToEdit.limitAmount.toString() : '');
      setClosingDay(cardToEdit.closingDay || '');
      setDueDay(cardToEdit.dueDay || '');
    } else {
      setCardName('');
      setLastFourDigits('');
      setBankName('Nubank');
      setCustomBank('');
      setColor(BANK_DEFAULT_COLORS['Nubank'] || '#820AD1');
      setLogoUrl('');
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

  const handleBankChange = (newBank: string) => {
    setBankName(newBank);
    const bankColor = BANK_DEFAULT_COLORS[newBank];
    if (bankColor) {
      setColor(bankColor);
    }
  };

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
        logoUrl: logoUrl.trim() || undefined,
        bankLogo: logoUrl.trim() || undefined,
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

  const displayBankName = bankName === 'Outro' ? (customBank || 'Banco Emissor') : bankName;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md card-depth-3d rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar border border-white/12 border-t-white/25"
        style={{
          background: 'linear-gradient(180deg, #181818 0%, #0F0F0F 100%)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl btn-liquid-glass flex items-center justify-center text-[#A8B5D1]">
              <CardIcon className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {cardToEdit ? 'Editar Cartão' : 'Cadastrar Cartão de Crédito'}
              </h3>
              <span className="text-[10px] text-[#737373]">
                Defina o banco, cores e dados da fatura
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-liquid-glass w-8 h-8 rounded-full text-white/70 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Live Card Preview Miniature */}
        <div 
          className="mt-4 p-4.5 rounded-2xl relative overflow-hidden transition-all duration-300 shadow-xl"
          style={{ 
            background: `linear-gradient(135deg, ${color} 0%, #0F0F0F 95%)`,
            boxShadow: `0 10px 24px -4px ${color}35, 0 4px 12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255, 255, 255, 0.4)`
          }}
        >
          {/* Gloss overlay */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              background: 'radial-gradient(ellipse at 85% 0%, rgba(255,255,255,0.4) 0%, transparent 65%)'
            }}
          />

          <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center gap-2">
              {/* Nome do Banco em destaque */}
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-white px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-xs border border-white/15 shadow-xs">
                {displayBankName}
              </span>
            </div>

            {/* Logo do Banco (se fornecido) */}
            {logoUrl ? (
              <div className="h-6 flex items-center justify-end">
                <img 
                  src={logoUrl} 
                  alt={displayBankName} 
                  className="max-h-6 max-w-[60px] object-contain drop-shadow-md rounded-xs" 
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              </div>
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: color }} />
            )}
          </div>

          <div className="mt-4 relative z-10">
            <div className="text-sm font-bold text-white tracking-wide drop-shadow-xs">
              {cardName || 'Nome do Cartão'}
            </div>
            <div className="text-xs font-mono text-white/80 mt-1 drop-shadow-xs tracking-wider">
              •••• •••• •••• {lastFourDigits ? lastFourDigits.slice(-4) : '••••'}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="text-[10px] font-semibold text-[#8C8C8C] uppercase tracking-wider block mb-1">
              Nome do Cartão (Apelido)
            </label>
            <input
              type="text"
              required
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="Ex: Nubank Ultravioleta, Inter Black..."
              className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/10 hover:border-white/20 focus:border-white/40 rounded-xl text-xs text-white placeholder-[#525252] focus:outline-hidden transition shadow-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-[#8C8C8C] uppercase tracking-wider block mb-1">
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
                  className="w-full pl-8 pr-3 py-2.5 bg-[#121212] border border-white/10 hover:border-white/20 focus:border-white/40 rounded-xl text-xs font-mono font-bold text-white placeholder-[#525252] focus:outline-hidden transition shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-[#8C8C8C] uppercase tracking-wider block mb-1">
                Banco Emissor
              </label>
              <select
                value={bankName}
                onChange={(e) => handleBankChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#121212] border border-white/10 hover:border-white/20 focus:border-white/40 rounded-xl text-xs text-white focus:outline-hidden transition shadow-xs"
              >
                {COMMON_BANKS.map(b => (
                  <option key={b} value={b} className="bg-[#171717] text-white">{b}</option>
                ))}
              </select>
            </div>
          </div>

          {bankName === 'Outro' && (
            <div>
              <label className="text-[10px] font-semibold text-[#8C8C8C] uppercase tracking-wider block mb-1">
                Nome do Banco
              </label>
              <input
                type="text"
                required
                value={customBank}
                onChange={(e) => setCustomBank(e.target.value)}
                placeholder="Ex: Sicredi, Safra, Sicoob, etc."
                className="w-full px-3.5 py-2 bg-[#121212] border border-white/10 rounded-xl text-xs text-white placeholder-[#525252] focus:outline-hidden"
              />
            </div>
          )}

          {/* Logo do Banco (URL) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold text-[#8C8C8C] uppercase tracking-wider block">
                Logo do Banco (URL da Imagem - Opcional)
              </label>
              <span className="text-[9.5px] text-[#737373]">PNG ou SVG com fundo transparente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <ImageIcon className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://exemplo.com/logo-nubank.png"
                  className="w-full pl-9 pr-3 py-2 bg-[#121212] border border-white/10 hover:border-white/20 focus:border-white/40 rounded-xl text-xs text-white placeholder-[#525252] focus:outline-hidden transition shadow-xs"
                />
              </div>
              {logoUrl && (
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-1 shrink-0">
                  <img 
                    src={logoUrl} 
                    alt="Preview" 
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-[#8C8C8C] uppercase tracking-wider block mb-1">
                Dia Fechamento
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value ? Number(e.target.value) : '')}
                placeholder="Ex: 25"
                className="w-full px-3 py-2 bg-[#121212] border border-white/10 rounded-xl text-xs text-white placeholder-[#525252] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-[#8C8C8C] uppercase tracking-wider block mb-1">
                Dia Vencimento
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value ? Number(e.target.value) : '')}
                placeholder="Ex: 5"
                className="w-full px-3 py-2 bg-[#121212] border border-white/10 rounded-xl text-xs text-white placeholder-[#525252] focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-[#8C8C8C] uppercase tracking-wider block mb-1">
              Limite do Cartão (Opcional)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#737373]">R$</span>
              <input
                type="number"
                step="0.01"
                value={limitStr}
                onChange={(e) => setLimitStr(e.target.value)}
                placeholder="5000,00"
                className="w-full pl-9 pr-3.5 py-2 bg-[#121212] border border-white/10 rounded-xl text-xs text-white placeholder-[#525252] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Color tag selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-semibold text-[#8C8C8C] uppercase tracking-wider block">
                Cor Oficial / Destaque do Cartão
              </label>
              <span className="text-[10px] text-[#A8B5D1] font-mono">{color}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {CARD_COLORS.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  title={c.name}
                  className={`w-7 h-7 rounded-full border-2 transition cursor-pointer flex items-center justify-center ${
                    color === c.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                >
                  {color === c.hex && <Check className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow-xs" />}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || !cardName || !lastFourDigits}
              className="btn-liquid-glass-primary w-full py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer shadow-xl"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Salvando...
                </span>
              ) : cardToEdit ? (
                'Salvar Alterações'
              ) : (
                'Cadastrar Cartão'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
