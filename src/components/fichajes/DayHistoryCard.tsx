import React, { useState, useMemo } from 'react';
import { WorkCycle } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    ChevronDown,
    ChevronUp,
    MapPinCheck,
    CalendarClock,
    PencilLine,
    CheckCircle,
    XCircle,
    Clock as ClockIcon,
    History as HistoryIcon,
    AlertTriangle,
    MapPin,
    MapPinCheckInside
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getDailyEvents, TimelineEvent } from '@/lib/fichajes-utils';
import { toast } from 'react-hot-toast';

interface DayHistoryCardProps {
    date: string;
    cycles: WorkCycle[];
    showUserName?: boolean;
    isGlobal?: boolean;
    onEdit?: (event: TimelineEvent) => void;
}

export const DayHistoryCard: React.FC<DayHistoryCardProps> = ({ date, cycles, showUserName = false, isGlobal = false, onEdit }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});

    const toggleUser = (userId: string) => {
        setExpandedUsers(prev => ({ ...prev, [userId]: !prev[userId] }));
    };

    // Sort cycles chronologically
    const sortedCycles = useMemo(() => {
        return [...cycles].sort((a, b) =>
            new Date(a.entrada.fecha_creacion).getTime() - new Date(b.entrada.fecha_creacion).getTime()
        );
    }, [cycles]);

    // Group by user for Global view
    const cyclesByUser = useMemo(() => {
        if (!isGlobal) return null;
        const groups: Record<string, { name: string, cycles: WorkCycle[] }> = {};
        sortedCycles.forEach(c => {
            const userId = (c.entrada as any).fk_user || c.entrada.usuario || 'unknown';
            if (!groups[userId]) {
                groups[userId] = {
                    name: c.entrada.usuario_nombre || c.entrada.usuario || 'Usuario',
                    cycles: []
                };
            }
            groups[userId].cycles.push(c);
        });
        return groups;
    }, [sortedCycles, isGlobal]);

    const formatTime = (date: Date) => format(date, 'HH:mm');

    const dateObj = new Date(date);
    const formattedDate = format(dateObj, "EEEE, d 'de' MMMM", { locale: es });
    const displayDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    return (
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden transition-all duration-300">
            {/* Header - Always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-5 text-left bg-white hover:bg-gray-50/50 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-50 text-[#121726] rounded-2xl border border-gray-100/50">
                        <CalendarClock size={20} />
                    </div>
                    <div>
                        <h3 className="text-gray-900 font-bold text-lg">{displayDate}</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            {cycles.length} registro{cycles.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <div className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown size={24} />
                </div>
            </button>

            {/* Content - Collapsible */}
            <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[5000px] opacity-100 border-t border-gray-50' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="p-4 space-y-3 bg-gray-50/30">
                    {isGlobal && cyclesByUser ? (
                        /* Global Tiered View: Date -> User -> Sessions */
                        Object.entries(cyclesByUser).map(([userId, group]) => {
                            const userIsExpanded = expandedUsers[userId] || false;
                            return (
                                <div key={userId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    <button
                                        onClick={() => toggleUser(userId)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-black uppercase">
                                                {group.name.substring(0, 2)}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-gray-900 tracking-tight">{group.name}</h4>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    {group.cycles.length} sesión{group.cycles.length !== 1 ? 'es' : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`text-gray-300 transition-transform duration-300 ${userIsExpanded ? 'rotate-180' : ''}`}>
                                            <ChevronDown size={18} />
                                        </div>
                                    </button>

                                    {userIsExpanded && (
                                        <div className="px-6 pb-6 pt-2 border-t border-gray-50 animate-fade-in">
                                            <div className="space-y-8 mt-4">
                                                {group.cycles.map((cycle, idx) => (
                                                    <SessionItem
                                                        key={cycle.id || idx}
                                                        cycle={cycle}
                                                        index={idx}
                                                        formatTime={formatTime}
                                                        onEdit={onEdit}
                                                        isGlobal={isGlobal}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        /* Personal View (Standard) */
                        <div className="px-2 pt-4 pb-4">
                            <div className="space-y-8">
                                {sortedCycles.map((cycle, sessionIndex) => (
                                    <SessionItem
                                        key={cycle.id || sessionIndex}
                                        cycle={cycle}
                                        index={sessionIndex}
                                        formatTime={formatTime}
                                        showUserName={showUserName}
                                        onEdit={onEdit}
                                        isGlobal={isGlobal}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Subcomponent to avoid repetition
const SessionItem = ({ cycle, index, formatTime, showUserName = false, onEdit, isGlobal = false }: { cycle: WorkCycle, index: number, formatTime: (d: Date) => string, showUserName?: boolean, onEdit?: (event: TimelineEvent) => void, isGlobal?: boolean }) => {
    const { user } = useAuth();
    const events = getDailyEvents([cycle]);
    const canEdit = user?.admin || !isGlobal;

    console.log('[DayHistoryCard] Rendering session events:', events.map(e => ({
        id: e.id,
        type: e.type,
        location: e.location,
        lat: e.lat,
        lng: e.lng
    })));

    return (
        <div className="relative">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
                    Sesión {index + 1}
                </h4>
                {showUserName && (
                    <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded-lg uppercase tracking-wider">
                        {cycle.entrada.usuario_nombre || cycle.entrada.usuario}
                    </span>
                )}
            </div>

            <div className="space-y-6 relative ml-2">
                <div className="absolute left-[5px] top-2 bottom-4 w-[2px] bg-gray-100 z-0"></div>
                {events.map((event) => (
                    <div key={event.id} className="flex items-start gap-4 group relative z-10">
                        <div className="mt-1.5 relative">
                            <div
                                className="w-2.5 h-2.5 rounded-full ring-4 ring-white shadow-sm"
                                style={{ backgroundColor: event.color }}
                            />
                        </div>
                        <div className="flex-1 flex justify-between items-start pt-0.5">
                            <div className="flex flex-col">
                                <div className="text-sm text-gray-900 font-black tracking-tight leading-none mb-1">
                                    {formatTime(event.time)}
                                </div>
                                <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                                    {event.label}
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {/* Warnings Section */}
                                {event.location_warning === 1 && (
                                    <div
                                        className="flex items-center gap-1 text-red-500 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100 cursor-help"
                                        title={`Ubicación fuera de rango${event.justification ? `: ${event.justification}` : ''}`}
                                    >
                                        <MapPin size={12} />
                                        {event.justification && <span className="text-[10px] font-bold">Justificado</span>}
                                    </div>
                                )}

                                {event.early_entry_warning === 1 && (
                                    <div
                                        className="text-amber-500 bg-amber-50 p-1 rounded-md border border-amber-100 cursor-help"
                                        title="Entrada anticipada (más de 15 min antes del turno)"
                                    >
                                        <ClockIcon size={12} />
                                    </div>
                                )}

                                {event.location && (
                                    <a
                                        href={event.lat && event.lng
                                            ? `https://www.google.com/maps/search/?api=1&query=${event.lat},${event.lng}`
                                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 hover:bg-emerald-100 transition-colors"
                                        title={event.lat && event.lng ? `Ver coordenadas: ${event.lat}, ${event.lng}` : "Ver en mapa"}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <MapPinCheckInside size={12} />
                                        <span className="text-[10px] font-bold">{event.location}</span>
                                    </a>
                                )}
                                {event.observaciones && (
                                    <div className={`text-[10px] font-medium max-w-[150px] truncate ${event.observaciones.includes('Corregido') ? 'text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded' : 'text-gray-400'}`} title={event.observaciones}>
                                        {event.observaciones}
                                    </div>
                                )}

                                {event.estado_aceptacion && (
                                    <div className="flex items-center" title={`Estado: ${event.estado_aceptacion}`}>
                                        {event.estado_aceptacion === 'aceptado' && <CheckCircle size={14} className="text-emerald-500" />}
                                        {event.estado_aceptacion === 'pendiente' && <ClockIcon size={14} className="text-amber-500 animate-pulse" />}
                                        {event.estado_aceptacion === 'rechazado' && <XCircle size={14} className="text-red-500" />}
                                    </div>
                                )}

                                <div className="flex items-center gap-1">
                                    {canEdit && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEdit?.(event);
                                            }}
                                            title="Solicitar corrección"
                                            className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                                        >
                                            <PencilLine size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
