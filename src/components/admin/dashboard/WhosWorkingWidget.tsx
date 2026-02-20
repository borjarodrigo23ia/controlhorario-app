'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Briefcase, Coffee, Power, ChevronDown, ChevronUp } from 'lucide-react';

interface EmployeeStatus {
    id: string;
    name: string;
    login: string;
    status: 'working' | 'paused' | 'offline';
    lastAction?: string;
}

export default function WhosWorkingWidget() {
    const [employees, setEmployees] = useState<EmployeeStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    const fetchStatuses = useCallback(async () => {
        try {
            const token = localStorage.getItem('dolibarr_token') || '';

            // 1. Fetch all active users
            const usersRes = await fetch('/api/users', {
                headers: { 'DOLAPIKEY': token }
            });
            if (!usersRes.ok) return;
            const users = await usersRes.json();
            if (!Array.isArray(users)) return;

            // 2. Fetch today's fichajes for ALL users
            const today = new Date();
            const dateStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 00:00:00`;
            const dateEnd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 23:59:59`;

            const fichajesRes = await fetch(`/api/fichajes?date_start=${encodeURIComponent(dateStart)}&date_end=${encodeURIComponent(dateEnd)}&limit=5000&sortfield=f.rowid&sortorder=ASC`, {
                headers: { 'DOLAPIKEY': token }
            });

            let allFichajes: any[] = [];
            if (fichajesRes.ok) {
                const fichajesData = await fichajesRes.json();
                allFichajes = fichajesData?.fichajes || (Array.isArray(fichajesData) ? fichajesData : []);
            }

            // 3. Build user lookup
            const userMap: Record<string, any> = {};
            for (const u of users) {
                const uid = String(u.id || u.rowid);
                userMap[uid] = u;
                if (u.login) {
                    userMap[u.login] = u;
                }
            }

            // 4. Group fichajes by user
            const fichajesByUserId: Record<string, any[]> = {};
            for (const f of allFichajes) {
                const fkUser = f.fk_user ? String(f.fk_user) : null;
                const usuario = f.usuario ? String(f.usuario) : null;

                let resolvedUserId: string | null = null;
                if (fkUser && userMap[fkUser]) {
                    resolvedUserId = String(userMap[fkUser].id || userMap[fkUser].rowid);
                } else if (usuario && userMap[usuario]) {
                    resolvedUserId = String(userMap[usuario].id || userMap[usuario].rowid);
                } else if (fkUser) {
                    resolvedUserId = fkUser;
                } else if (usuario) {
                    const found = users.find((u: any) => u.login === usuario);
                    resolvedUserId = found ? String(found.id || found.rowid) : usuario;
                }

                if (!resolvedUserId) continue;

                if (!fichajesByUserId[resolvedUserId]) fichajesByUserId[resolvedUserId] = [];
                fichajesByUserId[resolvedUserId].push(f);
            }

            // 5. Determine status
            const statuses: EmployeeStatus[] = users
                .filter((u: any) => {
                    const s = String(u.statut ?? u.status ?? '');
                    return s === '1';
                })
                .map((u: any) => {
                    const userId = String(u.id || u.rowid);
                    const userFichajes = fichajesByUserId[userId] || [];

                    userFichajes.sort((a: any, b: any) => {
                        const idA = parseInt(a.rowid || a.id || '0');
                        const idB = parseInt(b.rowid || b.id || '0');
                        if (idA !== idB) return idA - idB;
                        const dateA = new Date(a.fecha_creacion || a.date_creation || 0).getTime();
                        const dateB = new Date(b.fecha_creacion || b.date_creation || 0).getTime();
                        return dateA - dateB;
                    });

                    const lastFichaje = userFichajes[userFichajes.length - 1];
                    let status: 'working' | 'paused' | 'offline' = 'offline';
                    let lastAction: string | undefined;

                    if (lastFichaje) {
                        const tipo = (lastFichaje.tipo || '').toLowerCase();
                        if (tipo === 'entrar' || tipo === 'entrada' || tipo === 'terminar_pausa' || tipo === 'finp') {
                            status = 'working';
                        } else if (tipo === 'iniciar_pausa' || tipo === 'pausa') {
                            status = 'paused';
                        } else if (tipo === 'salir' || tipo === 'salida') {
                            status = 'offline';
                        }

                        const rawDate = lastFichaje.fecha_creacion || lastFichaje.date_creation;
                        if (rawDate) {
                            const date = new Date(rawDate);
                            if (!isNaN(date.getTime())) {
                                lastAction = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                            }
                        }
                    }

                    return {
                        id: userId,
                        name: [u.firstname, u.lastname].filter(Boolean).join(' ') || u.login || 'Usuario',
                        login: u.login || '',
                        status,
                        lastAction
                    };
                });

            statuses.sort((a, b) => {
                const order = { working: 0, paused: 1, offline: 2 };
                return order[a.status] - order[b.status];
            });

            setEmployees(statuses);
        } catch (err) {
            console.error('[WhosWorking] Error fetching employee statuses:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatuses();
        const interval = setInterval(fetchStatuses, 60000);
        return () => clearInterval(interval);
    }, [fetchStatuses]);

    const workingCount = employees.filter(e => e.status === 'working').length;
    const pausedCount = employees.filter(e => e.status === 'paused').length;
    const offlineCount = employees.filter(e => e.status === 'offline').length;

    const visibleEmployees = isExpanded ? employees : employees.slice(0, 3);

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'working':
                return {
                    label: 'Trabajando',
                    dotColor: 'bg-emerald-500',
                    badgeBg: 'bg-emerald-50',
                    badgeText: 'text-emerald-700',
                    icon: Briefcase,
                };
            case 'paused':
                return {
                    label: 'En pausa',
                    dotColor: 'bg-amber-500',
                    badgeBg: 'bg-amber-50',
                    badgeText: 'text-amber-700',
                    icon: Coffee,
                };
            case 'offline':
            default:
                return {
                    label: 'Offline',
                    dotColor: 'bg-gray-300',
                    badgeBg: 'bg-gray-50',
                    badgeText: 'text-gray-500',
                    icon: Power,
                };
        }
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="relative overflow-hidden rounded-[2rem] bg-white border border-gray-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            {/* Decorative background icon */}
            <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
                <div className="absolute -top-6 -right-6 opacity-[0.03] -rotate-12 text-black">
                    <Users size={140} strokeWidth={1} />
                </div>
            </div>

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-[#121726] tracking-tight">¿Quién está trabajando?</h3>
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {workingCount}
                        </span>
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {pausedCount}
                        </span>
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 text-gray-500 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                            {offlineCount}
                        </span>
                    </div>
                </div>

                {/* Loading skeleton */}
                {loading && (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <div className="w-9 h-9 rounded-full bg-gray-100" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-3.5 bg-gray-100 rounded w-24" />
                                    <div className="h-2.5 bg-gray-50 rounded w-16" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Employee list */}
                {!loading && (
                    <div className="space-y-2">
                        {employees.length === 0 && (
                            <p className="text-sm text-gray-400 text-center py-4 font-medium">No hay empleados registrados</p>
                        )}
                        {visibleEmployees.map((emp) => {
                            const config = getStatusConfig(emp.status);
                            return (
                                <div
                                    key={emp.id}
                                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50/80 transition-colors"
                                >
                                    {/* Avatar with status dot */}
                                    <div className="relative">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${config.badgeBg} ${config.badgeText}`}>
                                            {getInitials(emp.name)}
                                        </div>
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${config.dotColor} ${emp.status === 'working' ? 'animate-pulse' : ''}`} />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-[#121726] truncate">{emp.name}</p>
                                        <p className="text-[11px] text-gray-400 font-medium truncate">
                                            {config.label}
                                            {emp.lastAction && <span className="ml-1 text-gray-300">· {emp.lastAction}</span>}
                                        </p>
                                    </div>

                                    {/* Status badge */}
                                    <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${config.badgeBg} ${config.badgeText}`}>
                                        {config.label}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {employees.length > 3 && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full mt-4 py-2.5 flex items-center justify-center gap-2 text-gray-400 hover:text-gray-600 font-semibold transition-colors bg-gray-50 rounded-xl hover:bg-gray-100 text-xs"
                    >
                        {isExpanded ? (
                            <>
                                Ver menos <ChevronUp size={16} />
                            </>
                        ) : (
                            <>
                                Ver todos ({employees.length - 3} más) <ChevronDown size={16} />
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
