'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Clock, LayoutDashboard, User, CalendarClock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCorrections } from '@/hooks/useCorrections';
import { useVacations } from '@/hooks/useVacations';
import { CompanyService } from '@/lib/company-service';
import { useEffect, useState } from 'react';

export default function MobileNav() {
    const pathname = usePathname();
    const { user } = useAuth();
    const { corrections, fetchCorrections } = useCorrections();
    const { fetchVacations } = useVacations();
    const [hasNotifications, setHasNotifications] = useState(false);

    useEffect(() => {
        const checkNotifications = async () => {
            if (!user) return;

            try {
                if (user.admin) {
                    // Admin: Check for pending tasks
                    // Fix: use the returned data directly instead of relying on state
                    const pendingCorrections = await fetchCorrections(undefined, 'pendiente') || [];
                    const pendingVacs = await fetchVacations({ estado: 'pendiente' }) || [];

                    // Check Company Config
                    let configMissing = false;
                    try {
                        const setup = await CompanyService.getSetup();
                        if (!setup.name || !setup.siren) {
                            configMissing = true;
                        }
                    } catch (e) {
                        console.error('Error checking company config in MobileNav', e);
                    }

                    setHasNotifications(pendingVacs.length > 0 || pendingCorrections.length > 0 || configMissing);
                } else {
                    // User: Check for pending admin-initiated corrections
                    const token = localStorage.getItem('dolibarr_token');
                    const res = await fetch(`/api/corrections?fk_user=${user.id}&estado=pendiente`, {
                        headers: { 'DOLAPIKEY': token || '' }
                    });
                    if (res.ok) {
                        const userCorrs = await res.json();
                        const pendingAdminRequests = Array.isArray(userCorrs) ? userCorrs.filter((c: any) =>
                            c.fk_creator && String(c.fk_creator) !== String(c.fk_user)
                        ) : [];
                        setHasNotifications(pendingAdminRequests.length > 0);
                    }
                }
            } catch (e) {
                console.error('Error checking notifications:', e);
            }
        };

        checkNotifications();
        // Check every 2 minutes
        const interval = setInterval(checkNotifications, 120000);
        return () => clearInterval(interval);
    }, [user, fetchCorrections, fetchVacations]);

    // Secondary effect to watch corrections state for admin
    useEffect(() => {
        if (user?.admin && corrections.length > 0) {
            setHasNotifications(true);
        }
    }, [corrections, user]);

    const navItems = [
        { name: 'Fichajes', icon: Clock, href: '/fichajes' },
        { name: 'Historial', icon: CalendarClock, href: '/fichajes/historial' },
        {
            name: 'Gestión',
            icon: LayoutDashboard,
            href: user?.admin ? '/admin' : '/gestion',
            showDot: hasNotifications
        },
        { name: 'Usuario', icon: User, href: '/usuario' }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 pt-2 pb-5 md:hidden z-50 safe-area-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
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
                            <div className="relative">
                                <item.icon
                                    className="w-6 h-6"
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                                {item.showDot && (
                                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full shadow-sm" />
                                )}
                            </div>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
