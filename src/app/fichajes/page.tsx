'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFichajes } from '@/hooks/useFichajes';
import { TimerCard } from '@/components/TimerCard';
import { TodayFichajes } from '@/components/fichajes/TodayFichajes';
import ManualFichajeModal from '@/components/fichajes/ManualFichajeModal';
import { Settings, SquarePen, ClockFading } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { TimelineEvent } from '@/lib/fichajes-utils';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import AdminChangeRequestModal from '@/components/fichajes/AdminChangeRequestModal';
import PendingCorrectionsModal from '@/components/fichajes/PendingCorrectionsModal';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { SoftBlockModal } from '@/components/fichajes/SoftBlockModal';
import { toast } from 'react-hot-toast';
import { CompanyService } from '@/lib/company-service';
import { ConfigurationModal } from '@/components/admin/ConfigurationModal';
import PushNotificationPrompt from '@/components/PushNotificationPrompt';

export default function FichajesPage() {
    const { user } = useAuth();
    const {
        activeCycle,
        currentState,
        workCycles,
        loading: fichajesLoading,
        isInitialLoad,
        registrarEntrada,
        registrarSalida,
        iniciarPausa,
        refreshFichajes,
        terminarPausa,
        isOnline,
        offlineQueueCount,
        geolocationLoading
    } = useFichajes();

    // Block UI actions while geolocation config is still loading
    const loading = fichajesLoading || geolocationLoading;

    const [manualModalOpen, setManualModalOpen] = useState(false);
    const [targetEvent, setTargetEvent] = useState<TimelineEvent | undefined>(undefined);
    const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);

    // Soft-Block Modal State
    const [softBlockOpen, setSoftBlockOpen] = useState(false);
    const [softBlockData, setSoftBlockData] = useState<{ distance: number, centerName: string } | null>(null);
    const [pendingAction, setPendingAction] = useState<((justification: string, coords?: { lat: string, lng: string }) => Promise<void>) | null>(null);

    const [showConfigModal, setShowConfigModal] = useState(false);

    const router = useRouter();

    useEffect(() => {
        const checkAdminAndRedirect = () => {
            if (user?.admin && window.innerWidth >= 768) {
                router.replace('/admin');
            }
        };

        checkAdminAndRedirect();
        window.addEventListener('resize', checkAdminAndRedirect);
        return () => window.removeEventListener('resize', checkAdminAndRedirect);
    }, [user, router]);

    useEffect(() => {
        const checkCompanySetup = async () => {
            if (user?.admin) {
                try {
                    const setup = await CompanyService.getSetup();
                    if (!setup.name || !setup.siren) {
                        setShowConfigModal(true);
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        };
        checkCompanySetup();
    }, [user]);


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
    const handleFichajeError = (e: any, retryAction: (justification: string, coords?: { lat: string, lng: string }) => Promise<void>) => {
        console.log('DEBUG: handleFichajeError called', e);
        console.log('DEBUG: Error code:', e.code);
        console.log('DEBUG: Is Location Out of Range?', e.code === 'LOCATION_OUT_OF_RANGE');

        if (e.code === 'LOCATION_OUT_OF_RANGE') {
            console.log('DEBUG: Setting soft block data');
            setSoftBlockData({ distance: e.distance, centerName: e.centerName });
            setPendingAction(() => (justification: string) => retryAction(justification, e.coords)); // Store action + coords
            setSoftBlockOpen(true);
        } else {
            const msg = e.message || 'Error desconocido';
            if (!msg.includes('cancelado')) { // Ignorar cancelaciones si las hubiera
                toast.error(msg);
            }
        }
    };

    const handleSoftBlockConfirm = async (justification: string) => {
        try {
            setSoftBlockOpen(false);
            if (pendingAction) {
                await pendingAction(justification);
            }
            setSoftBlockData(null);
            setPendingAction(null);
        } catch (e) {
            console.error(e);
            toast.error('Error al fichar con justificación');
        }
    };

    const handleEntrada = async () => {
        try {
            await registrarEntrada();
        } catch (e: any) {
            handleFichajeError(e, async (justification: string, coords?: { lat: string, lng: string }) => {
                await registrarEntrada(undefined, coords, undefined, justification);
            });
        }
    };

    const handleSalida = async () => {
        try {
            await registrarSalida();
        } catch (e: any) {
            handleFichajeError(e, async (justification: string, coords?: { lat: string, lng: string }) => {
                await registrarSalida(undefined, coords, undefined, justification);
            });
        }
    };

    const onPausaClick = async () => {
        const action = currentState === 'en_pausa' ? 'terminar_pausa' : 'iniciar_pausa';
        try {
            if (action === 'terminar_pausa') await terminarPausa();
            else await iniciarPausa();
        } catch (e: any) {
            handleFichajeError(e, async (justification: string, coords?: { lat: string, lng: string }) => {
                if (action === 'terminar_pausa') await terminarPausa(undefined, coords, undefined, justification);
                else await iniciarPausa(undefined, coords, undefined, justification);
            });
        }
    };

    return (
        <>
            <RefreshIndicator progress={pullProgress} isRefreshing={isRefreshing} />
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
                <PendingCorrectionsModal onActionComplete={refreshFichajes} />
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
                        onManualEntry={() => handleEditFichaje()}
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
            <SoftBlockModal
                isOpen={softBlockOpen}
                onClose={() => setSoftBlockOpen(false)}
                onConfirm={handleSoftBlockConfirm}
                distance={softBlockData?.distance}
                centerName={softBlockData?.centerName}
            />
            <AdminChangeRequestModal />
            <ConfigurationModal
                isOpen={showConfigModal}
                onClose={() => setShowConfigModal(false)}
            />
            <PushNotificationPrompt />
        </>
    );
}
