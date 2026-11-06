import React, { useEffect, useMemo, useState } from 'react';
import { HandCoins, LogOut, Mail, Plus, Trash2, UserPlus, Users, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { Household, SharedExpense } from '../../types/finance';
import { computeBalances, splitCents, suggestSettlements } from '../../services/household';
import {
  acceptInvite,
  cancelInvite,
  createHousehold,
  declineInvite,
  deleteHousehold,
  deleteSharedExpense,
  inviteMember,
  leaveHousehold,
  normalizeEmail,
  saveSharedExpense,
  subscribeHouseholds,
  subscribeSharedExpenses
} from '../../services/householdService';
import { formatBRL } from '../../lib/format';
import { DeleteConfirmModal } from '../modals/DeleteConfirmModal';
import { EmptyState, Field, ModalShell, PageHeader, inputClass, parseAmountInput, todayISO } from '../common/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SharedTab: React.FC = () => {
  const { user } = useAuth();
  const { expenseCategories } = useFinance();
  const { showToast } = useToast();

  const uid = user?.uid || '';
  const email = user?.email || null;
  const myName = user?.displayName || user?.email?.split('@')[0] || 'Eu';

  const [groups, setGroups] = useState<{ member: Household[]; invites: Household[] }>({ member: [], invites: [] });
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<SharedExpense[]>([]);

  const [newGroupName, setNewGroupName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [expenseModal, setExpenseModal] = useState(false);
  const [confirm, setConfirm] = useState<null | 'leave' | 'delete'>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!uid) return;
    return subscribeHouseholds(uid, email, g => {
      setGroups(g);
      setLoaded(true);
    });
  }, [uid, email]);

  const group = groups.member.find(g => g.id === selectedId) || groups.member[0] || null;

  useEffect(() => {
    if (!group) {
      setExpenses([]);
      return;
    }
    return subscribeSharedExpenses(group.id, setExpenses);
  }, [group?.id]);

  const members = group?.members || [];
  const nameOf = (id: string) => group?.memberNames?.[id] || (id === uid ? myName : 'Membro');
  const isOwner = !!group && group.ownerId === uid;

  const balances = useMemo(() => computeBalances(expenses, members), [expenses, members]);
  const settlements = useMemo(() => suggestSettlements(balances), [balances]);

  const run = async (fn: () => Promise<void>, okMessage?: string) => {
    setBusy(true);
    try {
      await fn();
      if (okMessage) showToast(okMessage);
    } catch (err) {
      console.error(err);
      showToast('Não foi possível concluir. Verifique a conexão e as permissões do grupo.', { kind: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const submitGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;
    run(async () => {
      const id = await createHousehold(name, uid, myName);
      setSelectedId(id);
      setNewGroupName('');
    }, 'Grupo criado.');
  };

  const submitInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;
    const value = normalizeEmail(inviteEmail);
    if (!EMAIL_RE.test(value)) return showToast('Digite um e-mail válido.', { kind: 'error' });
    if (group.invitedEmails.includes(value)) return showToast('Esse e-mail já foi convidado.', { kind: 'info' });
    run(async () => {
      await inviteMember(group.id, value);
      setInviteEmail('');
    }, 'Convite criado. A pessoa o verá ao abrir esta aba com esse e-mail.');
  };

  // ------------------------------------------------------------- sem grupo
  if (!uid) return null;

  const invitesBlock =
    groups.invites.length > 0 ? (
      <section className="card-depth-3d p-5 rounded-3xl space-y-3" aria-label="Convites recebidos">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#E9C46A]" /> Convites para você
        </h3>
        {groups.invites.map(h => (
          <div key={h.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-[#0F1218] p-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">{h.name}</div>
              <div className="text-[10px] text-[#9AA4B5]">{h.members.length} membro(s)</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                disabled={busy || !email}
                onClick={() => run(() => acceptInvite(h.id, uid, email!, myName), `Você entrou em "${h.name}".`)}
                className="btn-liquid-glass-primary rounded-xl px-3 py-1.5 text-[11px] font-bold disabled:opacity-50 cursor-pointer"
              >
                Aceitar
              </button>
              <button
                type="button"
                disabled={busy || !email}
                onClick={() => run(() => declineInvite(h.id, email!), 'Convite recusado.')}
                className="btn-liquid-glass rounded-xl px-3 py-1.5 text-[11px] text-[#AEB6C4] disabled:opacity-50 cursor-pointer"
              >
                Recusar
              </button>
            </div>
          </div>
        ))}
      </section>
    ) : null;

  if (loaded && !group) {
    return (
      <div className="space-y-6 pb-24 w-full">
        <PageHeader icon={<Users className="w-5 h-5 text-[#38BDF8]" />} title="Despesas Compartilhadas" subtitle="Divida gastos com seu par ou sua família e acerte as contas sem planilha." />
        {invitesBlock}
        <section className="card-depth-3d p-5 rounded-3xl space-y-4">
          <EmptyState icon={<Users className="w-5 h-5" />} text="Crie um grupo (ex: Casa, Viagem) e convide as pessoas pelo e-mail da conta delas." />
          <form onSubmit={submitGroup} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <label htmlFor="new-group" className="sr-only">
              Nome do grupo
            </label>
            <input id="new-group" className={inputClass} value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Nome do grupo" maxLength={80} />
            <button type="submit" disabled={busy || !newGroupName.trim()} className="btn-liquid-glass-primary rounded-xl px-5 py-2 text-xs font-bold disabled:opacity-50 cursor-pointer whitespace-nowrap">
              Criar grupo
            </button>
          </form>
        </section>
      </div>
    );
  }

  if (!group) return <p className="text-xs text-[#9AA4B5]">Carregando grupos...</p>;

  return (
    <div className="space-y-6 pb-24 w-full">
      <PageHeader
        icon={<Users className="w-5 h-5 text-[#38BDF8]" />}
        title="Despesas Compartilhadas"
        subtitle="Quem pagou, quem deve e como acertar. Só os membros do grupo veem estes dados."
        actions={
          <button type="button" onClick={() => setExpenseModal(true)} className="btn-liquid-glass-primary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Nova despesa
          </button>
        }
      />

      {invitesBlock}

      {(
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Grupos">
          {groups.member.map(g => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={g.id === group.id}
              onClick={() => setSelectedId(g.id)}
              className={`rounded-xl border px-3 py-1.5 text-xs cursor-pointer ${g.id === group.id ? 'border-white/30 bg-white/8 text-white font-semibold' : 'border-white/10 text-[#AEB6C4] hover:text-white'}`}
            >
              {g.name}
            </button>
          ))}
          <form
            onSubmit={submitGroup}
            className="flex items-center gap-1.5"
          >
            <label htmlFor="another-group" className="sr-only">
              Novo grupo
            </label>
            <input id="another-group" className={`${inputClass} w-36`} value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Novo grupo" maxLength={80} />
            <button type="submit" disabled={busy || !newGroupName.trim()} aria-label="Criar grupo" className="btn-liquid-glass rounded-xl p-2 disabled:opacity-40 cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* ---------------------------------------------------- Membros e convites */}
      <section className="card-depth-3d p-5 rounded-3xl space-y-4" aria-labelledby="members-title">
        <h3 id="members-title" className="text-sm font-semibold text-white">
          Membros de "{group.name}"
        </h3>
        <ul className="flex flex-wrap gap-2">
          {members.map(m => (
            <li key={m} className="rounded-full border border-white/10 bg-[#0F1218] px-3 py-1 text-xs text-white">
              {nameOf(m)}
              {m === group.ownerId && <span className="ml-1.5 text-[10px] text-[#9AA4B5]">dono</span>}
              {m === uid && <span className="ml-1.5 text-[10px] text-[#A8B5D1]">você</span>}
            </li>
          ))}
          {group.invitedEmails.map(e => (
            <li key={e} className="inline-flex items-center gap-1 rounded-full border border-dashed border-white/15 px-3 py-1 text-xs text-[#9AA4B5]">
              {e} <span className="text-[10px]">(convidado)</span>
              <button type="button" aria-label={`Cancelar convite de ${e}`} onClick={() => run(() => cancelInvite(group.id, e))} className="hover:text-white cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={submitInvite} className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1">
            <Field label="Convidar por e-mail" htmlFor="invite-email" hint="A pessoa entra com a conta que usa esse e-mail (Google, ou e-mail verificado) e aceita o convite nesta aba.">
              <input id="invite-email" type="email" className={inputClass} value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="nome@email.com" />
            </Field>
          </div>
          <button type="submit" disabled={busy || !inviteEmail.trim()} className="btn-liquid-glass rounded-xl px-4 py-2 text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer sm:mb-[22px]">
            <UserPlus className="w-3.5 h-3.5" /> Convidar
          </button>
        </form>
      </section>

      {/* ------------------------------------------------------------ Saldos */}
      <section className="card-depth-3d p-5 rounded-3xl space-y-4" aria-labelledby="balances-title">
        <h3 id="balances-title" className="text-sm font-semibold text-white flex items-center gap-2">
          <HandCoins className="w-4 h-4 text-[#A3C9A8]" /> Quem deve a quem
        </h3>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {members.map(m => {
            const v = balances[m] || 0;
            return (
              <li key={m} className="rounded-2xl border border-white/8 bg-[#0F1218] p-3">
                <div className="text-xs text-white">{nameOf(m)}</div>
                <div className={`text-sm font-bold font-mono ${v > 0.004 ? 'text-[#A3C9A8]' : v < -0.004 ? 'text-[#E29578]' : 'text-[#9AA4B5]'}`}>
                  {v > 0.004 ? `recebe ${formatBRL(v)}` : v < -0.004 ? `deve ${formatBRL(-v)}` : 'em dia'}
                </div>
              </li>
            );
          })}
        </ul>

        {settlements.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-white">Para zerar as contas</h4>
            {settlements.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-[#0F1218] p-3 text-xs">
                <span className="text-white">
                  {nameOf(s.from)} paga <strong className="font-mono">{formatBRL(s.amount)}</strong> para {nameOf(s.to)}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () =>
                        saveSharedExpense(group.id, {
                          description: `Acerto: ${nameOf(s.from)} → ${nameOf(s.to)}`,
                          amount: s.amount,
                          date: todayISO(),
                          category: 'Acerto',
                          paidBy: s.from,
                          splitWith: [s.to],
                          isSettlement: true
                        }),
                      'Acerto registrado.'
                    )
                  }
                  className="btn-liquid-glass rounded-xl px-3 py-1.5 text-[11px] font-semibold text-[#A3C9A8] disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  Registrar pagamento
                </button>
              </div>
            ))}
          </div>
        ) : (
          expenses.length > 0 && <p className="text-xs text-[#A3C9A8]">Todas as contas estão acertadas.</p>
        )}
      </section>

      {/* ---------------------------------------------------------- Despesas */}
      <section className="card-depth-3d p-5 rounded-3xl space-y-3" aria-labelledby="shared-exp-title">
        <h3 id="shared-exp-title" className="text-sm font-semibold text-white">
          Histórico
        </h3>
        {expenses.length === 0 ? (
          <p className="text-xs text-[#9AA4B5]">Nenhuma despesa ainda. Use "Nova despesa" para registrar quem pagou e quem divide.</p>
        ) : (
          <ul className="divide-y divide-white/6 rounded-2xl border border-white/8 bg-[#0F1218] overflow-hidden">
            {expenses.slice(0, 80).map(e => {
              const share = splitCents(e.amount, e.splitWith.length)[0] / 100;
              return (
                <li key={e.id} className="flex items-center gap-3 px-3 py-2.5 text-xs">
                  <span className="w-12 shrink-0 text-[#9AA4B5] font-mono">{`${e.date.slice(8, 10)}/${e.date.slice(5, 7)}`}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-white">{e.description}</span>
                    <span className="block text-[10px] text-[#9AA4B5]">
                      {nameOf(e.paidBy)} pagou • {e.isSettlement ? 'acerto' : `dividido em ${e.splitWith.length} (≈ ${formatBRL(share)} cada)`}
                    </span>
                  </span>
                  <span className="font-mono font-semibold text-white">{formatBRL(e.amount)}</span>
                  <button
                    type="button"
                    aria-label={`Excluir ${e.description}`}
                    onClick={() => run(() => deleteSharedExpense(group.id, e.id), 'Despesa excluída.')}
                    className="p-1 rounded-lg text-[#9AA4B5] hover:text-[#E29578] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="flex justify-end">
        {isOwner ? (
          <button type="button" onClick={() => setConfirm('delete')} className="flex items-center gap-1.5 text-[11px] text-[#E29578] hover:underline cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" /> Excluir grupo
          </button>
        ) : (
          <button type="button" onClick={() => setConfirm('leave')} className="flex items-center gap-1.5 text-[11px] text-[#E29578] hover:underline cursor-pointer">
            <LogOut className="w-3.5 h-3.5" /> Sair do grupo
          </button>
        )}
      </div>

      <SharedExpenseModal
        isOpen={expenseModal}
        onClose={() => setExpenseModal(false)}
        members={members}
        nameOf={nameOf}
        defaultPayer={uid}
        categories={expenseCategories}
        onSave={data => run(() => saveSharedExpense(group.id, data), 'Despesa registrada.')}
      />

      <DeleteConfirmModal
        isOpen={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          const action = confirm;
          setConfirm(null);
          if (action === 'delete') {
            await run(() => deleteHousehold(group.id), 'Grupo excluído.');
            setSelectedId(null);
          } else {
            await run(() => leaveHousehold(group.id, uid), 'Você saiu do grupo.');
            setSelectedId(null);
          }
        }}
        title={confirm === 'delete' ? 'Excluir grupo' : 'Sair do grupo'}
        message={
          confirm === 'delete'
            ? 'Todas as despesas compartilhadas deste grupo serão apagadas para todos os membros.'
            : 'Você deixa de ver as despesas deste grupo. Os outros membros continuam com o histórico.'
        }
        itemDetail={`Grupo: ${group.name}`}
        confirmLabel={confirm === 'delete' ? 'Excluir grupo' : 'Sair'}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: string[];
  nameOf: (id: string) => string;
  defaultPayer: string;
  categories: string[];
  onSave: (data: Omit<SharedExpense, 'id' | 'householdId'>) => Promise<void>;
}

const SharedExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose, members, nameOf, defaultPayer, categories, onSave }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [paidBy, setPaidBy] = useState(defaultPayer);
  const [split, setSplit] = useState<string[]>(members);
  const [category, setCategory] = useState(categories[0] || 'Outros Gastos');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setDescription('');
    setAmount('');
    setDate(todayISO());
    setPaidBy(members.includes(defaultPayer) ? defaultPayer : members[0] || '');
    setSplit(members);
    setCategory(categories[0] || 'Outros Gastos');
    setError('');
  }, [isOpen, members, defaultPayer, categories]);

  const value = parseAmountInput(amount);
  const perPerson = isFinite(value) && value > 0 && split.length ? splitCents(value, split.length)[0] / 100 : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return setError('Descreva a despesa.');
    if (!isFinite(value) || value <= 0) return setError('Informe um valor maior que zero.');
    if (split.length === 0) return setError('Escolha pelo menos uma pessoa para dividir.');
    await onSave({
      description: description.trim().slice(0, 200),
      amount: Math.round(value * 100) / 100,
      date,
      category,
      paidBy,
      splitWith: split
    });
    onClose();
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Nova despesa compartilhada" description="O valor é dividido igualmente entre as pessoas marcadas.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Descrição" htmlFor="se-desc">
          <input id="se-desc" className={inputClass} value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Mercado, Jantar" maxLength={200} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor (R$)" htmlFor="se-amount">
            <input id="se-amount" className={inputClass} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
          </Field>
          <Field label="Data" htmlFor="se-date">
            <input id="se-date" type="date" className={inputClass} value={date} onChange={e => setDate(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quem pagou" htmlFor="se-payer">
            <select id="se-payer" className={inputClass} value={paidBy} onChange={e => setPaidBy(e.target.value)}>
              {members.map(m => (
                <option key={m} value={m}>
                  {nameOf(m)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Categoria" htmlFor="se-cat">
            <select id="se-cat" className={inputClass} value={category} onChange={e => setCategory(e.target.value)}>
              {categories.map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <fieldset>
          <legend className="text-[11px] font-semibold text-[#AEB6C4] mb-1.5">Dividir entre</legend>
          <div className="flex flex-wrap gap-2">
            {members.map(m => {
              const on = split.includes(m);
              return (
                <label key={m} className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs cursor-pointer ${on ? 'border-white/30 bg-white/8 text-white' : 'border-white/10 text-[#9AA4B5]'}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={e => setSplit(prev => (e.target.checked ? [...prev, m] : prev.filter(x => x !== m)))}
                    className="accent-[#38BDF8]"
                  />
                  {nameOf(m)}
                </label>
              );
            })}
          </div>
          {perPerson !== null && <p className="mt-1.5 text-[10px] text-[#9AA4B5]">≈ {formatBRL(perPerson)} por pessoa</p>}
        </fieldset>
        {error && (
          <p role="alert" className="text-[11px] text-[#E29578]">
            {error}
          </p>
        )}
        <button type="submit" className="btn-liquid-glass-primary w-full py-3 rounded-2xl text-xs font-bold cursor-pointer">
          Registrar despesa
        </button>
      </form>
    </ModalShell>
  );
};
