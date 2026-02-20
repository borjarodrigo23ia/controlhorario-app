'use client';

import React from 'react';
import { Fingerprint, MapPinHouse } from 'lucide-react';
import CompanyLogo from '@/components/ui/CompanyLogo';

interface CompanyHeaderProps {
    name: string;
    siren: string;
    town: string;
}

export function CompanyHeader({
    name,
    siren,
    town
}: CompanyHeaderProps) {
    return (
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-black/5 border border-gray-100 overflow-hidden">
            <div className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-10">
                <div className="relative">
                    <div className="w-40 h-40 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-center p-6 transition-all duration-500 hover:scale-105">
                        <CompanyLogo className="w-full h-full object-contain" />
                    </div>
                </div>

                <div className="flex-1 space-y-6 text-center md:text-left">
                    <div className="space-y-4">
                        <h2 className="text-4xl font-black text-gray-900 tracking-tight">
                            {name || 'Identidad Corporativa'}
                        </h2>
                        <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                            <div className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full shrink-0 shadow-lg shadow-black/10">
                                <Fingerprint size={14} strokeWidth={2.5} />
                                <span className="text-[11px] font-black uppercase tracking-widest">
                                    {siren || 'CIF pendiente'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-full border border-gray-200 shrink-0">
                                <MapPinHouse size={14} strokeWidth={2.5} />
                                <span className="text-[11px] font-black uppercase tracking-widest">
                                    {town || 'Población'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <p className="text-sm text-gray-400 font-medium max-w-2xl leading-relaxed">
                        Defina la personalidad visual y los datos institucionales de su empresa para personalizar toda la plataforma de gestión.
                    </p>
                </div>
            </div>
        </div>
    );
}
