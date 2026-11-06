import React, { useEffect, useState } from 'react';
import { Account, AccountType, SavingsGoal } from '../../types/finance';
import { Field, ModalShell, inputClass, parseAmountInput, todayISO } from '../common/ui';
import { formatBRL } from '../../lib/format';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  wallet: 'Carteira (dinheiro)',
  investment: 'Investimentos'
};

const COLORS = ['#A3C9A8', '#A8B5D1', '#E5A97D', '#E29578', '#E9C46A', '#38BDF8', '#9B5DE5', '#2A9D8F'];

const ColorPicker: React.FC<{ value: string; onChange: (c: string) => void }> = ({ value, onChange }) => (
  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor">
    {COLORS.map(c => (
      <button
        key={c}
        type="button"
        role="radio"
        aria-checked={value === c}
        aria-label={`Cor ${c}`}
        onClick={() => onChange(c)}
        className={`w-7 h-7 rounded-full border-2 cursor-pointer ${value === c ? 'border-white' : 'border-transparent'}`}
        style={{ background: c }}
      />
    ))}
  </div>
);

// ------------------------------------------------------------------ Conta

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  onSave: (data: { name: string; type: AccountType; initialBalance: number; color: string }) => Promise<void>;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, account, onSave }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [balance, setBalance] = useState('0');
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(account?.name || '');
    setType(account?.type || 'checking');
    setBalance(account ? String(account.initialBalance).replace('.', ',') : '0');
    setColor(account?.color || COLORS[0]);
    setError('');
  }, [isOpen, account]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseAmountInput(balance || '0');
    if (!name.trim()) return setError('Dê um nome para a conta.');
    if (!isFinite(value)) return setError('Saldo inicial inválido.');
    setSaving(true);
    try {
      await onSave({ name: name.trim().slice(0, 80), type, initialBalance: Math.round(value * 100) / 100, color });
      onClose();
    } catch {
      setError('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title={account ? 'Editar conta' : 'Nova conta'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome" htmlFor="acc-name">
          <input id="acc-name" className={inputClass} value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Nubank, Carteira" maxLength={80} />
        </Field>
        <Field label="Tipo" htmlFor="acc-type">
          <select id="acc-type" className={inputClass} value={type} onChange={e => setType(e.target.value as AccountType)}>
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Saldo inicial (R$)" htmlFor="acc-balance" hint="Saldo da conta antes dos lançamentos registrados no app. Pode ser negativo.">
          <input id="acc-balance" className={inputClass} inputMode="decimal" value={balance} onChange={e => setBalance(e.target.value)} />
        </Field>
        <Field label="Cor">
          <ColorPicker value={color} onChange={setColor} />
        </Field>
        {error && (
          <p role="alert" className="text-[11px] text-[#E29578]">
            {error}
          </p>
        )}
        <button type="submit" disabled={saving} className="btn-liquid-glass-primary w-full py-3 rounded-2xl text-xs font-bold disabled:opacity-50 cursor-pointer">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </ModalShell>
  );
};

// ----------------------------------------------------------- Transferência

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  balances: Record<string, { balance: number }>;
  onSave: (data: { fromAccountId: string; toAccountId: string; amount: number; date: string; description?: string }) => Promise<void>;
}

export const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, accounts, balances, onSave }) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFrom(accounts[0]?.id || '');
    setTo(accounts[1]?.id || '');
    setAmount('');
    setDate(todayISO());
    setDescription('');
    setError('');
  }, [isOpen, accounts]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseAmountInput(amount);
    if (!from || !to) return setError('Escolha as duas contas.');
    if (from === to) return setError('Origem e destino precisam ser diferentes.');
    if (!isFinite(value) || value <= 0) return setError('Informe um valor maior que zero.');
    setSaving(true);
    try {
      await onSave({ fromAccountId: from, toAccountId: to, amount: Math.round(value * 100) / 100, date, description: description.trim() || undefined });
      onClose();
    } catch {
      setError('Não foi possível registrar a transferência.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Transferir entre contas" description="A transferência move o saldo sem contar como receita ou despesa.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="De" htmlFor="tr-from" hint={from && balances[from] ? `Saldo: ${formatBRL(balances[from].balance)}` : undefined}>
            <select id="tr-from" className={inputClass} value={from} onChange={e => setFrom(e.target.value)}>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Para" htmlFor="tr-to">
            <select id="tr-to" className={inputClass} value={to} onChange={e => setTo(e.target.value)}>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor (R$)" htmlFor="tr-amount">
            <input id="tr-amount" className={inputClass} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
          </Field>
          <Field label="Data" htmlFor="tr-date">
            <input id="tr-date" type="date" className={inputClass} value={date} onChange={e => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Observação (opcional)" htmlFor="tr-desc">
          <input id="tr-desc" className={inputClass} value={description} onChange={e => setDescription(e.target.value)} maxLength={120} />
        </Field>
        {error && (
          <p role="alert" className="text-[11px] text-[#E29578]">
            {error}
          </p>
        )}
        <button type="submit" disabled={saving} className="btn-liquid-glass-primary w-full py-3 rounded-2xl text-xs font-bold disabled:opacity-50 cursor-pointer">
          {saving ? 'Registrando...' : 'Transferir'}
        </button>
      </form>
    </ModalShell>
  );
};

// -------------------------------------------------------------------- Meta

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
  onSave: (data: { name: string; targetAmount: number; deadline: string | null; color: string }) => Promise<void>;
}

