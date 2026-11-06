import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  Landmark,
  Pencil,
  PiggyBank,
  Plus,
  Scale,
  Target,
  Trash2,
  Wallet
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useExtras } from '../../context/ExtrasContext';
import { useToast } from '../../context/ToastContext';
import { Account, SavingsGoal } from '../../types/finance';
import { accountStatement, reconciliationDifference } from '../../services/accounts';
import { formatBRL } from '../../lib/format';
import { DeleteConfirmModal } from '../modals/DeleteConfirmModal';
import { EmptyState, Field, PageHeader, inputClass, parseAmountInput, todayISO } from '../common/ui';
import {
  ACCOUNT_TYPE_LABELS,
  AccountModal,
  ContributionModal,
  GoalModal,
  TransferModal
} from './AccountModals';

const goalMonthsLeft = (deadline: string): number => {
  const now = new Date();
  const [y, m] = deadline.split('-').map(Number);
  return Math.max(1, (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()) + 1);
};

export const AccountsTab: React.FC = () => {
  const { transactions, addTransaction, updateTransaction } = useFinance();
  const {
    accounts,
    transfers,
    goals,
    accountBalances,
    totalBalance,
    addAccount,
    updateAccount,
    deleteAccount,
    addTransfer,
    deleteTransfer,
    addGoal,
    updateGoal,
    deleteGoal,
    contributeToGoal
  } = useExtras();
  const { showToast } = useToast();

  const [accountModal, setAccountModal] = useState<{ open: boolean; account: Account | null }>({ open: false, account: null });
  const [transferOpen, setTransferOpen] = useState(false);
  const [goalModal, setGoalModal] = useState<{ open: boolean; goal: SavingsGoal | null }>({ open: false, goal: null });
  const [contribution, setContribution] = useState<{ goal: SavingsGoal | null; mode: 'deposit' | 'withdraw' }>({ goal: null, mode: 'deposit' });
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<SavingsGoal | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statementBalance, setStatementBalance] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const selected = accounts.find(a => a.id === selectedId) || null;
  const statement = useMemo(
    () => (selected ? accountStatement(selected.id, accounts, transactions, transfers).slice(0, 60) : []),
    [selected, accounts, transactions, transfers]
  );

  const typedStatement = parseAmountInput(statementBalance);
  const difference =
    selected && statementBalance.trim() && isFinite(typedStatement)
      ? reconciliationDifference(accountBalances[selected.id]?.balance ?? 0, typedStatement)
      : null;

  const createAdjustment = async () => {
    if (!selected || difference === null || difference === 0) return;
    setAdjusting(true);
    try {
      await addTransaction({
        type: difference > 0 ? 'income' : 'expense',
        nature: 'daily',
        amount: Math.abs(difference),
        category: difference > 0 ? 'Outras Receitas' : 'Outros Gastos',
        date: todayISO(),
        description: 'Ajuste de conciliação',
        paymentMethod: 'bank_transfer',
        isPaid: true,
        accountId: selected.id,
        reconciled: true,
        tags: ['conciliação']
      });
      setStatementBalance('');
      showToast('Ajuste criado. O saldo do app agora confere com o extrato.');
    } catch {
      showToast('Não foi possível criar o ajuste.', { kind: 'error' });
    } finally {
      setAdjusting(false);
    }
  };

  const toggleReconciled = async (txId: string, value: boolean) => {
    try {
      await updateTransaction(txId, { reconciled: value });
    } catch {
      showToast('Não foi possível atualizar a conciliação.', { kind: 'error' });
    }
  };

  const guard = async (fn: () => Promise<void>, okMessage: string) => {
    try {
      await fn();
      showToast(okMessage);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Algo deu errado. Tente novamente.', { kind: 'error' });
      throw err;
    }
  };

  const accountName = (id: string) => accounts.find(a => a.id === id)?.name || 'Conta removida';

  return (
    <div className="space-y-6 pb-24 w-full">
      <PageHeader
        icon={<Wallet className="w-5 h-5 text-[#A3C9A8]" />}
        title="Contas & Metas"
        subtitle="Saldo por conta, transferências, conciliação com o extrato do banco e metas de economia."
        actions={
          <>
            {accounts.length >= 2 && (
              <button type="button" onClick={() => setTransferOpen(true)} className="btn-liquid-glass px-3.5 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer">
                <ArrowLeftRight className="w-3.5 h-3.5" /> Transferir
              </button>
            )}
            <button type="button" onClick={() => setAccountModal({ open: true, account: null })} className="btn-liquid-glass-primary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Nova conta
            </button>
          </>
        }
      />

      {/* ------------------------------------------------------------ Contas */}
      <section className="card-depth-3d p-5 rounded-3xl space-y-4" aria-labelledby="accounts-title">
        <div className="flex items-center justify-between">
          <h3 id="accounts-title" className="text-sm font-semibold text-white flex items-center gap-2">
            <Landmark className="w-4 h-4 text-[#A8B5D1]" /> Minhas contas
          </h3>
          {accounts.length > 0 && (
            <span className="text-xs text-[#9AA4B5]">
              Total: <strong className={`font-mono ${totalBalance < 0 ? 'text-[#E29578]' : 'text-white'}`}>{formatBRL(totalBalance)}</strong>
            </span>
          )}
        </div>

        {accounts.length === 0 ? (
          <EmptyState
            icon={<Wallet className="w-5 h-5" />}
            text="Cadastre suas contas e carteiras para acompanhar o saldo de cada uma. Ao lançar uma receita ou despesa, escolha a conta de origem."
            action={
              <button type="button" onClick={() => setAccountModal({ open: true, account: null })} className="btn-liquid-glass-primary px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">
                Criar primeira conta
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {accounts.map(a => {
              const b = accountBalances[a.id];
              const active = selectedId === a.id;
              return (
                <div
                  key={a.id}
                  className={`rounded-2xl border p-4 space-y-3 transition ${active ? 'border-white/30 bg-white/5' : 'border-white/8 bg-[#0F1218]'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2.5 h-9 rounded-full shrink-0" style={{ background: a.color || '#A3C9A8' }} aria-hidden="true" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{a.name}</div>
                        <div className="text-[10px] text-[#9AA4B5]">{ACCOUNT_TYPE_LABELS[a.type]}</div>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button type="button" aria-label={`Editar ${a.name}`} onClick={() => setAccountModal({ open: true, account: a })} className="p-1 rounded-lg text-[#9AA4B5] hover:text-white hover:bg-[#283040] cursor-pointer">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" aria-label={`Excluir ${a.name}`} onClick={() => setAccountToDelete(a)} className="p-1 rounded-lg text-[#9AA4B5] hover:text-[#E29578] hover:bg-[#283040] cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className={`text-lg font-bold font-mono ${(b?.balance ?? 0) < 0 ? 'text-[#E29578]' : 'text-white'}`}>{formatBRL(b?.balance ?? 0)}</div>
                  <div className="flex justify-between text-[10px] text-[#9AA4B5]">
                    <span>Entradas {formatBRL((b?.income ?? 0) + (b?.transfersIn ?? 0))}</span>
                    <span>Saídas {formatBRL((b?.expense ?? 0) + (b?.transfersOut ?? 0))}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(active ? null : a.id);
                      setStatementBalance('');
                    }}
                    aria-expanded={active}
                    className="w-full btn-liquid-glass rounded-xl py-1.5 text-[11px] font-semibold text-[#A8B5D1] cursor-pointer"
                  >
                    {active ? 'Fechar extrato' : 'Ver extrato e conciliar'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ------------------------------------------------- Extrato / conciliação */}
      {selected && (
        <section className="card-depth-3d p-5 rounded-3xl space-y-4" aria-label={`Extrato de ${selected.name}`}>
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#E9C46A]" />
            <h3 className="text-sm font-semibold text-white">Conciliação — {selected.name}</h3>
          </div>
          <p className="text-[11px] text-[#9AA4B5]">
            Informe o saldo que aparece no extrato do banco. Se houver diferença, marque os lançamentos conferidos ou crie um ajuste. Compras no cartão de crédito
            só entram aqui quando você lança o pagamento da fatura.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="rounded-xl bg-[#0F1218] border border-white/8 p-3">
              <div className="text-[10px] text-[#9AA4B5]">Saldo no app</div>
              <div className="text-sm font-bold font-mono text-white">{formatBRL(accountBalances[selected.id]?.balance ?? 0)}</div>
            </div>
            <Field label="Saldo no extrato do banco (R$)" htmlFor="stmt-balance">
              <input id="stmt-balance" className={inputClass} inputMode="decimal" value={statementBalance} onChange={e => setStatementBalance(e.target.value)} placeholder="0,00" />
            </Field>
            <div>
              {difference === null ? (
                <span className="text-[11px] text-[#9AA4B5]">Digite o saldo para comparar.</span>
              ) : difference === 0 ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#A3C9A8]">
                  <Check className="w-4 h-4" /> Saldo confere
                </span>
              ) : (
                <div className="space-y-1.5">
                  <span className="block text-[11px] text-[#E5A97D]">
                    Diferença de <strong className="font-mono">{formatBRL(difference)}</strong>
                  </span>
                  <button type="button" onClick={createAdjustment} disabled={adjusting} className="btn-liquid-glass-primary w-full rounded-xl py-1.5 text-[11px] font-bold disabled:opacity-50 cursor-pointer">
                    {adjusting ? 'Criando...' : 'Criar lançamento de ajuste'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {statement.length === 0 ? (
            <p className="text-xs text-[#9AA4B5]">Nenhuma movimentação nesta conta ainda.</p>
          ) : (
            <ul className="divide-y divide-white/6 rounded-2xl border border-white/8 bg-[#0F1218] overflow-hidden">
              {statement.map(entry => (
                <li key={entry.key} className="flex items-center gap-3 px-3 py-2 text-xs">
                  {entry.transactionId ? (
                    <input
                      type="checkbox"
                      checked={!!entry.reconciled}
                      onChange={e => toggleReconciled(entry.transactionId!, e.target.checked)}
                      aria-label={`Conferido: ${entry.description}`}
                      className="w-4 h-4 accent-[#A3C9A8] cursor-pointer"
                    />
                  ) : (
                    <span className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span className="w-20 shrink-0 text-[#9AA4B5] font-mono">{entry.date.slice(8, 10) + '/' + entry.date.slice(5, 7) + '/' + entry.date.slice(2, 4)}</span>
                  <span className="flex-1 truncate text-white">{entry.description}</span>
                  <span className={`font-mono font-semibold ${entry.amount < 0 ? 'text-[#E29578]' : 'text-[#A3C9A8]'}`}>{formatBRL(entry.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ----------------------------------------------------- Transferências */}
      {transfers.length > 0 && (
        <section className="card-depth-3d p-5 rounded-3xl space-y-3" aria-labelledby="transfers-title">
          <h3 id="transfers-title" className="text-sm font-semibold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-[#38BDF8]" /> Transferências recentes
          </h3>
          <ul className="divide-y divide-white/6 rounded-2xl border border-white/8 bg-[#0F1218] overflow-hidden">
            {transfers.slice(0, 10).map(t => (
              <li key={t.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                <span className="w-20 shrink-0 text-[#9AA4B5] font-mono">{t.date.slice(8, 10) + '/' + t.date.slice(5, 7) + '/' + t.date.slice(2, 4)}</span>
                <span className="flex-1 truncate text-white">
                  {accountName(t.fromAccountId)} → {accountName(t.toAccountId)}
                  {t.description ? <span className="text-[#9AA4B5]"> · {t.description}</span> : null}
                </span>
                <span className="font-mono font-semibold text-white">{formatBRL(t.amount)}</span>
                <button
                  type="button"
                  aria-label="Excluir transferência"
                  onClick={() => guard(() => deleteTransfer(t.id), 'Transferência excluída.').catch(() => undefined)}
                  className="p-1 rounded-lg text-[#9AA4B5] hover:text-[#E29578] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------------------------------------------------------------- Metas */}
      <section className="card-depth-3d p-5 rounded-3xl space-y-4" aria-labelledby="goals-title">
        <div className="flex items-center justify-between">
          <h3 id="goals-title" className="text-sm font-semibold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-[#E29578]" /> Metas de economia
          </h3>
          <button type="button" onClick={() => setGoalModal({ open: true, goal: null })} className="btn-liquid-glass px-3 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Nova meta
          </button>
        </div>

        {goals.length === 0 ? (
          <EmptyState icon={<PiggyBank className="w-5 h-5" />} text="Crie metas como reserva de emergência ou uma viagem e acompanhe quanto já guardou." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {goals.map(g => {
              const pct = Math.min(100, (g.savedAmount / g.targetAmount) * 100);
              const done = g.savedAmount >= g.targetAmount;
              const remaining = Math.max(0, g.targetAmount - g.savedAmount);
              const perMonth = g.deadline && !done ? remaining / goalMonthsLeft(g.deadline) : null;
              const overdue = g.deadline && !done && g.deadline < todayISO();
              return (
                <div key={g.id} className="rounded-2xl border border-white/8 bg-[#0F1218] p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{g.name}</div>
                      <div className="text-[10px] text-[#9AA4B5]">
                        {g.deadline ? `Prazo: ${g.deadline.slice(8, 10)}/${g.deadline.slice(5, 7)}/${g.deadline.slice(0, 4)}` : 'Sem prazo'}
                        {overdue ? <span className="text-[#E29578]"> · atrasada</span> : null}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button type="button" aria-label={`Editar ${g.name}`} onClick={() => setGoalModal({ open: true, goal: g })} className="p-1 rounded-lg text-[#9AA4B5] hover:text-white hover:bg-[#283040] cursor-pointer">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" aria-label={`Excluir ${g.name}`} onClick={() => setGoalToDelete(g)} className="p-1 rounded-lg text-[#9AA4B5] hover:text-[#E29578] hover:bg-[#283040] cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-mono font-semibold text-white">{formatBRL(g.savedAmount)}</span>
                    <span className="text-[#9AA4B5]">de {formatBRL(g.targetAmount)}</span>
                  </div>
                  <div
                    className="h-2 rounded-full bg-[#1C212C] overflow-hidden"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(pct)}
                    aria-label={`Progresso da meta ${g.name}`}
                  >
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: done ? '#A3C9A8' : g.color || '#E29578' }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#9AA4B5]">
                    <span>{done ? 'Meta alcançada!' : `${Math.round(pct)}% • faltam ${formatBRL(remaining)}`}</span>
                    {perMonth !== null && <span>Sugestão: {formatBRL(perMonth)}/mês</span>}
                  </div>

                  <div className="flex gap-2">
                    <button type="button" onClick={() => setContribution({ goal: g, mode: 'deposit' })} className="flex-1 btn-liquid-glass-primary rounded-xl py-1.5 text-[11px] font-bold cursor-pointer">
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setContribution({ goal: g, mode: 'withdraw' })}
                      disabled={g.savedAmount <= 0}
                      className="flex-1 btn-liquid-glass rounded-xl py-1.5 text-[11px] font-semibold text-[#AEB6C4] disabled:opacity-40 cursor-pointer"
                    >
                      Retirar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------------- Modais */}
      <AccountModal
        isOpen={accountModal.open}
        account={accountModal.account}
        onClose={() => setAccountModal({ open: false, account: null })}
        onSave={data =>
          guard(
            () => (accountModal.account ? updateAccount(accountModal.account.id, data) : addAccount(data)),
            accountModal.account ? 'Conta atualizada.' : 'Conta criada.'
          )
        }
      />
      <TransferModal
        isOpen={transferOpen}
        onClose={() => setTransferOpen(false)}
        accounts={accounts}
        balances={accountBalances}
        onSave={data => guard(() => addTransfer(data), 'Transferência registrada.')}
      />
      <GoalModal
        isOpen={goalModal.open}
        goal={goalModal.goal}
        onClose={() => setGoalModal({ open: false, goal: null })}
        onSave={data =>
          guard(
            () => (goalModal.goal ? updateGoal(goalModal.goal.id, data) : addGoal(data)),
            goalModal.goal ? 'Meta atualizada.' : 'Meta criada.'
          )
        }
      />
      <ContributionModal
        isOpen={!!contribution.goal}
        goal={contribution.goal}
        mode={contribution.mode}
        onClose={() => setContribution(c => ({ ...c, goal: null }))}
        onSave={(amount, date) =>
          guard(() => contributeToGoal(contribution.goal!.id, amount, date), amount > 0 ? 'Valor guardado.' : 'Retirada registrada.')
        }
      />
      <DeleteConfirmModal
        isOpen={!!accountToDelete}
        onClose={() => setAccountToDelete(null)}
        onConfirm={async () => {
          if (!accountToDelete) return;
          await guard(() => deleteAccount(accountToDelete.id), 'Conta excluída.');
          if (selectedId === accountToDelete.id) setSelectedId(null);
          setAccountToDelete(null);
        }}
        title="Excluir conta"
        message="As transferências desta conta serão removidas. Os lançamentos continuam existindo, mas deixam de estar vinculados a ela."
        itemDetail={accountToDelete ? `Conta: ${accountToDelete.name}` : undefined}
        confirmLabel="Excluir conta"
      />
      <DeleteConfirmModal
        isOpen={!!goalToDelete}
        onClose={() => setGoalToDelete(null)}
        onConfirm={async () => {
          if (!goalToDelete) return;
          await guard(() => deleteGoal(goalToDelete.id), 'Meta excluída.');
          setGoalToDelete(null);
        }}
        title="Excluir meta"
        message="O histórico de depósitos desta meta será apagado."
        itemDetail={goalToDelete ? `Meta: ${goalToDelete.name}` : undefined}
        confirmLabel="Excluir meta"
      />
    </div>
  );
};
