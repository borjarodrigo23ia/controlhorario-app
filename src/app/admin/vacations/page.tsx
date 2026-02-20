'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import AdminVacationDashboard from '@/components/admin/AdminVacationDashboard';
import VacationCalendarView from '@/components/admin/VacationCalendarView';
import VacationDaysBulkAssign from '@/components/admin/VacationDaysBulkAssign';
import { Palmtree, Calendar as CalendarIcon, ListTodo, Plus, UserCircle, LayoutDashboard, ArrowLeft } from 'lucide-react';
import { useVacations } from '@/hooks/useVacations';
import VacationRequestForm from '@/components/vacations/VacationRequestForm';
import VacationList from '@/components/vacations/VacationList';
import VacationQuotaCard from '@/components/vacations/VacationQuotaCard';

export default function AdminVacationsPage() {
    const [activeTab, setActiveTab] = React.useState<'calendar' | 'requests'>('calendar');
    const [pendingCount, setPendingCount] = React.useState(0);
    const [showPersonalView, setShowPersonalView] = React.useState(false);
    const [refreshTrigger, setRefreshTrigger] = React.useState(0);
    const { fetchVacations } = useVacations();

    React.useEffect(() => {
        const loadPendingCount = async () => {
            // Keep this simple to avoid re-rendering loops if fetchVacations changes identity
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
            {/* Sidebar (Desktop) */}
            {/* Main Content */}
            <div className="max-w-[1600px] mx-auto space-y-8">
                <PageHeader
                    title={showPersonalView ? "Mis Vacaciones" : "Gestión de Vacaciones"}
                    subtitle={showPersonalView ? "Gestiona tus propios días libres y ausencias" : "Administración y aprobación de solicitudes"}
                    icon={Palmtree}
                    showBack={true}
                    backUrl="/admin" // Volver al panel de administración
                    badge="Administración"
                >
                    {/* Header Action: Toggle Personal View */}
                    {activeTab === 'requests' && (
                        <button
                            onClick={() => setShowPersonalView(!showPersonalView)}
                            className={`hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg transition-all text-sm font-bold active:scale-95 ${showPersonalView
                                ? 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'
                                : 'bg-black hover:bg-gray-800 text-white shadow-gray-200'
                                }`}
                        >
                            {showPersonalView ? (
                                <>
                                    <LayoutDashboard size={18} />
                                    <span>Volver a Gestión</span>
                                </>
                            ) : (
                                <>
                                    <UserCircle size={18} />
                                    <span>Mis Vacaciones</span>
                                </>
                            )}
                        </button>
                    )}
                </PageHeader>

                {/* Custom Tabs - Hidden in Personal View to reduce clutter */}
                {!showPersonalView && (
                    <div className="flex bg-gray-100/80 dark:bg-zinc-900 p-1.5 rounded-2xl w-full md:w-fit animate-in fade-in slide-in-from-top-2 duration-300">
                        <button
                            onClick={() => setActiveTab('calendar')}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'calendar'
                                ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-zinc-800/50'
                                }`}
                        >
                            <CalendarIcon size={18} />
                            <span>Gestión</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('requests')}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'requests'
                                ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-zinc-800/50'
                                }`}
                        >
                            <ListTodo size={18} />
                            <span>Solicitudes</span>
                            {pendingCount > 0 && (
                                <span className="bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 ml-1 leading-none shadow-sm">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {showPersonalView ? (
                        <div className="space-y-8">
                            {/* Mobile Back Button */}
                            <div className="md:hidden">
                                <button
                                    onClick={() => setShowPersonalView(false)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-900 rounded-xl shadow-sm text-sm font-bold mb-4"
                                >
                                    <ArrowLeft size={18} />
                                    <span>Volver al Panel</span>
                                </button>
                            </div>

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
                        <>
                            <VacationCalendarView />
                            <VacationDaysBulkAssign />
                        </>
                    ) : (
                        <>
                            {/* Mobile Action Button */}
                            <div className="md:hidden">
                                <button
                                    onClick={() => setShowPersonalView(true)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-xl shadow-md text-sm font-bold mb-4"
                                >
                                    <UserCircle size={18} />
                                    <span>Gestionar Mis Vacaciones</span>
                                </button>
                            </div>
                            <AdminVacationDashboard />
                        </>
                    )}
                </div>
            </div>
            {/* Mobile Navigation */}

        </>
    );
}
