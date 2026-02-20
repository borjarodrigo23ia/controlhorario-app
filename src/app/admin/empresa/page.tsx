'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { Building2 } from 'lucide-react';
import CompanyForm from '@/components/admin/CompanyForm';

export default function CompanyPage() {
    return (
        <div className="w-full space-y-10 pb-20 px-4 md:px-0">
            <PageHeader
                title="Configuración de Empresa"
                subtitle="Gestione la información institucional y la identidad visual de la organización."
                badge="Administración"
                icon={Building2}
                showBack={true}
            />

            <CompanyForm />
        </div>
    );
}
