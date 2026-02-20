'use client';

import { useState, useEffect, useCallback } from 'react';
import { BadgeCheck, Check, X } from 'lucide-react';
import Link from 'next/link';
import { useCorrections } from '@/hooks/useCorrections';
import { toast } from 'react-hot-toast';

export default function CorrectionRequestsWidget() {
    const { corrections, loading, fetchCorrections, approveCorrection, rejectCorrection } = useCorrections();
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchCorrections(undefined, 'pendiente');
    }, [fetchCorrections]);

    const handleApprove = useCallback(async (id: string) => {
        setProcessingId(id);
        const ok = await approveCorrection(id);
        if (ok) await fetchCorrections(undefined, 'pendiente');
        setProcessingId(null);
    }, [approveCorrection, fetchCorrections]);

    const handleReject = useCallback(async (id: string) => {
        setProcessingId(id);
        const ok = await rejectCorrection(id);
        if (ok) await fetchCorrections(undefined, 'pendiente');
        setProcessingId(null);
    }, [rejectCorrection, fetchCorrections]);

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        } catch { return dateStr; }
    };

    return (
        <div className="relative overflow-hidden rounded-[2rem] bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            {/* Decorative background icon */}
            <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
                <div className="absolute -bottom-8 -right-8 opacity-[0.03] rotate-12">
                    <BadgeCheck size={160} strokeWidth={1} />
                </div>
            </div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                            <BadgeCheck size={18} strokeWidth={2.2} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#121726] tracking-tight">Solicitudes de Fichaje</h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {corrections.length > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[11px] font-bold border border-red-100">
                                {corrections.length}
                            </span>
                        )}
                        <Link href="/admin/corrections" className="text-xs font-bold text-primary hover:text-primary/80 transition-colors">
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
                ) : corrections.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gray-50 flex items-center justify-center">
                            <BadgeCheck size={24} className="text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-400 font-semibold">No hay solicitudes pendientes</p>
                    </div>
                ) : (
                    <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                        {corrections.slice(0, 5).map(c => {
                            const name = [c.firstname, c.lastname].filter(Boolean).join(' ') || c.login || `Usuario #${c.fk_user}`;
                            const isProcessing = processingId === c.rowid;

                            return (
                                <div
                                    key={c.rowid}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/60 border border-gray-100/50 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-[#121726] truncate">{name}</p>
                                        <p className="text-xs text-gray-400 font-medium">
                                            {formatDate(c.fecha_jornada)} · {c.hora_entrada?.slice(0, 5)} - {c.hora_salida?.slice(0, 5)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            onClick={() => handleApprove(c.rowid)}
                                            disabled={isProcessing}
                                            className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50"
                                            title="Aprobar"
                                        >
                                            <Check size={16} strokeWidth={2.5} />
                                        </button>
                                        <button
                                            onClick={() => handleReject(c.rowid)}
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
