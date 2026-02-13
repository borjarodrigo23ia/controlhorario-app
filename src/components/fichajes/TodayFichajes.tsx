'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { WorkCycle } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { MapPinCheck, ChevronDown, ChevronUp, PencilLine, CheckCircle, XCircle, Clock as ClockIcon, MapPin, MapPinCheckInside, MessageCircle, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { getDailyEvents, TimelineEvent } from '@/lib/fichajes-utils';
import { toast } from 'react-hot-toast';
import { LocationDetailModal } from './LocationDetailModal';

interface TodayFichajesProps {
    cycles: WorkCycle[];
    loading?: boolean;
    onEdit?: (event: TimelineEvent) => void;
    onLocation?: (lat: string, lng: string) => void;
}

export const TodayFichajes: React.FC<TodayFichajesProps> = ({ cycles, loading, onEdit, onLocation }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Modal state for map and details
    const [selectedEventForMap, setSelectedEventForMap] = useState<TimelineEvent | null>(null);

    // Comment editing state
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [savingComment, setSavingComment] = useState(false);

    const handleSaveComment = useCallback(async (eventId: string) => {
        if (!editText.trim()) {
            setEditingEventId(null);
            return;
        }
        setSavingComment(true);
        try {
            const token = localStorage.getItem('dolibarr_token') || '';
            const res = await fetch(`/api/fichajes/${eventId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'DOLAPIKEY': token,
                },
                body: JSON.stringify({
                    observaciones: editText.trim(),
                }),
            });
            if (res.ok) {
                toast.success('Observación guardada');
                setEditingEventId(null);
                window.location.reload();
            } else {
                const data = await res.json();
                toast.error(data?.error || 'Error al guardar');
            }
        } catch (error) {
            toast.error('Error de conexión');
        } finally {
            setSavingComment(false);
        }
    }, [editText]);

    // 1. Sort cycles chronologically
    const sortedCycles = useMemo(() => {
        return [...cycles].sort((a, b) =>
            new Date(a.entrada.fecha_creacion).getTime() - new Date(b.entrada.fecha_creacion).getTime()
        );
    }, [cycles]);

    // 2. Generate ALL events from all cycles
    const allEvents = useMemo(() => {
        return sortedCycles.flatMap(cycle => getDailyEvents([cycle]));
    }, [sortedCycles]);

    // 3. Determine visible event IDs
    const visibleEventIds = useMemo(() => {
        if (isExpanded) {
            return new Set(allEvents.map(e => e.id));
        }
        const last4 = allEvents.slice(-4);
        return new Set(last4.map(e => e.id));
    }, [allEvents, isExpanded]);

    const formatTime = (date: Date) => format(date, 'HH:mm');

    if (loading) {
        return (
            <div className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 border border-white/20">
                <div className="flex justify-between items-center mb-8">
                    <div className="space-y-2">
                        <Skeleton width={180} height={28} />
                        <Skeleton width={220} height={20} />
                    </div>
                    <Skeleton width={80} height={28} borderRadius="full" />
                </div>
                <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-4">
                            <Skeleton width={12} height={12} borderRadius="full" className="mt-2" />
                            <div className="flex-1 space-y-2">
                                <Skeleton width={60} height={24} />
                                <Skeleton width={120} height={18} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!cycles.length) return null;

    return (
        <div className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 border border-white/20">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Fichajes de hoy</h2>
                    <p className="text-gray-400 mt-1 font-medium text-lg">
                        {format(new Date(), "EEEE, d 'de' MMMM", { locale: es }).charAt(0).toUpperCase() + format(new Date(), "EEEE, d 'de' MMMM", { locale: es }).slice(1)}
                    </p>
                </div>
                <div className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-sm font-bold tracking-wide">
                    {cycles.length > 0 ? 'Activo' : 'Inactivo'}
                </div>
            </div>

            <div className="space-y-8 relative">
                {sortedCycles.map((cycle, sessionIndex) => {
                    const sessionEvents = getDailyEvents([cycle]);
                    const visibleSessionEvents = sessionEvents.filter(e => visibleEventIds.has(e.id));

                    if (visibleSessionEvents.length === 0) return null;

                    return (
                        <div key={cycle.id || sessionIndex} className="relative">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                                Sesión {sessionIndex + 1}
                            </h4>

                            <div className="space-y-6 relative ml-2">
                                <div className="absolute left-[5px] top-2 bottom-4 w-[2px] bg-gray-100 z-0"></div>

                                {visibleSessionEvents.map((event) => (
                                    <React.Fragment key={event.id}>
                                        <div className="flex items-start gap-4 group relative z-10 animate-fadeIn">
                                            <div className="mt-1.5 relative">
                                                <div
                                                    className="w-3 h-3 rounded-full ring-4 ring-white shadow-sm transition-transform duration-300 group-hover:scale-110"
                                                    style={{ backgroundColor: event.color }}
                                                />
                                            </div>

                                            <div className="flex-1 flex justify-between items-start pt-0.5">
                                                <div className="flex flex-col">
                                                    <div className="text-lg text-gray-900 font-bold tracking-tight">
                                                        {event.originalTime && formatTime(event.originalTime) !== formatTime(event.time) ? (
                                                            <span className="flex items-center gap-1.5">
                                                                <span className="text-gray-400 line-through font-medium text-base">{formatTime(event.originalTime)}</span>
                                                                <span className="text-gray-300 text-sm">→</span>
                                                                <span>{formatTime(event.time)}</span>
                                                            </span>
                                                        ) : formatTime(event.time)}
                                                    </div>
                                                    <div className="text-base text-gray-500 font-medium">
                                                        {event.label}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    {event.location_warning === 1 && (
                                                        <div
                                                            className="flex items-center gap-1 text-red-500 bg-red-50 px-2 py-0.5 rounded-md border border-red-100 cursor-help"
                                                            title={`Ubicación fuera de rango${event.justification ? `: ${event.justification}` : ''}`}
                                                        >
                                                            <MapPin size={12} />
                                                            {event.justification && <span className="text-[10px] font-bold hidden sm:inline">Justificado</span>}
                                                        </div>
                                                    )}

                                                    {/* Botón de Mapa - Abre el modal de detalle */}
                                                    {(event.location || (event.lat && event.lng && event.lat !== '0' && event.lat !== 'null')) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedEventForMap(event);
                                                            }}
                                                            className="text-red-500 hover:text-red-700 transition-colors active:scale-95 p-0.5"
                                                            title="Ver ubicación y detalles"
                                                        >
                                                            <MapPin size={18} />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (event.justification) {
                                                                setSelectedEventForMap(event);
                                                            } else {
                                                                setEditingEventId(event.id);
                                                                setEditText(event.observaciones || '');
                                                            }
                                                        }}
                                                        title={event.justification ? "Ver detalles de la incidencia" : "Añadir/editar observación"}
                                                        className={`p-1.5 transition-colors ${event.justification ? 'text-amber-500 hover:text-amber-600' : 'text-black hover:text-gray-600'}`}
                                                    >
                                                        {event.justification ? <AlertTriangle size={18} /> : <MessageCircle size={16} />}
                                                    </button>

                                                    <button
                                                        title="Solicitar corrección"
                                                        onClick={() => onEdit?.(event)}
                                                        className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                    >
                                                        <PencilLine size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Inline comment editor */}
                                        {editingEventId === event.id && (
                                            <div className="mt-4 ml-6 p-4 rounded-2xl border border-gray-100 animate-fadeIn">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <MessageCircle size={16} className="text-black" />
                                                    <span className="text-xs font-black text-black uppercase tracking-wider">Añadir Observación</span>
                                                </div>
                                                <textarea
                                                    value={editText}
                                                    onChange={(e) => setEditText(e.target.value)}
                                                    placeholder="Escribe una observación..."
                                                    rows={3}
                                                    className="w-full text-base rounded-xl border border-gray-200 p-3 focus:ring-1 focus:ring-black focus:border-black outline-none resize-none bg-white font-medium"
                                                    autoFocus
                                                />
                                                <div className="flex justify-end gap-3 mt-3">
                                                    <button
                                                        onClick={() => setEditingEventId(null)}
                                                        className="px-4 py-2 text-sm font-bold text-red-500 hover:text-red-700 transition-colors"
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        onClick={() => handleSaveComment(event.dbId || event.id)}
                                                        disabled={savingComment}
                                                        className="px-5 py-2 text-sm font-bold bg-black text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 shadow-sm"
                                                    >
                                                        {savingComment ? 'Guardando...' : 'Guardar'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {allEvents.length > 4 && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full mt-6 py-3 flex items-center justify-center gap-2 text-gray-400 hover:text-gray-600 font-semibold transition-colors bg-gray-50 rounded-2xl hover:bg-gray-100"
                >
                    {isExpanded ? (
                        <>
                            Ver menos <ChevronUp size={20} />
                        </>
                    ) : (
                        <>
                            Ver más ({allEvents.length - 4} restantes) <ChevronDown size={20} />
                        </>
                    )}
                </button>
            )}

            <Link
                href="/fichajes/historial"
                className="w-full block text-center py-3.5 px-4 rounded-xl border border-blue-900 text-blue-900 font-medium hover:bg-blue-50 transition-colors mt-6"
            >
                Ir a mis fichajes
            </Link>

            <LocationDetailModal
                event={selectedEventForMap}
                onClose={() => setSelectedEventForMap(null)}
            />
        </div>
    );
};
