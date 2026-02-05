'use client';

import React, { useState, useEffect } from 'react';
import { Download, MonitorSmartphone } from 'lucide-react';
import InstallGuideModal from './InstallGuideModal';

export default function InstallPrompt() {
    const [showModal, setShowModal] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Detectar si ya está en modo standalone (instalada)
        const checkStandalone = () => {
            const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone ||
                document.referrer.includes('android-app://');
            setIsStandalone(isStandaloneMode);
        };

        checkStandalone();

        // Detectar iOS para ajustar sugerencias si fuera necesario
        const userAgent = window.navigator.userAgent.toLowerCase();
        setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    }, []);

    // Si ya está instalada, no mostrar el botón
    if (isStandalone) return null;

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-3 bg-primary/10 border border-primary/20 rounded-[1.4rem] text-primary hover:bg-primary/20 transition-all shadow-sm group"
                title="Instalar Aplicación"
            >
                <MonitorSmartphone size={18} className="group-hover:scale-110 transition-transform" />
                <span className="text-sm font-bold tracking-tight hidden md:inline">Instalar App</span>
                <span className="text-sm font-bold tracking-tight md:hidden">Instalar</span>
            </button>

            <InstallGuideModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
            />
        </>
    );
}
