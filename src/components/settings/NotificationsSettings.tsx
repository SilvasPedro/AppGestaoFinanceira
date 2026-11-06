import React, { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import {
  notificationsEnabled,
  notificationsSupported,
  requestNotificationPermission,
  setNotificationsEnabled
} from '../../services/reminders';
import { useToast } from '../../context/ToastContext';

export const NotificationsSettings: React.FC = () => {
  const { showToast } = useToast();
  const supported = notificationsSupported();
  const [enabled, setEnabled] = useState(notificationsEnabled);
  const permission = supported ? Notification.permission : 'denied';

  const turnOn = async () => {
    const result = await requestNotificationPermission();
    if (result === 'granted') {
      setEnabled(true);
      showToast('Lembretes ativados neste aparelho.');
    } else if (result === 'denied') {
      showToast('O navegador bloqueou as notificações. Libere nas configurações do site e tente de novo.', { kind: 'error', duration: 7000 });
    }
  };

  const turnOff = () => {
    setNotificationsEnabled(false);
    setEnabled(false);
    showToast('Lembretes desativados neste aparelho.', { kind: 'info' });
  };

  return (
    <section className="card-depth-3d p-5 sm:p-6 rounded-3xl space-y-3" aria-labelledby="notif-title">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#E5A97D]/15 text-[#E5A97D] flex items-center justify-center">
            {enabled ? <Bell className="w-4.5 h-4.5" /> : <BellOff className="w-4.5 h-4.5" />}
          </div>
          <div>
            <h3 id="notif-title" className="text-sm font-semibold text-white">
              Lembretes de vencimento
            </h3>
            <p className="text-[11px] text-[#9AA4B5]">Avisos de contas fixas, parcelas e faturas de cartão perto de vencer (3 dias antes) ou atrasadas.</p>
          </div>
        </div>

        {supported ? (
          enabled ? (
            <button type="button" onClick={turnOff} className="btn-liquid-glass rounded-xl px-3.5 py-2 text-xs font-semibold text-[#AEB6C4] hover:text-white cursor-pointer shrink-0">
              Desativar
            </button>
          ) : (
            <button type="button" onClick={turnOn} disabled={permission === 'denied'} className="btn-liquid-glass-primary rounded-xl px-3.5 py-2 text-xs font-bold disabled:opacity-50 cursor-pointer shrink-0">
              Ativar
            </button>
          )
        ) : null}
      </div>

      {!supported && <p className="text-[11px] text-[#E5A97D]">Este navegador não oferece notificações. O aviso de vencimentos continua aparecendo dentro do app.</p>}
      {supported && permission === 'denied' && !enabled && (
        <p className="text-[11px] text-[#E5A97D]">As notificações estão bloqueadas para este site. Libere nas configurações do navegador para ativar.</p>
      )}

      <p className="text-[10px] text-[#9AA4B5]">
        As notificações são geradas pelo app neste aparelho, uma vez por dia para cada vencimento, enquanto o app estiver aberto ou instalado e em execução. Ainda não há envio em
        segundo plano com o app fechado nem por e-mail — isso exigiria um servidor.
      </p>
    </section>
  );
};
