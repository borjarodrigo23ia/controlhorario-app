'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import AdminVacationDashboard from '@/components/admin/AdminVacationDashboard';
import VacationCalendarView from '@/components/admin/VacationCalendarView';
import VacationDaysBulkAssign from '@/components/admin/VacationDaysBulkAssign';
import { Palmtree, Calendar as CalendarIcon, ListTodo, UserCircle, X } from 'lucide-react';
import { useVacations } from '@/hooks/useVacations';
import VacationRequestForm from '@/components/vacations/VacationRequestForm';
import VacationList from '@/components/vacations/VacationList';
import VacationQuotaCard from '@/components/vacations/VacationQuotaCard';

// Calendar Modal — rendered via portal so it covers everything
function CalendarModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => { setMounted(true); }, []);

    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    if (!mounted || !open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md animate-in fade-in duration-300" />

            {/* Modal Panel */}
            <div
                className="relative z-10 w-full max-w-5xl max-h-[90vh] bg-white rounded-[2rem] shadow-[0_32px_80px_rgba(0,0,0,0.25)] overflow-hidden animate-in fade-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <CalendarIcon size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-gray-900 tracking-tight">Calendario de Ausencias</h2>
                            <p className="text-[11px] text-gray-400 font-medium">Consulta los días cogidos del equipo</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Calendar Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-72px)] p-4 md:p-6">
                    <VacationCalendarView />
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function AdminVacationsPage() {
    const [activeTab, setActiveTab] = React.useState<'calendar' | 'requests' | 'personal'>('calendar');
    const [pendingCount, setPendingCount] = React.useState(0);
    const [refreshTrigger, setRefreshTrigger] = React.useState(0);
    const [calendarOpen, setCalendarOpen] = React.useState(false);
    const { fetchVacations } = useVacations();

    React.useEffect(() => {
        const loadPendingCount = async () => {
            const data = await fetchVacations();
            const pending = data.filter(r => r.estado === 'pendiente').length;
            setPendingCount(pending);
        };
        loadPendingCount();
    }, [fetchVacations, refreshTrigger]);

    const handleSuccess = () => {
        setRefreshTrigger(prev => prev + 1);
        alert('Solicitud enviada correctamente');
    };

    return (
        <>
            <CalendarModal open={calendarOpen} onClose={() => setCalendarOpen(false)} />

            <div className="max-w-[1600px] mx-auto space-y-8">
                <PageHeader
                    title={activeTab === 'personal' ? "Mis Vacaciones" : "Gestión de Vacaciones"}
                    subtitle={activeTab === 'personal' ? "Gestiona tus propios días libres y ausencias" : "Administración y aprobación de solicitudes"}
                    icon={Palmtree}
                    showBack={true}
                    backUrl="/admin"
                    badge="Administración"
                />

                {/* Custom Tabs + Ver Calendario button */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex bg-gray-100/80 dark:bg-zinc-900 p-1 md:p-1.5 rounded-2xl w-full sm:w-fit animate-in fade-in slide-in-from-top-2 duration-300">
                        <button
                            onClick={() => setActiveTab('calendar')}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 md:gap-2.5 px-3 md:px-6 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-bold transition-all ${activeTab === 'calendar'
                                ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-zinc-800/50'
                                }`}
                        >
                            <CalendarIcon size={15} className="shrink-0" />
                            <span>Gestión</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('requests')}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 md:gap-2.5 px-3 md:px-6 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-bold transition-all ${activeTab === 'requests'
                                ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-zinc-800/50'
                                }`}
                        >
                            <ListTodo size={15} className="shrink-0" />
                            <span>Solicitudes</span>
                            {pendingCount > 0 && (
                                <span className="bg-red-500 text-white text-[9px] min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-1 ml-0.5 leading-none shadow-sm shrink-0">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('personal')}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 md:gap-2.5 px-3 md:px-6 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-bold transition-all ${activeTab === 'personal'
                                ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-zinc-800/50'
                                }`}
                        >
                            <UserCircle size={15} className="shrink-0" />
                            <span className="truncate">Mis Vacaciones</span>
                        </button>
                    </div>

                    {/* Ver Calendario button - only on requests and personal tabs */}
                    {activeTab !== 'calendar' && (
                        <button
                            onClick={() => setCalendarOpen(true)}
                            className="group flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-primary/10 to-indigo-400/10 text-primary border border-primary/20 hover:from-primary/20 hover:to-indigo-400/20 hover:border-primary/40 hover:shadow-[0_4px_16px_rgba(99,102,241,0.2)] transition-all duration-300 shrink-0 animate-in fade-in duration-200"
                        >
                            <CalendarIcon size={13} className="shrink-0" />
                            Ver calendario equipo
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'personal' ? (
                        <div className="space-y-8">
                            <VacationQuotaCard refreshTrigger={refreshTrigger} />

                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                                <div className="xl:col-span-5">
                                    <VacationRequestForm onSuccess={handleSuccess} />
                                </div>
                                <div className="xl:col-span-7">
                                    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-2 h-full min-h-[500px]">
                                        <VacationList refreshTrigger={refreshTrigger} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'calendar' ? (
                        <VacationCalendarView
                            leftPanel={<VacationDaysBulkAssign />}
                        />
                    ) : (
                        <AdminVacationDashboard />
                    )}
                </div>
            </div>
        </>
    );
}
