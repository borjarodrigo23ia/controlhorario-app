'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { CompanyService, CompanySetup } from '@/lib/company-service';
import { companySchema, CompanyFormData } from '@/lib/schemas/company-schema';
import { Loader2, X, CircleCheck } from 'lucide-react';

// Sub-components
import { CompanyHeader } from './company/CompanyHeader';
import { IdentitySection } from './company/IdentitySection';
import { ContactSection } from './company/ContactSection';
import { LocationSection } from './company/LocationSection';

export default function CompanyForm() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [companyData, setCompanyData] = useState<CompanySetup | null>(null);

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CompanyFormData>({
        resolver: zodResolver(companySchema)
    });

    const watchedName = watch('name');
    const watchedSiren = watch('siren');
    const watchedTown = watch('town');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await CompanyService.getSetup();
            setCompanyData(data);
            reset({
                name: data.name,
                address: data.address,
                zip: data.zip,
                town: data.town,
                phone: data.phone,
                email: data.email,
                url: data.url,
                siren: data.siren,
                socialobject: data.socialobject
            });
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: CompanyFormData) => {
        try {
            setSaving(true);
            await CompanyService.updateSetup(data);
            toast.success('Cambios guardados');
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-black" size={40} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">Cargando identidad...</span>
        </div>
    );

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">

            <CompanyHeader
                name={watchedName || ''}
                siren={watchedSiren || ''}
                town={watchedTown || ''}
            />

            <IdentitySection register={register} errors={errors} />

            <ContactSection register={register} errors={errors} />

            <LocationSection register={register} errors={errors} />

            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/50 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/20 shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Información sincronizada</span>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="flex-1 sm:flex-none px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black hover:bg-white transition-all border border-transparent hover:border-gray-100"
                    >
                        Descartar
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 sm:flex-none bg-black text-white px-12 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl shadow-black/20 hover:-translate-y-1 hover:shadow-black/30 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <CircleCheck size={16} className="text-primary" />}
                        {saving ? 'Guardando...' : 'Aplicar Configuración'}
                    </button>
                </div>
            </div>
        </form>
    );
}
