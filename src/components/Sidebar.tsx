'use client';

import { usePathname } from 'next/navigation';
import { Clock, BadgeCheck, LayoutDashboard, Users, CalendarClock, MapPinHouse, Settings, X } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
    const pathname = usePathname();
    const { logout, user } = useAuth();

    const navItems = [
        { name: 'Fichajes', icon: Clock, href: '/fichajes' },
        { name: 'Historial', icon: CalendarClock, href: '/fichajes/historial' },
        ...(!user?.admin ? [
            { name: 'Gestión', icon: LayoutDashboard, href: '/gestion' }
        ] : []),
        ...(user?.admin ? [
            { name: 'Admin Dashboard', icon: LayoutDashboard, href: '/admin' },
            { name: 'Empleados', icon: Users, href: '/admin/users' },
            { name: 'Centros', icon: MapPinHouse, href: '/admin/centers' },
            { name: 'Configuración', icon: Settings, href: '/admin/settings' },
            { name: 'Solicitudes', icon: BadgeCheck, href: '/admin/corrections' },
        ] : [])
    ];

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 glass-premium border-r border-white/20 flex flex-col p-6 z-20">
            <div className="mb-12 px-2">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
                        <Clock size={20} />
                    </div>
                    <span>Control Horario</span>
                </h1>
            </div>

            <nav className="flex-1 space-y-1.5">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '#' && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 font-bold text-sm tracking-tight ${isActive
                                ? 'bg-black text-white shadow-lg shadow-black/10 scale-[1.02]'
                                : 'text-gray-500 hover:bg-black/5 hover:text-gray-900'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Botón salir opcional en sidebar */}
            <div className="mt-auto pt-6 border-t border-gray-100/50">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-500 transition-all font-bold text-sm w-full hover:bg-red-50 rounded-2xl group"
                >
                    <div className="p-1.5 rounded-lg bg-gray-50 group-hover:bg-red-100 transition-colors">
                        <X size={16} />
                    </div>
                    <span>Cerrar sesión</span>
                </button>
            </div>
        </aside>
    );
}
