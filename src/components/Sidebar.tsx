'use client';

import { usePathname } from 'next/navigation';
import { Home, Clock, BadgeCheck, LayoutDashboard, Users, CalendarClock, LayoutGrid, MapPinHouse, Settings, Palmtree } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
    const pathname = usePathname();
    const { logout, user } = useAuth();

    const navItems = [
        { name: 'Fichajes', icon: Clock, href: '/fichajes' },
        { name: 'Historial', icon: user?.admin ? CalendarClock : LayoutGrid, href: '/fichajes/historial' },
        ...(!user?.admin ? [{ name: 'Vacaciones', icon: Palmtree, href: '/vacations' }] : []),
        ...(user?.admin ? [
            { name: 'Admin Dashboard', icon: LayoutDashboard, href: '/admin' },
            { name: 'Empleados', icon: Users, href: '/admin/users' },
            { name: 'Centros', icon: MapPinHouse, href: '/admin/centers' },
            { name: 'Configuración', icon: Settings, href: '/admin/settings' },
            { name: 'Solicitudes', icon: BadgeCheck, href: '/admin/corrections' },
        ] : [])
    ];

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-100 flex flex-col p-6 z-20">
            <div className="mb-12">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Control Horario</h1>
            </div>

            <nav className="flex-1 space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '#' && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${isActive
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Botón salir opcional en sidebar */}
            <div className="mt-auto pt-6 border-t border-gray-100">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-500 transition-colors w-full"
                >
                    <span>Cerrar sesión</span>
                </button>
            </div>
        </aside>
    );
}
