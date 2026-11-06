import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Account, SavingsGoal, Transfer } from '../types/finance';
import { useAuth } from './AuthContext';
import { useFinance } from './FinanceContext';
import { AccountBalance, computeAccountBalances } from '../services/accounts';
import { deleteUserDoc, saveUserDoc, subscribeUserCollection } from '../services/userCollections';

type NewAccount = Omit<Account, 'id' | 'userId' | 'createdAt'>;
type NewTransfer = Omit<Transfer, 'id' | 'userId' | 'createdAt'>;
type NewGoal = Pick<SavingsGoal, 'name' | 'targetAmount'> & Partial<Pick<SavingsGoal, 'deadline' | 'color'>>;

interface ExtrasContextType {
  accounts: Account[];
  transfers: Transfer[];
  goals: SavingsGoal[];
  accountBalances: Record<string, AccountBalance>;
  totalBalance: number;

  addAccount: (data: NewAccount) => Promise<void>;
  updateAccount: (id: string, data: Partial<NewAccount>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  addTransfer: (data: NewTransfer) => Promise<void>;
  deleteTransfer: (id: string) => Promise<void>;

  addGoal: (data: NewGoal) => Promise<void>;
  updateGoal: (id: string, data: Partial<NewGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  /** amount positivo = depósito, negativo = retirada. */
  contributeToGoal: (id: string, amount: number, date: string) => Promise<void>;
}

const ExtrasContext = createContext<ExtrasContextType | undefined>(undefined);

const round2 = (n: number) => Math.round(n * 100) / 100;

export const ExtrasProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { transactions } = useFinance();
  const uid = user?.uid;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);

  useEffect(() => {
    if (!uid) return;
    setAccounts([]);
    setTransfers([]);
    setGoals([]);
    const unsubs = [
      subscribeUserCollection<Account>(uid, 'accounts', list =>
        setAccounts(list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')))
      ),
      subscribeUserCollection<Transfer>(uid, 'transfers', list =>
        setTransfers(list.sort((a, b) => b.date.localeCompare(a.date)))
      ),
      subscribeUserCollection<SavingsGoal>(uid, 'goals', list =>
        setGoals(list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')))
      )
    ];
    return () => unsubs.forEach(u => u());
  }, [uid]);

  const accountBalances = useMemo(
    () => computeAccountBalances(accounts, transactions, transfers),
    [accounts, transactions, transfers]
  );
  const totalBalance = useMemo(
    () => round2(Object.values(accountBalances).reduce((s, b) => s + b.balance, 0)),
    [accountBalances]
  );

  const requireUid = () => {
    if (!uid) throw new Error('Faça login para continuar.');
    return uid;
  };

  const addAccount = useCallback(
    async (data: NewAccount) => {
      const id = requireUid();
      await saveUserDoc(id, 'accounts', { ...data, userId: id, createdAt: new Date().toISOString() }, 'acc');
    },
    [uid]
  );

  const updateAccount = useCallback(
    async (accountId: string, data: Partial<NewAccount>) => {
      const id = requireUid();
      const existing = accounts.find(a => a.id === accountId);
      if (!existing) return;
      await saveUserDoc(id, 'accounts', { ...existing, ...data }, 'acc');
    },
    [uid, accounts]
  );

  const deleteAccount = useCallback(
    async (accountId: string) => {
      const id = requireUid();
      // transferências que envolvem a conta deixariam de fazer sentido
      await Promise.all(
        transfers
          .filter(t => t.fromAccountId === accountId || t.toAccountId === accountId)
          .map(t => deleteUserDoc(id, 'transfers', t.id))
      );
      await deleteUserDoc(id, 'accounts', accountId);
    },
    [uid, transfers]
  );

  const addTransfer = useCallback(
    async (data: NewTransfer) => {
      const id = requireUid();
      await saveUserDoc(id, 'transfers', { ...data, userId: id, createdAt: new Date().toISOString() }, 'tr');
    },
    [uid]
  );

  const deleteTransfer = useCallback(
    async (transferId: string) => {
      await deleteUserDoc(requireUid(), 'transfers', transferId);
    },
    [uid]
  );

  const addGoal = useCallback(
    async (data: NewGoal) => {
      const id = requireUid();
      const goal: Omit<SavingsGoal, 'id'> = {
        userId: id,
        name: data.name,
        targetAmount: data.targetAmount,
        savedAmount: 0,
        deadline: data.deadline ?? null,
        color: data.color,
        contributions: [],
        createdAt: new Date().toISOString()
      };
      await saveUserDoc(id, 'goals', goal, 'goal');
    },
    [uid]
  );

  const updateGoal = useCallback(
    async (goalId: string, data: Partial<NewGoal>) => {
      const id = requireUid();
      const existing = goals.find(g => g.id === goalId);
      if (!existing) return;
      await saveUserDoc(id, 'goals', { ...existing, ...data }, 'goal');
    },
    [uid, goals]
  );

  const deleteGoal = useCallback(
    async (goalId: string) => {
      await deleteUserDoc(requireUid(), 'goals', goalId);
    },
    [uid]
  );

  const contributeToGoal = useCallback(
    async (goalId: string, amount: number, date: string) => {
      const id = requireUid();
      const existing = goals.find(g => g.id === goalId);
      if (!existing || !isFinite(amount) || amount === 0) return;
      const savedAmount = Math.max(0, round2(existing.savedAmount + amount));
      // mantém só as últimas 200 movimentações para não crescer sem limite
      const contributions = [...existing.contributions, { date, amount: round2(amount) }].slice(-200);
      await saveUserDoc(id, 'goals', { ...existing, savedAmount, contributions }, 'goal');
    },
    [uid, goals]
  );

  return (
    <ExtrasContext.Provider
      value={{
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
      }}
    >
      {children}
    </ExtrasContext.Provider>
  );
};

export const useExtras = (): ExtrasContextType => {
  const ctx = useContext(ExtrasContext);
  if (!ctx) throw new Error('useExtras deve ser usado dentro de ExtrasProvider');
  return ctx;
};
