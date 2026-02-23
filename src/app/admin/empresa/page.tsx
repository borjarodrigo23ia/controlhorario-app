'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { Building2 } from 'lucide-react';
import CompanyForm from '@/components/admin/CompanyForm';
import CompanyFormLegacy from '@/components/admin/CompanyFormLegacy';

export default function CompanyPage() {
    return (
        <div className="w-full space-y-6 lg:space-y-10 pb-20">
            <PageHeader
                title="Configuración de Empresa"
                subtitle="Gestione la información institucional y la identidad visual de la organización."
                badge="Administración"
                icon={Building2}
                showBack={true}
            />

            {/* HYBRID LAYOUT: Modern for Desktop, Legacy for Mobile */}
            <div className="hidden lg:block">
                <CompanyForm />
            </div>
            <div className="lg:hidden">
                <CompanyFormLegacy />
            </div>
        </div>
    );
}
