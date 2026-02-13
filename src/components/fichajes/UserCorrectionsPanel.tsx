'use client';

import React from 'react';
import { CorrectionRequest } from '@/lib/admin-types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Clock, CheckCircle, XCircle,
    CalendarClock, MessageSquare, Info
} from 'lucide-react';

interface UserCorrectionsPanelProps {
    corrections: CorrectionRequest[];
    loading: boolean;
}

// Robust time formatter — handles ISO strings, "YYYY-MM-DD HH:mm:ss", timestamps
const formatTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '--:--';
    try {
        // If it's a timestamp number
        if (!isNaN(Number(dateStr)) && !String(dateStr).includes('-')) {
            const ts = Number(dateStr);
            const d = new Date(ts > 10000000000 ? ts : ts * 1000);
            if (!isNaN(d.getTime())) return format(d, 'HH:mm');
        }
        // Try "YYYY-MM-DD HH:mm:ss" or ISO
        const match = dateStr.match(/(\d{2}:\d{2})/);
        if (match) return match[1];
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return format(d, 'HH:mm');
    } catch { /* fallback */ }
    return '--:--';
};

// Robust date formatter
const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
        // Handle "YYYY-MM-DD" directly
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [y, m, d] = dateStr.split('-').map(Number);
            const date = new Date(y, m - 1, d);
            const formatted = format(date, "EEEE d 'de' MMMM", { locale: es });
            return formatted.charAt(0).toUpperCase() + formatted.slice(1);
        }
        // Handle timestamps
        if (!isNaN(Number(dateStr))) {
            const ts = Number(dateStr);
            const d = new Date(ts > 10000000000 ? ts : ts * 1000);
            if (!isNaN(d.getTime())) {
                const formatted = format(d, "EEEE d 'de' MMMM", { locale: es });
                return formatted.charAt(0).toUpperCase() + formatted.slice(1);
            }
        }
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            const formatted = format(d, "EEEE d 'de' MMMM", { locale: es });
            return formatted.charAt(0).toUpperCase() + formatted.slice(1);
        }
    } catch { /* fallback */ }
    return dateStr;
};

const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
        if (!isNaN(Number(dateStr)) && !String(dateStr).includes('-')) {
            const ts = Number(dateStr);
            const d = new Date(ts > 10000000000 ? ts : ts * 1000);
            if (!isNaN(d.getTime())) return format(d, 'dd/MM/yyyy HH:mm');
        }
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return format(d, 'dd/MM/yyyy HH:mm');
        return dateStr;
    } catch { return dateStr; }
};

// Parse observations format "[Motivo] Comentario" into { label, text }
const parseObservaciones = (obs: string | null | undefined): { label: string; text: string } | null => {
    if (!obs) return null;
    const match = obs.match(/^\[([^\]]+)\]\s*([\s\S]*)/);
    if (match) return { label: match[1], text: match[2] };
    return { label: '', text: obs };
};

