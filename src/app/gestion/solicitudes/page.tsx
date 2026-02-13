'use client';

import { useAuth } from '@/context/AuthContext';
import { useUserCorrections } from '@/hooks/useUserCorrections';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { PageHeader } from '@/components/ui/PageHeader';
import { FileText, ArrowLeft, RefreshCw } from 'lucide-react';
import UserCorrectionsPanel from '@/components/fichajes/UserCorrectionsPanel';
import Link from 'next/link';
import { useEffect } from 'react';

export default function UserCorrectionsPage() {
    const { user } = useAuth();
    const { corrections, loading, fetchMyCorrections } = useUserCorrections();

    useEffect(() => {
        fetchMyCorrections();
    }, [fetchMyCorrections]);

    return (
        <div className="flex min-h-screen bg-[#FAFBFC]">
            <div className="hidden md:block"><Sidebar /></div>
            <main className="flex-1 ml-0 md:ml-64 p-6 md:p-12 pb-32">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Back Link */}
                    <div className="flex items-center justify-between">
                        <Link
                            href="/gestion"
                            className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-wider"
                        >
                            <ArrowLeft size={16} />
                            Volver a Gestión
                        </Link>

                        <button
                            onClick={() => fetchMyCorrections()}
                            disabled={loading}
                            className="p-2 text-gray-400 hover:text-primary transition-colors disabled:opacity-50"
                            title="Actualizar"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <PageHeader
                        title="Mis Solicitudes"
                        subtitle="Consulta el estado de tus solicitudes de corrección y cambios de jornada"
                        icon={FileText}
                        badge="Historial"
                    />

                    <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <UserCorrectionsPanel
                            corrections={corrections}
                            loading={loading}
                        />
                    </div>
                </div>
            </main>
            <MobileNav />
        </div>
    );
}
