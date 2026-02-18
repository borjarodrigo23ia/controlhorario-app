'use client';

import { useState, useEffect } from 'react';
import usePushNotifications from '@/hooks/usePushNotifications';
import { Bell, X } from 'lucide-react';

export default function PushNotificationPrompt() {
    const { isSubscribed, permission, subscribeToPush } = usePushNotifications();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Show if not subscribed, permission not denied, and not explicitly dismissed in this session
        const dismissed = sessionStorage.getItem('push_prompt_dismissed');
        if (!isSubscribed && permission === 'default' && !dismissed) {
            const timer = setTimeout(() => setIsVisible(true), 3000);
            return () => clearTimeout(timer);
        }
    }, [isSubscribed, permission]);

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('push_prompt_dismissed', 'true');
    };

    const handleSubscribe = async () => {
        await subscribeToPush();
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-24 left-4 right-4 z-[100] md:left-auto md:right-8 md:bottom-8 md:w-96 animate-in slide-in-from-bottom-8 duration-500">
            <div className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_rgb(0,0,0,0.08)] border border-slate-100 p-6 flex items-start gap-4">
                <div className="bg-black p-3.5 rounded-2xl text-white shrink-0 shadow-xl shadow-black/10">
                    <Bell size={24} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-900 text-sm mb-1 leading-tight">
                        Activar Notificaciones
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed mb-3">
                        Recibe alertas de tus vacaciones y correcciones directamente en tu móvil.
                    </p>
                    <button
                        onClick={handleSubscribe}
                        className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95"
                    >
                        Activar Ahora
                    </button>
                </div>
                <button
                    onClick={handleDismiss}
                    className="text-slate-300 hover:text-slate-500 transition-colors p-1"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
}
