'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellDot, CalendarClock, BadgeCheck, X, ChevronRight, Info, CircleX } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useVacations, VacationRequest } from '@/hooks/useVacations';
import { useCorrections } from '@/hooks/useCorrections';
import { CorrectionRequest } from '@/lib/admin-types';
import { CompanyService } from '@/lib/company-service';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function NotificationBell() {
    const { user } = useAuth();
    const { fetchVacations } = useVacations();
    const { fetchCorrections } = useCorrections();
    const [isOpen, setIsOpen] = useState(false);
    const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const bellRef = useRef<HTMLDivElement>(null);

    const loadNotifications = async () => {
        if (!user) return;
        setLoading(true);
        const allNotifications: any[] = [];

        try {
            // 1. Fetch Read Notifications IDs
            const readRes = await fetch(`/api/notifications/read?userId=${user.id}`);
            const readIds = readRes.ok ? await readRes.json() : [];
            const readSet = new Set(readIds as string[]);
            setReadNotificationIds(readSet);

            if (user.admin) {
                // Admin Notifications
                const [vacs, corrs, companySetup] = await Promise.all([
                    fetchVacations({ estado: 'pendiente' }),
                    // Fetch corrections separately
                    (async () => {
                        const token = localStorage.getItem('dolibarr_token');
                        const res = await fetch(`/api/corrections?estado=pendiente`, {
                            headers: { 'DOLAPIKEY': token || '' }
                        });
                        return res.ok ? await res.json() : [];
                    })(),
                    CompanyService.getSetup().catch(() => null)
                ]);

                // 0. System Alerts (High Priority)
                if (companySetup && (!companySetup.name || !companySetup.siren)) {
                    const id = 'sys-config-required';
                    if (!readSet.has(id)) {
                        allNotifications.push({
                            id,
                            type: 'system-alert',
                            title: 'Configuración Requerida',
                            description: 'Faltan datos de la empresa (Razón Social o CIF)',
                            href: '/admin/empresa',
                            date: new Date().toISOString(),
                            icon: Info,
                            color: 'text-red-500 bg-red-50'
                        });
                    }
                }

                vacs.forEach((v: VacationRequest) => {
                    const id = `vac-${v.rowid}`;
                    if (!readSet.has(id)) {
                        allNotifications.push({
                            id,
                            type: 'vacation',
                            title: 'Solicitud de Vacaciones',
                            description: `${v.usuario} ha solicitado ${v.tipo.replace('_', ' ')}`,
                            href: '/admin/vacations',
                            date: v.fecha_creacion,
                            icon: CalendarClock,
                            color: 'text-blue-500'
                        });
                    }
                });

                corrs.forEach((c: CorrectionRequest) => {
                    const id = `corr-${c.rowid}`;
                    if (!readSet.has(id)) {
                        const empName = c.firstname && c.lastname ? `${c.firstname} ${c.lastname}` : (c.login || 'Un empleado');
                        allNotifications.push({
                            id,
                            type: 'correction',
                            title: 'Cambio de Jornada',
                            description: `${empName} solicita corrección de fichaje`,
                            href: '/admin/corrections',
                            date: c.date_creation,
                            icon: BadgeCheck,
                            color: 'text-emerald-500'
                        });
                    }
                });
            } else {
                // User Notifications
                const [userVacs, userCorrs] = await Promise.all([
                    fetchVacations({ usuario: user.login }),
                    (async () => {
                        const token = localStorage.getItem('dolibarr_token');
                        const res = await fetch(`/api/corrections?fk_user=${user.id}&estado=pendiente`, {
                            headers: { 'DOLAPIKEY': token || '' }
                        });
                        return res.ok ? await res.json() : [];
                    })()
                ]);

                // 1. Vacation Status Updates
                const recentVacs = userVacs.filter(v => v.estado !== 'pendiente').slice(0, 5);
                recentVacs.forEach((v: VacationRequest) => {
                    const id = `vac-${v.rowid}-${v.estado}`; // Make ID state-dependent to show new status
                    if (!readSet.has(id)) {
                        allNotifications.push({
                            id,
                            type: 'vacation-status',
                            title: `Solicitud ${v.estado.charAt(0).toUpperCase() + v.estado.slice(1)}`,
                            description: `Tu solicitud para el ${v.fecha_inicio} ha sido ${v.estado}`,
                            href: '/gestion',
                            date: v.fecha_aprobacion || v.fecha_creacion,
                            icon: v.estado === 'aprobado' ? BadgeCheck : CircleX,
                            color: v.estado === 'aprobado' ? 'text-emerald-500' : 'text-red-500'
                        });
                    }
                });

                // 2. Pending Admin Corrections (Action Required)
                const pendingAdminRequests = userCorrs.filter((c: CorrectionRequest) =>
                    c.fk_creator && String(c.fk_creator) !== String(c.fk_user)
                );

                pendingAdminRequests.forEach((c: CorrectionRequest) => {
                    const id = `corr-req-${c.rowid}`;
                    if (!readSet.has(id)) {
                        allNotifications.push({
                            id,
                            type: 'correction-request',
                            title: 'Aprobación Requerida',
                            description: 'El administrador ha propuesto un cambio en tu jornada',
                            href: '/fichajes',
                            date: c.date_creation,
                            icon: Info,
                            color: 'text-amber-500'
                        });
                    }
                });
            }

            // Sort by date (descending)
            allNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setNotifications(allNotifications);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAllAsRead = async () => {
        if (!user || notifications.length === 0) return;

        const idsToMark = notifications.map(n => n.id);

        try {
            await fetch('/api/notifications/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    notificationIds: idsToMark
                })
            });

            // Optimistic update
            setNotifications([]);
            toast.success('Todas las notificaciones marcadas como leídas');
        } catch (error) {
            toast.error('Error al actualizar notificaciones');
        }
    };

    const markOneAsRead = async (id: string, href: string) => {
        if (!user) return;
        try {
            await fetch('/api/notifications/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    notificationIds: [id]
                })
            });
            // Don't clear list immediately if navigating, but if stayed logic would be:
            // setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (e) {
            // ignore
        }
    };

    useEffect(() => {
        loadNotifications();
        const interval = setInterval(loadNotifications, 60000 * 5); // Check every 5 min
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const hasUnread = notifications.length > 0;

    if (!user) return null;

    return (
        <>
            <div className="relative" ref={bellRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`relative p-2.5 rounded-2xl transition-all duration-300 z-[100] ${isOpen ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50 border border-gray-100 shadow-sm'
                        }`}
                >
                    <Bell className="w-6 h-6" strokeWidth={isOpen ? 2.5 : 2} />
                    {hasUnread && !isOpen && (
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                    )}
                </button>

                {isOpen && (
                    <div className="absolute right-0 mt-3 w-[300px] md:w-[360px] bg-white rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-6 py-5 flex items-center justify-between">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                Notificaciones
                            </h4>
                            {hasUnread && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-[9px] font-black uppercase tracking-[0.1em] text-primary hover:opacity-70 transition-opacity"
                                >
                                    Limpiar todo
                                </button>
                            )}
                        </div>

                        <div className="max-h-[380px] overflow-y-auto px-2 pb-4">
                            {loading && notifications.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-gray-100 border-t-primary rounded-full animate-spin mb-3" />
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sincronizando...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="py-12 text-center">
                                    <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                        <BadgeCheck size={14} className="opacity-40" /> Sin pendientes
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {notifications.map((notif) => (
                                        <Link
                                            key={notif.id}
                                            href={notif.href}
                                            onClick={() => {
                                                markOneAsRead(notif.id, notif.href);
                                                setIsOpen(false);
                                            }}
                                            className="flex items-center gap-3.5 p-3.5 rounded-2xl hover:bg-gray-50 transition-all group"
                                        >
                                            <div className={`w-10 h-10 shrink-0 rounded-xl bg-gray-50 flex items-center justify-center ${notif.color || 'text-gray-400'} group-hover:bg-primary/5 transition-colors`}>
                                                <notif.icon size={18} strokeWidth={2.5} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <p className="text-[13px] font-bold text-gray-900 truncate">
                                                        {notif.title}
                                                    </p>
                                                    <span className="text-[8px] font-black text-gray-300 uppercase shrink-0">
                                                        {new Date(notif.date).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-400 font-medium leading-normal line-clamp-1 group-hover:text-gray-600 transition-colors">
                                                    {notif.description}
                                                </p>
                                            </div>
                                            <ChevronRight size={14} className="text-gray-200 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
