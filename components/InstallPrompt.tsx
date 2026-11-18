'use client';

import { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if already in standalone PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) return;

    // Check dismissed in session
    if (sessionStorage.getItem('nutrisnap_install_dismissed')) return;

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      const timer = setTimeout(() => setShowPrompt(true), 2500);
      return () => clearTimeout(timer);
    }

    // Android / Desktop beforeinstallprompt
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('nutrisnap_install_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-sm mx-auto animate-fade-in">
      <div className="bg-slate-900/95 border border-emerald-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
          <Download className="w-5 h-5" />
        </div>

        <div className="flex-1">
          <h4 className="text-xs font-bold text-white">Install NutriSnap App</h4>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
            {isIOS ? (
              <span className="flex items-center gap-1 flex-wrap">
                Tap <Share className="w-3 h-3 text-emerald-400 inline" /> and select{' '}
                <strong className="text-slate-200">&apos;Add to Home Screen&apos;</strong>{' '}
                <PlusSquare className="w-3 h-3 text-emerald-400 inline" />
              </span>
            ) : (
              'Install to your home screen for instant camera access and offline use.'
            )}
          </p>

          {!isIOS && deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="mt-2 py-1 px-3 rounded-lg bg-emerald-500 text-white font-semibold text-[11px] hover:bg-emerald-600 transition"
            >
              Install App
            </button>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 text-slate-500 hover:text-white rounded-lg transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
