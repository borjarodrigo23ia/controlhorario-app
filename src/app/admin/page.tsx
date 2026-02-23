'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { Users, BadgeCheck, Settings, LayoutDashboard, CalendarClock, ChevronRight, MapPinHouse, CalendarRange, Palmtree, HouseHeart, TriangleAlert } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCorrections } from '@/hooks/useCorrections';
import { useVacations } from '@/hooks/useVacations';
import { useFichajes } from '@/hooks/useFichajes';
import { CompanyService, CompanySetup } from '@/lib/company-service';

import { ConfigurationModal } from '@/components/admin/ConfigurationModal';
import { TodayFichajes } from '@/components/fichajes/TodayFichajes';
import ManualFichajeModal from '@/components/fichajes/ManualFichajeModal';
import AdminChangeRequestModal from '@/components/fichajes/AdminChangeRequestModal';
import { TimelineEvent } from '@/lib/fichajes-utils';
import { toast } from 'react-hot-toast';

// Desktop dashboard widgets
import WelcomeCard from '@/components/admin/dashboard/WelcomeCard';
import ClockWidget from '@/components/admin/dashboard/ClockWidget';
import WhosWorkingWidget from '@/components/admin/dashboard/WhosWorkingWidget';
import CorrectionRequestsWidget from '@/components/admin/dashboard/CorrectionRequestsWidget';
import VacationRequestsWidget from '@/components/admin/dashboard/VacationRequestsWidget';
import VacationCalendarWidget from '@/components/admin/dashboard/VacationCalendarWidget';

