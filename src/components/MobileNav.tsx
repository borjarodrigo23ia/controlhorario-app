'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Clock, LayoutDashboard, User, LayoutGrid, CalendarClock } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';

export default function MobileNav() {
    const pathname = usePathname();
    const { user } = useAuth();

    const navItems = [
        { name: 'Fichajes', icon: Clock, href: '/fichajes' },
        { name: 'Historial', icon: user?.admin ? CalendarClock : LayoutGrid, href: '/fichajes/historial' },
        ...(user?.admin ? [
            { name: 'Gestión', icon: LayoutDashboard, href: '/admin' },
        ] : []),
        { name: 'Usuario', icon: User, href: '/usuario' }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 pt-4 pb-8 md:hidden z-50 safe-area-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            <nav className="flex justify-around items-center max-w-md mx-auto">
                {navItems.map((item) => {
                    let isActive = false;

                    if (item.href === '/fichajes') {
                        // Special handling for Fichajes to avoid overlap with Historial
                        isActive = pathname === '/fichajes';
                    } else if (item.href === '/') {
                        isActive = pathname === '/';
                    } else {
                        // Standard behavior for other links (including Historial)
                        isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    }

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all touch-manipulation ${isActive
                                ? 'text-[#060721]'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                            title={item.name}
                        >
                            <item.icon
                                className="w-6 h-6"
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
