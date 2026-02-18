'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import usePushNotifications from '@/hooks/usePushNotifications';
import { Bell, BellOff, Calendar, Clock, RotateCw, Loader2, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function NotificationPreferences() {
    const { user } = useAuth();
    const { isSubscribed, permission, subscribeToPush } = usePushNotifications();
    const [prefs, setPrefs] = useState({
        fichajes: true,
        vacaciones: true,
        cambios: true
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetch(`/api/web-push/preferences?userId=${user.id}`, {
                headers: { 'DOLAPIKEY': localStorage.getItem('dolibarr_token') || '' }
            })
                .then(res => res.json())
                .then(data => {
                    setPrefs(data);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
    }, [user]);

    const handleToggle = async (key: keyof typeof prefs) => {
        const newVal = !prefs[key];
        setPrefs(prev => ({ ...prev, [key]: newVal }));

        // Optimistic UI, then save
        try {
            await fetch('/api/web-push/preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'DOLAPIKEY': localStorage.getItem('dolibarr_token') || ''
                },
                body: JSON.stringify({ userId: user?.id, [key]: newVal })
            });
        } catch (e) {
            // Revert on error
            setPrefs(prev => ({ ...prev, [key]: !newVal }));
        }
    };

    const handleTestNotification = async () => {
        const loadingToast = toast.loading('Enviando notificación de prueba...');
        try {
            const res = await fetch('/api/web-push/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'DOLAPIKEY': localStorage.getItem('dolibarr_token') || '',
                    'X-User-Id': user?.id || ''
                }
            });

            if (res.ok) {
                const data = await res.json();
                const adminMsg = data.debug_admin_count !== undefined
                    ? ` (Admins detectados: ${data.debug_admin_count})`
                    : '';
                toast.success(`Prueba enviada${adminMsg}`, { id: loadingToast });
            } else {
                const data = await res.json();
                toast.error(data.error || 'Error al enviar prueba', { id: loadingToast });
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión', { id: loadingToast });
        }
    };

    if (!isSubscribed) {
        return (
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-[0_20px_60px_rgb(0,0,0,0.03)]">
                <div className="flex items-start gap-4">
                    <div className="bg-black p-3 rounded-2xl shadow-xl shadow-black/10 shrink-0">
                        <BellOff className="text-white" size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-black text-slate-900 text-lg mb-1 leading-tight">
                            {permission === 'granted' ? 'Completar Configuración' : 'Activar Notificaciones'}
                        </h3>
                        <p className="text-sm text-slate-500 font-medium mb-5 leading-relaxed">
                            {permission === 'granted'
                                ? 'Has dado permiso, pero falta vincular este dispositivo con tu cuenta.'
                                : 'Recibe avisos sobre tu horario, vacaciones y cambios en tus fichajes directamente en tu móvil.'}
                        </p>
                        <button
                            onClick={subscribeToPush}
                            className="bg-black text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-900 transition-all active:scale-95 shadow-lg shadow-black/10"
                        >
                            {permission === 'granted' ? 'Vincular Dispositivo' : 'Permitir Notificaciones'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-[0_20px_60px_rgb(0,0,0,0.03)] overflow-hidden">
            <div className="p-8 md:p-10">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-50 p-3 rounded-2xl">
                            <Bell className="text-slate-900" size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 text-lg">Estado: Conectado</h3>
                            <p className="text-sm text-slate-500 font-medium">Este dispositivo está vinculado correctamente</p>
                        </div>
                    </div>
                    <button
                        onClick={handleTestNotification}
                        className="p-3 bg-slate-50 text-slate-400 hover:text-black hover:bg-slate-100 rounded-2xl transition-all active:scale-95 group"
                        title="Probar notificación"
                    >
                        <Send size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                </div>

                <div className="space-y-6">
                    <ToggleRow
                        icon={Clock}
                        title="Recordatorios de Horario"
                        description="Avisos al inicio y fin de tu jornada"
                        checked={prefs.fichajes}
                        onChange={() => handleToggle('fichajes')}
                    />
                    <ToggleRow
                        icon={Calendar}
                        title="Vacaciones"
                        description="Actualizaciones sobre tus solicitudes"
                        checked={prefs.vacaciones}
                        onChange={() => handleToggle('vacaciones')}
                    />
                    <ToggleRow
                        icon={RotateCw}
                        title="Cambios y Correcciones"
                        description="Avisos sobre modificaciones de fichajes"
                        checked={prefs.cambios}
                        onChange={() => handleToggle('cambios')}
                    />
                </div>
            </div>
        </div>
    );
}

function ToggleRow({ icon: Icon, title, description, checked, onChange }: any) {
    return (
        <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer" onClick={onChange}>
            <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-slate-100 text-slate-900">
                    <Icon size={20} strokeWidth={2.5} />
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 text-sm">{title}</h4>
                    <p className="text-xs text-slate-500 font-medium">{description}</p>
                </div>
            </div>
            <div className={`w-12 h-7 rounded-full transition-colors relative ${checked ? 'bg-green-500' : 'bg-red-500'}`}>
                <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
        </div>
    );
}
