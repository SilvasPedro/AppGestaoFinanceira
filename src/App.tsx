/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { BottomNav, TabType } from './components/common/BottomNav';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { TransactionsTab } from './components/transactions/TransactionsTab';
import { BudgetsTab } from './components/budgets/BudgetsTab';
import { ProjectionsTab } from './components/projections/ProjectionsTab';
import { SettingsTab } from './components/settings/SettingsTab';
import { TransactionModal } from './components/modals/TransactionModal';
import { AuthModal } from './components/modals/AuthModal';
import { WifiOff } from 'lucide-react';

const MainContent: React.FC = () => {
  const { currentMonth, addTransaction, pendingBillsCount, isOnline } = useFinance();
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
      />

      {/* Bottom Sheet / Modal para Lançamento Rápido */}
      <TransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={addTransaction}
        defaultMonth={currentMonth}
      />

      {/* Modal de Autenticação Firebase (Google & Email) */}
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

export default function App() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <MainContent />
      </FinanceProvider>
    </AuthProvider>
  );
}
