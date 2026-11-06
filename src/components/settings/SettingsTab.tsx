import React, { useState } from 'react';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Tag, 
  CreditCard as CardIcon,
  CheckCircle2,
  LogOut,
  Calendar,
  DollarSign,
  Pencil,
  Wifi
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { NotificationsSettings } from './NotificationsSettings';
import { DeleteConfirmModal } from '../modals/DeleteConfirmModal';
import { CreditCardModal, BANK_DEFAULT_COLORS } from '../modals/CreditCardModal';
import { CustomCategoryItem, CreditCard } from '../../types/finance';
import { formatBRL } from '../../lib/format';

export const SettingsTab: React.FC = () => {
  const { 
    customCategories, 
    creditCards,
    cardInvoices,
    expenseCategories, 
    incomeCategories, 
    addCustomCategory, 
    deleteCustomCategory,
    addCreditCard,
    updateCreditCard,
    deleteCreditCard
  } = useFinance();
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [categoryType, setCategoryType] = useState<'expense' | 'income'>('expense');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [submittingCat, setSubmittingCat] = useState(false);

  // Modais de exclusão e cartões
  const [catToDelete, setCatToDelete] = useState<CustomCategoryItem | null>(null);
  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);
  const [cardToEdit, setCardToEdit] = useState<CreditCard | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    const allExisting = categoryType === 'expense' ? expenseCategories : incomeCategories;
    if (allExisting.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      showToast('Esta categoria já existe.', { kind: 'error' });
      return;
    }

    setSubmittingCat(true);
    try {
      await addCustomCategory(trimmed, categoryType);
      setNewCategoryName('');
      showToast(`Categoria "${trimmed}" adicionada.`);
    } catch (err) {
      console.error('Error adding category:', err);
      showToast('Não foi possível adicionar a categoria. Tente novamente.', { kind: 'error' });
    } finally {
      setSubmittingCat(false);
    }
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
        <p className="text-xs text-[#9AA4B5] mt-1">
          Gerencie cartões de crédito, categorias personalizadas e preferências da sua conta.
        </p>
      </div>


      <NotificationsSettings />

      {/* 1. Gestão de Cartões de Crédito */}
      <div className="card-depth-3d p-5 sm:p-6 rounded-3xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#A8B5D1]/15 text-[#A8B5D1] flex items-center justify-center">
              <CardIcon className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Meus Cartões de Crédito</h3>
              <p className="text-[11px] text-[#9AA4B5]">
                Gerencie limites, datas, cores, logos e faturas dos seus cartões com suporte a edição completa.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setCardToEdit(null);
              setIsCardModalOpen(true);
            }}
            className="btn-liquid-glass-primary py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Novo Cartão</span>
          </button>
        </div>

        {creditCards.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#0F1218] border border-[#1F2531] text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#1C212C] text-[#9AA4B5] flex items-center justify-center mx-auto">
              <CardIcon className="w-5 h-5" />
            </div>
            <p className="text-xs text-[#9AA4B5]">
              Nenhum cartão cadastrado. Adicione seu primeiro cartão para acompanhar faturas e parcelas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {creditCards.map(card => {
              const baseColor = card.color || (card.bankName && BANK_DEFAULT_COLORS[card.bankName]) || '#3B82F6';
              const cardLogo = card.logoUrl || card.bankLogo;
              const summary = cardInvoices[card.id];
              const currentInvoice = summary ? summary.total : 0;

              return (
                <div 
                  key={card.id}
                  className="w-full h-48 sm:h-52 rounded-2xl p-4.5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 card-depth-3d group hover:-translate-y-1"
                  style={{
                    background: `linear-gradient(135deg, ${baseColor} 0%, #10141B 95%)`,
                    boxShadow: `0 10px 24px -4px ${baseColor}35, 0 4px 12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.35)`
                  }}
                >
                  {/* Gloss Reflection Overlay */}
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-40"
                    style={{
                      background: 'radial-gradient(ellipse at 85% 0%, rgba(255,255,255,0.4) 0%, transparent 65%)'
                    }}
                  />

                  {/* Top Row: Chip Metálico + Wifi + Nome do Banco + Logo / Nome */}
                  <div className="flex items-start justify-between relative z-10 gap-2">
                    <div className="flex items-center gap-2">
                      {/* Sim Chip Dourado */}
                      <div className="w-8 h-6 rounded-md bg-linear-to-tr from-amber-400 via-amber-200 to-amber-500 border border-amber-600/50 p-0.5 shadow-sm relative overflow-hidden shrink-0">
                        <div className="w-full h-full border border-amber-800/30 rounded-xs flex flex-col justify-around">
                          <div className="h-[1px] bg-amber-800/40 w-full" />
                          <div className="h-[1px] bg-amber-800/40 w-full" />
                        </div>
                      </div>
                      <Wifi className="w-3.5 h-3.5 text-white/70 rotate-90 shrink-0" />
                      {card.bankName && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/95 px-2 py-0.5 rounded-md bg-black/45 backdrop-blur-xs border border-white/15 truncate max-w-[95px] sm:max-w-[110px]">
                          {card.bankName}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      {cardLogo ? (
                        <div className="h-6 max-w-[75px] flex items-center justify-end">
                          <img
                            src={cardLogo}
                            alt={card.bankName || card.cardName}
                            className="max-h-6 max-w-[75px] object-contain drop-shadow"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <span className="text-xs font-extrabold text-white tracking-tight uppercase block drop-shadow-xs">
                          {card.cardName}
                        </span>
                      )}
                      {cardLogo && (
                        <span className="text-[10px] font-semibold text-white/90 tracking-tight uppercase block drop-shadow-xs">
                          {card.cardName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Row: Digits Monospaced */}
                  <div className="flex items-center justify-between relative z-10">
                    <div className="text-xs sm:text-sm font-mono tracking-widest text-white/90 drop-shadow-xs">
                      •••• •••• •••• {card.lastFourDigits}
                    </div>
                    {card.limitAmount && card.limitAmount > 0 && (
                      <span className="text-[10px] text-white/75 font-mono bg-black/35 px-2 py-0.5 rounded-md backdrop-blur-xs border border-white/10">
                        Lim: {formatBRL(card.limitAmount)}
                      </span>
                    )}
                  </div>

                  {/* Bottom Row: Informações de Vencimento/Fechamento + Ações (Editar e Excluir) */}
                  <div className="flex items-end justify-between relative z-10 pt-2 border-t border-white/10">
                    <div className="text-[10px] text-white/80 space-y-0.5">
                      <div>
                        <span>Vence dia <strong>{card.dueDay || '—'}</strong></span>
                        {card.closingDay && (
                          <span className="text-white/60 ml-2">Fecha dia <strong>{card.closingDay}</strong></span>
                        )}
                      </div>
                      {currentInvoice > 0 && (
                        <span className="block text-[9.5px] text-white/65 font-mono">
                          Fatura Mês: <strong className="text-white">{formatBRL(currentInvoice)}</strong>
                        </span>
                      )}
                    </div>

                    {/* Botões de Ação Liquid Glass */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCardToEdit(card);
                          setIsCardModalOpen(true);
                        }}
                        title="Editar Cartão (nome, banco, cor, logo, limites)"
                        className="btn-liquid-glass px-2.5 py-1.5 rounded-xl text-white hover:text-[#A8B5D1] text-[11px] font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
                      >
                        <Pencil className="w-3 h-3 stroke-[2.5]" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCardToDelete(card)}
                        title="Remover Cartão"
                        className="btn-liquid-glass p-1.5 rounded-xl text-white/70 hover:text-[#E29578] shadow-sm active:scale-95 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Categorias Personalizadas */}
      <div className="card-depth-3d p-5 rounded-3xl space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#A8B5D1]" /> Categorias Personalizadas
          </h3>
          <p className="text-xs text-[#9AA4B5] mt-0.5">
            Adicione novas categorias além das padrões do sistema para organizar seus lançamentos.
          </p>
        </div>

        {/* Formulário de Adicionar Categoria */}
        <form onSubmit={handleAddCategory} className="space-y-3">
          <div className="flex gap-2">
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#0F1218] rounded-xl border border-[#283040] w-52 shrink-0">
              <button
                type="button"
                onClick={() => setCategoryType('expense')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  categoryType === 'expense'
                    ? 'bg-[#E29578] text-black shadow-xs'
                    : 'text-[#AEB6C4] hover:text-white'
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
                    : 'text-[#AEB6C4] hover:text-white'
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
                className="flex-1 px-3.5 py-2 bg-[#0F1218] border border-[#283040] rounded-xl text-xs text-white placeholder-[#5E6A7E] focus:outline-hidden focus:border-white transition"
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
        <div className="pt-2 border-t border-[#1F2531] space-y-3">
          <div>
            <span className="text-[11px] font-medium text-[#9AA4B5] uppercase tracking-wider block mb-2">
              Suas Categorias de Despesas Personalizadas ({userCustomExpenses.length})
            </span>
            {userCustomExpenses.length === 0 ? (
              <span className="text-xs text-[#5E6A7E] italic">Nenhuma categoria personalizada criada.</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {userCustomExpenses.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0F1218] border border-[#283040] text-xs text-white"
                  >
                    <span>{cat.name}</span>
                    <button
                      type="button"
                      onClick={() => setCatToDelete(cat)}
                      title="Excluir categoria"
                      className="text-[#9AA4B5] hover:text-[#E29578] transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <span className="text-[11px] font-medium text-[#9AA4B5] uppercase tracking-wider block mb-2">
              Suas Categorias de Receitas Personalizadas ({userCustomIncomes.length})
            </span>
            {userCustomIncomes.length === 0 ? (
              <span className="text-xs text-[#5E6A7E] italic">Nenhuma categoria personalizada criada.</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {userCustomIncomes.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0F1218] border border-[#283040] text-xs text-white"
                  >
                    <span>{cat.name}</span>
                    <button
                      type="button"
                      onClick={() => setCatToDelete(cat)}
                      title="Excluir categoria"
                      className="text-[#9AA4B5] hover:text-[#E29578] transition cursor-pointer"
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

      {/* 3. Informações da Conta & Sessão */}
      <div className="card-depth-3d p-5 rounded-3xl space-y-3">
        <h3 className="text-xs font-semibold text-[#9AA4B5] uppercase tracking-wider">
          Informações da Conta & Nuvem
        </h3>
        <div className="space-y-2 text-xs">
          <div className="p-3 bg-[#0F1218] border border-[#1F2531] rounded-xl flex items-center justify-between">
            <span className="text-[#9AA4B5]">Usuário Conectado:</span>
            <span className="font-medium text-white">{user?.displayName || user?.email}</span>
          </div>

          {user && (
            <div className="p-3 bg-[#0F1218] border border-[#1F2531] rounded-xl flex items-center justify-between">
              <span className="text-[#9AA4B5]">UID Firebase:</span>
              <span className="font-mono text-[11px] text-[#A8B5D1]">{user.uid}</span>
            </div>
          )}

          <div className="p-3 bg-[#0F1218] border border-[#1F2531] rounded-xl flex items-center justify-between">
            <span className="text-[#9AA4B5]">Sincronização Nuvem:</span>
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
            className="w-full py-3 rounded-2xl bg-[#1C212C] hover:bg-[#283040] text-[#E29578] border border-[#283040] text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair da Conta (Logout)</span>
          </button>
        </div>
      </div>

      {/* Modal para adicionar ou editar cartão */}
      <CreditCardModal
        isOpen={isCardModalOpen}
        cardToEdit={cardToEdit}
        onClose={() => {
          setIsCardModalOpen(false);
          setCardToEdit(null);
        }}
        onSave={async (card) => {
          if (cardToEdit) {
            await updateCreditCard(cardToEdit.id, card);
            showToast(`Cartão "${card.cardName}" atualizado.`);
          } else {
            await addCreditCard(card);
            showToast(`Cartão "${card.cardName}" cadastrado.`);
          }
          setIsCardModalOpen(false);
          setCardToEdit(null);
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
