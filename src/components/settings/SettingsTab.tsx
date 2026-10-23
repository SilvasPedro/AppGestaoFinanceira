import React, { useState } from 'react';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Tag, 
  CreditCard as CardIcon,
  Database,
  CheckCircle2,
  LogOut,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { DeleteConfirmModal } from '../modals/DeleteConfirmModal';
import { CreditCardModal } from '../modals/CreditCardModal';
import { CustomCategoryItem, CreditCard } from '../../types/finance';

export const SettingsTab: React.FC = () => {
  const { 
    customCategories, 
    creditCards,
    expenseCategories, 
    incomeCategories, 
    addCustomCategory, 
    deleteCustomCategory,
    addCreditCard,
    deleteCreditCard,
    purgeAllUserData 
  } = useFinance();
  const { user, logout } = useAuth();

  const [categoryType, setCategoryType] = useState<'expense' | 'income'>('expense');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [submittingCat, setSubmittingCat] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modais de exclusão e cartões
  const [catToDelete, setCatToDelete] = useState<CustomCategoryItem | null>(null);
  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    const allExisting = categoryType === 'expense' ? expenseCategories : incomeCategories;
    if (allExisting.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      alert('Esta categoria já existe!');
      return;
    }

    setSubmittingCat(true);
    try {
      await addCustomCategory(trimmed, categoryType);
      setNewCategoryName('');
      setSuccessMsg(`Categoria "${trimmed}" adicionada com sucesso!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Error adding category:', err);
    } finally {
      setSubmittingCat(false);
    }
  };

  const handlePurgeAll = async () => {
    try {
      await purgeAllUserData();
      setSuccessMsg('Todos os dados foram zerados com sucesso! O painel está 100% limpo.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Error purging data:', err);
    }
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const userCustomExpenses = customCategories.filter(c => c.type === 'expense');
  const userCustomIncomes = customCategories.filter(c => c.type === 'income');

  return (
    <div className="space-y-6 pb-24 w-full">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#A8B5D1]" /> Configurações & Personalização
        </h2>
        <p className="text-xs text-[#737373] mt-1">
          Gerencie cartões de crédito, categorias personalizadas e preferências da sua conta.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-[#A3C9A8]/15 border border-[#A3C9A8]/30 rounded-2xl flex items-center gap-2.5 text-xs text-[#A3C9A8] animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. Gestão de Cartões de Crédito */}
      <div className="card-depth-3d p-5 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#A8B5D1]/15 text-[#A8B5D1] flex items-center justify-center">
              <CardIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Meus Cartões de Crédito</h3>
              <p className="text-[11px] text-[#737373]">
                Vincule despesas e faturas unificadas por cartão.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCardModalOpen(true)}
            className="btn-liquid-glass-primary py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Novo Cartão</span>
          </button>
        </div>

        {creditCards.length === 0 ? (
          <div className="p-4 rounded-2xl bg-[#0D0D0D] border border-[#1E1E1E] text-center text-xs text-[#737373]">
            Nenhum cartão cadastrado. Adicione seu primeiro cartão para acompanhar faturas e parcelas.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {creditCards.map(card => (
              <div 
                key={card.id}
                className="p-3.5 rounded-2xl bg-[#0D0D0D] border border-[#262626] flex items-center justify-between transition hover:border-[#333333]"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 font-mono text-xs font-bold"
                    style={{ backgroundColor: `${card.color || '#A8B5D1'}22`, border: `1.5px solid ${card.color || '#A8B5D1'}` }}
                  >
                    ••••
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-semibold text-white truncate">
                      {card.cardName}
                    </div>
                    <div className="text-[11px] text-[#737373] flex items-center gap-1.5 mt-0.5">
                      <span>{card.bankName}</span>
                      <span>•</span>
                      <span>•••• {card.lastFourDigits}</span>
                    </div>
                    {(card.closingDay || card.dueDay || card.limitAmount) && (
                      <div className="text-[10px] text-[#525252] mt-0.5">
                        {card.closingDay && `Fecha dia ${card.closingDay} `}
                        {card.dueDay && `• Vence dia ${card.dueDay} `}
                        {card.limitAmount && `• Limite: ${formatBRL(card.limitAmount)}`}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCardToDelete(card)}
                  title="Remover cartão"
                  className="p-1.5 rounded-lg text-[#737373] hover:text-[#E29578] hover:bg-[#1A1A1A] transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Categorias Personalizadas */}
      <div className="card-depth-3d p-5 rounded-3xl space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#A8B5D1]" /> Categorias Personalizadas
          </h3>
          <p className="text-xs text-[#737373] mt-0.5">
            Adicione novas categorias além das padrões do sistema para organizar seus lançamentos.
          </p>
        </div>

        {/* Formulário de Adicionar Categoria */}
        <form onSubmit={handleAddCategory} className="space-y-3">
          <div className="flex gap-2">
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#0D0D0D] rounded-xl border border-[#262626] w-52 shrink-0">
              <button
                type="button"
                onClick={() => setCategoryType('expense')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  categoryType === 'expense'
                    ? 'bg-[#E29578] text-black shadow-xs'
                    : 'text-[#A3A3A3] hover:text-white'
                }`}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() => setCategoryType('income')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  categoryType === 'income'
                    ? 'bg-[#A3C9A8] text-black shadow-xs'
                    : 'text-[#A3A3A3] hover:text-white'
                }`}
              >
                Receita
              </button>
            </div>

            <div className="flex-1 flex gap-2">
              <input
                type="text"
                required
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={categoryType === 'expense' ? 'Ex: Assinatura de Software, Pet Shop...' : 'Ex: Consultoria, Dividendos...'}
                className="flex-1 px-3.5 py-2 bg-[#0D0D0D] border border-[#262626] rounded-xl text-xs text-white placeholder-[#525252] focus:outline-hidden focus:border-white transition"
              />
              <button
                type="submit"
                disabled={submittingCat || !newCategoryName.trim()}
                className="btn-liquid-glass-primary py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-40 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Adicionar</span>
              </button>
            </div>
          </div>
        </form>

        {/* Lista de Categorias Criadas */}
        <div className="pt-2 border-t border-[#1E1E1E] space-y-3">
          <div>
            <span className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block mb-2">
              Suas Categorias de Despesas Personalizadas ({userCustomExpenses.length})
            </span>
            {userCustomExpenses.length === 0 ? (
              <span className="text-xs text-[#525252] italic">Nenhuma categoria personalizada criada.</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {userCustomExpenses.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0D0D0D] border border-[#262626] text-xs text-white"
                  >
                    <span>{cat.name}</span>
                    <button
                      type="button"
                      onClick={() => setCatToDelete(cat)}
                      title="Excluir categoria"
                      className="text-[#737373] hover:text-[#E29578] transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <span className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block mb-2">
              Suas Categorias de Receitas Personalizadas ({userCustomIncomes.length})
            </span>
            {userCustomIncomes.length === 0 ? (
              <span className="text-xs text-[#525252] italic">Nenhuma categoria personalizada criada.</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {userCustomIncomes.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0D0D0D] border border-[#262626] text-xs text-white"
                  >
                    <span>{cat.name}</span>
                    <button
                      type="button"
                      onClick={() => setCatToDelete(cat)}
                      title="Excluir categoria"
                      className="text-[#737373] hover:text-[#E29578] transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Limpeza Completa de Dados do Firestore */}
      <div className="card-depth-3d p-5 rounded-3xl border border-[#E29578]/40 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E29578]/15 border border-[#E29578]/30 flex items-center justify-center text-[#E29578] shrink-0">
            <Database className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Limpar / Zerar Dados do Usuário
            </h3>
            <p className="text-xs text-[#A3A3A3] mt-1 leading-relaxed">
              Deseja recomeçar do zero? Clique no botão abaixo para apagar todas as transações, limites e cartões da sua coleção do Cloud Firestore.
            </p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setShowPurgeModal(true)}
            className="btn-liquid-glass py-2.5 px-4 rounded-xl border border-[#E29578]/40 text-[#E29578] text-xs font-semibold flex items-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Zerar Todos os Lançamentos do Banco</span>
          </button>
        </div>
      </div>

      {/* 4. Informações da Conta & Sessão */}
      <div className="card-depth-3d p-5 rounded-3xl space-y-3">
        <h3 className="text-xs font-semibold text-[#737373] uppercase tracking-wider">
          Informações da Conta & Nuvem
        </h3>
        <div className="space-y-2 text-xs">
          <div className="p-3 bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl flex items-center justify-between">
            <span className="text-[#737373]">Usuário Conectado:</span>
            <span className="font-medium text-white">{user?.displayName || user?.email}</span>
          </div>

          {user && (
            <div className="p-3 bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl flex items-center justify-between">
              <span className="text-[#737373]">UID Firebase:</span>
              <span className="font-mono text-[11px] text-[#A8B5D1]">{user.uid}</span>
            </div>
          )}

          <div className="p-3 bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl flex items-center justify-between">
            <span className="text-[#737373]">Sincronização Nuvem:</span>
            <span className="text-[#A3C9A8] font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A3C9A8] animate-pulse" />
              Cloud Firestore Ativo
            </span>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full py-3 rounded-2xl bg-[#1A1A1A] hover:bg-[#262626] text-[#E29578] border border-[#262626] text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair da Conta (Logout)</span>
          </button>
        </div>
      </div>

      {/* Modal para adicionar novo cartão */}
      <CreditCardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        onSave={async (card) => {
          await addCreditCard(card);
          setSuccessMsg(`Cartão "${card.cardName}" cadastrado com sucesso!`);
          setTimeout(() => setSuccessMsg(null), 3000);
        }}
      />

      {/* Modal de confirmação para exclusão de cartão */}
      <DeleteConfirmModal
        isOpen={!!cardToDelete}
        onClose={() => setCardToDelete(null)}
        onConfirm={async () => {
          if (cardToDelete) {
            await deleteCreditCard(cardToDelete.id);
            setCardToDelete(null);
          }
        }}
        title="Remover Cartão de Crédito"
        message="Deseja remover este cartão de crédito? Os lançamentos vinculados a ele continuarão no histórico, mas o cartão não aparecerá mais nos seletores."
        itemDetail={cardToDelete ? `${cardToDelete.cardName} •••• ${cardToDelete.lastFourDigits}` : undefined}
        confirmLabel="Sim, Remover Cartão"
      />

      {/* Modal de confirmação para exclusão de categoria personalizada */}
      <DeleteConfirmModal
        isOpen={!!catToDelete}
        onClose={() => setCatToDelete(null)}
        onConfirm={async () => {
          if (catToDelete) {
            await deleteCustomCategory(catToDelete.id);
            setCatToDelete(null);
          }
        }}
        title="Excluir Categoria Personalizada"
        message="Deseja remover esta categoria personalizada? Ela não aparecerá mais nos seletores de novos lançamentos."
        itemDetail={catToDelete ? `Categoria: ${catToDelete.name}` : undefined}
        confirmLabel="Sim, Excluir"
      />

      {/* Modal de confirmação para Zerar Banco de Dados */}
      <DeleteConfirmModal
        isOpen={showPurgeModal}
        onClose={() => setShowPurgeModal(false)}
        onConfirm={handlePurgeAll}
        title="Zerar Todos os Dados do Firestore?"
        message="Atenção: Esta ação apagará permanentemente todos os lançamentos, contas fixas, parcelamentos, tetos orçamentários e cartões gravados na sua conta. O painel ficará completamente limpo."
        itemDetail={user ? `Usuário: ${user.email} (UID: ${user.uid.slice(0, 8)}...)` : undefined}
        confirmLabel="Sim, Apagar Tudo Definitivamente"
        isDestructive={true}
      />

      {/* Modal de Confirmação de Logout */}
      <DeleteConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={async () => {
          setShowLogoutModal(false);
          await logout();
        }}
        title="Desconectar do Finances PRO?"
        message="Deseja encerrar sua sessão atual? Você poderá entrar novamente a qualquer momento com sua conta Google ou e-mail/senha."
        confirmLabel="Sair da Conta"
        isDestructive={false}
      />
    </div>
  );
};
