'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Clock, BadgeCheck, LayoutDashboard, Users, CalendarClock, MapPinHouse, Settings, HouseHeart, CalendarRange, Palmtree, ScanFace, PenLine, Power } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import CompanyLogo from '@/components/ui/CompanyLogo';
import { CompanyService, CompanySetup } from '@/lib/company-service';

interface SidebarProps {
    adminBadges?: {
        vacations?: number;
        corrections?: number;
        users?: number;
    };
}

export default function Sidebar({ adminBadges }: SidebarProps) {
    const pathname = usePathname();
    const { logout, user } = useAuth();
    const [company, setCompany] = useState<CompanySetup | null>(null);

    useEffect(() => {
        CompanyService.getSetup()
            .then(setCompany)
            .catch(err => console.error('Error fetching company setup in sidebar:', err));
    }, []);

    const navGroups = [
        {
            title: "Inicio",
            items: !user?.admin ? [
                { name: 'Fichajes', icon: Clock, href: '/fichajes', desc: 'Registrar tu jornada' },
                { name: 'Historial', icon: CalendarClock, href: '/fichajes/historial', desc: 'Tus registros' },
                { name: 'Gestión', icon: LayoutDashboard, href: '/gestion', desc: 'Resumen' }
            ] : [
                { name: 'Dashboard', icon: LayoutDashboard, href: '/admin', desc: 'Panel global' },
            ]
        },
        ...(user?.admin ? [
            {
                title: "Gestión Empleados",
                items: [
                    { name: 'Empleados', icon: Users, href: '/admin/users', desc: 'Gestión de personal', badge: adminBadges?.users },
                    { name: 'Vacaciones', icon: Palmtree, href: '/admin/vacations', desc: 'Días libres', badge: adminBadges?.vacations },
                    { name: 'Solicitudes', icon: BadgeCheck, href: '/admin/corrections', desc: 'Revisiones', badge: adminBadges?.corrections },
                    { name: 'Jornadas', icon: CalendarRange, href: '/admin/jornadas', desc: 'Turnos y horarios' },
                ]
            },
            {
                title: "Organización",
                items: [
                    { name: 'Empresa', icon: HouseHeart, href: '/admin/empresa', desc: 'Datos corporativos' },
                    { name: 'Centros', icon: MapPinHouse, href: '/admin/centers', desc: 'Sedes y centros' },
                    { name: 'Registros', icon: CalendarClock, href: '/admin/fichajes', desc: 'Historial total' },
                ]
            },
            {
                title: "Sistema",
                items: [
                    { name: 'Configuración', icon: Settings, href: '/admin/settings', desc: 'Ajustes' },
                ]
            }
        ] : [])
    ];

    return (
        <aside className="fixed left-0 top-0 h-screen w-80 bg-white border-r border-gray-100 flex flex-col z-20 overflow-hidden">
            {/* Header / Logo */}
            <div className="p-8 pb-4">
                <Link href={user?.admin ? '/admin' : '/fichajes'} className="flex items-center gap-4 group">
                    <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center p-2.5 transition-all duration-500 group-hover:scale-105 group-hover:bg-primary/10">
                        <CompanyLogo
                            className="w-full h-full object-contain"
                            alt={company?.name || 'Company Logo'}
                        />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-lg font-black text-gray-900 tracking-tight leading-none truncate">
                            {company?.name || 'Control'}
                        </span>
                        <span className="text-primary text-[9px] uppercase tracking-[0.25em] font-black mt-1 opacity-80">
                            Control Horario
                        </span>
                    </div>
                </Link>
            </div>

            {/* Navigation Groups */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2 space-y-8">
                {navGroups.map((group, groupIdx) => (
                    <div key={groupIdx} className="space-y-2">
                        <h4 className="px-4 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4">
                            {group.title}
                        </h4>
                        <div className="space-y-1.5">
                            {group.items.map((item: any) => {
                                const isActive = pathname === item.href;

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            "group relative flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-300",
                                            isActive
                                                ? "bg-black text-white shadow-xl shadow-black/10 translate-x-1"
                                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                        )}
                                    >
                                        <div className={cn(
                                            "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
                                            isActive
                                                ? "bg-white/10 text-white"
                                                : "bg-gray-50 text-black group-hover:bg-primary/10 group-hover:text-primary"
                                        )}>
                                            <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />

                                            {item.badge !== undefined && item.badge > 0 && (
                                                <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white shadow-lg">
                                                    {item.badge}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className={cn(
                                                "text-[13px] font-bold tracking-tight leading-none",
                                                isActive ? "text-white" : "text-gray-700 group-hover:text-black"
                                            )}>
                                                {item.name}
                                            </h3>
                                            <p className={cn(
                                                "text-[10px] font-medium mt-1 truncate opacity-60",
                                                isActive ? "text-gray-400" : "text-gray-400"
                                            )}>
                                                {item.desc}
                                            </p>
                                        </div>

                                        {isActive && (
                                            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* User Profile & Logout section at the bottom */}
            <div className="mt-auto px-6 py-8 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 bg-white text-black border border-gray-100 rounded-xl flex items-center justify-center shadow-sm">
                        <ScanFace size={22} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate leading-tight">
                            {user?.login}
                        </p>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-wider mt-0.5">
                            Ver Perfil
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href="/usuario"
                        className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-all active:scale-95"
                        title="Mi Perfil"
                    >
                        <PenLine size={18} strokeWidth={2.5} />
                    </Link>
                    <button
                        onClick={logout}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-95"
                        title="Cerrar sesión"
                    >
                        <Power size={18} strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
