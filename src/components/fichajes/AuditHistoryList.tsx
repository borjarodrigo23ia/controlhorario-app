'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { History, User, Clock, Info, ArrowRight, Search, Filter, ChevronDown, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface AuditLog {
    id_log: string;
    id_fichaje: string;
    usuario_editor: string;
    usuario_nombre: string;
    fecha_modificacion: string;
    campo_modificado: string;
    valor_anterior: string | null;
    valor_nuevo: string | null;
    comentario: string;
}

interface AuditHistoryListProps {
    userId?: string;
    limit?: number;
}

export default function AuditHistoryList({ userId, limit }: AuditHistoryListProps) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        fetchAuditLogs();
    }, [userId]);

    const fetchAuditLogs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('dolibarr_token');
            const url = userId
                ? `/api/fichajes/history?id_user=${userId}`
                : `/api/fichajes/history`;

            const response = await fetch(url, {
                headers: {
                    'DOLAPIKEY': token || ''
                }
            });

            if (!response.ok) throw new Error('Error al obtener auditoría');

            const data = await response.json();
            setLogs(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            toast.error('No se pudo cargar el registro de auditoría');
        } finally {
            setLoading(false);
        }
    };

    const getFieldLabel = (field: string) => {
        const labels: Record<string, string> = {
            'fk_user': 'ID de Usuario',
            'usuario': 'Nombre de Usuario',
            'tipo': 'Tipo de Fichaje',
            'observaciones': 'Observaciones',
            'fecha_creacion': 'Fecha y Hora',
            'latitud': 'Latitud',
            'longitud': 'Longitud',
            'estado_aceptacion': 'Aceptación',
            'hora_entrada': 'Entrada',
            'hora_salida': 'Salida',
            'total_pausa': 'Total Pausa',
            'total_trabajo': 'Total Trabajo'
        };
        return labels[field] || field;
    };

    const filteredLogs = useMemo(() => {
        return logs.filter((log: AuditLog) =>
            log.usuario_nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.campo_modificado.toLowerCase().includes(searchQuery.toLowerCase()) ||
            getFieldLabel(log.campo_modificado).toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.comentario && log.comentario.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [logs, searchQuery]);

    const { monthlyGroups, totalPages } = useMemo(() => {
        const groups: Record<string, AuditLog[]> = {};

        filteredLogs.forEach((log: AuditLog) => {
            if (!log.fecha_modificacion) return;

            let date: Date;
            const rawValue = log.fecha_modificacion;

            // Robust Date Parsing
            if (!isNaN(Number(rawValue)) && !String(rawValue).includes('-')) {
                const ts = Number(rawValue);
                date = new Date(ts > 10000000000 ? ts : ts * 1000);
            } else {
                date = new Date(rawValue);
            }

            if (isNaN(date.getTime())) return;

            const monthKey = format(date, "yyyy-MM");
            if (!groups[monthKey]) groups[monthKey] = [];
            groups[monthKey].push(log);
        });

        const sortedMonthKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
        const totalItems = sortedMonthKeys.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedKeys = sortedMonthKeys.slice(startIndex, endIndex);

        const pageGroups = paginatedKeys.map(key => ({
            monthKey: key,
            logs: groups[key].sort((a, b) => {
                const parseDate = (val: string | null) => {
                    if (!val) return new Date(0);
                    if (!isNaN(Number(val)) && !String(val).includes('-')) {
                        const ts = Number(val);
                        return new Date(ts > 10000000000 ? ts : ts * 1000);
                    }
                    return new Date(val);
                };
                return parseDate(b.fecha_modificacion).getTime() - parseDate(a.fecha_modificacion).getTime();
            })
        }));

        return { monthlyGroups: pageGroups, totalPages };
    }, [filteredLogs, currentPage]);

    const formatMonth = (monthKey: string) => {
        try {
            const [year, month] = monthKey.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1);
            if (isNaN(date.getTime())) return 'Fecha Desconocida';
            const monthName = date.toLocaleDateString('es-ES', { month: 'long' });
            return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
        } catch (e) {
            return 'Formato Inválido';
        }
    };

    const toggleMonth = (monthKey: string) => {
        setExpandedMonths((prev: Record<string, boolean>) => ({
            ...prev,
            [monthKey]: !prev[monthKey]
        }));
    };

    // Auto-expand first month on load
    useEffect(() => {
        if (monthlyGroups.length > 0) {
            setExpandedMonths((prev: Record<string, boolean>) => ({
                ...prev,
                [monthlyGroups[0].monthKey]: true
            }));
        }
    }, [monthlyGroups]);

    if (loading) {
        return (
            <div className="py-24 flex flex-col items-center justify-center gap-6 animate-pulse">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-black/5 border-t-black rounded-full animate-spin"></div>
                    <div className="absolute inset-0 bg-black/5 rounded-full blur-xl"></div>
                </div>
                <div className="text-center space-y-2">
                    <p className="text-sm font-black text-gray-900 uppercase tracking-[0.2em]">Consultando historial</p>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Sincronizando registros con el servidor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-32">
            {/* Filter Header */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-2 bg-white/50 backdrop-blur-xl rounded-[2.5rem] border border-white/50 shadow-premium">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} strokeWidth={2.5} />
                    <input
                        type="text"
                        placeholder="Buscar por usuario, campo o comentario..."
                        className="w-full pl-14 pr-6 py-4 bg-transparent border-none rounded-2xl text-sm font-bold placeholder:text-gray-300 focus:ring-0 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {monthlyGroups.length === 0 ? (
                <div className="bg-white/40 backdrop-blur-md rounded-[3rem] border border-white p-16 text-center shadow-premium relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gray-200/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                    <div className="relative z-10 max-w-xs mx-auto">
                        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 transition-transform duration-500">
                            <Info size={36} className="text-gray-300" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Sin cambios registrados</h3>
                        <p className="text-sm text-gray-500 font-bold opacity-70 leading-relaxed uppercase tracking-wider">
                            No se han encontrado registros que coincidan con los filtros actuales.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-10">
                    {monthlyGroups.map(({ monthKey, logs: monthLogs }, monthIndex) => {
                        const isExpanded = expandedMonths[monthKey] ?? false;

                        return (
                            <div key={monthKey} className="group flex flex-col gap-3 relative">
                                {/* Monthly Separator */}
                                {monthIndex > 0 && (
                                    <div className="pt-10 mb-2 border-t border-gray-100 mx-2" />
                                )}

                                {/* Monthly Header */}
                                <button
                                    onClick={() => toggleMonth(monthKey)}
                                    className={cn(
                                        "flex items-center justify-between w-full px-5 py-5 rounded-3xl transition-all duration-300 relative overflow-hidden",
                                        "bg-white border border-gray-100 shadow-sm hover:shadow-md",
                                        isExpanded ? "border-black/5" : "hover:border-gray-200"
                                    )}
                                >
                                    <div className="flex items-center gap-4 text-left relative z-10">
                                        <div className={cn(
                                            "w-12 h-12 flex items-center justify-center rounded-2xl transition-all font-bold text-xs tracking-wider",
                                            isExpanded ? "bg-black text-white" : "bg-gray-50 text-gray-400"
                                        )}>
                                            {formatMonth(monthKey).substring(0, 3).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={cn(
                                                "text-sm font-bold transition-colors",
                                                isExpanded ? "text-black" : "text-gray-900"
                                            )}>
                                                {formatMonth(monthKey)}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                                                {monthLogs.length} {monthLogs.length === 1 ? 'cambio registrado' : 'cambios registrados'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={cn(
                                        "p-2 rounded-full transition-all duration-300 relative z-10",
                                        isExpanded ? "rotate-180 bg-gray-100 text-black" : "bg-gray-50 text-gray-300"
                                    )}>
                                        <ChevronDown size={18} />
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="grid gap-6 mt-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                        {monthLogs.map((log, index) => {
                                            const colors = [
                                                'from-emerald-500/10 to-transparent',
                                                'from-blue-500/10 to-transparent',
                                                'from-amber-500/10 to-transparent',
                                                'from-violet-500/10 to-transparent',
                                                'from-rose-500/10 to-transparent'
                                            ];
                                            const accentColor = colors[index % colors.length];

                                            return (
                                                <div key={log.id_log} className="group/card relative bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all duration-300 overflow-hidden">
                                                    <div className={`absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl ${accentColor} blur-2xl rounded-tl-full opacity-40 pointer-events-none transition-opacity duration-500 group-hover/card:opacity-80`} />

                                                    <div className="flex flex-col gap-3 relative z-10">
                                                        {/* Top Row: Field Badge, User & Date */}
                                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="px-3 py-1 bg-black text-white rounded-full text-[9px] font-black uppercase tracking-[0.15em] shadow-sm">
                                                                    {getFieldLabel(log.campo_modificado)}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-gray-500">
                                                                    <User size={12} className="text-gray-400" />
                                                                    <span className="text-[11px] font-bold tracking-tight">{log.usuario_nombre}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 tabular-nums uppercase tracking-wider">
                                                                <Clock size={11} className="opacity-50" />
                                                                {log.fecha_modificacion ? (() => {
                                                                    try {
                                                                        const d = !isNaN(Number(log.fecha_modificacion)) ? new Date(Number(log.fecha_modificacion) * 1000) : new Date(log.fecha_modificacion);
                                                                        return format(d, "d MMM, HH:mm", { locale: es });
                                                                    } catch (e) { return '--:--'; }
                                                                })() : '--:--'}
                                                            </div>
                                                        </div>

                                                        {/* Comparison Row: Compact horizontal layout */}
                                                        <div className="flex items-center gap-2 bg-gray-50/50 p-2 rounded-xl border border-gray-100/50">
                                                            <div className="flex-1 min-w-0 text-center sm:text-left">
                                                                <div className="px-2 py-0.5 text-[8px] uppercase tracking-widest text-red-400 font-black">Antes</div>
                                                                <div className="px-2 text-xs font-semibold text-gray-400 truncate line-through decoration-red-400/20">
                                                                    {log.valor_anterior || '(vacio)'}
                                                                </div>
                                                            </div>

                                                            <div className="shrink-0 w-6 h-6 rounded-full bg-white flex items-center justify-center border border-gray-100 shadow-sm">
                                                                <ArrowRight size={12} className="text-gray-300" strokeWidth={3} />
                                                            </div>

                                                            <div className="flex-1 min-w-0 text-center sm:text-left">
                                                                <div className="px-2 py-0.5 text-[8px] uppercase tracking-widest text-emerald-500 font-black">Después</div>
                                                                <div className="px-2 text-xs font-extra-bold text-gray-900 truncate">
                                                                    {log.valor_nuevo || '(vacio)'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Comentario: Only if exists and very compact */}
                                                        {log.comentario && (
                                                            <div className="flex items-start gap-2 px-2 py-1.5 bg-amber-50/30 rounded-lg border border-amber-100/30">
                                                                <Info size={10} className="text-amber-400 mt-0.5 shrink-0" strokeWidth={3} />
                                                                <p className="text-[11px] text-amber-900/50 font-medium italic leading-tight line-clamp-1">
                                                                    {log.comentario}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="fixed bottom-0 left-0 right-0 md:left-64 p-4 md:p-6 z-[60] mb-[74px] md:mb-0 pointer-events-none">
                    <div className="flex items-center justify-between w-full max-w-lg mx-auto bg-white/40 backdrop-blur-2xl border border-white/50 p-3 px-6 rounded-full shadow-premium text-gray-500 font-medium pointer-events-auto transition-all duration-300">
                        <button
                            type="button"
                            onClick={() => {
                                if (currentPage > 1) {
                                    setCurrentPage((p: number) => p - 1);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                            }}
                            disabled={currentPage === 1}
                            className="p-2 rounded-full hover:bg-black/5 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                            <ArrowRight className="rotate-180" size={20} strokeWidth={2.5} />
                        </button>

                        <div className="flex items-center gap-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => {
                                        setCurrentPage(page);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className={cn(
                                        "h-10 w-10 flex items-center justify-center transition-all duration-500 rounded-full text-sm font-black",
                                        currentPage === page
                                            ? "text-white bg-black shadow-lg shadow-black/10 scale-110"
                                            : "text-gray-400 hover:bg-black/5"
                                    )}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                if (currentPage < totalPages) {
                                    setCurrentPage((p: number) => p + 1);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                            }}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-full hover:bg-black/5 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                            <ArrowRight size={20} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