export const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, goal, onSave }) => {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(goal?.name || '');
    setTarget(goal ? String(goal.targetAmount).replace('.', ',') : '');
    setDeadline(goal?.deadline || '');
    setColor(goal?.color || COLORS[0]);
    setError('');
  }, [isOpen, goal]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseAmountInput(target);
    if (!name.trim()) return setError('Dê um nome para a meta.');
    if (!isFinite(value) || value <= 0) return setError('Informe um valor alvo maior que zero.');
    setSaving(true);
    try {
      await onSave({ name: name.trim().slice(0, 80), targetAmount: Math.round(value * 100) / 100, deadline: deadline || null, color });
      onClose();
    } catch {
      setError('Não foi possível salvar a meta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title={goal ? 'Editar meta' : 'Nova meta de economia'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome" htmlFor="goal-name">
          <input id="goal-name" className={inputClass} value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Reserva de emergência, Viagem" maxLength={80} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor alvo (R$)" htmlFor="goal-target">
            <input id="goal-target" className={inputClass} inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} placeholder="0,00" />
          </Field>
          <Field label="Prazo (opcional)" htmlFor="goal-deadline">
            <input id="goal-deadline" type="date" className={inputClass} value={deadline} onChange={e => setDeadline(e.target.value)} />
          </Field>
        </div>
        <Field label="Cor">
          <ColorPicker value={color} onChange={setColor} />
        </Field>
        {error && (
          <p role="alert" className="text-[11px] text-[#E29578]">
            {error}
          </p>
        )}
        <button type="submit" disabled={saving} className="btn-liquid-glass-primary w-full py-3 rounded-2xl text-xs font-bold disabled:opacity-50 cursor-pointer">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </ModalShell>
  );
};

// ------------------------------------------------ Depósito / retirada em meta

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
  mode: 'deposit' | 'withdraw';
  onSave: (amount: number, date: string) => Promise<void>;
}

export const ContributionModal: React.FC<ContributionModalProps> = ({ isOpen, onClose, goal, mode, onSave }) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setAmount('');
    setDate(todayISO());
    setError('');
  }, [isOpen, goal?.id, mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseAmountInput(amount);
    if (!isFinite(value) || value <= 0) return setError('Informe um valor maior que zero.');
    if (mode === 'withdraw' && goal && value > goal.savedAmount) return setError('A retirada é maior que o valor guardado.');
    setSaving(true);
    try {
      await onSave(mode === 'deposit' ? value : -value, date);
      onClose();
    } catch {
      setError('Não foi possível registrar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'deposit' ? `Guardar em "${goal?.name ?? ''}"` : `Retirar de "${goal?.name ?? ''}"`}
      description={goal ? `Guardado: ${formatBRL(goal.savedAmount)} de ${formatBRL(goal.targetAmount)}` : undefined}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor (R$)" htmlFor="contrib-amount">
            <input id="contrib-amount" className={inputClass} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
          </Field>
          <Field label="Data" htmlFor="contrib-date">
            <input id="contrib-date" type="date" className={inputClass} value={date} onChange={e => setDate(e.target.value)} />
          </Field>
        </div>
        {error && (
          <p role="alert" className="text-[11px] text-[#E29578]">
            {error}
          </p>
        )}
        <button type="submit" disabled={saving} className="btn-liquid-glass-primary w-full py-3 rounded-2xl text-xs font-bold disabled:opacity-50 cursor-pointer">
          {saving ? 'Salvando...' : mode === 'deposit' ? 'Guardar' : 'Retirar'}
        </button>
      </form>
    </ModalShell>
  );
};
