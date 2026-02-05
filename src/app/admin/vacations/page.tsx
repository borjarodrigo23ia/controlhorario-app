'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import AdminVacationDashboard from '@/components/admin/AdminVacationDashboard';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { Palmtree } from 'lucide-react';

export default function AdminVacationsPage() {
    return (
        <div className="flex min-h-screen bg-[#FAFBFC]">
            {/* Sidebar (Desktop) */}
            <div className="hidden md:block">
                <Sidebar />
            </div>

            {/* Main Content */}
            <main className="flex-1 ml-0 md:ml-64 p-6 md:p-12 pb-32">
                <div className="max-w-[1600px] mx-auto space-y-8">
                    <PageHeader
                        title="Gestión de Vacaciones"
                        subtitle="Administración y aprobación de solicitudes de días libres"
                        icon={Palmtree}
                        showBack
                        badge="Administración"
                    />

                    <AdminVacationDashboard />
                </div>
            </main>

            {/* Mobile Navigation */}
            <MobileNav />
        </div>
    );
}
