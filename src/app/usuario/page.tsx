'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import MobileNav from '@/components/MobileNav';
import Sidebar from '@/components/Sidebar';
import { LogOut, Save, Mail, Phone, Lock, Loader2, Pencil, UserCircle, X, Power, Eye, EyeOff, Trash2 } from 'lucide-react';
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

            <main className="flex-1 sidebar-margin ml-0 p-6 md:p-12 pb-32 flex flex-col items-center">
                <div className="w-full max-w-lg">
                    <PageHeader
                        title="Mi Perfil"
                        subtitle="Gestiona tu información de cuenta"
                        icon={UserCircle}
                        showBack
                        badge="Mi Cuenta"
                    >
                        <div className="flex items-center gap-3">
                            {!isEditing ? (
                                <>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 border border-slate-200 hover:bg-slate-50 group"
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

                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_20px_60px_rgb(0,0,0,0.03)] overflow-hidden">
                        <div className="p-10 md:p-12 space-y-7">

                            {/* Header Info (Compact) */}
                            <div className="border-b border-gray-50 pb-6 mb-2">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Información de Usuario</h3>
                                <p className="text-xs font-bold text-slate-400">Datos registrados en la base</p>
                            </div>

                            <div className="group border-b border-gray-50 pb-4">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Nombre de usuario</p>
                                <p className="text-base font-bold text-slate-900 tracking-tight">{user.login}</p>
                            </div>

                            <div className="group border-b border-gray-50 pb-4">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Nombre completo</p>
                                {isEditing ? (
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            className="w-1/2 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all underline decoration-slate-300 decoration-2 underline-offset-4"
                                            value={formData.firstname}
                                            onChange={(e) => setFormData(prev => ({ ...prev, firstname: e.target.value }))}
                                            placeholder="Nombre"
                                        />
                                        <input
                                            type="text"
                                            className="w-1/2 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all underline decoration-slate-300 decoration-2 underline-offset-4"
                                            value={formData.lastname}
                                            onChange={(e) => setFormData(prev => ({ ...prev, lastname: e.target.value }))}
                                            placeholder="Apellidos"
                                        />
                                    </div>
                                ) : (
                                    <p className="text-base font-bold text-slate-900 tracking-tight">
                                        {user.firstname || ''} {user.lastname || ''}
                                    </p>
                                )}
                            </div>

                            {/* Fields Section */}
                            <div className="space-y-7">
                                <div className="group">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 transition-colors">
                                        DNI / NIE
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all underline decoration-slate-300 decoration-2 underline-offset-4"
                                            value={formData.dni}
                                            onChange={(e) => setFormData(prev => ({ ...prev, dni: e.target.value }))}
                                            placeholder="12345678X"
                                        />
                                    ) : (
                                        <p className="text-base font-bold text-slate-700 px-1">{formData.dni || 'No registrado'}</p>
                                    )}
                                </div>

                                <div className="group">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 transition-colors">
                                        Correo electrónico
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="email"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all underline decoration-slate-300 decoration-2 underline-offset-4"
                                            value={formData.email}
                                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                            placeholder="correo@ejemplo.com"
                                        />
                                    ) : (
                                        <p className="text-base font-bold text-slate-700 px-1">{user.email || 'No especificado'}</p>
                                    )}
                                </div>

                                <div className="group">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 transition-colors">
                                        Teléfono móvil
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="tel"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all underline decoration-slate-300 decoration-2 underline-offset-4"
                                            value={formData.user_mobile}
                                            onChange={(e) => setFormData(prev => ({ ...prev, user_mobile: e.target.value }))}
                                            placeholder="+34"
                                        />
                                    ) : (
                                        <p className="text-base font-bold text-slate-700 px-1">{formData.user_mobile || 'No registrado'}</p>
                                    )}
                                </div>

                                <div className="group">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 transition-colors">
                                        Teléfono oficina / fijo
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="tel"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all underline decoration-slate-300 decoration-2 underline-offset-4"
                                            value={formData.office_phone}
                                            onChange={(e) => setFormData(prev => ({ ...prev, office_phone: e.target.value }))}
                                            placeholder="Extensión o fijo"
                                        />
                                    ) : (
                                        <p className="text-base font-bold text-slate-700 px-1">{formData.office_phone || 'No registrado'}</p>
                                    )}
                                </div>

                                <div className="group">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 transition-colors">
                                        Nº Seguridad Social (NAF)
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all underline decoration-slate-300 decoration-2 underline-offset-4"
                                            value={formData.naf}
                                            onChange={(e) => setFormData(prev => ({ ...prev, naf: e.target.value }))}
                                            placeholder="00/00000000/00"
                                        />
                                    ) : (
                                        <p className="text-base font-bold text-slate-700 px-1">{formData.naf || 'No especificado'}</p>
                                    )}
                                </div>



                                {isEditing && (
                                    <div className="group animate-in fade-in slide-in-from-top-2 duration-300">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-3">
                                            Nueva contraseña
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 pr-12 text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all placeholder:text-slate-300 placeholder:font-medium underline decoration-slate-300 decoration-2 underline-offset-4"
                                                value={formData.password}
                                                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-2"
                                            >
                                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="pt-6 space-y-4">
                                {isEditing ? (
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="flex-1 relative group overflow-hidden bg-slate-900 text-white py-4 px-4 rounded-xl font-bold text-[10px] tracking-wider transition-all duration-300 active:scale-95 disabled:opacity-70"
                                        >
                                            <div className="relative z-10 flex items-center justify-center gap-2">
                                                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                                <span>{saving ? 'GUARDANDO...' : 'GUARDAR'}</span>
                                            </div>
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
                                            className="flex-1 flex items-center justify-center gap-2 bg-white text-red-600 border border-red-200 py-4 px-4 rounded-xl font-bold text-[10px] tracking-wider uppercase hover:bg-red-50 transition-all active:scale-95"
                                        >
                                            <Trash2 size={14} strokeWidth={3} />
                                            CANCELAR
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {/* Notification Preferences Section */}
                    <div className="mt-8 w-full">
                        <NotificationPreferences />
                    </div>

                </div>
            </main>

            <MobileNav />
        </div>
    );
}
