'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { useCorrections } from '@/hooks/useCorrections';
import { useVacations } from '@/hooks/useVacations';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { corrections, fetchCorrections } = useCorrections();
    const { fetchVacations } = useVacations();

    const [pendingVacations, setPendingVacations] = useState(0);
    const [missingUserDataCount, setMissingUserDataCount] = useState(0);

    useEffect(() => {
        // Fetch corrections count
        fetchCorrections(undefined, 'pendiente');

        // Fetch vacations count
        const loadVacations = async () => {
            try {
                const data = await fetchVacations({ estado: 'pendiente' });
                setPendingVacations(data ? data.length : 0);
            } catch (e) {
                console.error('Error loading vacations count for sidebar', e);
            }
        };

        // Check users with missing critical data (DNI/NAF)
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
                console.error('Error checking users data for sidebar', e);
            }
        };

        loadVacations();
        checkUsersData();
    }, [fetchCorrections, fetchVacations]);

    // Simple protection for admin routes
    if (user && !user.admin) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-gray-100 max-w-md">
                    <h1 className="text-2xl font-black text-gray-900 mb-2">Acceso Denegado</h1>
                    <p className="text-gray-500 font-medium">No tienes permisos de administrador para ver esta sección.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#FAFBFC]">
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
                <Sidebar
                    adminBadges={{
                        vacations: pendingVacations,
                        corrections: corrections.length,
                        users: missingUserDataCount
                    }}
                />
            </div>

            {/* Main scrollable area */}
            <main className="flex-1 ml-0 md:ml-80 p-6 md:p-8 lg:p-12 pb-32">
                {children}
            </main>

            {/* Mobile Navigation */}
            <MobileNav />
        </div>
    );
}
