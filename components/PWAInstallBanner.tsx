import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';
import { Button } from './UI';

const PWAInstallBanner: React.FC = () => {
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
        const isAndroid = /android/i.test(userAgent);
        const isMobileDevice = isIOSDevice || isAndroid;

        setIsIOS(isIOSDevice);
        setIsMobile(isMobileDevice);

        // Detect if already in standalone mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone
            || document.referrer.includes('android-app://');

        if (isStandalone) return;

        setIsIOS(isIOSDevice);

        // Check if user dismissed it recently
        const dismissedAt = localStorage.getItem('pwa-dismissed-at');
        if (dismissedAt) {
            const now = new Date().getTime();
            const lastDismissed = parseInt(dismissedAt);
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            if (now - lastDismissed < oneWeek) return;
        }

        // Handle Chrome/Android prompt
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setInstallPrompt(e);
            setIsVisible(true);
        };

        // Set visibility if on mobile and not standalone
        if (isMobile && !isStandalone) {
            // Check dismissal again to be safe
            const dismissedAt = localStorage.getItem('pwa-dismissed-at');
            let shouldShow = true;
            if (dismissedAt) {
                const now = new Date().getTime();
                const oneWeek = 7 * 24 * 60 * 60 * 1000;
                if (now - parseInt(dismissedAt) < oneWeek) shouldShow = false;
            }
            if (shouldShow) setIsVisible(true);
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstall = async () => {
        if (!installPrompt) return;

        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;

        if (outcome === 'accepted') {
            setIsVisible(false);
        }
        setInstallPrompt(null);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('pwa-dismissed-at', new Date().getTime().toString());
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-24 left-4 right-4 z-[100] animate-in slide-in-from-bottom duration-500">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl shadow-emerald-500/10 flex flex-col gap-4 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors p-1"
                >
                    <X size={20} />
                </button>

                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 shrink-0">
                        <Download size={24} />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-base leading-tight">Instale o App</h3>
                        <p className="text-slate-400 text-sm mt-0.5">Acesse sua barbearia mais rápido e receba notificações direto no celular.</p>
                    </div>
                </div>

                {isIOS ? (
                    <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/50">
                        <p className="text-xs text-slate-300 flex flex-wrap items-center gap-2 leading-relaxed">
                            Para instalar no iPhone: Toque em <span className="bg-slate-800 p-1.5 rounded-lg inline-flex"><Share size={14} className="text-sky-500" /></span>, depois role para baixo e selecione <span className="bg-slate-800 px-2 py-1 rounded-lg inline-flex items-center gap-1">Adicionar à Tela de Início <PlusSquare size={14} className="text-emerald-500" /></span>.
                        </p>
                    </div>
                ) : installPrompt ? (
                    <Button
                        onClick={handleInstall}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                    >
                        Instalar Agora
                    </Button>
                ) : (
                    <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/50">
                        <p className="text-xs text-slate-300 flex flex-wrap items-center gap-2 leading-relaxed">
                            Para instalar no Android: Toque nos <span className="font-bold text-white">três pontos (⋮)</span> do navegador e selecione <span className="bg-slate-800 px-2 py-1 rounded-lg inline-flex items-center gap-1 font-bold">Instalar aplicativo</span>.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PWAInstallBanner;