const StatusConfig: Record<string, { icon: typeof Clock; label: string; color: string; bg: string; border: string }> = {
    pendiente: { icon: Clock, label: 'Pendiente', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    aprobada: { icon: CheckCircle, label: 'Aprobada', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    rechazada: { icon: XCircle, label: 'Rechazada', color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
};

const UserCorrectionsPanel: React.FC<UserCorrectionsPanelProps> = ({ corrections, loading }) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cargando solicitudes...</p>
                </div>
            </div>
        );
    }

    if (corrections.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                    <CalendarClock size={28} className="text-gray-300" />
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-1">
                    Sin solicitudes
                </h3>
                <p className="text-sm text-gray-400 max-w-xs">
                    No has realizado ninguna solicitud de corrección. Puedes solicitar una desde el historial de fichajes.
                </p>
            </div>
        );
    }

    // Sort: pending first, then by date descending
    const sorted = [...corrections].sort((a, b) => {
        const order: Record<string, number> = { pendiente: 0, aprobada: 1, rechazada: 2 };
        const statusDiff = (order[a.estado] ?? 3) - (order[b.estado] ?? 3);
        if (statusDiff !== 0) return statusDiff;
        return new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime();
    });

    return (
        <div className="space-y-4">
            {sorted.map((correction) => {
                const status = StatusConfig[correction.estado] || StatusConfig.pendiente;
                const StatusIcon = status.icon;

                const parsedPausas = Array.isArray(correction.pausas)
                    ? correction.pausas
                    : (typeof correction.pausas === 'string'
                        ? (() => { try { return JSON.parse(correction.pausas || '[]'); } catch { return []; } })()
                        : []);

                return (
                    <div
                        key={correction.rowid}
                        className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-md"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-gray-50 text-[#121726] rounded-2xl border border-gray-100/50">
                                    <CalendarClock size={18} />
                                </div>
                                <div>
                                    <h3 className="text-gray-900 font-bold text-base capitalize">
                                        {formatDate(correction.fecha_jornada)}
                                    </h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                        Solicitud #{correction.rowid}
                                    </p>
                                </div>
                            </div>

                            {/* Status Badge */}
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${status.bg} ${status.color} border ${status.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${correction.estado === 'pendiente' ? 'bg-amber-500 animate-pulse' : correction.estado === 'aprobada' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                <StatusIcon size={12} />
                                {status.label}
                            </span>
                        </div>

                        {/* Body */}
                        <div className="px-5 pb-4 space-y-3">
                            {/* Corrected times - only show fields that have values */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {correction.hora_entrada && formatTime(correction.hora_entrada) !== '--:--' && (
                                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100/50">
                                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wider">Corrección Entrada</span>
                                        <span className="text-sm font-black text-gray-900 tracking-tight">
                                            {formatTime(correction.hora_entrada)}
                                        </span>
                                    </div>
                                )}
                                {correction.hora_salida && formatTime(correction.hora_salida) !== '--:--' && (
                                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100/50">
                                        <span className="text-[9px] font-black text-red-400 uppercase tracking-wider">Corrección Salida</span>
                                        <span className="text-sm font-black text-gray-900 tracking-tight">
                                            {formatTime(correction.hora_salida)}
                                        </span>
                                    </div>
                                )}
                                {parsedPausas.length > 0 && (
                                    <div className="flex items-center gap-1 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100/50">
                                        <Clock size={12} className="text-gray-400" />
                                        <span className="text-[10px] font-bold text-gray-500">{parsedPausas.length} pausa{parsedPausas.length > 1 ? 's' : ''}</span>
                                    </div>
                                )}
                            </div>

                            {/* Observations - parsed into bold label + normal text */}
                            {correction.observaciones && (() => {
                                const parsed = parseObservaciones(correction.observaciones);
                                if (!parsed) return null;
                                return (
                                    <div className="flex items-start gap-2.5 bg-gray-50/70 rounded-xl p-3 border border-gray-100/50">
                                        <Info size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            {parsed.label && <span className="font-bold text-gray-800">{parsed.label}: </span>}
                                            {parsed.text}
                                        </p>
                                    </div>
                                );
                            })()}

                            {/* Admin Note (if resolved) */}
                            {correction.admin_note && (
                                <div className={`flex items-start gap-2.5 rounded-xl p-3 border ${correction.estado === 'aprobada'
                                    ? 'bg-emerald-50/50 border-emerald-100/50'
                                    : 'bg-red-50/50 border-red-100/50'
                                    }`}>
                                    <MessageSquare size={14} className={`mt-0.5 flex-shrink-0 ${correction.estado === 'aprobada' ? 'text-emerald-500' : 'text-red-400'
                                        }`} />
                                    <div className="text-xs leading-relaxed">
                                        <span className={`font-bold ${correction.estado === 'aprobada' ? 'text-emerald-600' : 'text-red-500'
                                            }`}>Nota del administrador: </span>
                                        <span className={
                                            correction.estado === 'aprobada' ? 'text-emerald-700' : 'text-red-600'
                                        }>{correction.admin_note}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 bg-gray-50/30">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                Solicitado: {formatDateTime(correction.date_creation)}
                            </span>
                            {correction.date_approval && (
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Resuelto: {formatDateTime(correction.date_approval)}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default UserCorrectionsPanel;
