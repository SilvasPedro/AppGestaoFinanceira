import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.error('Google Sign In Error:', err);
      const error = err as { code?: string; message?: string };
      if (error.code === 'auth/popup-blocked') {
        setAuthError('O pop-up de login foi bloqueado pelo navegador. Por favor, autorize pop-ups.');
      } else if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        // Pop-up fechado pelo usuário
      } else {
        setAuthError('Falha na autenticação com o Google. Tente novamente.');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      setLoading(true);
      setAuthError(null);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: unknown) {
      console.error('Email Login Error:', err);
      const error = err as { code?: string };
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setAuthError('E-mail ou senha incorretos.');
      } else if (error.code === 'auth/invalid-email') {
        setAuthError('Formato de e-mail inválido.');
      } else {
        setAuthError('Erro ao realizar login. Verifique seus dados.');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, pass: string) => {
    try {
      setLoading(true);
      setAuthError(null);
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err: unknown) {
      console.error('Email Register Error:', err);
      const error = err as { code?: string };
      if (error.code === 'auth/email-already-in-use') {
        setAuthError('Este e-mail já está em uso.');
      } else if (error.code === 'auth/weak-password') {
        setAuthError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setAuthError('Erro ao cadastrar conta. Tente novamente.');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        authError,
        clearAuthError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
