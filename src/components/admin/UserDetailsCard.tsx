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
    Fingerprint,
    Pencil,
    Trash2,
    Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface UserDetailsProps {
    user: {
        id: string;
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
        array_options?: {
            options_dni?: string | null;
            options_seguridadsocial?: string | null;
            [key: string]: any;
        };
    };
    onEdit?: () => void;
}

export default function UserDetailsCard({ user, onEdit }: UserDetailsProps) {
    const [isOpen, setIsOpen] = useState(true); // Open by default
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.')) return;

        setIsDeleting(true);
        try {
            const token = localStorage.getItem('dolibarr_token');
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'DELETE',
                headers: { 'DOLAPIKEY': token || '' }
            });

            if (!res.ok) throw new Error('Error al eliminar usuario');

            toast.success('Usuario eliminado correctamente');
            router.push('/admin/users');
        } catch (error) {
            console.error(error);
            toast.error('No se pudo eliminar el usuario');
            setIsDeleting(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado al portapapeles`);
    };

    // Extract DNI from note_private if available

    // Extract DNI from note_private if available
    const dniMatch = user.note_private?.match(/DNI:\s*([^\n]*)/i);
    const dni = user.array_options?.options_dni || (dniMatch ? dniMatch[1].trim() : null);
    const naf = user.array_options?.options_seguridadsocial || null;


    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden transition-all hover:shadow-md group/card">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 md:px-6 py-5 md:py-6 text-left cursor-pointer"
            >
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="p-2.5 md:p-3 bg-black text-white rounded-xl md:rounded-2xl relative overflow-hidden">
                        <UserCircle size={20} className="md:w-6 md:h-6 relative z-10" />
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity"></div>
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base md:text-lg font-bold text-gray-900 flex flex-wrap items-center gap-2 truncate">
                            {user.firstname} {user.lastname}
                            {user.admin === '1' && (
                                <span className="bg-black text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Shield size={10} className="fill-current" />
                                    ADMIN
                                </span>
                            )}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium flex items-center gap-2">
                            <span>{user.login}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            <span>Información Personal</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                        disabled={isDeleting}
                        className="p-2 text-red-500 rounded-full hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50"
                        title="Eliminar usuario"
                    >
                        {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                    </button>
                    <div className={`p-2 rounded-full bg-gray-50 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 bg-gray-100 text-gray-600' : ''}`}>
                        <ChevronDown size={20} />
                    </div>
                </div>
            </div>

            <div
                className={`transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                <div className="px-4 md:px-6 pb-6 pt-0 border-t border-gray-50">



                    {/* Contact Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Email */}
                        <div className="group p-4 rounded-2xl bg-gray-50/50 border border-transparent hover:border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email</span>
                                {user.email && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => copyToClipboard(user.email!, 'Email')} className="p-1 hover:text-blue-600 transition-colors"><Copy size={12} /></button>
                                        <a href={`mailto:${user.email}`} className="p-1 hover:text-blue-600 transition-colors"><ExternalLink size={12} /></a>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg text-gray-400 shadow-sm shrink-0">
                                    <Mail size={16} />
                                </div>
                                <span className="text-sm font-bold text-gray-900 truncate">{user.email || 'No registrado'}</span>
                            </div>
                        </div>

                        {/* Mobile */}
                        <div className="group p-4 rounded-2xl bg-gray-50/50 border border-transparent hover:border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Móvil</span>
                                {user.user_mobile && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => copyToClipboard(user.user_mobile!, 'Móvil')} className="p-1 hover:text-green-600 transition-colors"><Copy size={12} /></button>
                                        <a href={`tel:${user.user_mobile}`} className="p-1 hover:text-green-600 transition-colors"><Phone size={12} /></a>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg text-gray-400 shadow-sm shrink-0">
                                    <Smartphone size={16} />
                                </div>
                                <span className="text-sm font-bold text-gray-900">{user.user_mobile || 'No registrado'}</span>
                            </div>
                        </div>

                        {/* Office Phone */}
                        {user.office_phone && (
                            <div className="group p-4 rounded-2xl bg-gray-50/50 border border-transparent hover:border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Teléfono Fijo</span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => copyToClipboard(user.office_phone!, 'Teléfono')} className="p-1 hover:text-green-600 transition-colors"><Copy size={12} /></button>
                                        <a href={`tel:${user.office_phone}`} className="p-1 hover:text-green-600 transition-colors"><Phone size={12} /></a>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg text-gray-400 shadow-sm shrink-0">
                                        <Phone size={16} />
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">{user.office_phone}</span>
                                </div>
                            </div>
                        )}

                        {/* DNI */}
                        <div className="group p-4 rounded-2xl bg-gray-50/50 border border-transparent hover:border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">DNI / NIE</span>
                                {dni && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => copyToClipboard(dni, 'DNI')} className="p-1 hover:text-purple-600 transition-colors"><Copy size={12} /></button>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg text-gray-400 shadow-sm shrink-0">
                                    <Fingerprint size={16} />
                                </div>
                                <span className="text-sm font-bold text-gray-900">{dni || 'No registrado'}</span>
                            </div>
                        </div>

                        {/* NAF */}
                        <div className="group p-4 rounded-2xl bg-gray-50/50 border border-transparent hover:border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nº Seguridad Social</span>
                                {naf && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => copyToClipboard(naf, 'NAF')} className="p-1 hover:text-blue-600 transition-colors"><Copy size={12} /></button>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg text-gray-400 shadow-sm shrink-0">
                                    <Shield size={16} />
                                </div>
                                <span className="text-sm font-bold text-gray-900">{naf || 'No registrado'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="flex items-center justify-end gap-2 mt-6 pt-6 border-t border-gray-50">
                        {onEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black text-white hover:bg-gray-800 transition-all text-xs font-bold uppercase tracking-wide shadow-sm active:scale-95"
                            >
                                <Pencil size={14} /> Editar
                            </button>
                        )}
                    </div>
                </div>
                <div className="h-6"></div>
            </div>
        </div>
    );
}
