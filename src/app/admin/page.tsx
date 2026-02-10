'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { Users, BadgeCheck, Settings, LayoutDashboard, CalendarClock, ChevronRight, MapPinHouse, CalendarRange, Palmtree } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCorrections } from '@/hooks/useCorrections';
import { useVacations } from '@/hooks/useVacations';

export default function AdminPage() {
    const { user } = useAuth();
    const { corrections, fetchCorrections } = useCorrections();
    const { fetchVacations } = useVacations();
    const [pendingVacations, setPendingVacations] = useState(0);

    useEffect(() => {
        fetchCorrections(undefined, 'pendiente');

        const loadVacations = async () => {
            const data = await fetchVacations({ estado: 'pendiente' });
            setPendingVacations(data ? data.length : 0);
        };
        loadVacations();
    }, [fetchCorrections, fetchVacations]);

    // Simple protection
    if (user && !user.admin) {
        return <div className="p-8">Acceso denegado</div>;
    }

    const cards = [
        { title: 'Usuarios', icon: Users, href: '/admin/users', desc: 'Gestionar configuración de empleados', color: 'primary' },
        { title: 'Centros de Trabajo', icon: MapPinHouse, href: '/admin/centers', desc: 'Configurar geolocalización y ubicaciones', color: 'blue' },
        { title: 'Historial Global', icon: CalendarClock, href: '/admin/fichajes', desc: 'Consulta los registros de todos los usuarios', color: 'indigo' },
        {
            title: 'Solicitudes',
            icon: BadgeCheck,
            href: '/admin/corrections',
            desc: 'Aprobar cambios de jornada',
            color: 'primary',
            badge: corrections.length
        },
        {
            title: 'Gestión de Vacaciones',
            icon: Palmtree,
            href: '/admin/vacations',
            desc: 'Aprobar/rechazar días libres',
            color: 'green',
            badge: pendingVacations
        },
        { title: 'Gestión de Jornadas', icon: CalendarRange, href: '/admin/jornadas', desc: 'Asignar jornadas a trabajadores', color: 'orange' },
    ];

    return (
        <div className="flex min-h-screen bg-[#FAFBFC]">
            <div className="hidden md:block"><Sidebar /></div>
            <main className="flex-1 ml-0 md:ml-64 p-6 md:p-12 pb-32">
                <PageHeader
                    title="Panel de Administración"
                    subtitle="Gestión global de empleados y registros"
                    icon={LayoutDashboard}
                    badge="Sistemas"
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {cards.map((c) => (
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
                                            {c.title}
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
            </main>
            <MobileNav />
        </div>
    );
}
