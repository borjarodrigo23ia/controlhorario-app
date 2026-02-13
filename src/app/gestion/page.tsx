'use client';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUserCorrections } from '@/hooks/useUserCorrections';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { LayoutDashboard, Palmtree, ChevronRight, Clock, FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

export default function GestionPage() {
    const { user } = useAuth();
    const { corrections, fetchMyCorrections } = useUserCorrections();

    // Load corrections on mount to update badge
    useEffect(() => {
        fetchMyCorrections();
    }, [fetchMyCorrections]);

    const pendingCount = corrections.filter(c => c.estado === 'pendiente').length;

    // Simple protection
    if (user && user.admin) {
        return <div className="p-8 text-center font-bold">Usa el panel de administrador para estas gestiones.</div>;
    }

    const cards = [
        {
            title: 'Vacaciones y Ausencias',
            icon: Palmtree,
            href: '/vacations',
            desc: 'Solicitar vacaciones, días propios o bajas',
            color: 'primary'
        },
        {
            title: 'Mis Solicitudes',
            icon: FileText,
            href: '/gestion/solicitudes',
            desc: 'Consulta estado de correcciones y cambios',
            color: 'amber',
            badge: pendingCount
        }
    ];

    return (
        <div className="flex min-h-screen bg-[#FAFBFC]">
            <div className="hidden md:block"><Sidebar /></div>
            <main className="flex-1 ml-0 md:ml-64 p-6 md:p-12 pb-32">
                <PageHeader
                    title="Centro de Gestión"
                    subtitle="Accede a tus herramientas de empleado"
                    icon={LayoutDashboard}
                    badge="Empleado"
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
