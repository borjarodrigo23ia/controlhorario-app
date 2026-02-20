'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Clock, BadgeCheck, LayoutDashboard, Users, CalendarClock, MapPinHouse, Settings, X, HouseHeart, CalendarRange, Palmtree } from 'lucide-react';
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

    const navItems = [
        ...(!user?.admin ? [
            { name: 'Fichajes', icon: Clock, href: '/fichajes', desc: 'Registrar tu jornada' },
            { name: 'Historial', icon: CalendarClock, href: '/fichajes/historial', desc: 'Tus registros individuales' },
            { name: 'Gestión', icon: LayoutDashboard, href: '/gestion', desc: 'Resumen de actividad' }
        ] : []),
        ...(user?.admin ? [
            { name: 'Dashboard', icon: LayoutDashboard, href: '/admin', desc: 'Panel de control global' },
            { name: 'Empresa', icon: HouseHeart, href: '/admin/empresa', desc: 'Configuración corporativa' },
            { name: 'Empleados', icon: Users, href: '/admin/users', desc: 'Gestión de personal', badge: adminBadges?.users },
            { name: 'Centros', icon: MapPinHouse, href: '/admin/centers', desc: 'Ubicaciones y departamentos' },
            { name: 'Historial', icon: CalendarClock, href: '/admin/fichajes', desc: 'Registros de todos los usuarios' },
            { name: 'Jornadas', icon: CalendarRange, href: '/admin/jornadas', desc: 'Asignación de turnos' },
            { name: 'Vacaciones', icon: Palmtree, href: '/admin/vacations', desc: 'Gestión de días libres', badge: adminBadges?.vacations },
            { name: 'Solicitudes', icon: BadgeCheck, href: '/admin/corrections', desc: 'Revisiones de fichajes', badge: adminBadges?.corrections },
            { name: 'Configuración', icon: Settings, href: '/admin/settings', desc: 'Ajustes del sistema' },
        ] : [])
    ];

    return (
        <aside className="fixed left-0 top-0 h-screen w-80 glass-premium border-r border-white/20 flex flex-col p-6 z-20 overflow-y-auto custom-scrollbar">
            <div className="mb-10 px-2">
                <Link href={user?.admin ? '/admin' : '/fichajes'} className="flex items-center gap-4 group">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-black/5 border border-gray-100/50 p-2 overflow-hidden transition-transform duration-500 group-hover:scale-110">
                        <CompanyLogo
                            className="w-full h-full object-contain"
                            alt={company?.name || 'Company Logo'}
                        />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xl font-black text-gray-900 tracking-tight leading-none truncate">
                            {company?.name || 'Control'}
                        </span>
                        <span className="text-primary text-[10px] uppercase tracking-[0.2em] font-black mt-1">
                            Control Horario
                        </span>
                    </div>
                </Link>
            </div>

            <nav className="flex-1 space-y-3">
                {navItems.map((item: any) => {
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "group relative overflow-hidden flex items-center gap-3 px-4 py-2.5 rounded-[1.2rem] transition-all duration-500 border",
                                isActive
                                    ? "bg-black text-white border-black shadow-[0_10px_25px_rgba(0,0,0,0.2)] scale-[1.02] z-10"
                                    : "bg-white border-gray-100/80 text-gray-500 shadow-sm hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
                            )}
                        >
                            {/* Decorative Background Icon */}
                            <div className={cn(
                                "absolute -bottom-4 -right-4 -rotate-12 pointer-events-none transition-all duration-700 group-hover:scale-125 group-hover:rotate-0 text-current",
                                isActive ? "opacity-[0.7]" : "opacity-[0.07]"
                            )}>
                                <item.icon size={60} strokeWidth={1} />
                            </div>

                            <div className={cn(
                                "relative flex h-9 w-9 shrink-0 items-center justify-center transition-all duration-500",
                                isActive
                                    ? "text-white"
                                    : "text-gray-400 group-hover:text-primary group-hover:rotate-3"
                            )}>
                                <item.icon size={20} strokeWidth={2.5} />

                                {/* Notification Badge */}
                                {item.badge !== undefined && item.badge > 0 && (
                                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full border-2 border-white shadow-md animate-in zoom-in duration-300">
                                        {item.badge}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0 relative">
                                <h3 className={cn(
                                    "text-sm font-bold tracking-tight transition-colors truncate",
                                    isActive ? "text-white" : "text-gray-900 group-hover:text-primary"
                                )}>
                                    {item.name}
                                </h3>
                                <p className={cn(
                                    "text-[10px] font-semibold leading-relaxed opacity-70 truncate",
                                    isActive ? "text-gray-400" : "text-gray-400 group-hover:text-gray-500"
                                )}>
                                    {item.desc}
                                </p>
                            </div>
                        </Link>
                    );
                })}
            </nav>

            {/* Botón salir opcional en sidebar */}
            <div className="mt-8 pt-6 border-t border-gray-100/50">
                <button
                    onClick={logout}
                    className="group flex items-center gap-3 px-4 py-2.5 w-full bg-red-50/50 hover:bg-red-50 border border-red-100/50 hover:border-red-200 shadow-sm hover:shadow-md rounded-[1.2rem] transition-all duration-300 active:scale-95"
                >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center text-red-600 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                        <X size={20} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 text-left">
                        <span className="block text-sm font-bold text-red-900 leading-none">Cerrar sesión</span>
                        <span className="text-[10px] font-semibold text-red-400 mt-1 block">Finalizar sesión actual</span>
                    </div>
                </button>
            </div>
        </aside>
    );
}
