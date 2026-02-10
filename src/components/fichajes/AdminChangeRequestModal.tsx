import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { X, FileText, ShieldCheck, History, UserCheck, MessageSquare, ArrowRight, CircleCheck, CircleX, Hourglass, CalendarSync } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { parseDolibarrDate } from '@/lib/date-utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PendingChange {
    id: string; // rowid
    tipo: string;
    fecha_creacion_iso: string; // El nuevo horario propuesto
    fecha_anterior_iso?: string; // El horario original
    observaciones: string;
    usuario_nombre?: string;
}

export default function AdminChangeRequestModal() {
    const { user } = useAuth();
    const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (user && !user.admin) {
            fetchPendingChanges();
        }
    }, [user]);

    const fetchPendingChanges = async () => {
        try {
            const token = localStorage.getItem('dolibarr_token');
            const res = await fetch('/api/fichajes/pending', {
                headers: { 'DOLAPIKEY': token || '' }
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    setPendingChanges(data);
                    setIsOpen(true);
                }
            }
        } catch (error) {
            console.error('Error fetching pending changes:', error);
        }
    };

    const handleAction = async (action: 'accept' | 'reject') => {
        if (!pendingChanges[currentIndex]) return;

        const changeId = pendingChanges[currentIndex].id;
        setLoading(true);

        try {
            const token = localStorage.getItem('dolibarr_token');
            const res = await fetch(`/api/fichajes/${changeId}/${action}`, {
                method: 'POST',
                headers: { 'DOLAPIKEY': token || '' }
            });

            if (!res.ok) throw new Error('Error processing request');

            toast.success(action === 'accept' ? 'Cambio aceptado' : 'Cambio rechazado');

            // Remove current item locally
            const newPending = [...pendingChanges];
            newPending.splice(currentIndex, 1);
            setPendingChanges(newPending);

            if (newPending.length === 0) {
                setIsOpen(false);
            } else if (currentIndex >= newPending.length) {
                setCurrentIndex(0);
            }

        } catch (error) {
            console.error(error);
            toast.error('Error al procesar la acción');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || pendingChanges.length === 0 || user?.admin) return null;

    const currentChange = pendingChanges[currentIndex];
    const isSalida = currentChange.tipo === 'salida';

    // Type colors matching TimerCard
    const typeColor = isSalida ? '#FF7A7A' : '#AFF0BA';
    const typeText = isSalida ? '#FFFFFF' : '#1D4D2F';

    // Helper to format date nicely - Exactly like TodayFichajes
    const formatDate = (isoDate: string) => {
        try {
            const date = parseDolibarrDate(isoDate);
            const formatted = format(date, "EEEE, d 'de' MMMM 'a las' HH:mm", { locale: es });
            return formatted.charAt(0).toUpperCase() + formatted.slice(1);
        } catch (e) {
            return isoDate;
        }
    };

    const formatTimeOnly = (isoDate: string) => {
        try {
            if (!isoDate) return '--:--';

            // If it's already a short time string like "09:05:00" or "09:05"
            if (isoDate.includes(':') && !isoDate.includes('-')) {
                const parts = isoDate.split(':');
                if (parts.length >= 2) {
                    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
                }
            }

            const date = parseDolibarrDate(isoDate);
            if (isNaN(date.getTime())) return '--:--';
            return format(date, "HH:mm");
        } catch (e) {
            return '--:--';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#121726]/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-400 border border-gray-100">
                {/* Header - Minimalist B&W */}
                <div className="p-8 pb-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-black rounded-2xl text-white shadow-lg">
                            <ShieldCheck size={24} />
                        </div>
                        <h2 className="text-xl font-black text-black tracking-tight">
                            Validar cambio
                        </h2>
                    </div>
                    <p className="text-gray-400 text-xs font-semibold leading-relaxed">
                        Un administrador ha modificado un registro. Por favor, confirma si el cambio es correcto.
                    </p>
                </div>

                {/* Content Area - Small & Compact */}
                <div className="px-8 pb-8 space-y-5">
                    <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100 space-y-6">
                        {/* Status Label - Contextual Color */}
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-gray-300">
                                <History size={10} />
                                {currentIndex + 1} de {pendingChanges.length}
                            </div>
                            <span
                                className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-tight shadow-sm"
                                style={{ backgroundColor: typeColor, color: typeText }}
                            >
                                {isSalida ? 'Salida' : 'Entrada'}
                            </span>
                        </div>

                        <div className="space-y-5">
                            {/* Comparison view: Old vs New */}
                            <div className="space-y-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-300">Cambio solicitado</span>

                                <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex-1">
                                        <div className="text-[8px] font-black uppercase text-gray-400 mb-0.5">Anterior</div>
                                        <div className="text-sm font-bold text-gray-300 line-through">
                                            {currentChange.fecha_anterior_iso ? formatTimeOnly(currentChange.fecha_anterior_iso) : '--:--'}
                                        </div>
                                    </div>

                                    <div className="text-gray-200">
                                        <ArrowRight size={14} />
                                    </div>

                                    <div className="flex-1">
                                        <div className="text-[8px] font-black uppercase text-black mb-0.5">Propuesto</div>
                                        <div className="text-sm font-black text-black">
                                            {formatTimeOnly(currentChange.fecha_creacion_iso)}
                                        </div>
                                    </div>

                                    <div className="p-2 bg-gray-50 rounded-xl text-black">
                                        <CalendarSync size={16} />
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold px-1">
                                    {formatDate(currentChange.fecha_creacion_iso)}
                                </p>
                            </div>

                            <div className="space-y-1 pt-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-300">Observaciones del administrador</span>
                                <div className="bg-white/80 rounded-2xl p-4 border border-gray-100 shadow-sm">
                                    <p className="text-xs text-gray-500 font-medium italic leading-relaxed">
                                        {(() => {
                                            const cleaned = currentChange.observaciones
                                                .replace(/\[\s*Selecciona un motivo\s*\.\.\.\s*\]/gi, '')
                                                .trim();
                                            return cleaned ? `"${cleaned}"` : "Registro modificado por el administrador";
                                        })()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions - Stacked for Mobile, minimalist B&W */}
                    <div className="space-y-2 pt-2">
                        <button
                            onClick={() => handleAction('accept')}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-4 bg-black text-white rounded-2xl font-black text-sm hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-gray-200 disabled:opacity-50"
                        >
                            <CircleCheck size={18} className="text-white" />
                            Confirmar cambio
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => handleAction('reject')}
                                disabled={loading}
                                className="py-3 bg-white border border-gray-100 text-gray-400 rounded-xl font-bold text-xs hover:text-red-500 hover:border-red-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <CircleX size={14} className="text-red-500" />
                                Rechazar
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="py-3 bg-white border border-gray-100 text-gray-400 rounded-xl font-bold text-xs hover:text-black hover:border-black/10 transition-all flex items-center justify-center gap-2"
                            >
                                <Hourglass size={14} className="text-amber-400" />
                                Decidir luego
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
