import React, { useState, useEffect } from 'react';
import { Download, Check, Share2, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Detect standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  if (isInstalled) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#171717] text-[#A3C9A8] border border-[#262626]">
        <Check className="w-3.5 h-3.5" /> PWA Ativo
      </span>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        title="Instalar App no celular ou desktop"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#171717] hover:bg-[#262626] text-[#A8B5D1] hover:text-white border border-[#262626] transition active:scale-95"
      >
        <Download className="w-3.5 h-3.5 text-[#A8B5D1]" />
        <span className="hidden xs:inline">Instalar App</span>
      </button>

      {/* Guia para iOS Safari */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-[#171717] border border-[#262626] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#A8B5D1]" /> Instalar no iPhone / iPad
              </h3>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-lg text-[#737373] hover:text-white hover:bg-[#262626]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs text-[#A3A3A3] leading-relaxed">
              <p>
                1. Toque no botão <strong className="text-white">Compartilhar</strong> na barra inferior do Safari.
              </p>
              <p>
                2. Role para baixo e selecione <strong className="text-white">Adicionar à Tela de Início</strong>.
              </p>
              <p>
                3. Toque em <strong className="text-white">Adicionar</strong> no canto superior direito para usar o app em tela cheia mesmo sem internet!
              </p>
            </div>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full rounded-xl bg-[#262626] hover:bg-[#333333] py-2.5 text-xs font-semibold text-white transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
