/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { BottomNav, TabType } from './components/common/BottomNav';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { TransactionsTab } from './components/transactions/TransactionsTab';
import { BudgetsTab } from './components/budgets/BudgetsTab';
import { ProjectionsTab } from './components/projections/ProjectionsTab';
import { RecurringTab } from './components/recurring/RecurringTab';
import { SettingsTab } from './components/settings/SettingsTab';
import { TransactionModal } from './components/modals/TransactionModal';
import { AuthModal } from './components/modals/AuthModal';
import { AuthScreen } from './components/auth/AuthScreen';
import { WifiOff, Loader2 } from 'lucide-react';

const MainContent: React.FC = () => {
  const { currentMonth, addTransaction, pendingBillsCount, isOnline, activeFixedCount, activeInstallmentsCount } = useFinance();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex flex-col md:flex-row selection:bg-[#A3C9A8]/20">
      {/* Desktop Sidebar (visible on md+) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        pendingBillsCount={pendingBillsCount}
      />

      {/* Main Content Body */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile Header (hidden on md+) */}
        <Header 
          onOpenAuth={() => setIsAuthModalOpen(true)} 
          onNavigateTab={setActiveTab}
          activeTab={activeTab}
        />

        {/* Main View Area */}
        <main className="flex-1 w-full px-4 pt-4 md:px-8 md:pt-6 pb-32 md:pb-12 max-w-6xl mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardTab
              onNavigateTab={setActiveTab}
              onOpenAddModal={() => setIsAddModalOpen(true)}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsTab
              onOpenAddModal={() => setIsAddModalOpen(true)}
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

          {activeTab === 'settings' && (
            <SettingsTab />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (strictly hidden on desktop md+) */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        pendingBillsCount={pendingBillsCount}
        recurringBadgeCount={activeFixedCount + activeInstallmentsCount}
      />

      {/* Bottom Sheet / Modal para Lançamento Rápido */}
      <TransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={addTransaction}
        defaultMonth={currentMonth}
      />

      {/* Modal de Perfil e Logout */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Floating Offline Toast Notification */}
      {!isOnline && (
        <div className="fixed bottom-20 md:bottom-6 left-4 z-40 flex items-center gap-2 rounded-xl bg-[#171717] border border-[#E29578]/40 px-3 py-2 text-xs text-[#E29578] shadow-xl">
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
      <div className="min-h-screen w-full bg-[#0D0D0D] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#141414] border border-[#262626] flex items-center justify-center shadow-xl">
          <Loader2 className="w-5 h-5 text-[#A3C9A8] animate-spin" />
        </div>
        <span className="text-xs text-[#737373]">Carregando Finances PRO...</span>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <FinanceProvider>
      <MainContent />
    </FinanceProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
