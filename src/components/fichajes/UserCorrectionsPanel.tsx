'use client';

import React from 'react';
import { CorrectionRequest } from '@/lib/admin-types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Clock, CheckCircle, XCircle,
    CalendarClock, MessageCircle, Info, ChevronDown, ArrowRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

import Link from 'next/link';

interface UserCorrectionsPanelProps {
    corrections: CorrectionRequest[];
    loading: boolean;
    showUser?: boolean; // New prop to toggle user name display
}

// Robust time formatter — handles ISO strings, "YYYY-MM-DD HH:mm:ss", timestamps
const formatTime = (dateStr: string | null | undefined, isOriginal: boolean = false) => {
    if (!dateStr || dateStr === 'null' || dateStr === 'undefined') {
        return '--:--';
    }
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
    if (!obs || obs === 'undefined') return null;
    const match = obs.match(/^\[([^\]]+)\]\s*([\s\S]*)/);
    if (match) {
        const label = match[1];
        if (label === 'undefined') return { label: '', text: match[2] };
        return { label, text: match[2] };
    }
    return { label: '', text: obs };
};

const StatusConfig: Record<string, { icon: typeof Clock; label: string; color: string; bg: string; border: string }> = {
    pendiente: { icon: Clock, label: 'Pendiente', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    aprobada: { icon: CheckCircle, label: 'Aprobada', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    rechazada: { icon: XCircle, label: 'Rechazada', color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
};

const UserCorrectionsPanel: React.FC<UserCorrectionsPanelProps> = ({ corrections, loading, showUser }) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 h-full w-full">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cargando solicitudes...</p>
                </div>
            </div>
        );
    }

    if (corrections.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center h-full w-full">
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

    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const toggleRow = (id: string) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Helper to check for REAL time differences (ignore format mismatches or empty vs null)
    const areTimesDifferent = (t1: string | null | undefined, t2: string | null | undefined) => {
        const v1 = formatTime(t1);
        const v2 = formatTime(t2);
        // If both are placeholder/empty, they are equal
        if (v1 === '--:--' && v2 === '--:--') return false;
        return v1 !== v2;
    };

    // Split corrections into individual action items
    const flattenedItems: Array<any> = [];
    corrections.forEach(c => {
        const pPausas = Array.isArray(c.pausas)
            ? c.pausas
            : (typeof c.pausas === 'string'
                ? (() => { try { return JSON.parse(c.pausas || '[]'); } catch { return []; } })()
                : []);

        const actions: any[] = [];

        // 1. Entrada
        if (c.hora_entrada && areTimesDifferent(c.hora_entrada, c.hora_entrada_original)) {
            actions.push({ ...c, virtualId: `${c.rowid}-entrada`, specificType: 'entrada' });
        }
        // 2. Salida
        if (c.hora_salida && areTimesDifferent(c.hora_salida, c.hora_salida_original)) {
            actions.push({ ...c, virtualId: `${c.rowid}-salida`, specificType: 'salida' });
        }
        // 3. Pausas
        pPausas.forEach((p: any, idx: number) => {
            if (p.inicio_iso && areTimesDifferent(p.inicio_iso, p.original_inicio_iso)) {
                actions.push({ ...c, virtualId: `${c.rowid}-pausa-${idx}`, specificType: 'pausa', pData: p });
            }
            if (p.fin_iso && areTimesDifferent(p.fin_iso, p.original_fin_iso)) {
                actions.push({ ...c, virtualId: `${c.rowid}-regreso-${idx}`, specificType: 'regreso', pData: p });
            }
        });

        // 4. Fallback if no specific time changes (e.g. just status change or only observations)
        if (actions.length === 0) {
            actions.push({ ...c, virtualId: `${c.rowid}-jornada`, specificType: 'jornada' });
        }

        flattenedItems.push(...actions);
    });

    // Sort: pending first, then by shift date descending (most recent workday at the top)
    const sorted = flattenedItems.sort((a, b) => {
        const order: Record<string, number> = { pendiente: 0, aprobada: 1, rechazada: 2 };
        const statusDiff = (order[a.estado] ?? 3) - (order[b.estado] ?? 3);
        if (statusDiff !== 0) return statusDiff;

        // Use fecha_jornada for date sorting (ignores time as it's just YYYY-MM-DD)
        return new Date(b.fecha_jornada).getTime() - new Date(a.fecha_jornada).getTime();
    });

    // Pagination logic
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const displayTotalPages = Math.ceil(sorted.length / itemsPerPage);
    // ensure displayTotalPages calculation is consistent with page.tsx
    const totalPages = displayTotalPages;

    const paginated = sorted.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="flex flex-col h-full w-full">
            <div className="flex-1 space-y-4 pb-12">
                {paginated.map((item) => {
                    const status = StatusConfig[item.estado] || StatusConfig.pendiente;
                    const isExpanded = !!expandedRows[item.virtualId];

                    const badgeConfig = (() => {
                        switch (item.specificType) {
                            case 'entrada': return { label: 'Entrada', color: 'bg-[#BEEDAD] text-black border-[#A2D991]', glow: 'bg-[#BEEDAD]' };
                            case 'salida': return { label: 'Salida', color: 'bg-[#FF8585] text-black border-[#FF6B6B]', glow: 'bg-[#FF8585]' };
                            case 'pausa': return { label: 'Pausa', color: 'bg-[#FFF5A6] text-black border-[#FFE882]', glow: 'bg-[#FFF5A6]' };
                            case 'regreso': return { label: 'Regreso', color: 'bg-[#A6D8FF] text-black border-[#82C6FF]', glow: 'bg-[#A6D8FF]' };
                            default: return { label: 'Jornada', color: 'bg-gray-200 text-black border-gray-300', glow: 'bg-gray-400' };
                        }
                    })();

                    return (
                        <div
                            key={item.virtualId}
                            className="group relative bg-white rounded-[1.8rem] shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-md"
                        >
                            {/* Intense Glow Effect - Matching admin/centers style */}
                            <div className={cn(
                                "absolute bottom-0 right-0 w-32 h-32 blur-2xl rounded-tl-full transition-all duration-500 pointer-events-none z-0",
                                isExpanded ? "opacity-0 translate-x-4 translate-y-4" : "opacity-100 translate-x-0 translate-y-0",
                                item.specificType === 'entrada' ? "bg-gradient-to-tl from-emerald-500/40 to-transparent" :
                                    item.specificType === 'salida' ? "bg-gradient-to-tl from-rose-500/40 to-transparent" :
                                        item.specificType === 'pausa' ? "bg-gradient-to-tl from-amber-500/40 to-transparent" :
                                            item.specificType === 'regreso' ? "bg-gradient-to-tl from-blue-500/40 to-transparent" :
                                                "bg-gradient-to-tl from-gray-400/40 to-transparent"
                            )} />
                            {/* Header - Always visible */}
                            <div
                                className="flex items-center justify-between p-5 cursor-pointer select-none"
                                onClick={() => toggleRow(item.virtualId)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "p-3 rounded-2xl border transition-all duration-500",
                                        isExpanded ? "bg-black text-white border-black rotate-[10deg]" : "bg-gray-50 text-[#121726] border-gray-100/50"
                                    )}>
                                        <CalendarClock size={20} strokeWidth={2} />
                                    </div>
                                    <div>
                                        {showUser && (
                                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                                                {item.firstname} {item.lastname}
                                            </div>
                                        )}
                                        <h3 className="text-gray-900 font-black text-[1rem] capitalize tracking-tight leading-none">
                                            {formatDate(item.fecha_jornada)}
                                        </h3>
                                        {/* Action Type Badge */}
                                        <span className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border mt-1.5 shadow-sm",
                                            badgeConfig.color
                                        )}>
                                            {badgeConfig.label}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* Only show 'Requiere Acción' in header, other statuses are inside or obvious */}
                                    {(() => {
                                        const isAdminRequest = item.fk_creator && String(item.fk_creator) !== String(item.fk_user);
                                        const isPendingAdmin = item.estado === 'pendiente' && isAdminRequest;

                                        if (isPendingAdmin) {
                                            return (
                                                <div className="hidden md:flex gap-2">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-50 text-purple-600 border border-purple-100 animate-pulse shadow-sm">
                                                        <Info size={12} />
                                                        Acción Pendiente
                                                    </span>
                                                    <Link href="/fichajes" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-black text-white hover:brightness-125 transition-all shadow-md active:scale-95">
                                                        Revisar
                                                    </Link>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}

                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border border-gray-100/80 z-10",
                                        isExpanded ? "bg-black text-white rotate-180" : "bg-white text-black"
                                    )}>
                                        <ChevronDown size={20} strokeWidth={2.5} />
                                    </div>
                                </div>
                            </div>

                            {/* Collapsible Content */}
                            <div className={cn(
                                "grid transition-[grid-template-rows,opacity,padding] duration-500 ease-in-out",
                                isExpanded ? "grid-rows-[1fr] opacity-100 p-5 pt-0" : "grid-rows-[0fr] opacity-0 p-0"
                            )}>
                                <div className="overflow-hidden space-y-5">
                                    <div className="h-px bg-gray-50 w-full" />

                                    {/* Status Mobile (Hidden on MD) - Only show if action needed */}
                                    {(() => {
                                        const isAdminRequest = item.fk_creator && String(item.fk_creator) !== String(item.fk_user);
                                        const isPendingAdmin = item.estado === 'pendiente' && isAdminRequest;

                                        if (isPendingAdmin) {
                                            return (
                                                <div className="md:hidden flex flex-wrap gap-2 mb-4">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-50 text-purple-600 border border-purple-100 animate-pulse">
                                                        <Info size={12} />
                                                        Acción Pendiente
                                                    </span>
                                                    <Link href="/fichajes" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-black text-white font-bold">
                                                        Revisar
                                                    </Link>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}

                                    {/* Details Content */}
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-3">
                                            {/* Entrance Comparison */}
                                            {item.specificType === 'entrada' && (
                                                <div className="flex flex-col gap-2 bg-gray-50/50 rounded-[1.2rem] p-4 border border-gray-100/50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Anterior</span>
                                                            <span className="text-base font-black text-gray-400 line-through tabular-nums leading-none">
                                                                {formatTime(item.hora_entrada_original, true)}
                                                            </span>
                                                        </div>
                                                        <ArrowRight size={16} className="text-gray-300 mx-1" />
                                                        <span className="text-xl font-black text-gray-900 tabular-nums leading-none">
                                                            {formatTime(item.hora_entrada)}
                                                        </span>
                                                        <div className="ml-auto flex items-center gap-2">
                                                            {item.estado === 'aprobada' && (
                                                                <CheckCircle size={18} className="text-emerald-500" strokeWidth={2.5} />
                                                            )}
                                                            {item.estado === 'rechazada' && (
                                                                <XCircle size={18} className="text-red-500" strokeWidth={2.5} />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Exit Comparison */}
                                            {item.specificType === 'salida' && (
                                                <div className="flex flex-col gap-2 bg-gray-50/50 rounded-[1.2rem] p-4 border border-gray-100/50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Anterior</span>
                                                            <span className="text-base font-black text-gray-400 line-through tabular-nums leading-none">
                                                                {formatTime(item.hora_salida_original, true)}
                                                            </span>
                                                        </div>
                                                        <ArrowRight size={16} className="text-gray-300 mx-1" />
                                                        <span className="text-xl font-black text-gray-900 tabular-nums leading-none">
                                                            {formatTime(item.hora_salida)}
                                                        </span>
                                                        <div className="ml-auto flex items-center gap-2">
                                                            {item.estado === 'aprobada' && (
                                                                <CheckCircle size={18} className="text-emerald-500" strokeWidth={2.5} />
                                                            )}
                                                            {item.estado === 'rechazada' && (
                                                                <XCircle size={18} className="text-red-500" strokeWidth={2.5} />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Pausa Comparison */}
                                            {item.specificType === 'pausa' && item.pData && (
                                                <div className="flex flex-col gap-2 bg-gray-50/50 rounded-[1.2rem] p-4 border border-gray-100/50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Anterior</span>
                                                            <span className="text-base font-black text-gray-400 line-through tabular-nums leading-none">
                                                                {formatTime(item.pData.original_inicio_iso, true)}
                                                            </span>
                                                        </div>
                                                        <ArrowRight size={16} className="text-gray-300 mx-1" />
                                                        <span className="text-xl font-black text-gray-900 tabular-nums leading-none">
                                                            {formatTime(item.pData.inicio_iso)}
                                                        </span>
                                                        <div className="ml-auto flex items-center gap-2">
                                                            {item.estado === 'aprobada' && (
                                                                <CheckCircle size={18} className="text-emerald-500" strokeWidth={2.5} />
                                                            )}
                                                            {item.estado === 'rechazada' && (
                                                                <XCircle size={18} className="text-red-500" strokeWidth={2.5} />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Regreso Comparison */}
                                            {item.specificType === 'regreso' && item.pData && (
                                                <div className="flex flex-col gap-2 bg-gray-50/50 rounded-[1.2rem] p-4 border border-gray-100/50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Anterior</span>
                                                            <span className="text-base font-black text-gray-400 line-through tabular-nums leading-none">
                                                                {formatTime(item.pData.original_fin_iso, true)}
                                                            </span>
                                                        </div>
                                                        <ArrowRight size={16} className="text-gray-300 mx-1" />
                                                        <span className="text-xl font-black text-gray-900 tabular-nums leading-none">
                                                            {formatTime(item.pData.fin_iso)}
                                                        </span>
                                                        <div className="ml-auto flex items-center gap-2">
                                                            {item.estado === 'aprobada' && (
                                                                <CheckCircle size={18} className="text-emerald-500" strokeWidth={2.5} />
                                                            )}
                                                            {item.estado === 'rechazada' && (
                                                                <XCircle size={18} className="text-red-500" strokeWidth={2.5} />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Generic/Jornada Fallback */}
                                            {item.specificType === 'jornada' && (
                                                <div className="flex flex-col gap-1 text-center py-4 text-gray-400">
                                                    <Info size={24} className="mx-auto mb-2 opacity-50" />
                                                    <p className="text-xs font-bold uppercase tracking-widest">Cambios en la jornada</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Observations */}
                                        {item.observaciones && (() => {
                                            const parsed = parseObservaciones(item.observaciones);
                                            if (!parsed) return null;
                                            return (
                                                <div className="flex flex-col gap-2 bg-gray-50/70 rounded-2xl p-4 border border-gray-100/50">
                                                    <div className="flex items-center gap-2 text-gray-400">
                                                        <Info size={14} strokeWidth={2.5} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">Mi Justificación</span>
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-600 leading-relaxed">
                                                        {parsed.label && <span className="font-black text-gray-900">{parsed.label}: </span>}
                                                        {parsed.text}
                                                    </p>
                                                </div>
                                            );
                                        })()}

                                        {/* Admin Note (if resolved) */}
                                        {item.admin_note && (
                                            <div className="flex flex-col gap-2 rounded-2xl p-4 border border-gray-100/50 bg-white">
                                                <div className="flex items-center gap-2 text-gray-400">
                                                    <MessageCircle size={14} strokeWidth={2.5} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Nota del Administrador</span>
                                                </div>
                                                <p className="text-sm font-semibold leading-relaxed text-black">
                                                    {item.admin_note}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 0 && (() => {
                const maxVisiblePages = 5;
                const safeDisplayTotalPages = Math.max(1, totalPages);

                let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                let endPage = startPage + maxVisiblePages - 1;

                if (endPage > safeDisplayTotalPages) {
                    endPage = safeDisplayTotalPages;
                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                }

                const pages = [];
                for (let i = startPage; i <= endPage; i++) {
                    pages.push(i);
                }

                return (
                    <div className="w-full shrink-0 mt-auto pt-4 border-t border-gray-100/80 mb-2">
                        <div className="flex items-center justify-between w-full max-w-lg mx-auto text-gray-500 font-medium pb-2 transition-all duration-300">
                            <button
                                type="button"
                                aria-label="prev"
                                onClick={() => {
                                    if (currentPage > 1) {
                                        setCurrentPage(p => p - 1);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }
                                }}
                                disabled={currentPage === 1}
                                className="rounded-full bg-slate-200/50 hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.499 12.85a.9.9 0 0 1 .57.205l.067.06a.9.9 0 0 1 .06 1.206l-.06.066-5.585 5.586-.028.027.028.027 5.585 5.587a.9.9 0 0 1 .06 1.207l-.06.066a.9.9 0 0 1-1.207.06l-.066-.06-6.25-6.25a1 1 0 0 1-.158-.212l-.038-.08a.9.9 0 0 1-.03-.606l.03-.083a1 1 0 0 1 .137-.226l.06-.066 6.25-6.25a.9.9 0 0 1 .635-.263Z" fill="#475569" stroke="#475569" strokeWidth=".078" />
                                </svg>
                            </button>

                            <div className="flex items-center gap-2 text-sm font-medium">
                                {pages.map(page => (
                                    <button
                                        key={page}
                                        onClick={() => {
                                            setCurrentPage(page);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className={cn(
                                            "h-10 w-10 flex items-center justify-center aspect-square transition-all duration-500",
                                            currentPage === page
                                                ? "text-primary bg-white/30 backdrop-blur-xl border border-white/50 shadow-[0_8px_20px_0_rgba(99,102,241,0.2)] rounded-full scale-125 font-bold z-10"
                                                : "text-gray-500 hover:bg-white/20"
                                        )}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>

                            <button
                                type="button"
                                aria-label="next"
                                onClick={() => {
                                    if (currentPage < totalPages) {
                                        setCurrentPage(p => p + 1);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }
                                }}
                                disabled={currentPage >= totalPages}
                                className="rounded-full bg-slate-200/50 hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <svg className="rotate-180" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.499 12.85a.9.9 0 0 1 .57.205l.067.06a.9.9 0 0 1 .06 1.206l-.06.066-5.585 5.586-.028.027.028.027 5.585 5.587a.9.9 0 0 1 .06 1.207l-.06.066a.9.9 0 0 1-1.207.06l-.066-.06-6.25-6.25a1 1 0 0 1-.158-.212l-.038-.08a.9.9 0 0 1-.03-.606l.03-.083a1 1 0 0 1 .137-.226l.06-.066 6.25-6.25a.9.9 0 0 1 .635-.263Z" fill="#475569" stroke="#475569" strokeWidth=".078" />
                                </svg>
                            </button>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default UserCorrectionsPanel;
