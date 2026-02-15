'use client';

import { useState } from 'react';
import {
    ChevronDown,
    ChevronUp,
    Mail,
    Phone,
    Smartphone,
    MapPin,
    Briefcase,
    UserCircle,
    Copy,
    ExternalLink,
    Shield,
    Fingerprint
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface UserDetailsProps {
    user: {
        login: string;
        firstname: string;
        lastname: string;
        email?: string;
        user_mobile?: string;
        office_phone?: string;
        address?: string;
        zip?: string;
        town?: string;
        job?: string;
        gender?: string;
        birth?: string;
        admin?: string;
        note_private?: string;
    }
}

export default function UserDetailsCard({ user }: UserDetailsProps) {
    const [isOpen, setIsOpen] = useState(false);

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado al portapapeles`);
    };

    // Extract DNI from note_private if available
    const dniMatch = user.note_private?.match(/DNI:\s*([^\n]*)/i);
    const dni = dniMatch ? dniMatch[1].trim() : null;

    const hasContactInfo = user.email || user.user_mobile || user.office_phone || dni;

    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden transition-all hover:shadow-md">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-6 text-left"
            >
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-black text-white rounded-2xl">
                        <UserCircle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            {user.firstname} {user.lastname}
                            {user.admin === '1' && (
                                <span className="bg-black text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Shield size={10} className="fill-current" />
                                    ADMIN
                                </span>
                            )}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">
                            Información Personal
                        </p>
                    </div>
                </div>
                <div className={`p-2 rounded-full bg-gray-50 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 bg-gray-100 text-gray-600' : ''}`}>
                    <ChevronDown size={20} />
                </div>
            </button>

            <div
                className={`transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                <div className="p-6 pt-0 border-t border-gray-50">

                    {/* Contact Info */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-4 mb-2">Contacto</h4>

                        {user.email ? (
                            <div className="flex items-center justify-between group p-3 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg text-gray-400 shadow-sm">
                                        <Mail size={16} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">{user.email}</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => copyToClipboard(user.email!, 'Email')}
                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Copy size={14} />
                                    </button>
                                    <a
                                        href={`mailto:${user.email}`}
                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-gray-400 italic pl-2">Sin email registrado</div>
                        )}

                        {user.user_mobile ? (
                            <div className="flex items-center justify-between group p-3 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg text-gray-400 shadow-sm">
                                        <Smartphone size={16} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">{user.user_mobile}</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => copyToClipboard(user.user_mobile!, 'Móvil')}
                                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    >
                                        <Copy size={14} />
                                    </button>
                                    <a
                                        href={`tel:${user.user_mobile}`}
                                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    >
                                        <Phone size={14} />
                                    </a>
                                </div>
                            </div>
                        ) : null}

                        {dni ? (
                            <div className="flex items-center justify-between group p-3 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg text-gray-400 shadow-sm">
                                        <Fingerprint size={16} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">DNI: {dni}</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => copyToClipboard(dni, 'DNI')}
                                        className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                    >
                                        <Copy size={14} />
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        {user.office_phone ? (
                            <div className="flex items-center justify-between group p-3 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg text-gray-400 shadow-sm">
                                        <Phone size={16} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">{user.office_phone}</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => copyToClipboard(user.office_phone!, 'Teléfono')}
                                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    >
                                        <Copy size={14} />
                                    </button>
                                    <a
                                        href={`tel:${user.office_phone}`}
                                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    >
                                        <Phone size={14} />
                                    </a>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
                <div className="h-6"></div>
            </div>
        </div>
    );
}
