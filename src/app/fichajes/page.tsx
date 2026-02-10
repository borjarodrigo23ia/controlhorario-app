'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFichajes } from '@/hooks/useFichajes';
import Sidebar from '@/components/Sidebar';
import { TimerCard } from '@/components/TimerCard';
import { TodayFichajes } from '@/components/fichajes/TodayFichajes';
import ManualFichajeModal from '@/components/fichajes/ManualFichajeModal';
import MobileNav from '@/components/MobileNav';
import { Settings, SquarePen, ClockFading } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { TimelineEvent } from '@/lib/fichajes-utils';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import AdminChangeRequestModal from '@/components/fichajes/AdminChangeRequestModal';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';

export default function FichajesPage() {
    const { user } = useAuth();
    const {
        activeCycle,
        currentState,
        workCycles,
        loading,
        isInitialLoad,
        registrarEntrada,
        registrarSalida,
        iniciarPausa,
        refreshFichajes,
        terminarPausa,
        isOnline,
        offlineQueueCount
    } = useFichajes();

    const [manualModalOpen, setManualModalOpen] = useState(false);
    const [targetEvent, setTargetEvent] = useState<TimelineEvent | undefined>(undefined);
    const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);

    const { pullProgress, isRefreshing } = usePullToRefresh(async () => {
        await refreshFichajes();
    });

    const handleEditFichaje = (event?: TimelineEvent) => {
        setTargetEvent(event);
        setSelectedDate(event?.dateStr);
        setManualModalOpen(true);
    };

    const handleLocation = (lat: string, lng: string) => {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    };

    // Manejadores de acción (wrappers simples)
    const handleEntrada = async () => {
        try { await registrarEntrada(); } catch (e) { console.error(e); }
    };
    const handleSalida = async () => {
        try { await registrarSalida(); } catch (e) { console.error(e); }
    };

    const onPausaClick = async () => {
        if (currentState === 'en_pausa') {
            await terminarPausa();
        } else {
            await iniciarPausa();
        }
    };

    return (
        <div className="flex min-h-screen bg-[#FAFBFC]">
            <RefreshIndicator progress={pullProgress} isRefreshing={isRefreshing} />
            <div className="hidden md:block">
                <Sidebar />
            </div>

            <main className="flex-1 ml-0 md:ml-64 p-6 md:p-12 pb-32">
                <PageHeader
                    title={<>Bienvenido, <span className="text-primary italic">{user?.firstname || user?.login || 'Usuario'}</span></>}
                    subtitle="Registra tu jornada y revisa tu actividad de hoy"
                    icon={ClockFading}
                    badge="Dashboard"
                >
                    <div className="flex items-center gap-3">
                        <InstallPrompt />

                        <button
                            onClick={() => handleEditFichaje()}
                            className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-100 rounded-[1.4rem] text-gray-500 hover:text-primary hover:border-primary/20 transition-all shadow-sm group"
                            title="Fichaje Manual"
                        >
                            <SquarePen size={18} className="group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium tracking-tight">Fichaje manual</span>
                        </button>
                    </div>
                </PageHeader>

                <div className="space-y-6 md:space-y-8 max-w-5xl">
                    <section className="w-full">
                        <TimerCard
                            cycle={activeCycle}
                            currentState={currentState}
                            onEntrar={handleEntrada}
                            onSalir={handleSalida}
                            onPausa={onPausaClick}
                            loading={loading}
                            isInitialLoad={isInitialLoad}
                            isOnline={isOnline}
                            offlineQueueCount={offlineQueueCount}
                        />
                    </section>

                    <section className="w-full">
                        <TodayFichajes
                            cycles={workCycles.filter(cycle => {
                                const cycleDate = new Date(cycle.fecha);
                                const today = new Date();
                                return cycleDate.getDate() === today.getDate() &&
                                    cycleDate.getMonth() === today.getMonth() &&
                                    cycleDate.getFullYear() === today.getFullYear();
                            })}
                            loading={loading}
                            onEdit={handleEditFichaje}
                            onLocation={handleLocation}
                        />
                    </section>
                </div>

                <ManualFichajeModal
                    isOpen={manualModalOpen}
                    onClose={() => {
                        setManualModalOpen(false);
                        setTargetEvent(undefined);
                        setSelectedDate(undefined);
                    }}
                    onSaved={refreshFichajes}
                    initialDate={selectedDate}
                    targetEvent={targetEvent}
                />
                <AdminChangeRequestModal />
            </main>
            <MobileNav />
        </div>
    );
}
