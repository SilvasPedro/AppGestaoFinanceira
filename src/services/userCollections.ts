import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/** Coleções por usuário criadas pelas funcionalidades de contas, metas e anexos. */
export type UserCollection = 'accounts' | 'transfers' | 'goals' | 'attachments';

export const EXTRA_COLLECTIONS: UserCollection[] = ['accounts', 'transfers', 'goals', 'attachments'];

const newId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

/** Remove campos `undefined`, que o Firestore rejeita. */
function sanitize<T extends object>(data: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export function subscribeUserCollection<T extends { id: string }>(
  userId: string,
  name: UserCollection,
  callback: (items: T[]) => void
): () => void {
  try {
    return onSnapshot(
      collection(db, 'users', userId, name),
      snapshot => {
        const list: T[] = [];
        snapshot.forEach(d => list.push({ ...(d.data() as object), id: d.id } as T));
        callback(list);
      },
      error => {
        console.warn(`Firestore ${name} subscription status:`, error);
        callback([]);
      }
    );
  } catch (e) {
    console.warn(`Error setting up ${name} listener:`, e);
    callback([]);
    return () => {};
  }
}

export async function saveUserDoc<T extends object>(
  userId: string,
  name: UserCollection,
  data: T & { id?: string },
  idPrefix: string
): Promise<string> {
  const id = data.id || newId(idPrefix);
  await setDoc(doc(db, 'users', userId, name, id), sanitize({ ...data, id }), { merge: true });
  return id;
}

export async function deleteUserDoc(userId: string, name: UserCollection, id: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, name, id));
}

/** Apaga todos os documentos das coleções extras (usado em "apagar todos os dados"). */
export async function purgeExtraCollections(userId: string): Promise<void> {
  for (const name of EXTRA_COLLECTIONS) {
    const snap = await getDocs(collection(db, 'users', userId, name));
    if (snap.empty) continue;
    const batch = writeBatch(db);
    snap.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

// ---------------------------------------------------------------------------
// Anexos (comprovantes). Ficam em documento próprio para não pesar a lista de lançamentos.
// ---------------------------------------------------------------------------

export interface Attachment {
  id: string; // mesmo id do lançamento
  dataUrl: string;
  fileName: string;
  createdAt: string;
}

/** Limite do documento no Firestore é 1 MiB; a imagem comprimida fica bem abaixo disso. */
export const MAX_ATTACHMENT_CHARS = 700_000;

export async function saveAttachment(userId: string, txId: string, dataUrl: string, fileName: string): Promise<void> {
  if (dataUrl.length > MAX_ATTACHMENT_CHARS) throw new Error('Imagem grande demais mesmo após compressão.');
  const att: Attachment = { id: txId, dataUrl, fileName, createdAt: new Date().toISOString() };
  await setDoc(doc(db, 'users', userId, 'attachments', txId), att);
}

export async function loadAttachment(userId: string, txId: string): Promise<Attachment | null> {
  const snap = await getDoc(doc(db, 'users', userId, 'attachments', txId));
  return snap.exists() ? ({ ...(snap.data() as Attachment), id: snap.id }) : null;
}

export async function deleteAttachment(userId: string, txId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'attachments', txId));
}

/**
 * Reduz uma imagem (câmera/galeria) para JPEG de até `maxSide` px no maior lado.
 * Roda no navegador via canvas.
 */
export function compressImage(file: File, maxSide = 1280, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Escolha um arquivo de imagem.'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Não foi possível processar a imagem.'));
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem.'));
    };
    img.src = url;
  });
}
