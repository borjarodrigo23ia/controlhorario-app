import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Check, X, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PendingChange {
    id: string; // rowid
    tipo: string;
    fecha_creacion_iso: string; // Used for Date constructor
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
        if (user) {
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

    if (!isOpen || pendingChanges.length === 0) return null;

    const currentChange = pendingChanges[currentIndex];

    // Helper to format date nicely
    const formatDate = (isoDate: string) => {
        try {
            return new Date(isoDate).toLocaleString('es-ES', {
                dateStyle: 'full',
                timeStyle: 'medium'
            });
        } catch (e) {
            return isoDate;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
                <div className="p-6 bg-amber-50 border-b border-amber-100 flex items-start gap-4">
                    <div className="p-3 bg-amber-100 rounded-full text-amber-600 shrink-0">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-amber-900">Validación Requerida</h2>
                        <p className="text-amber-700 mt-1 text-sm">
                            El administrador ha modificado uno de tus registros. Por ley, debes aceptar o rechazar este cambio.
                        </p>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                        <div className="flex items-center gap-2 mb-4 text-gray-500 text-sm font-medium uppercase tracking-wide">
                            <FileText size={16} />
                            Detalles del Cambio ({pendingChanges.length} pendientes)
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-col border-b border-gray-200 pb-3">
                                <span className="text-xs text-gray-500 uppercase font-semibold mb-1">Fecha del registro</span>
                                <span className="font-semibold text-gray-900 text-lg">
                                    {formatDate(currentChange.fecha_creacion_iso)}
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-gray-200 pb-3">
                                <span className="text-gray-600">Tipo de fichaje:</span>
                                <span className={`font-bold px-1 py-0.5 rounded text-sm ${currentChange.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {currentChange.tipo === 'entrada' ? 'ENTRADA' : 'SALIDA'}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600 block mb-2 text-sm">Motivo indicado por admin:</span>
                                <p className="text-sm bg-white p-4 rounded-lg border border-gray-200 text-gray-800 italic leading-relaxed">
                                    "{currentChange.observaciones}"
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end items-center flex-wrap">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="px-3 py-2 text-gray-500 hover:text-gray-700 font-medium text-sm mr-auto"
                    >
                        Revisar luego
                    </button>
                    <button
                        onClick={() => handleAction('reject')}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-red-100 text-red-600 rounded-xl font-medium hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50"
                    >
                        <X size={18} />
                        Rechazar
                    </button>
                    <button
                        onClick={() => handleAction('accept')}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50"
                    >
                        <Check size={18} />
                        Aceptar
                    </button>
                </div>
            </div>
        </div>
    );
}
