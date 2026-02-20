'use client';

import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { CompanyFormData } from '@/lib/schemas/company-schema';
import { Building2, Fingerprint, Briefcase } from 'lucide-react';

interface IdentitySectionProps {
    register: UseFormRegister<CompanyFormData>;
    errors: FieldErrors<CompanyFormData>;
}

export function IdentitySection({ register, errors }: IdentitySectionProps) {
    return (
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-black/5 border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-black/10">
            <div className="p-8 md:p-12 space-y-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-white">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-black">Información Legal</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Identidad fiscal y razón social</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="space-y-2 lg:col-span-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Razón Social *</label>
                        <div className="relative group">
                            <input
                                {...register('name')}
                                placeholder="Nombre completo de la entidad"
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-black/5 focus:bg-white rounded-2xl p-4 pr-12 text-sm font-bold transition-all outline-none"
                            />
                            <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 text-black opacity-40 group-focus-within:opacity-100 transition-opacity" size={22} />
                        </div>
                        {errors.name && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2 lg:col-span-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CIF / NIF</label>
                        <div className="relative group">
                            <input
                                {...register('siren')}
                                placeholder="Identificación fiscal"
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-black/5 focus:bg-white rounded-2xl p-4 pr-12 text-sm font-bold transition-all outline-none"
                            />
                            <Fingerprint className="absolute right-4 top-1/2 -translate-y-1/2 text-black opacity-40 group-focus-within:opacity-100 transition-opacity" size={22} />
                        </div>
                    </div>

                    <div className="space-y-2 lg:col-span-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Objeto Social / Actividad</label>
                        <div className="relative group">
                            <textarea
                                {...register('socialobject')}
                                rows={1}
                                placeholder="Describa la actividad principal..."
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-black/5 focus:bg-white rounded-2xl p-4 pr-12 text-sm font-bold transition-all outline-none resize-none"
                            />
                            <Briefcase className="absolute right-4 top-1/2 -translate-y-1/2 text-black opacity-40 group-focus-within:opacity-100 transition-opacity" size={22} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
