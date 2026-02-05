'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, MonitorSmartphone, ArrowRight } from 'lucide-react';
import InstallGuideModal from './InstallGuideModal';

export default function LoginInstallPrompt() {
    const [isVisible, setIsVisible] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Detectar si ya está en modo standalone (instalada)
        const checkStandalone = () => {
            const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone ||
                document.referrer.includes('android-app://');
            setIsStandalone(isStandaloneMode);

            // Si no está instalada, mostramos el prompt con un pequeño delay
            if (!isStandaloneMode) {
                const timer = setTimeout(() => setIsVisible(true), 500);
                return () => clearTimeout(timer);
            }
        };

        checkStandalone();
    }, []);

    if (isStandalone || !isVisible) return null;

    return (
        <>
            <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-[350px] z-50 animate-bounce-in">
                <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 dark:border-zinc-800 p-5 overflow-hidden relative group animate-vibrate [animation-delay:0.6s]">
                    {/* Decorative background element */}
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-500" />

                    <button
                        onClick={() => setIsVisible(false)}
                        className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X size={16} />
                    </button>

                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-black dark:bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-black/10">
                            <MonitorSmartphone size={24} className="text-white dark:text-black" />
                        </div>

                        <div className="flex-1 pt-0.5">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-1">
                                Experiencia mejorada
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal mb-4">
                                Te recomendamos instalar la App para recibir notificaciones y acceso rápido.
                            </p>

                            <button
                                onClick={() => setShowModal(true)}
                                className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 active:scale-95 group/btn"
                            >
                                <span>Ver guía de instalación</span>
                                <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <InstallGuideModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
            />
        </>
    );
}
