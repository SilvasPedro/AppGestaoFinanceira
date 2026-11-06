/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useCallback, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { ExtrasProvider } from './context/ExtrasContext';
import { RemindersBanner } from './components/common/RemindersBanner';
import { Header } from './components/common/Header';
import { DesktopHeader } from './components/common/DesktopHeader';
import { Sidebar } from './components/common/Sidebar';
import { BottomNav, TabType } from './components/common/BottomNav';
const DashboardTab = lazy(() => import('./components/dashboard/DashboardTab').then(m => ({ default: m.DashboardTab })));
const TransactionsTab = lazy(() => import('./components/transactions/TransactionsTab').then(m => ({ default: m.TransactionsTab })));
const BudgetsTab = lazy(() => import('./components/budgets/BudgetsTab').then(m => ({ default: m.BudgetsTab })));
const ProjectionsTab = lazy(() => import('./components/projections/ProjectionsTab').then(m => ({ default: m.ProjectionsTab })));
const RecurringTab = lazy(() => import('./components/recurring/RecurringTab').then(m => ({ default: m.RecurringTab })));
const AccountsTab = lazy(() => import('./components/accounts/AccountsTab').then(m => ({ default: m.AccountsTab })));
const CardsTab = lazy(() => import('./components/cards/CardsTab').then(m => ({ default: m.CardsTab })));
const ReportsTab = lazy(() => import('./components/reports/ReportsTab').then(m => ({ default: m.ReportsTab })));
const SharedTab = lazy(() => import('./components/shared/SharedTab').then(m => ({ default: m.SharedTab })));
const SettingsTab = lazy(() => import('./components/settings/SettingsTab').then(m => ({ default: m.SettingsTab })));
import { TransactionModal, type AddPreset } from './components/modals/TransactionModal';
import { AuthModal } from './components/modals/AuthModal';
import { AuthScreen } from './components/auth/AuthScreen';
import { WifiOff, Loader2 } from 'lucide-react';

const TabSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse" role="status" aria-label="Carregando conteúdo">
    <div className="h-6 w-48 rounded-lg bg-[#1C212C]" />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="h-28 rounded-3xl bg-[#151A23]" />
      <div className="h-28 rounded-3xl bg-[#151A23]" />
      <div className="h-28 rounded-3xl bg-[#151A23]" />
    </div>
    <div className="h-64 rounded-3xl bg-[#151A23]" />
  </div>
);

const MainContent: React.FC = () => {
  const { 
    currentMonth, 
    addTransaction, 
    pendingBillsCount, 
    isOnline, 
    activeFixedCount, 
    activeInstallmentsCount,
    layoutMode
  } = useFinance();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addPreset, setAddPreset] = useState<AddPreset>({});
  const { showToast } = useToast();

  // O preset só é aceito quando vem de um chamador explícito (nunca o evento de clique).
  const openAddModal = useCallback((preset?: AddPreset) => {
    const valid = preset && ('type' in preset || 'nature' in preset) ? preset : {};
    setAddPreset(valid);
    setIsAddModalOpen(true);
  }, []);

  const handleSaveTransaction = useCallback(
    async (...args: Parameters<typeof addTransaction>) => {
      try {
        const result = await addTransaction(...args);
        showToast('Lançamento salvo.');
        return result;
      } catch (err) {
        showToast('Não foi possível salvar o lançamento.', { kind: 'error' });
        throw err;
      }
    },
    [addTransaction, showToast]
  );
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen text-white flex flex-col md:flex-row selection:bg-[#A3C9A8]/20">
      {/* Desktop Sidebar (visible on md+) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => openAddModal()}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        pendingBillsCount={pendingBillsCount}
      />

      {/* Main Content Body */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Desktop Top Header (hidden on mobile) */}
        <DesktopHeader
          activeTab={activeTab}
          onOpenAddModal={() => openAddModal()}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />

        {/* Mobile Header (hidden on md+) */}
        <Header 
          onOpenAuth={() => setIsAuthModalOpen(true)} 
          onNavigateTab={setActiveTab}
          activeTab={activeTab}
        />

        {/* Main View Area with Desktop Normal vs. Expanded Layout (Diretriz 4) */}
        <main 
          className={`flex-1 w-full pt-4 pb-32 md:pb-12 transition-all duration-300 ${
            layoutMode === 'expanded'
              ? 'px-4 md:px-8 lg:px-12 max-w-none'
              : 'px-4 md:px-8 max-w-6xl mx-auto'
          }`}
        >
          <RemindersBanner onNavigateTab={setActiveTab} />

          <Suspense fallback={<TabSkeleton />}>
          {activeTab === 'dashboard' && (
            <DashboardTab
              onNavigateTab={setActiveTab}
              onOpenAddModal={openAddModal}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsTab
              onOpenAddModal={() => openAddModal()}
            />
          )}

          {activeTab === 'recurring' && (
            <RecurringTab />
          )}

          {activeTab === 'budgets' && (
            <BudgetsTab />
          )}

          {activeTab === 'projections' && (
            <ProjectionsTab />
          )}

          {activeTab === 'accounts' && <AccountsTab />}

          {activeTab === 'cards' && <CardsTab />}

          {activeTab === 'reports' && <ReportsTab />}

          {activeTab === 'shared' && <SharedTab />}

          {activeTab === 'settings' && (
            <SettingsTab />
          )}
          </Suspense>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (strictly hidden on desktop md+) */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => openAddModal()}
        pendingBillsCount={pendingBillsCount}
        recurringBadgeCount={activeFixedCount + activeInstallmentsCount}
      />

      {/* Bottom Sheet / Modal para Lançamento Rápido */}
      <TransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveTransaction}
        defaultMonth={currentMonth}
        initialType={addPreset.type}
        initialNature={addPreset.nature}
      />

      {/* Modal de Perfil e Logout */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Floating Offline Toast Notification */}
      {!isOnline && (
        <div className="fixed bottom-20 md:bottom-6 left-4 z-40 flex items-center gap-2 rounded-xl bg-[#181D27] border border-[#E29578]/40 px-3 py-2 text-xs text-[#E29578] shadow-xl">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Modo Offline — Dados persistidos via IndexedDB</span>
        </div>
      )}
    </div>
  );
};

const AuthGate: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0F1218] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#151A23] border border-[#283040] flex items-center justify-center shadow-xl">
          <Loader2 className="w-5 h-5 text-[#A3C9A8] animate-spin" />
        </div>
        <span className="text-xs text-[#9AA4B5]">Carregando Finances PRO...</span>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <FinanceProvider>
      <ExtrasProvider>
        <MainContent />
      </ExtrasProvider>
    </FinanceProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AuthGate />
      </ToastProvider>
    </AuthProvider>
  );
}
