import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  writeBatch,
  deleteField
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Transaction, CategoryBudget, CustomCategoryItem, CreditCard } from '../types/finance';

const GUEST_TX_KEY = 'finances_pro_clean_guest_txs';
const GUEST_BUDGETS_KEY = 'finances_pro_clean_guest_budgets';
const GUEST_CUSTOM_CATS_KEY = 'finances_pro_clean_guest_cats';
const GUEST_CARDS_KEY = 'finances_pro_clean_guest_cards';

export class FinanceService {
  /**
   * Remove chaves antigas de sessões anteriores que possam conter dados mockados
   */
  static cleanupLegacyStorage(): void {
    try {
      const legacyKeys = [
        'finances_pro_txs_v2',
        'finances_pro_budgets_v2',
        'finances_pro_custom_cats_v2',
        'finances_pro_guest_txs_v1',
        'finances_pro_guest_budgets_v1',
        'finances_pro_mock_seeded'
      ];
      legacyKeys.forEach(k => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }

  /**
   * Assina a coleção de transações do usuário no Firestore em tempo real.
   * NUNCA injeta dados mockados, dados de exemplo ou seeds fictícios.
   */
  static subscribeTransactions(
    userId: string,
    isGuest: boolean,
    callback: (transactions: Transaction[]) => void
  ): () => void {
    FinanceService.cleanupLegacyStorage();

    if (isGuest || !userId) {
      const stored = localStorage.getItem(GUEST_TX_KEY);
      if (stored) {
        try {
          callback(JSON.parse(stored));
        } catch {
          callback([]);
        }
      } else {
        callback([]);
      }
      return () => {};
    }

    try {
      const txRef = collection(db, 'users', userId, 'transactions');
      const q = query(txRef, orderBy('date', 'desc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            callback([]);
            return;
          }
          const list: Transaction[] = [];
          snapshot.forEach((docSnapshot) => {
            list.push({ id: docSnapshot.id, ...(docSnapshot.data() as Omit<Transaction, 'id'>) });
          });
          callback(list);
        },
        (error) => {
          console.warn('Firestore subscription status:', error);
          callback([]);
        }
      );

      return unsubscribe;
    } catch (e) {
      console.warn('Error setting up firestore listener:', e);
      callback([]);
      return () => {};
    }
  }

  /**
   * Assina a coleção de limites orçamentários do usuário no Firestore em tempo real.
   */
  static subscribeBudgets(
    userId: string,
    isGuest: boolean,
    callback: (budgets: CategoryBudget[]) => void
  ): () => void {
    if (isGuest || !userId) {
      const stored = localStorage.getItem(GUEST_BUDGETS_KEY);
      if (stored) {
        try {
          callback(JSON.parse(stored));
        } catch {
          callback([]);
        }
      } else {
        callback([]);
      }
      return () => {};
    }

    try {
      const bRef = collection(db, 'users', userId, 'budgets');
      const unsubscribe = onSnapshot(
        bRef,
        (snapshot) => {
          if (snapshot.empty) {
            callback([]);
            return;
          }
          const list: CategoryBudget[] = [];
          snapshot.forEach((docSnapshot) => {
            list.push({ id: docSnapshot.id, ...(docSnapshot.data() as Omit<CategoryBudget, 'id'>) });
          });
          callback(list);
        },
        (error) => {
          console.warn('Firestore budgets subscription status:', error);
          callback([]);
        }
      );

      return unsubscribe;
    } catch (e) {
      console.warn('Error setting up firestore budgets listener:', e);
      callback([]);
      return () => {};
    }
  }

  /**
   * Assina categorias personalizadas do usuário
   */
  static subscribeCustomCategories(
    userId: string,
    isGuest: boolean,
    callback: (categories: CustomCategoryItem[]) => void
  ): () => void {
    if (isGuest || !userId) {
      const stored = localStorage.getItem(GUEST_CUSTOM_CATS_KEY);
      if (stored) {
        try {
          callback(JSON.parse(stored));
        } catch {
          callback([]);
        }
      } else {
        callback([]);
      }
      return () => {};
    }

    try {
      const catsRef = collection(db, 'users', userId, 'categories');
      const unsubscribe = onSnapshot(
        catsRef,
        (snapshot) => {
          if (snapshot.empty) {
            callback([]);
            return;
          }
          const list: CustomCategoryItem[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as Omit<CustomCategoryItem, 'id'>) });
          });
          callback(list);
        },
        (err) => {
          console.warn('Firestore custom categories subscription status:', err);
          callback([]);
        }
      );
      return unsubscribe;
    } catch (e) {
      console.warn('Error setting up custom categories listener:', e);
      callback([]);
      return () => {};
    }
  }

  /**
   * Assina cartões de crédito do usuário
   */
  static subscribeCreditCards(
    userId: string,
    isGuest: boolean,
    callback: (cards: CreditCard[]) => void
  ): () => void {
    if (isGuest || !userId) {
      const stored = localStorage.getItem(GUEST_CARDS_KEY);
      if (stored) {
        try {
          callback(JSON.parse(stored));
        } catch {
          callback([]);
        }
      } else {
        callback([]);
      }
      return () => {};
    }

    try {
      const cardsRef = collection(db, 'users', userId, 'creditCards');
      const q = query(cardsRef, orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            callback([]);
            return;
          }
          const list: CreditCard[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as Omit<CreditCard, 'id'>) });
          });
          callback(list);
        },
        (err) => {
          console.warn('Firestore credit cards subscription status:', err);
          callback([]);
        }
      );
      return unsubscribe;
    } catch (e) {
      console.warn('Error setting up credit cards listener:', e);
      callback([]);
      return () => {};
    }
  }

  /**
   * Salva ou atualiza um cartão de crédito
   */
  static async saveCreditCard(
    userId: string,
    card: Omit<CreditCard, 'id' | 'userId'> & { id?: string },
    isGuest: boolean
  ): Promise<string> {
    const cardId = card.id || `card_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const fullCard: CreditCard = {
      ...card,
      id: cardId,
      userId: isGuest ? 'guest' : userId,
      createdAt: card.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isGuest || !userId) {
      const current = JSON.parse(localStorage.getItem(GUEST_CARDS_KEY) || '[]');
      const filtered = current.filter((c: CreditCard) => c.id !== cardId);
      const updated = [fullCard, ...filtered];
      localStorage.setItem(GUEST_CARDS_KEY, JSON.stringify(updated));
      return cardId;
    }

    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(fullCard)) {
      if (v !== undefined) sanitized[k] = v;
    }

    const docRef = doc(db, 'users', userId, 'creditCards', cardId);
    await setDoc(docRef, sanitized, { merge: true });
    return cardId;
  }

  /**
   * Deleta um cartão de crédito
   */
  static async deleteCreditCard(
    userId: string,
    cardId: string,
    isGuest: boolean
  ): Promise<void> {
    if (isGuest || !userId) {
      const current: CreditCard[] = JSON.parse(localStorage.getItem(GUEST_CARDS_KEY) || '[]');
      const filtered = current.filter(c => c.id !== cardId);
      localStorage.setItem(GUEST_CARDS_KEY, JSON.stringify(filtered));
      return;
    }

    const docRef = doc(db, 'users', userId, 'creditCards', cardId);
    await deleteDoc(docRef);
  }

  /**
   * Salva categoria personalizada
   */
  static async saveCustomCategory(
    userId: string,
    category: Omit<CustomCategoryItem, 'id'> & { id?: string },
    isGuest: boolean
  ): Promise<void> {
    const catId = category.id || `cat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const item: CustomCategoryItem = {
      ...category,
      id: catId
    };

    if (isGuest || !userId) {
      const current = JSON.parse(localStorage.getItem(GUEST_CUSTOM_CATS_KEY) || '[]');
      const filtered = current.filter((c: CustomCategoryItem) => c.name.toLowerCase() !== item.name.toLowerCase());
      const updated = [...filtered, item];
      localStorage.setItem(GUEST_CUSTOM_CATS_KEY, JSON.stringify(updated));
      return;
    }

    const docRef = doc(db, 'users', userId, 'categories', catId);
    await setDoc(docRef, item, { merge: true });
  }

  /**
   * Remove categoria personalizada
   */
  static async deleteCustomCategory(
    userId: string,
    categoryId: string,
    isGuest: boolean
  ): Promise<void> {
    if (isGuest || !userId) {
      const current: CustomCategoryItem[] = JSON.parse(localStorage.getItem(GUEST_CUSTOM_CATS_KEY) || '[]');
      const filtered = current.filter(c => c.id !== categoryId);
      localStorage.setItem(GUEST_CUSTOM_CATS_KEY, JSON.stringify(filtered));
      return;
    }

    const docRef = doc(db, 'users', userId, 'categories', categoryId);
    await deleteDoc(docRef);
  }

  /**
   * Adiciona ou atualiza uma transação (Gastos Diários, Fixos ou Parcelados)
   */
  static async saveTransaction(
    userId: string,
    transaction: Omit<Transaction, 'id' | 'userId'> & { id?: string },
    isGuest: boolean
  ): Promise<string> {
    const txId = transaction.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const fullTx: Transaction = {
      ...transaction,
      id: txId,
      userId: isGuest ? 'guest' : userId,
      createdAt: transaction.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Remove qualquer valor 'undefined' para compatibilidade estrita com Firestore setDoc
    const sanitizedDoc: Record<string, any> = {};
    for (const [key, val] of Object.entries(fullTx)) {
      if (val !== undefined) {
        sanitizedDoc[key] = val;
      }
    }

    // Se não for compra parcelada, garante a remoção do campo no Firestore e no cache local
    if (transaction.nature !== 'installment') {
      delete fullTx.installmentDetails;
      delete sanitizedDoc.installmentDetails;
      sanitizedDoc.installmentDetails = deleteField();
    }

    if (isGuest || !userId) {
      delete fullTx.installmentDetails;
      const current = JSON.parse(localStorage.getItem(GUEST_TX_KEY) || '[]');
      const filtered = current.filter((t: Transaction) => t.id !== txId);
      const updated = [fullTx, ...filtered];
      localStorage.setItem(GUEST_TX_KEY, JSON.stringify(updated));
      return txId;
    }

    const docRef = doc(db, 'users', userId, 'transactions', txId);
    await setDoc(docRef, sanitizedDoc, { merge: true });
    return txId;
  }

  /**
   * Remove uma transação do banco ou armazenamento local
   */
  static async deleteTransaction(userId: string, txId: string, isGuest: boolean): Promise<void> {
    if (isGuest || !userId) {
      const current: Transaction[] = JSON.parse(localStorage.getItem(GUEST_TX_KEY) || '[]');
      const filtered = current.filter(t => t.id !== txId);
      localStorage.setItem(GUEST_TX_KEY, JSON.stringify(filtered));
      return;
    }

    const docRef = doc(db, 'users', userId, 'transactions', txId);
    await deleteDoc(docRef);
  }

  /**
   * Remove todas as parcelas de um grupo de parcelamento (exclusão total)
   */
  static async deleteInstallmentGroup(userId: string, groupId: string, isGuest: boolean): Promise<void> {
    if (isGuest || !userId) {
      const current: Transaction[] = JSON.parse(localStorage.getItem(GUEST_TX_KEY) || '[]');
      const filtered = current.filter(t => t.installmentDetails?.groupId !== groupId);
      localStorage.setItem(GUEST_TX_KEY, JSON.stringify(filtered));
      return;
    }

    const txRef = collection(db, 'users', userId, 'transactions');
    const snapshot = await getDocs(txRef);
    const batch = writeBatch(db);
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.installmentDetails?.groupId === groupId) {
        batch.delete(docSnap.ref);
      }
    });
    await batch.commit();
  }

  /**
   * Adiantamento / Amortização de parcelas:
   * Pega as próximas K parcelas não pagas do grupo, atualiza sua data para targetDate,
   * aplica eventual desconto e marca como pagas.
   */
  static async advanceInstallments(
    userId: string,
    groupId: string,
    countToAdvance: number,
    discountAmount: number,
    targetDate: string,
    isGuest: boolean
  ): Promise<void> {
    if (isGuest || !userId) {
      const current: Transaction[] = JSON.parse(localStorage.getItem(GUEST_TX_KEY) || '[]');
      const groupItems = current
        .filter(t => t.installmentDetails?.groupId === groupId && !t.isPaid)
        .sort((a, b) => (a.installmentDetails?.currentInstallment || 0) - (b.installmentDetails?.currentInstallment || 0));

      const toAdvance = groupItems.slice(0, countToAdvance);
      const discountPerItem = toAdvance.length > 0 ? discountAmount / toAdvance.length : 0;
      const advanceIds = new Set(toAdvance.map(t => t.id));

      const updated = current.map(t => {
        if (!advanceIds.has(t.id)) return t;
        const newAmount = Math.max(0, Math.round((t.amount - discountPerItem) * 100) / 100);
        return {
          ...t,
          date: targetDate,
          isPaid: true,
          amount: newAmount,
          description: t.description.includes('Adiantada') ? t.description : `${t.description} (Adiantada)`,
          updatedAt: new Date().toISOString()
        };
      });

      localStorage.setItem(GUEST_TX_KEY, JSON.stringify(updated));
      return;
    }

    const txRef = collection(db, 'users', userId, 'transactions');
    const snapshot = await getDocs(txRef);
    const matchingDocs: { id: string; ref: any; data: any }[] = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.installmentDetails?.groupId === groupId && !data.isPaid) {
        matchingDocs.push({ id: docSnap.id, ref: docSnap.ref, data });
      }
    });

    matchingDocs.sort((a, b) => 
      (a.data.installmentDetails?.currentInstallment || 0) - (b.data.installmentDetails?.currentInstallment || 0)
    );

    const toAdvance = matchingDocs.slice(0, countToAdvance);
    if (toAdvance.length === 0) return;

    const discountPerItem = discountAmount > 0 ? discountAmount / toAdvance.length : 0;
    const batch = writeBatch(db);

    toAdvance.forEach(item => {
      const oldAmount = Number(item.data.amount) || 0;
      const newAmount = Math.max(0, Math.round((oldAmount - discountPerItem) * 100) / 100);
      const oldDesc = String(item.data.description || '');
      const newDesc = oldDesc.includes('Adiantada') ? oldDesc : `${oldDesc} (Adiantada)`;

      batch.update(item.ref, {
        date: targetDate,
        isPaid: true,
        amount: newAmount,
        description: newDesc,
        updatedAt: new Date().toISOString()
      });
    });

    await batch.commit();
  }

  /**
   * Atualização em lote de parcelamento (edição de descrição, categoria, cartão, valor da parcela)
   */
  static async updateInstallmentGroup(
    userId: string,
    groupId: string,
    updates: {
      description?: string;
      category?: string;
      paymentMethod?: PaymentMethod;
      cardId?: string;
      cardName?: string;
      cardLastFour?: string;
      monthlyAmount?: number;
      totalInstallments?: number;
    },
    isGuest: boolean
  ): Promise<void> {
    if (isGuest || !userId) {
      const current: Transaction[] = JSON.parse(localStorage.getItem(GUEST_TX_KEY) || '[]');
      const updated = current.map(t => {
        if (t.installmentDetails?.groupId !== groupId) return t;
        const curInstallment = t.installmentDetails.currentInstallment;
        const total = updates.totalInstallments || t.installmentDetails.totalInstallments;
        const monthly = updates.monthlyAmount !== undefined ? updates.monthlyAmount : t.amount;
        const baseDesc = updates.description !== undefined ? updates.description : t.description.replace(/\s\(\d+\/\d+\).*$/, '');
        return {
          ...t,
          description: `${baseDesc} (${curInstallment}/${total})`,
          amount: monthly,
          category: updates.category || t.category,
          paymentMethod: updates.paymentMethod || t.paymentMethod,
          cardId: updates.cardId !== undefined ? updates.cardId : t.cardId,
          cardName: updates.cardName !== undefined ? updates.cardName : t.cardName,
          cardLastFour: updates.cardLastFour !== undefined ? updates.cardLastFour : t.cardLastFour,
          installmentDetails: {
            ...t.installmentDetails,
            totalInstallments: total,
            monthlyAmount: monthly,
            totalAmount: Math.round(monthly * total * 100) / 100
          },
          updatedAt: new Date().toISOString()
        };
      });
      localStorage.setItem(GUEST_TX_KEY, JSON.stringify(updated));
      return;
    }

    const txRef = collection(db, 'users', userId, 'transactions');
    const snapshot = await getDocs(txRef);
    const batch = writeBatch(db);

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.installmentDetails?.groupId === groupId) {
        const curInstallment = data.installmentDetails.currentInstallment;
        const total = updates.totalInstallments || data.installmentDetails.totalInstallments;
        const monthly = updates.monthlyAmount !== undefined ? updates.monthlyAmount : data.amount;
        const baseDesc = updates.description !== undefined ? updates.description : (data.description || '').replace(/\s\(\d+\/\d+\).*$/, '');

        const patch: Record<string, any> = {
          description: `${baseDesc} (${curInstallment}/${total})`,
          amount: monthly,
          'installmentDetails.totalInstallments': total,
          'installmentDetails.monthlyAmount': monthly,
          'installmentDetails.totalAmount': Math.round(monthly * total * 100) / 100,
          updatedAt: new Date().toISOString()
        };

        if (updates.category) patch.category = updates.category;
        if (updates.paymentMethod) patch.paymentMethod = updates.paymentMethod;
        if (updates.cardId !== undefined) patch.cardId = updates.cardId;
        if (updates.cardName !== undefined) patch.cardName = updates.cardName;
        if (updates.cardLastFour !== undefined) patch.cardLastFour = updates.cardLastFour;

        batch.update(docSnap.ref, patch);
      }
    });

    await batch.commit();
  }

  /**
   * Descontinua uma transação recorrente fixa a partir de um mês específico
   */
  static async discontinueRecurringTransaction(
    userId: string,
    txId: string,
    fromMonth: string,
    isGuest: boolean
  ): Promise<void> {
    if (isGuest || !userId) {
      const current: Transaction[] = JSON.parse(localStorage.getItem(GUEST_TX_KEY) || '[]');
      const updated = current.map(t => (t.id === txId ? { ...t, endDate: fromMonth } : t));
      localStorage.setItem(GUEST_TX_KEY, JSON.stringify(updated));
      return;
    }

    const docRef = doc(db, 'users', userId, 'transactions', txId);
    await updateDoc(docRef, { endDate: fromMonth, updatedAt: new Date().toISOString() });
  }

  /**
   * Alterna status Pago / Pendente para contas fixas ou recorrentes
   */
  static async togglePaidStatus(
    userId: string,
    txId: string,
    currentStatus: boolean,
    isGuest: boolean,
    month?: string,
    currentPaidMonths: string[] = []
  ): Promise<void> {
    if (isGuest || !userId) {
      const current: Transaction[] = JSON.parse(localStorage.getItem(GUEST_TX_KEY) || '[]');
      const updated = current.map(t => {
        if (t.id !== txId) return t;
        let newPaidMonths = t.paidMonths || [];
        if (month) {
          newPaidMonths = newPaidMonths.includes(month)
            ? newPaidMonths.filter(m => m !== month)
            : [...newPaidMonths, month];
        }
        return { ...t, isPaid: !currentStatus, paidMonths: newPaidMonths };
      });
      localStorage.setItem(GUEST_TX_KEY, JSON.stringify(updated));
      return;
    }

    const docRef = doc(db, 'users', userId, 'transactions', txId);
    const updates: Record<string, any> = { 
      isPaid: !currentStatus, 
      updatedAt: new Date().toISOString() 
    };

    if (month) {
      const hasMonth = currentPaidMonths.includes(month);
      const updatedPaidMonths = hasMonth 
        ? currentPaidMonths.filter(m => m !== month)
        : [...currentPaidMonths, month];
      updates.paidMonths = updatedPaidMonths;
    }

    await updateDoc(docRef, updates);
  }

  /**
   * Salva limite orçamentário para uma categoria
   */
  static async saveBudget(
    userId: string,
    budget: CategoryBudget,
    isGuest: boolean
  ): Promise<void> {
    const budgetId = budget.id || `budget_${budget.category.toLowerCase().replace(/\s+/g, '_')}`;
    const toSave: CategoryBudget = {
      ...budget,
      id: budgetId,
      userId: isGuest ? 'guest' : userId
    };

    if (isGuest || !userId) {
      const current = JSON.parse(localStorage.getItem(GUEST_BUDGETS_KEY) || '[]');
      const filtered = current.filter((b: CategoryBudget) => b.category.toLowerCase() !== toSave.category.toLowerCase());
      const updated = [...filtered, toSave];
      localStorage.setItem(GUEST_BUDGETS_KEY, JSON.stringify(updated));
      return;
    }

    const docRef = doc(db, 'users', userId, 'budgets', budgetId);
    await setDoc(docRef, toSave, { merge: true });
  }

  /**
   * Deleta limite orçamentário
   */
  static async deleteBudget(
    userId: string,
    budgetId: string,
    isGuest: boolean
  ): Promise<void> {
    if (isGuest || !userId) {
      const current: CategoryBudget[] = JSON.parse(localStorage.getItem(GUEST_BUDGETS_KEY) || '[]');
      const filtered = current.filter(b => b.id !== budgetId);
      localStorage.setItem(GUEST_BUDGETS_KEY, JSON.stringify(filtered));
      return;
    }

    const docRef = doc(db, 'users', userId, 'budgets', budgetId);
    await deleteDoc(docRef);
  }

  /**
   * Deleta TODOS os dados do usuário (limpeza completa de lançamentos, orçamentos, categorias e cartões)
   */
  static async deleteAllUserData(userId: string, isGuest: boolean): Promise<void> {
    // 1. Limpa localStorage
    FinanceService.clearLocalData();

    if (isGuest || !userId) {
      return;
    }

    // 2. Limpa Firestore em lote
    try {
      const txRef = collection(db, 'users', userId, 'transactions');
      const txSnap = await getDocs(txRef);
      if (!txSnap.empty) {
        const batch = writeBatch(db);
        txSnap.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }

      const budgetRef = collection(db, 'users', userId, 'budgets');
      const budgetSnap = await getDocs(budgetRef);
      if (!budgetSnap.empty) {
        const batch = writeBatch(db);
        budgetSnap.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }

      const catRef = collection(db, 'users', userId, 'categories');
      const catSnap = await getDocs(catRef);
      if (!catSnap.empty) {
        const batch = writeBatch(db);
        catSnap.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }

      const cardsRef = collection(db, 'users', userId, 'creditCards');
      const cardsSnap = await getDocs(cardsRef);
      if (!cardsSnap.empty) {
        const batch = writeBatch(db);
        cardsSnap.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) {
      console.error('Error clearing user firestore data:', e);
      throw e;
    }
  }

  /**
   * Remove todos os dados locais de convidado e legados
   */
  static clearLocalData(): void {
    FinanceService.cleanupLegacyStorage();
    localStorage.removeItem(GUEST_TX_KEY);
    localStorage.removeItem(GUEST_BUDGETS_KEY);
    localStorage.removeItem(GUEST_CUSTOM_CATS_KEY);
    localStorage.removeItem(GUEST_CARDS_KEY);
  }
}
