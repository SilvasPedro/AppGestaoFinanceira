import React, { useState } from 'react';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Tag, 
  AlertTriangle, 
  ShieldCheck, 
  User as UserIcon, 
  Database,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { DeleteConfirmModal } from '../modals/DeleteConfirmModal';
import { CustomCategoryItem } from '../../types/finance';

export const SettingsTab: React.FC = () => {
  const { 
    customCategories, 
    expenseCategories, 
    incomeCategories, 
    addCustomCategory, 
    deleteCustomCategory,
    purgeAllUserData 
  } = useFinance();
  const { user, isGuest } = useAuth();

  const [categoryType, setCategoryType] = useState<'expense' | 'income'>('expense');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [submittingCat, setSubmittingCat] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modais de exclusão
  const [catToDelete, setCatToDelete] = useState<CustomCategoryItem | null>(null);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purging, setPurging] = useState(false);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    // Verificar se já existe
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
    setPurging(true);
    try {
      await purgeAllUserData();
      setSuccessMsg('Todos os dados foram zerados com sucesso! O painel está 100% limpo.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Error purging data:', err);
    } finally {
      setPurging(false);
    }
  };

  const userCustomExpenses = customCategories.filter(c => c.type === 'expense');
  const userCustomIncomes = customCategories.filter(c => c.type === 'income');

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#A8B5D1]" /> Configurações & Personalização
        </h2>
        <p className="text-xs text-[#737373] mt-1">
          Gerencie categorias personalizadas, dados da sua conta e preferências.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-[#A3C9A8]/15 border border-[#A3C9A8]/30 rounded-2xl flex items-center gap-2.5 text-xs text-[#A3C9A8] animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. Categorias Personalizadas */}
      <div className="p-5 rounded-3xl bg-[#141414] border border-[#262626] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E1E1E] pb-3">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#A3C9A8]" /> Categorias Personalizadas
            </h3>
            <p className="text-[11px] text-[#737373] mt-0.5">
              Adicione novas categorias para utilizar nos lançamentos e tetos orçamentários.
            </p>
          </div>

          <div className="flex bg-[#0D0D0D] p-1 rounded-xl border border-[#262626] self-start sm:self-auto">
            <button
              onClick={() => setCategoryType('expense')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                categoryType === 'expense'
                  ? 'bg-[#E29578] text-black shadow-xs'
                  : 'text-[#737373] hover:text-white'
              }`}
            >
              Despesas (-)
            </button>
            <button
              onClick={() => setCategoryType('income')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                categoryType === 'income'
                  ? 'bg-[#A3C9A8] text-black shadow-xs'
                  : 'text-[#737373] hover:text-white'
              }`}
            >
              Receitas (+)
            </button>
          </div>
        </div>

        {/* Formulário para Nova Categoria */}
        <form onSubmit={handleAddCategory} className="flex gap-2">
          <input
            type="text"
            required
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder={categoryType === 'expense' ? 'Ex: Pet, Viagens, Streaming...' : 'Ex: Bônus, Aluguel Recebido...'}
            className="flex-1 px-3.5 py-2.5 bg-[#0D0D0D] border border-[#262626] rounded-xl text-xs text-white placeholder-[#525252] focus:outline-hidden focus:border-white transition"
          />
          <button
            type="submit"
            disabled={submittingCat || !newCategoryName.trim()}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-40"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Adicionar</span>
          </button>
        </form>

        {/* Lista de Categorias Criadas pelo Usuário */}
        <div className="space-y-2 pt-2">
          <span className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider block">
            Suas Categorias Personalizadas ({categoryType === 'expense' ? userCustomExpenses.length : userCustomIncomes.length})
          </span>

          {(categoryType === 'expense' ? userCustomExpenses : userCustomIncomes).length === 0 ? (
            <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] text-center text-xs text-[#737373]">
              Nenhuma categoria personalizada criada para {categoryType === 'expense' ? 'despesas' : 'receitas'}.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(categoryType === 'expense' ? userCustomExpenses : userCustomIncomes).map((c) => (
                <div
                  key={c.id}
                  className="p-3 bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl flex items-center justify-between text-xs"
                >
                  <span className="text-white font-medium">{c.name}</span>
                  <button
                    onClick={() => setCatToDelete(c)}
                    title="Excluir categoria"
                    className="p-1 rounded-lg text-[#525252] hover:text-[#E29578] hover:bg-[#1A1A1A] transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Categorias Padrão do Sistema */}
        <div className="pt-2">
          <span className="text-[10px] text-[#525252] uppercase tracking-wider block mb-1.5">
            Categorias Nativas do Sistema:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(categoryType === 'expense' ? expenseCategories : incomeCategories).map((cat) => (
              <span
                key={cat}
                className="px-2.5 py-1 rounded-lg bg-[#0D0D0D] border border-[#1E1E1E] text-[11px] text-[#A3A3A3]"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Limpeza Completa de Dados (Purge Mock Data do Firestore) */}
      <div className="p-5 rounded-3xl bg-[#141414] border border-[#E29578]/30 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E29578]/15 border border-[#E29578]/30 flex items-center justify-center text-[#E29578] shrink-0">
            <Database className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Limpar / Zerar Dados do Usuário
            </h3>
            <p className="text-xs text-[#A3A3A3] mt-1 leading-relaxed">
              Caso você tenha conectado sua conta Google e dados de teste antigos ainda estejam salvos na sua coleção do Cloud Firestore, clique no botão abaixo para excluir todas as transações e limites e iniciar com o painel 100% zerado.
            </p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setShowPurgeModal(true)}
            className="py-2.5 px-4 rounded-xl bg-[#E29578]/15 hover:bg-[#E29578]/25 border border-[#E29578]/40 text-[#E29578] text-xs font-semibold flex items-center gap-2 transition active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span>Zerar Todos os Lançamentos do Banco</span>
          </button>
        </div>
      </div>

      {/* 3. Informações da Conta & Firestore */}
      <div className="p-5 rounded-3xl bg-[#141414] border border-[#262626] space-y-3">
        <h3 className="text-xs font-semibold text-[#737373] uppercase tracking-wider">
          Informações da Conta & Nuvem
        </h3>
        <div className="space-y-2 text-xs">
          <div className="p-3 bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl flex items-center justify-between">
            <span className="text-[#737373]">Status da Sessão:</span>
            <span className="font-medium text-white">
              {user ? (user.displayName || user.email) : (isGuest ? 'Modo Convidado Local' : 'Não autenticado')}
            </span>
          </div>

          {user && (
            <div className="p-3 bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl flex items-center justify-between">
              <span className="text-[#737373]">UID Firebase:</span>
              <span className="font-mono text-[11px] text-[#A8B5D1]">{user.uid}</span>
            </div>
          )}

          <div className="p-3 bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl flex items-center justify-between">
            <span className="text-[#737373]">Persistência Offline:</span>
            <span className="text-[#A3C9A8] font-medium">IndexedDB Local Ativo</span>
          </div>
        </div>
      </div>

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
        message="Atenção: Esta ação apagará permanentemente todos os lançamentos, contas fixas, parcelamentos e tetos orçamentários gravados na sua conta. O painel ficará completamente limpo."
        itemDetail={user ? `Usuário: ${user.email} (UID: ${user.uid.slice(0, 8)}...)` : 'Armazenamento Local do Navegador'}
        confirmLabel="Sim, Apagar Tudo Definitivamente"
        isDestructive={true}
      />
    </div>
  );
};
