'use client';

import { useState, useEffect, useCallback } from 'react';
import { Palmtree, Check, X } from 'lucide-react';
import Link from 'next/link';
import { useVacations } from '@/hooks/useVacations';

export default function VacationRequestsWidget() {
    const { fetchVacations, approveVacation, rejectVacation } = useVacations();
    const [vacations, setVacations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchVacations({ estado: 'pendiente' });
            setVacations(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [fetchVacations]);

    useEffect(() => {
        load();
    }, [load]);

    const handleApprove = useCallback(async (id: number) => {
        setProcessingId(String(id));
        const result = await approveVacation(id);
        if (result?.success) await load();
        setProcessingId(null);
    }, [approveVacation, load]);

    const handleReject = useCallback(async (id: number) => {
        setProcessingId(String(id));
        const result = await rejectVacation(id);
        if (result?.success) await load();
        setProcessingId(null);
    }, [rejectVacation, load]);

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        } catch { return dateStr; }
    };

    const TIPO_LABELS: Record<string, string> = {
        vacaciones: 'Vacaciones',
        enfermedad: 'Enfermedad',
        asuntos_propios: 'Asuntos Propios',
    };

    const TIPO_COLORS: Record<string, string> = {
        vacaciones: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        enfermedad: 'bg-amber-50 text-amber-600 border-amber-100',
        asuntos_propios: 'bg-blue-50 text-blue-600 border-blue-100',
    };

    return (
        <div className="relative overflow-hidden rounded-[2rem] bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            {/* Decorative background icon */}
            <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
                <div className="absolute -bottom-10 -right-10 opacity-[0.03] -rotate-12">
                    <Palmtree size={160} strokeWidth={1} />
                </div>
            </div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-black">
                            <Palmtree size={18} strokeWidth={2.2} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#121726] tracking-tight">Solicitudes de Vacaciones</h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {vacations.length > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full bg-green-50 text-green-600 text-[11px] font-bold border border-green-100">
                                {vacations.length}
                            </span>
                        )}
                        <Link href="/admin/vacations" className="text-xs font-bold text-primary hover:text-primary/80 transition-colors">
                            Ver todo →
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2].map(i => (
                            <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : vacations.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gray-50 flex items-center justify-center">
                            <Palmtree size={24} className="text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-400 font-semibold">No hay solicitudes pendientes</p>
                    </div>
                ) : (
                    <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                        {vacations.slice(0, 5).map(v => {
                            const name = v.usuario || `Usuario #${v.fk_user || v.rowid}`;
                            const isProcessing = processingId === String(v.rowid);
                            const tipo = v.tipo || 'vacaciones';

                            return (
                                <div
                                    key={v.rowid}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/60 border border-gray-100/50 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-[#121726] truncate">{name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <p className="text-xs text-gray-400 font-medium">
                                                {formatDate(v.fecha_inicio)} → {formatDate(v.fecha_fin)}
                                            </p>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${TIPO_COLORS[tipo] || TIPO_COLORS.vacaciones}`}>
                                                {TIPO_LABELS[tipo] || tipo}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            onClick={() => handleApprove(v.rowid)}
                                            disabled={isProcessing}
                                            className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50"
                                            title="Aprobar"
                                        >
                                            <Check size={16} strokeWidth={2.5} />
                                        </button>
                                        <button
                                            onClick={() => handleReject(v.rowid)}
                                            disabled={isProcessing}
                                            className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50"
                                            title="Rechazar"
                                        >
                                            <X size={16} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