export default function AdminPage() {
    const { user } = useAuth();
    const { corrections, fetchCorrections } = useCorrections();
    const { fetchVacations } = useVacations();
    const [pendingVacations, setPendingVacations] = useState(0);
    const [missingConfig, setMissingConfig] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [missingUserDataCount, setMissingUserDataCount] = useState(0);

    // Fichajes state for the integrated history
    const { workCycles, loading: fichajesLoading, refreshFichajes } = useFichajes();
    const [manualModalOpen, setManualModalOpen] = useState(false);
    const [targetEvent, setTargetEvent] = useState<TimelineEvent | undefined>(undefined);
    const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);

    const handleEditFichaje = (event?: TimelineEvent) => {
        setTargetEvent(event);
        setSelectedDate(event?.dateStr);
        setManualModalOpen(true);
    };

    const handleLocation = (lat: string, lng: string) => {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    };

    useEffect(() => {
        fetchCorrections(undefined, 'pendiente');

        const loadVacations = async () => {
            const data = await fetchVacations({ estado: 'pendiente' });
            setPendingVacations(data ? data.length : 0);
        };

        const checkCompanySetup = async () => {
            try {
                const setup = await CompanyService.getSetup();
                if (!setup.name || !setup.siren) {
                    setMissingConfig(true);
                    setShowConfigModal(true);
                }
            } catch (e) {
                console.error('Error checking company setup', e);
            }
        };

        const checkUsersData = async () => {
            try {
                const token = localStorage.getItem('dolibarr_token');
                const res = await fetch('/api/users', {
                    headers: { 'DOLAPIKEY': token || '' }
                });
                if (res.ok) {
                    const users = await res.json();
                    if (Array.isArray(users)) {
                        const count = users.filter((u: any) => {
                            const isActive = u.statut === '1' || u.status === '1' || u.active === '1';
                            if (!isActive) return false;
                            const dni = u.array_options?.options_dni;
                            const naf = u.array_options?.options_naf;
                            return !dni || !naf;
                        }).length;
                        setMissingUserDataCount(count);
                    }
                }
            } catch (e) {
                console.error('Error checking users data', e);
            }
        };

        loadVacations();
        checkCompanySetup();
        checkUsersData();
    }, [fetchCorrections, fetchVacations]);

    // Simple protection
    if (user && !user.admin) {
        return <div className="p-8">Acceso denegado</div>;
    }

    // Requests grid is now primary after removal of quick nav cards
    const adminNavItems = [
        { name: 'Dashboard', icon: LayoutDashboard, href: '/admin', desc: 'Panel de control global' },
        { name: 'Empresa', icon: HouseHeart, href: '/admin/empresa', desc: 'Configuración corporativa' },
        { name: 'Empleados', icon: Users, href: '/admin/users', desc: 'Gestión de personal', badge: missingUserDataCount },
        { name: 'Centros', icon: MapPinHouse, href: '/admin/centers', desc: 'Ubicaciones y departamentos' },
        { name: 'Historial', icon: CalendarClock, href: '/admin/fichajes', desc: 'Registros de todos los usuarios' },
        { name: 'Jornadas', icon: CalendarRange, href: '/admin/jornadas', desc: 'Asignación de turnos' },
        { name: 'Vacaciones', icon: Palmtree, href: '/admin/vacations', desc: 'Gestión de días libres', badge: pendingVacations },
        { name: 'Solicitudes', icon: BadgeCheck, href: '/admin/corrections', desc: 'Revisiones de fichajes', badge: corrections.length },
        { name: 'Configuración', icon: Settings, href: '/admin/settings', desc: 'Ajustes del sistema' },
    ];

    return (
        <>
            <ConfigurationModal
                isOpen={showConfigModal}
                onClose={() => setShowConfigModal(false)}
            />

            {missingConfig && (
                <div className="mb-8 p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="w-14 h-14 rounded-[1.2rem] bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 animate-pulse border border-amber-200/50 shadow-sm">
                        <TriangleAlert size={24} strokeWidth={2.2} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-amber-900">Configuración Pendiente</h3>
                        <p className="text-xs text-amber-700 font-medium">Es necesario configurar la Razón Social y el CIF de la empresa.</p>
                    </div>
                </div>
            )}

            {/* ========================================
                MOBILE LAYOUT — Preserved exactly as-is
               ======================================== */}
            <div className="block md:hidden">
                <PageHeader
                    title="Panel de Administración"
                    subtitle="Gestión global de empleados y registros"
                    icon={LayoutDashboard}
                    badge="Sistemas"
                />

                <div className="grid grid-cols-1 gap-4">
                    {adminNavItems.filter(item => item.name !== 'Dashboard').map((c) => (
                        <Link
                            key={c.href}
                            href={c.href}
                            className="group relative block bg-white rounded-[2.2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 transition-all duration-500 hover:shadow-[0_25px_50px_rgb(0,0,0,0.06)] hover:-translate-y-2"
                        >
                            {/* Decorative Glow */}
                            <div className="absolute inset-x-6 top-6 -z-10 h-14 w-14 rounded-full bg-primary/20 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-40" />

                            <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.2rem] bg-primary/5 text-primary border border-primary/5 transition-all duration-500 group-hover:bg-primary group-hover:text-black group-hover:scale-110 group-hover:rotate-3 shadow-sm">
                                        <c.icon size={24} strokeWidth={2.2} />
                                        {/* Notification Badge */}
                                        {c.badge !== undefined && c.badge > 0 && (
                                            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-[20px] flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                                                {c.badge}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold text-[#121726] tracking-tight group-hover:text-primary transition-colors flex items-center gap-2">
                                            {c.name}
                                        </h3>
                                        <p className="text-xs font-semibold text-gray-400 leading-relaxed opacity-80">
                                            {c.desc}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-300 transition-all duration-500 group-hover:bg-primary group-hover:text-black group-hover:rotate-45">
                                    <ChevronRight size={18} />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* ========================================
                DESKTOP / TABLET LAYOUT — New dashboard
               ======================================== */}
            <div className="hidden md:block">
                {/* Welcome at the top spanning everything */}
                <div className="mb-5">
                    <WelcomeCard />
                </div>

                <div className="grid grid-cols-3 gap-5">
                    {/* Side Column: Who's Working + Personal History */}
                    <div className="col-span-1 space-y-5">
                        <WhosWorkingWidget />

                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <TodayFichajes
                                cycles={workCycles.filter(cycle => {
                                    const cycleDate = new Date(cycle.fecha);
                                    const today = new Date();
                                    return cycleDate.getDate() === today.getDate() &&
                                        cycleDate.getMonth() === today.getMonth() &&
                                        cycleDate.getFullYear() === today.getFullYear();
                                })}
                                loading={fichajesLoading}
                                onEdit={handleEditFichaje}
                                onLocation={handleLocation}
                                onManualEntry={() => handleEditFichaje()}
                                showExampleIfEmpty={true}
                            />
                        </div>
                    </div>

                    {/* Main Column: Calendar + Requests */}
                    <div className="col-span-2 space-y-5">
                        {/* Vacation Calendar Widget */}
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <VacationCalendarWidget />
                        </div>

                        {/* Requests Grid */}
                        <div className="grid grid-cols-2 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                            <CorrectionRequestsWidget />
                            <VacationRequestsWidget />
                        </div>
                    </div>
                </div>
            </div>

            {/* Fichaje Modals */}
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
        </>
    );
}
