import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Household, SharedExpense } from '../types/finance';

const newId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export const normalizeEmail = (e: string) => e.trim().toLowerCase();

export async function createHousehold(name: string, uid: string, displayName: string): Promise<string> {
  const id = newId('hh');
  const household: Household = {
    id,
    name: name.trim().slice(0, 80),
    ownerId: uid,
    members: [uid],
    memberNames: { [uid]: displayName },
    invitedEmails: [],
    createdAt: new Date().toISOString()
  };
  await setDoc(doc(db, 'households', id), household);
  return id;
}

/** Assina os grupos em que o usuário é membro e os convites pendentes para o e-mail dele. */
export function subscribeHouseholds(
  uid: string,
  email: string | null,
  callback: (groups: { member: Household[]; invites: Household[] }) => void
): () => void {
  let member: Household[] = [];
  let invites: Household[] = [];
  const emit = () => callback({ member, invites });

  const toList = (snap: { forEach: (cb: (d: { id: string; data: () => unknown }) => void) => void }) => {
    const list: Household[] = [];
    snap.forEach(d => list.push({ ...(d.data() as Household), id: d.id }));
    return list;
  };

  const unsubMember = onSnapshot(
    query(collection(db, 'households'), where('members', 'array-contains', uid)),
    snap => {
      member = toList(snap);
      emit();
    },
    err => {
      console.warn('Firestore households subscription status:', err);
      member = [];
      emit();
    }
  );

  let unsubInvites = () => {};
  if (email) {
    unsubInvites = onSnapshot(
      query(collection(db, 'households'), where('invitedEmails', 'array-contains', normalizeEmail(email))),
      snap => {
        invites = toList(snap).filter(h => !h.members.includes(uid));
        emit();
      },
      err => {
        console.warn('Firestore invites subscription status:', err);
        invites = [];
        emit();
      }
    );
  }

  return () => {
    unsubMember();
    unsubInvites();
  };
}

export function subscribeSharedExpenses(
  householdId: string,
  callback: (expenses: SharedExpense[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'households', householdId, 'expenses'),
    snap => {
      const list: SharedExpense[] = [];
      snap.forEach(d => list.push({ ...(d.data() as SharedExpense), id: d.id }));
      list.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(list);
    },
    err => {
      console.warn('Firestore shared expenses subscription status:', err);
      callback([]);
    }
  );
}

export async function inviteMember(householdId: string, email: string): Promise<void> {
  await updateDoc(doc(db, 'households', householdId), { invitedEmails: arrayUnion(normalizeEmail(email)) });
}

export async function cancelInvite(householdId: string, email: string): Promise<void> {
  await updateDoc(doc(db, 'households', householdId), { invitedEmails: arrayRemove(normalizeEmail(email)) });
}

/** O convidado entra no grupo: sai da lista de convites e entra em `members`. */
export async function acceptInvite(householdId: string, uid: string, email: string, displayName: string): Promise<void> {
  await updateDoc(doc(db, 'households', householdId), {
    members: arrayUnion(uid),
    invitedEmails: arrayRemove(normalizeEmail(email)),
    [`memberNames.${uid}`]: displayName
  });
}

export async function declineInvite(householdId: string, email: string): Promise<void> {
  await updateDoc(doc(db, 'households', householdId), { invitedEmails: arrayRemove(normalizeEmail(email)) });
}

export async function leaveHousehold(householdId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'households', householdId), { members: arrayRemove(uid) });
}

export async function deleteHousehold(householdId: string): Promise<void> {
  const expenses = await getDocs(collection(db, 'households', householdId, 'expenses'));
  const docs = expenses.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = writeBatch(db);
    docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, 'households', householdId));
}

export async function saveSharedExpense(householdId: string, expense: Omit<SharedExpense, 'id' | 'householdId'>): Promise<void> {
  const id = newId('se');
  const data: SharedExpense = { ...expense, id, householdId, createdAt: new Date().toISOString() };
  await setDoc(doc(db, 'households', householdId, 'expenses', id), data);
}

export async function deleteSharedExpense(householdId: string, expenseId: string): Promise<void> {
  await deleteDoc(doc(db, 'households', householdId, 'expenses', expenseId));
}
