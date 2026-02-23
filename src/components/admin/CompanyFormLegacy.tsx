'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { CompanyService, CompanySetup } from '@/lib/company-service';
import { companySchema, CompanyFormData } from '@/lib/schemas/company-schema';
import { Loader2, Phone, Mail, X, CircleCheck, MapPin, HouseHeart, MapPinHouse } from 'lucide-react';

export default function CompanyFormLegacy() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [companyData, setCompanyData] = useState<CompanySetup | null>(null);

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CompanyFormData>({
        resolver: zodResolver(companySchema)
    });

    // Watch values for the "Header" live preview
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
                siren: data.siren, // CIF/NIF
                capital: data.capital,
                socialobject: data.socialobject
            });
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar datos de empresa');
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: CompanyFormData) => {
        try {
            setSaving(true);
            await CompanyService.updateSetup(data);
            toast.success('Datos actualizados correctamente');
            loadData(); // Reload to ensure sync
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar datos');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;
    }

    return (
        <div className="max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 w-full">
            <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden transition-all duration-500 hover:shadow-[0_20px_40px_rgb(0,0,0,0.04)]">

                {/* REFINED INTEGRATED HEADER: INFO ONLY */}
                <div className="px-5 md:px-10 py-8 md:py-10 border-b border-gray-50 bg-gradient-to-br from-gray-50/50 to-white">
                    <div className="text-center md:text-left">
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-black text-[#121726] tracking-tighter leading-none mb-3">
                                    {watchedName || 'Nombre de la Empresa'}
                                </h2>
                                <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-black text-white rounded-full shrink-0">
                                        <HouseHeart size={10} strokeWidth={3} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                            {watchedSiren || 'CIF pendiente'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-500 rounded-full border border-gray-200 shrink-0">
                                        <MapPinHouse size={10} strokeWidth={3} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                            {watchedTown || 'Ubicación'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs md:text-sm text-gray-400 font-medium max-w-2xl italic mx-auto md:mx-0">
                                {companyData?.socialobject || 'Configure el objeto social de su empresa para completar el perfil institucional.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* FORM CONTENT */}
                <div className="p-5 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 md:gap-y-8">
                    {/* Section 1: Identity */}
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[11px] font-black text-black uppercase tracking-[0.3em]">Identidad Corporativa</span>
                            <div className="h-px flex-1 bg-gray-50" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Razón Social *</label>
                        <input
                            {...register('name')}
                            placeholder="Nombre oficial..."
                            className="w-full bg-gray-50/50 border-2 border-transparent focus:border-black/5 focus:bg-white rounded-2xl p-4 text-sm font-bold transition-all outline-none"
                        />
                        {errors.name && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">CIF / NIF</label>
                        <input
                            {...register('siren')}
                            placeholder="Ej. B12345678"
                            className="w-full bg-gray-50/50 border-2 border-transparent focus:border-black/5 focus:bg-white rounded-2xl p-4 text-sm font-bold transition-all outline-none"
                        />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Objeto Social</label>
                        <textarea
                            {...register('socialobject')}
                            rows={3}
                            placeholder="Actividad principal de la empresa..."
                            className="w-full bg-gray-50/50 border-2 border-transparent focus:border-black/5 focus:bg-white rounded-2xl p-4 text-sm font-bold transition-all outline-none resize-none"
                        />
                    </div>

                    {/* Section 2: Contact */}
                    <div className="md:col-span-2 pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin size={16} className="text-black" />
                            <span className="text-[11px] font-black text-black uppercase tracking-[0.3em]">Contacto y Ubicación</span>
                            <div className="h-px flex-1 bg-gray-50" />
                        </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Dirección Postal</label>
                        <input
                            {...register('address')}
                            placeholder="Calle, número, oficina..."
                            className="w-full bg-gray-50/50 border-2 border-transparent focus:border-black/5 focus:bg-white rounded-2xl p-4 text-sm font-bold transition-all outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Código Postal</label>
                        <input
                            {...register('zip')}
                            placeholder="46xxx"
                            className="w-full bg-gray-50/50 border-2 border-transparent focus:border-black/5 focus:bg-white rounded-2xl p-4 text-sm font-bold transition-all outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Población</label>
                        <input
                            {...register('town')}
                            placeholder="Ej. Valencia"
                            className="w-full bg-gray-50/50 border-2 border-transparent focus:border-black/5 focus:bg-white rounded-2xl p-4 text-sm font-bold transition-all outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Phone size={10} className="text-gray-300" /> Teléfono
                        </label>
                        <input
                            {...register('phone')}
                            placeholder="+34 ..."
                            className="w-full bg-gray-50/50 border-2 border-transparent focus:border-black/5 focus:bg-white rounded-2xl p-4 text-sm font-bold transition-all outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Mail size={10} className="text-gray-300" /> Email Corporativo
                        </label>
                        <input
                            {...register('email')}
                            placeholder="info@empresa.com"
                            className="w-full bg-gray-50/50 border-2 border-transparent focus:border-black/5 focus:bg-white rounded-2xl p-4 text-sm font-bold transition-all outline-none"
                        />
                        {errors.email && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.email.message}</p>}
                    </div>
                </div>

                {/* FOOTER ACTIONS */}
                <div className="px-5 md:px-10 py-6 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="px-6 py-3 md:py-2.5 rounded-xl font-black text-red-500 border border-red-200 hover:bg-red-50 hover:border-red-500 transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                        <X size={14} strokeWidth={3} />
                        Descartar
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-black text-white px-8 py-3 md:py-2.5 rounded-xl font-black flex items-center justify-center gap-2 shadow-xl shadow-black/10 hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-[10px] uppercase tracking-widest"
                    >
                        {saving ? <Loader2 className="animate-spin" size={14} /> : <CircleCheck size={14} strokeWidth={3} className="text-white" />}
                        <span>{saving ? 'Procesando...' : 'Guardar'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
