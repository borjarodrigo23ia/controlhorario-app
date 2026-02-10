'use client';
import { useState, useEffect } from 'react';
import { useCorrections } from '@/hooks/useCorrections';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { Check, X, Clock, BadgeCheck, ChevronDown, User, Calendar, MessageSquare, AlertCircle, Info, CircleCheck, CircleX } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CorrectionRequest } from '@/lib/admin-types';

export default function AdminCorrectionsPage() {
    const { corrections, loading, fetchCorrections, approveCorrection, rejectCorrection } = useCorrections();
    const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchCorrections(undefined, 'pendiente');
    }, [fetchCorrections]);

    // Group by User
    const groupedCorrections = corrections.reduce((acc, curr) => {
        const userId = curr.fk_user;
        if (!acc[userId]) acc[userId] = [];
        acc[userId].push(curr);
        return acc;
    }, {} as Record<string, CorrectionRequest[]>);

    const toggleUser = (userId: string) => {
        setExpandedUsers(prev => ({ ...prev, [userId]: !prev[userId] }));
    };

    const [processingId, setProcessingId] = useState<string | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        type: 'approve' | 'reject';
        id: string;
        note: string;
    }>({
        isOpen: false,
        type: 'approve',
        id: '',
        note: ''
    });

    const executeAction = async () => {
        if (!confirmDialog.note.trim()) return;

        setProcessingId(confirmDialog.id);
        const success = confirmDialog.type === 'approve'
            ? await approveCorrection(confirmDialog.id, confirmDialog.note)
            : await rejectCorrection(confirmDialog.id, confirmDialog.note);

        if (success) {
            fetchCorrections(undefined, 'pendiente');
            setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
        setProcessingId(null);
    };

    return (
        <div className="flex min-h-screen bg-[#FAFBFC]">
            <div className="hidden md:block"><Sidebar /></div>
            <main className="flex-1 ml-0 md:ml-64 p-6 md:p-12 pb-32">
                <div className="max-w-5xl mx-auto space-y-8">
                    <PageHeader
                        title="Correcciones Pendientes"
                        subtitle="Revisa y aprueba las solicitudes de edición de jornada"
                        icon={BadgeCheck}
                        showBack
                        badge="Administración"
                    />

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                            <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-black animate-spin mb-4" />
                            <p className="text-gray-400 font-medium">Cargando solicitudes...</p>
                        </div>
                    ) : corrections.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 bg-white rounded-[2rem] border border-gray-100 shadow-sm text-center">
                            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-3">
                                <Check size={24} className="text-green-500" strokeWidth={3} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">¡Todo al día!</h3>
                            <p className="text-sm text-gray-500 max-w-xs mx-auto">
                                No hay solicitudes de corrección pendientes de revisar en este momento.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {Object.entries(groupedCorrections).map(([userId, userCorrections]) => {
                                const user = userCorrections[0]; // Take info from first item
                                const isExpanded = expandedUsers[userId];
                                const count = userCorrections.length;

                                return (
                                    <div key={userId} className="group bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                                        {/* Header - Collapsible Trigger */}
                                        <button
                                            onClick={() => toggleUser(userId)}
                                            className="w-full flex items-center justify-between p-6 md:p-8 text-left outline-none"
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className="relative">
                                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-900 shadow-inner border border-gray-100 group-hover:scale-105 transition-transform duration-500">
                                                        <User size={28} strokeWidth={1.5} />
                                                    </div>
                                                    <div className="absolute -top-2 -right-2 bg-red-500 text-white w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold border-4 border-white shadow-sm">
                                                        {count}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight mb-1">
                                                        {user.firstname} {user.lastname}
                                                    </h3>
                                                    <p className="text-sm font-medium text-gray-400">
                                                        @{user.login || 'usuario'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                                                isExpanded ? "bg-black text-white rotate-180" : "bg-gray-50 text-gray-400 group-hover:bg-gray-100"
                                            )}>
                                                <ChevronDown size={20} strokeWidth={2.5} />
                                            </div>
                                        </button>

                                        {/* Expanded Content */}
                                        <div className={cn(
                                            "grid transition-[grid-template-rows] duration-500 ease-in-out px-4 md:px-6",
                                            isExpanded ? "grid-rows-[1fr] pb-6 opacity-100" : "grid-rows-[0fr] pb-0 opacity-0"
                                        )}>
                                            <div className="overflow-hidden">
                                                <div className="h-px bg-gray-100 w-full mb-4" />
                                                <div className="grid gap-3">
                                                    {userCorrections.map((c) => (
                                                        <div key={c.rowid} className="relative bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                                                            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">

                                                                {/* Left: Date & Time Info */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <div className="bg-primary/5 p-1.5 rounded-lg text-primary">
                                                                            <Calendar size={14} strokeWidth={2.5} />
                                                                        </div>
                                                                        <span className="text-sm font-bold text-gray-900 capitalize truncate">
                                                                            {c.fecha_jornada ? format(new Date(c.fecha_jornada), "EEEE, d MMM", { locale: es }) : 'Fecha desconocida'}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex items-center gap-6 text-xs text-gray-500 ml-1">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[9px] font-bold uppercase text-gray-300 tracking-wider">Entrada</span>
                                                                            <span className="font-bold text-gray-900 tabular-nums">
                                                                                {c.hora_entrada ? format(new Date(c.hora_entrada), 'HH:mm') : '--:--'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="w-px h-6 bg-gray-100" />
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[9px] font-bold uppercase text-gray-300 tracking-wider">Salida</span>
                                                                            <span className="font-bold text-gray-900 tabular-nums">
                                                                                {c.hora_salida ? format(new Date(c.hora_salida), 'HH:mm') : '--:--'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="w-px h-6 bg-gray-100" />
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[9px] font-bold uppercase text-gray-300 tracking-wider">Pausas</span>
                                                                            <span className="font-bold text-gray-700">
                                                                                {(() => {
                                                                                    try {
                                                                                        if (!c.pausas) return '0';
                                                                                        if (Array.isArray(c.pausas)) return c.pausas.length;
                                                                                        const parsed = JSON.parse(c.pausas);
                                                                                        return Array.isArray(parsed) ? parsed.length : '0';
                                                                                    } catch { return '0'; }
                                                                                })()} logs
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {c.observaciones && (
                                                                        <div className="mt-3 pt-3 border-t border-gray-100 w-full">
                                                                            <div className="flex items-start gap-2 bg-white px-0 py-0 rounded-lg">
                                                                                <Info size={12} className="mt-0.5 shrink-0 text-amber-500" />
                                                                                <span className="text-[11px] font-medium text-gray-600 italic leading-snug">{c.observaciones}</span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Right: Actions */}
                                                                <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                                                                    <button
                                                                        onClick={() => setConfirmDialog({ isOpen: true, type: 'approve', id: c.rowid, note: '' })}
                                                                        className="flex-1 md:flex-none h-9 px-4 flex items-center justify-center gap-1.5 bg-[#C4EBB9] text-black rounded-lg text-[10px] font-bold uppercase tracking-wider hover:brightness-95 transition-all shadow-sm active:scale-95"
                                                                    >
                                                                        <CircleCheck size={14} strokeWidth={2} />
                                                                        Aprobar
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setConfirmDialog({ isOpen: true, type: 'reject', id: c.rowid, note: '' })}
                                                                        className="flex-1 md:flex-none h-9 px-4 flex items-center justify-center gap-1.5 bg-[#FC8383] text-black rounded-lg text-[10px] font-bold uppercase tracking-wider hover:brightness-95 transition-all shadow-sm active:scale-95"
                                                                    >
                                                                        <CircleX size={14} strokeWidth={2} />
                                                                        Rechazar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* Confirmation Modal */}
            {confirmDialog.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">
                                {confirmDialog.type === 'approve' ? 'Aprobar Solicitud' : 'Rechazar Solicitud'}
                            </h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Por favor, indica el motivo de esta acción. Este comentario será visible para el empleado.
                            </p>

                            <textarea
                                value={confirmDialog.note}
                                onChange={(e) => setConfirmDialog(prev => ({ ...prev, note: e.target.value }))}
                                placeholder="Escribe un motivo obligatorio..."
                                className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 resize-none mb-6"
                                autoFocus
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmDialog({ isOpen: false, type: 'approve', id: '', note: '' })}
                                    className="flex-1 h-11 flex items-center justify-center text-sm font-bold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={executeAction}
                                    disabled={!confirmDialog.note.trim() || processingId !== null}
                                    className={cn(
                                        "flex-1 h-11 flex items-center justify-center gap-2 text-sm font-bold rounded-xl text-black transition-all shadow-sm disabled:opacity-50 disabled:pointer-events-none",
                                        confirmDialog.type === 'approve' ? "bg-[#C4EBB9] hover:brightness-95" : "bg-[#FC8383] hover:brightness-95"
                                    )}
                                >
                                    {processingId ? (
                                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            {confirmDialog.type === 'approve' ? <CircleCheck size={16} /> : <CircleX size={16} />}
                                            Confirmar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <MobileNav />
        </div>
    );
}
