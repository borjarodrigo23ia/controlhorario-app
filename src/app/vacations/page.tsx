'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import VacationRequestForm from '@/components/vacations/VacationRequestForm';
import VacationList from '@/components/vacations/VacationList';
import VacationQuotaCard from '@/components/vacations/VacationQuotaCard';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { Palmtree, Info, Calendar as CalendarIcon, ListTodo } from 'lucide-react';
import VacationCalendarView from '@/components/admin/VacationCalendarView';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';

export default function VacationsPage() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [activeTab, setActiveTab] = useState<'requests' | 'calendar'>('requests');

    const { pullProgress, isRefreshing } = usePullToRefresh(async () => {
        setRefreshTrigger(prev => prev + 1);
        // Add a small artificial delay for better UX if needed, 
        // but setRefreshTrigger will cause components to re-fetch.
        await new Promise(r => setTimeout(r, 600));
    });

    const handleSuccess = () => {
        setRefreshTrigger(prev => prev + 1);
        alert('Solicitud enviada correctamente');
    };

    return (
        <div className="flex min-h-screen bg-[#FAFBFC]">
            <RefreshIndicator progress={pullProgress} isRefreshing={isRefreshing} />
            {/* Sidebar (Desktop) */}
            <div className="hidden md:block">
                <Sidebar />
            </div>

            {/* Main Content */}
            <main className="flex-1 ml-0 md:ml-64 p-6 md:p-12 pb-32">
                <div className="max-w-[1600px] mx-auto space-y-8">
                    <PageHeader
                        title="Mis Vacaciones"
                        subtitle="Gestiona tus solicitudes de días libres y vacaciones"
                        icon={Palmtree}
                        showBack
                        badge="Gestión de Tiempo"
                    />

                    <div className="space-y-8">
                        {/* Custom Tabs */}
                        <div className="flex bg-gray-100/80 p-1.5 rounded-2xl w-full md:w-fit">
                            <button
                                onClick={() => setActiveTab('requests')}
                                className={`flex-1 md:flex-none flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'requests'
                                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                    }`}
                            >
                                <ListTodo size={18} />
                                <span>Mis Solicitudes</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('calendar')}
                                className={`flex-1 md:flex-none flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'calendar'
                                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                    }`}
                            >
                                <CalendarIcon size={18} />
                                <span>Calendario Equipo</span>
                            </button>
                        </div>

                        {activeTab === 'requests' ? (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Quota Section */}
                                <VacationQuotaCard refreshTrigger={refreshTrigger} />

                                {/* Form Section */}
                                <VacationRequestForm onSuccess={handleSuccess} />

                                {/* Policy Info - Hidden on mobile to reduce clutter */}
                                <div className="hidden md:block bg-[#f0f9ff] rounded-[2rem] p-8 border border-blue-100/50">
                                    <div className="flex items-center gap-3 mb-3 text-blue-900">
                                        <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                                            <Info size={20} />
                                        </div>
                                        <h4 className="font-bold text-lg tracking-tight">Política de Vacaciones</h4>
                                    </div>
                                    <p className="text-sm text-blue-800/80 leading-relaxed font-medium pl-1">
                                        Recuerda solicitar tus vacaciones con al menos 15 días de antelación.
                                        Las solicitudes están sujetas a aprobación por parte de tu supervisor.
                                    </p>
                                </div>

                                {/* Vacation History */}
                                <VacationList refreshTrigger={refreshTrigger} />
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <VacationCalendarView />
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Mobile Navigation */}
            <MobileNav />
        </div>
    );
}
