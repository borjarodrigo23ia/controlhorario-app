'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import MobileNav from '@/components/MobileNav';
import Sidebar from '@/components/Sidebar';
import { LogOut, Save, Mail, Phone, Lock, Loader2, Pencil, UserCircle, X, Power, Eye, EyeOff, Trash2, ScanFace } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import NotificationPreferences from '@/components/NotificationPreferences';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function UsuarioPage() {
    const { user, logout, refreshUser } = useAuth();
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    const [formData, setFormData] = useState({
        firstname: '',
        lastname: '',
        email: '',
        user_mobile: '',
        office_phone: '',
        password: '',
        dni: '',
        naf: ''
    });

    // Initialize form with user data using API
    useEffect(() => {
        const fetchUserData = async () => {
            if (!user?.id) return;

            try {
                // Initialize with context data first to show something immediately
                setFormData(prev => ({
                    ...prev,
                    firstname: user.firstname || '',
                    lastname: user.lastname || '',
                    email: user.email || '',
                    user_mobile: user.user_mobile || '',
                    dni: (user as any).note_private?.match(/DNI:\s*([^\n]*)/i)?.[1].trim() || ''
                }));

                const token = localStorage.getItem('dolibarr_token');
                const res = await fetch(`/api/users/${user.id}`, {
                    headers: {
                        'DOLAPIKEY': token || ''
                    }
                });

                if (res.ok) {
                    const data = await res.json();
                    // Update with fresh data from API
                    setFormData(prev => ({
                        ...prev,
                        firstname: data.firstname || '',
                        lastname: data.lastname || '',
                        email: data.email || '',
                        user_mobile: data.user_mobile || '',
                        office_phone: data.phone || data.office_phone || '',
                        dni: data.array_options?.options_dni || data.note_private?.match(/DNI:\s*([^\n]*)/i)?.[1].trim() || '',
                        naf: data.array_options?.options_naf || ''
                    }));
                }
            } catch (error) {
                console.error('Error fetching user details:', error);
            }
        };

        fetchUserData();
    }, [user]);

    const handleSave = async () => {
        if (!user?.id) return;
        setSaving(true);

        try {
            const token = localStorage.getItem('dolibarr_token');
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'DOLAPIKEY': token || ''
                },
                body: JSON.stringify({
                    firstname: formData.firstname,
                    lastname: formData.lastname,
                    email: formData.email,
                    user_mobile: formData.user_mobile,
                    office_phone: formData.office_phone,
                    note_private: formData.dni ? `DNI: ${formData.dni}` : '',
                    array_options: {
                        options_dni: formData.dni,
                        options_naf: formData.naf
                    },
                    ...(formData.password ? { password: formData.password } : {})
                })
            });

            if (res.ok) {
                toast.success('Perfil actualizado correctamente');
                await refreshUser(); // Reload user data from server
                setFormData(prev => ({ ...prev, password: '' }));
                setIsEditing(false);
            } else {
                const err = await res.json();
                console.error("Profile update failed details:", err.details || err.message || err);

                // If the message contains technical strings like "Dolibarr" or "Error 500", override it
                let userMessage = err.message || 'No se pudo actualizar el perfil. Por favor, inténtelo de nuevo.';
                if (userMessage.includes('Dolibarr') || userMessage.includes('500') || userMessage.includes('Internal Server Error')) {
                    userMessage = 'Error al guardar los datos. Por favor, revise la información e intente de nuevo.';
                }

                toast.error(userMessage);
            }
        } catch (error) {
            toast.error('Error de conexión');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    if (!user) {
        return (
            <div className="flex min-h-screen bg-[#FAFBFC] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#FAFBFC]">
            <div className="hidden md:block"><Sidebar /></div>

            <main className="flex-1 ml-0 md:ml-80 p-6 md:p-12 pb-32">
                <div className="w-full space-y-8">
                    <PageHeader
                        title="Mi Perfil"
                        subtitle="Gestiona tu información de cuenta y preferencias"
                        icon={UserCircle}
                        showBack
                        badge="Mi Cuenta"
                    >
                        <div className="flex items-center gap-3">
                            {!isEditing ? (
                                <>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 border border-slate-200 hover:bg-slate-50 group shadow-sm"
                                    >
                                        <Pencil size={14} strokeWidth={3} className="group-hover:rotate-12 transition-transform" />
                                        EDITAR
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-600/20 hover:bg-red-700 group"
                                    >
                                        <Power size={14} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                                        SALIR
                                    </button>
                                </>
                            ) : null}
                        </div>
                    </PageHeader>

                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 shadow-[0_20px_60px_rgb(0,0,0,0.03)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="p-8 md:p-12">

                            {/* Section: User Info Header */}
                            <div className="flex flex-row items-center gap-4 md:gap-6 mb-6 pb-8 border-b border-gray-50">
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/5 rounded-[1.5rem] md:rounded-3xl flex items-center justify-center text-primary border border-primary/10 shrink-0">
                                    <ScanFace size={32} className="md:w-10 md:h-10" strokeWidth={1.5} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight truncate">
                                        {user.firstname} {user.lastname}
                                    </h3>
                                    <div className="flex flex-col md:flex-row md:items-center gap-x-4 gap-y-0.5 mt-0.5 md:mt-1">
                                        <p className="flex items-center gap-1.5 text-xs md:text-sm font-bold text-gray-400 truncate">
                                            <UserCircle size={12} className="text-gray-300 md:w-3.5 md:h-3.5" />
                                            @{user.login}
                                        </p>
                                        <div className="w-1 h-1 bg-gray-200 rounded-full hidden md:block" />
                                        <p className="flex items-center gap-1.5 text-xs md:text-sm font-bold text-gray-400 truncate">
                                            <Mail size={12} className="text-gray-300 md:w-3.5 md:h-3.5" />
                                            {user.email}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">

                                {/* Personal Info Group */}
                                <div className="space-y-8">
                                    <div>
                                        <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                            <UserCircle size={14} strokeWidth={2.5} />
                                            Datos Personales
                                        </h4>

                                        <div className="space-y-6">
                                            <div className="group">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block transition-colors">
                                                    Nombre Completo
                                                </label>
                                                {isEditing ? (
                                                    <div className="flex flex-col sm:flex-row gap-3">
                                                        <input
                                                            type="text"
                                                            className="w-full sm:w-1/2 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all"
                                                            value={formData.firstname}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, firstname: e.target.value }))}
                                                            placeholder="Nombre"
                                                        />
                                                        <input
                                                            type="text"
                                                            className="w-full sm:w-1/2 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all"
                                                            value={formData.lastname}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, lastname: e.target.value }))}
                                                            placeholder="Apellidos"
                                                        />
                                                    </div>
                                                ) : (
                                                    <p className="text-base font-bold text-slate-900 tracking-tight pb-2 border-b border-transparent">
                                                        {formData.firstname} {formData.lastname}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="group">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block transition-colors">
                                                    DNI / NIE
                                                </label>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all"
                                                        value={formData.dni}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, dni: e.target.value }))}
                                                        placeholder="12345678X"
                                                    />
                                                ) : (
                                                    <p className="text-base font-bold text-slate-700">{formData.dni || 'No registrado'}</p>
                                                )}
                                            </div>

                                            <div className="group">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block transition-colors">
                                                    Nº Seguridad Social (NAF)
                                                </label>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all"
                                                        value={formData.naf}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, naf: e.target.value }))}
                                                        placeholder="00/00000000/00"
                                                    />
                                                ) : (
                                                    <p className="text-base font-bold text-slate-700">{formData.naf || 'No especificado'}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact & Security Group */}
                                <div className="space-y-8">
                                    <div>
                                        <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                            <Phone size={14} strokeWidth={2.5} />
                                            Contacto y Seguridad
                                        </h4>

                                        <div className="space-y-6">
                                            <div className="group">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block transition-colors">
                                                    Correo electrónico
                                                </label>
                                                {isEditing ? (
                                                    <input
                                                        type="email"
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all"
                                                        value={formData.email}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                    />
                                                ) : (
                                                    <p className="text-base font-bold text-slate-700">{formData.email}</p>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="group">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block transition-colors">
                                                        Móvil
                                                    </label>
                                                    {isEditing ? (
                                                        <input
                                                            type="tel"
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all"
                                                            value={formData.user_mobile}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, user_mobile: e.target.value }))}
                                                        />
                                                    ) : (
                                                        <p className="text-base font-bold text-slate-700">{formData.user_mobile || '—'}</p>
                                                    )}
                                                </div>
                                                <div className="group">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block transition-colors">
                                                        Fijo
                                                    </label>
                                                    {isEditing ? (
                                                        <input
                                                            type="tel"
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all"
                                                            value={formData.office_phone}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, office_phone: e.target.value }))}
                                                        />
                                                    ) : (
                                                        <p className="text-base font-bold text-slate-700">{formData.office_phone || '—'}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {isEditing && (
                                                <div className="group animate-in fade-in slide-in-from-top-2 duration-400">
                                                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-2 block">
                                                        Nueva contraseña
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type={showPassword ? "text" : "password"}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pr-12 text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all"
                                                            value={formData.password}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                                            placeholder="Dejar vacío para mantener"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-2"
                                                        >
                                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions Group (at the bottom of card) */}
                            {isEditing && (
                                <div className="mt-12 pt-10 border-t border-gray-50 flex flex-col sm:flex-row gap-4">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex-1 inline-flex items-center justify-center gap-2 bg-black text-white py-4 px-8 rounded-2xl font-black text-[11px] tracking-widest uppercase transition-all shadow-xl shadow-black/10 hover:shadow-black/20 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2.5} />}
                                        {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            setFormData(prev => ({
                                                ...prev,
                                                firstname: user.firstname || '',
                                                lastname: user.lastname || '',
                                                email: user.email || '',
                                                user_mobile: user.user_mobile || '',
                                                password: ''
                                            }));
                                        }}
                                        className="flex-1 inline-flex items-center justify-center gap-2 bg-white text-red-600 border border-red-100 py-4 px-8 rounded-2xl font-black text-[11px] tracking-widest uppercase hover:bg-red-50 transition-all active:scale-95"
                                    >
                                        <Trash2 size={16} strokeWidth={2.5} />
                                        CANCELAR
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notification Preferences Section */}
                    <div className="mt-12">
                        <NotificationPreferences />
                    </div>
                </div>
            </main>

            <MobileNav />
        </div>
    );
}
