import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore,
  Firestore 
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User,
  Auth
} from 'firebase/auth';

// Configuração fornecida exatamente nos requisitos
export const firebaseConfig = {
  apiKey: "AIzaSyCWve8E4PIwEeBf5nATJnFnlJkSe9YkbPE",
  authDomain: "suporte-interno-ece8c.firebaseapp.com",
  projectId: "suporte-interno-ece8c",
  storageBucket: "suporte-interno-ece8c.firebasestorage.app",
  messagingSenderId: "154422890108",
  appId: "1:154422890108:web:efe6f03bc4c55dc11483f9"
};

// Inicialização segura do app Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inicialização do Firestore com suporte offline persistente via IndexedDB
let db: Firestore;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch {
  // Caso já tenha sido inicializado ou o navegador restrinja multi-tab persistent cache
  db = getFirestore(app);
}

// Inicialização do Firebase Auth
const auth: Auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { 
  app, 
  db, 
  auth, 
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};
export type { User };
