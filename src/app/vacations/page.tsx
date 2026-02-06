'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import VacationRequestForm from '@/components/vacations/VacationRequestForm';
import VacationList from '@/components/vacations/VacationList';
import VacationQuotaCard from '@/components/vacations/VacationQuotaCard';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { Palmtree, Info } from 'lucide-react';

export default function VacationsPage() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleSuccess = () => {
        setRefreshTrigger(prev => prev + 1);
        alert('Solicitud enviada correctamente');
    };

    return (
        <div className="flex min-h-screen bg-[#FAFBFC]">
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
                </div>
            </main>

            {/* Mobile Navigation */}
            <MobileNav />
        </div>
    );
}
