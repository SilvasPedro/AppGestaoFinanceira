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
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Transaction, CategoryBudget, CustomCategoryItem } from '../types/finance';

const LOCAL_STORAGE_TX_KEY = 'finances_pro_txs_v2';
const LOCAL_STORAGE_BUDGETS_KEY = 'finances_pro_budgets_v2';
const LOCAL_STORAGE_CUSTOM_CATS_KEY = 'finances_pro_custom_cats_v2';

export class FinanceService {
  /**
   * Assina a coleção de transações do usuário no Firestore em tempo real.
   * Se for usuário local/convidado, carrega do localStorage sem dados fictícios.
   */
  static subscribeTransactions(
    userId: string,
    isGuest: boolean,
    callback: (transactions: Transaction[]) => void
  ): () => void {
    if (isGuest || !userId) {
      const stored = localStorage.getItem(LOCAL_STORAGE_TX_KEY);
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
          console.warn('Firestore subscription fallback:', error);
          const fallback = localStorage.getItem(LOCAL_STORAGE_TX_KEY);
          if (fallback) {
            try {
              callback(JSON.parse(fallback));
            } catch {
              callback([]);
            }
          } else {
            callback([]);
          }
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
   * Assina a coleção de limites orçamentários do usuário no Firestore sem mock data.
   */
  static subscribeBudgets(
    userId: string,
    isGuest: boolean,
    callback: (budgets: CategoryBudget[]) => void
  ): () => void {
    if (isGuest || !userId) {
      const stored = localStorage.getItem(LOCAL_STORAGE_BUDGETS_KEY);
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
      const budgetsRef = collection(db, 'users', userId, 'budgets');
      const unsubscribe = onSnapshot(
        budgetsRef,
        (snapshot) => {
          if (snapshot.empty) {
            callback([]);
            return;
          }
          const list: CategoryBudget[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as Omit<CategoryBudget, 'id'>) });
          });
          callback(list);
        },
        (err) => {
          console.warn('Firestore budgets subscription error:', err);
          callback([]);
        }
      );
      return unsubscribe;
    } catch (e) {
      console.warn('Error setting up budget listener:', e);
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
      const stored = localStorage.getItem(LOCAL_STORAGE_CUSTOM_CATS_KEY);
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
          const list: CustomCategoryItem[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as Omit<CustomCategoryItem, 'id'>) });
          });
          callback(list);
        },
        (err) => {
          console.warn('Firestore custom categories subscription error:', err);
          const fallback = localStorage.getItem(LOCAL_STORAGE_CUSTOM_CATS_KEY);
          callback(fallback ? JSON.parse(fallback) : []);
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
      const current = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CUSTOM_CATS_KEY) || '[]');
      const filtered = current.filter((c: CustomCategoryItem) => c.name.toLowerCase() !== item.name.toLowerCase());
      const updated = [...filtered, item];
      localStorage.setItem(LOCAL_STORAGE_CUSTOM_CATS_KEY, JSON.stringify(updated));
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
      const current: CustomCategoryItem[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CUSTOM_CATS_KEY) || '[]');
      const filtered = current.filter(c => c.id !== categoryId);
      localStorage.setItem(LOCAL_STORAGE_CUSTOM_CATS_KEY, JSON.stringify(filtered));
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

    if (isGuest || !userId) {
      const current = JSON.parse(localStorage.getItem(LOCAL_STORAGE_TX_KEY) || '[]');
      const filtered = current.filter((t: Transaction) => t.id !== txId);
      const updated = [fullTx, ...filtered];
      localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(updated));
      return txId;
    }

    const docRef = doc(db, 'users', userId, 'transactions', txId);
    await setDoc(docRef, fullTx, { merge: true });
    return txId;
  }

  /**
   * Remove uma transação do banco ou armazenamento local
   */
  static async deleteTransaction(userId: string, txId: string, isGuest: boolean): Promise<void> {
    if (isGuest || !userId) {
      const current: Transaction[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_TX_KEY) || '[]');
      const filtered = current.filter(t => t.id !== txId);
      localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(filtered));
      return;
    }

    const docRef = doc(db, 'users', userId, 'transactions', txId);
    await deleteDoc(docRef);
  }

  /**
   * Alterna status Pago / Pendente para contas fixas ou recorrentes
   */
  static async togglePaidStatus(
    userId: string,
    txId: string,
    currentStatus: boolean,
    isGuest: boolean
  ): Promise<void> {
    if (isGuest || !userId) {
      const current: Transaction[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_TX_KEY) || '[]');
      const updated = current.map(t => (t.id === txId ? { ...t, isPaid: !currentStatus } : t));
      localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(updated));
      return;
    }

    const docRef = doc(db, 'users', userId, 'transactions', txId);
    await updateDoc(docRef, { isPaid: !currentStatus, updatedAt: new Date().toISOString() });
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
      const current: CategoryBudget[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_BUDGETS_KEY) || '[]');
      const filtered = current.filter(b => b.category !== budget.category && b.id !== budgetId);
      const updated = [...filtered, toSave];
      localStorage.setItem(LOCAL_STORAGE_BUDGETS_KEY, JSON.stringify(updated));
      return;
    }

    const docRef = doc(db, 'users', userId, 'budgets', budgetId);
    await setDoc(docRef, toSave, { merge: true });
  }

  /**
   * Remove um limite orçamentário
   */
  static async deleteBudget(
    userId: string,
    budgetId: string,
    isGuest: boolean
  ): Promise<void> {
    if (isGuest || !userId) {
      const current: CategoryBudget[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_BUDGETS_KEY) || '[]');
      const filtered = current.filter(b => b.id !== budgetId);
      localStorage.setItem(LOCAL_STORAGE_BUDGETS_KEY, JSON.stringify(filtered));
      return;
    }

    const docRef = doc(db, 'users', userId, 'budgets', budgetId);
    await deleteDoc(docRef);
  }

  /**
   * Deleta TODOS os dados do usuário (limpeza completa de dados mockados residuais no Firestore e Local)
   */
  static async deleteAllUserData(userId: string, isGuest: boolean): Promise<void> {
    // 1. Limpa localStorage
    localStorage.removeItem(LOCAL_STORAGE_TX_KEY);
    localStorage.removeItem(LOCAL_STORAGE_BUDGETS_KEY);
    localStorage.removeItem('finances_pro_guest_txs_v1');
    localStorage.removeItem('finances_pro_guest_budgets_v1');

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
    } catch (e) {
      console.error('Error clearing user firestore data:', e);
      throw e;
    }
  }

  /**
   * Remove todos os dados locais
   */
  static clearLocalData(): void {
    localStorage.removeItem(LOCAL_STORAGE_TX_KEY);
    localStorage.removeItem(LOCAL_STORAGE_BUDGETS_KEY);
    localStorage.removeItem('finances_pro_guest_txs_v1');
    localStorage.removeItem('finances_pro_guest_budgets_v1');
  }
}
