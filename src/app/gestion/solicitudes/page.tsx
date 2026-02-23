'use client';

import { useAuth } from '@/context/AuthContext';
import { useUserCorrections } from '@/hooks/useUserCorrections';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { PageHeader } from '@/components/ui/PageHeader';
import { FileText, ArrowLeft, RefreshCw, BadgeCheck } from 'lucide-react';
import UserCorrectionsPanel from '@/components/fichajes/UserCorrectionsPanel';
import Link from 'next/link';
import { useEffect } from 'react';

export default function UserCorrectionsPage() {
    const { user } = useAuth();
    const { corrections, loading, fetchMyCorrections } = useUserCorrections();

    useEffect(() => {
        fetchMyCorrections();
    }, [fetchMyCorrections]);

    const pendingAdminRequests = corrections.filter(c =>
        c.estado === 'pendiente' && c.fk_creator && String(c.fk_creator) !== String(user?.id)
    );

    return (
        <div className="flex min-h-screen bg-[#FAFBFC]">
            <div className="hidden md:block"><Sidebar /></div>
            <main className="flex-1 ml-0 md:ml-80 p-6 md:p-12 pb-32">
                <div className="max-w-4xl mx-auto space-y-6">
                    <PageHeader
                        title="Validar Solicitudes"
                        subtitle="Revisa y valida las modificaciones de horario propuestas por el administrador"
                        icon={BadgeCheck}
                        showBack
                        badge={pendingAdminRequests.length > 0 ? `${pendingAdminRequests.length} Pendientes` : 'Todo al día'}
                    />

                    <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {pendingAdminRequests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                                    <BadgeCheck size={28} className="text-emerald-500" />
                                </div>
                                <h3 className="text-lg font-black text-gray-900 mb-1">
                                    Todo validado
                                </h3>
                                <p className="text-sm text-gray-400 max-w-xs">
                                    No tienes solicitudes pendientes de validar. Puedes consultar todo el historial en la sección de Fichajes.
                                </p>
                                <Link href="/fichajes/historial" className="mt-6 px-6 py-2 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors">
                                    Ver Historial
                                </Link>
                            </div>
                        ) : (
                            <UserCorrectionsPanel
                                corrections={pendingAdminRequests}
                                loading={loading}
                            />
                        )}
                    </div>
                </div>
            </main>
            <MobileNav />
        </div>
    );
}
