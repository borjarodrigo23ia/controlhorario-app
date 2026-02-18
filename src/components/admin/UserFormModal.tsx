'use client';

import { useState, useEffect } from 'react';
import { X, User as UserIcon, Mail, Lock, Shield, Check, Loader2, Fingerprint, Phone, Smartphone, Eye, EyeOff, MapPin, MapPinOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { DolibarrUser } from '@/lib/admin-types';

interface UserFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: DolibarrUser | null; // If null, it's create mode
}

export default function UserFormModal({ isOpen, onClose, onSuccess, initialData }: UserFormModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstname: '',
        lastname: '',
        login: '',
        email: '',
        password: '',
        dni: '',
        naf: '',
        user_mobile: '',
        office_phone: '',
        isAdmin: false,
        requireGeolocation: false
    });
    const [showPassword, setShowPassword] = useState(false);

    const isEditMode = !!initialData;

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Extract DNI from note_private
                const dniMatch = initialData.note_private?.match(/DNI:\s*([^\n]*)/i);
                const dni = dniMatch ? dniMatch[1].trim() : '';

                setFormData({
                    firstname: initialData.firstname || '',
                    lastname: initialData.lastname || '',
                    login: initialData.login || '',
                    email: initialData.email || '',
                    password: '', // Password empty on edit
                    dni: initialData.array_options?.options_dni || dni, // Prefer extrafield, fallback to note parse
                    naf: initialData.array_options?.options_naf || '',
                    user_mobile: initialData.user_mobile || '',
                    office_phone: initialData.phone || initialData.office_phone || '',
                    isAdmin: initialData.admin === '1',
                    requireGeolocation: false // Will be updated by fetch
                });

                // Fetch current geolocation config for the user
                const fetchUserConfig = async () => {
                    try {
                        const token = localStorage.getItem('dolibarr_token');
                        const res = await fetch(`/api/users/${initialData.id}/config`, {
                            headers: { 'DOLAPIKEY': token || '' }
                        });
                        if (res.ok) {
                            const config = await res.json();
                            const isGeolocationEnabled = config.require_geolocation === '1' || config.require_geolocation === 1;
                            setFormData(prev => ({ ...prev, requireGeolocation: isGeolocationEnabled }));
                        }
                    } catch (err) {
                        console.error('Error fetching user config:', err);
                    }
                };
                fetchUserConfig();
            } else {
                // Reset for create
                setFormData({
                    firstname: '',
                    lastname: '',
                    login: '',
                    email: '',
                    password: '',
                    dni: '',
                    naf: '',
                    user_mobile: '',
                    office_phone: '',
                    isAdmin: false,
                    requireGeolocation: false
                });
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('dolibarr_token');
            const url = isEditMode
                ? `/api/users/${initialData?.id}` // Use standard user update endpoint (internally uses admin key)
                : '/api/admin/create-user';

            const method = isEditMode ? 'PUT' : 'POST';

            // Clean data for submission
            const payload: any = {
                ...formData,
                admin: formData.isAdmin ? 1 : 0,
                user_mobile: formData.user_mobile,
                office_phone: formData.office_phone,
                array_options: {
                    options_dni: formData.dni,
                    options_naf: formData.naf
                }
            };

            // If editing and password is empty, remove it to avoid overwriting
            if (isEditMode && !payload.password) {
                delete payload.password;
            }

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'DOLAPIKEY': token || ''
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                console.error('User save technical details:', errorData.details || errorData.message || errorData);
                throw new Error(errorData.message || 'Error al guardar el usuario. Verfique los campos.');
            }

            const savedUser = await res.json();
            // Handle both flat response or nested { data: { ... } } from our API route
            const userId = isEditMode
                ? initialData?.id
                : (savedUser.data?.id || savedUser.data?.log_id || savedUser.id || savedUser.log_id);

            // Persist geolocation preference if we have a user ID
            if (userId) {
                try {
                    await fetch(`/api/users/${userId}/config`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'DOLAPIKEY': token || ''
                        },
                        body: JSON.stringify({
                            param_name: 'require_geolocation',
                            value: formData.requireGeolocation ? '1' : '0'
                        })
                    });
                } catch (configErr) {
                    console.error('Error persisting geolocation config:', configErr);
                    // We don't throw here as the main user save was successful
                }
            }

            toast.success(isEditMode ? 'Usuario actualizado' : 'Usuario creado');
            onSuccess();
            onClose();

        } catch (error: any) {
            console.error('Error saving user:', error);
            toast.error(error.message || 'Error desconocido');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
                onClick={() => !loading && onClose()}
            />

            {/* Modal */}
            <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 h-[90vh] md:h-auto md:max-h-[90vh]">

                {/* Header */}
                <div className="p-6 md:p-8 md:pb-4 flex items-start justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-black/5 rounded-2xl">
                            <UserIcon size={24} className="text-black" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">
                                {isEditMode ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                            </h3>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">
                                Administración
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => !loading && onClose()}
                        className="p-2 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 md:px-8 pb-8 custom-scrollbar">
                    <div className="space-y-6 mt-4">

                        {/* Name Fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">Nombre</label>
                                <input
                                    type="text"
                                    name="firstname"
                                    value={formData.firstname}
                                    onChange={handleChange}
                                    required
                                    placeholder="Ej. Juan"
                                    className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 text-sm text-gray-900 placeholder:text-gray-300 font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">Apellidos</label>
                                <input
                                    type="text"
                                    name="lastname"
                                    value={formData.lastname}
                                    onChange={handleChange}
                                    required
                                    placeholder="Ej. Pérez"
                                    className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 text-sm text-gray-900 placeholder:text-gray-300 font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                                />
                            </div>
                        </div>

                        {/* DNI Field */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">
                                <Fingerprint size={12} /> DNI / NIE
                            </label>
                            <input
                                type="text"
                                name="dni"
                                value={formData.dni}
                                onChange={handleChange}
                                placeholder="12345678X"
                                className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 text-sm text-gray-900 placeholder:text-gray-300 font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                            />
                        </div>

                        {/* NAF Field */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">
                                <Shield size={12} /> Nº Seguridad Social (NAF)
                            </label>
                            <input
                                type="text"
                                name="naf"
                                value={formData.naf}
                                onChange={handleChange}
                                placeholder="00/00000000/00"
                                className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 text-sm text-gray-900 placeholder:text-gray-300 font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                            />
                        </div>

                        {/* Login & Email */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">
                                <UserIcon size={12} /> Usuario (Login)
                            </label>
                            <input
                                type="text"
                                name="login"
                                value={formData.login}
                                onChange={handleChange}
                                required
                                disabled={isEditMode} // Usually login shouldn't change easily
                                title={isEditMode ? "El login no se puede cambiar" : ""}
                                placeholder="usuario123"
                                className={cn(
                                    "w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 text-sm text-gray-900 placeholder:text-gray-300 font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all",
                                    isEditMode && "bg-gray-50 text-gray-500"
                                )}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">
                                <Mail size={12} /> Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="juan@empresa.com"
                                className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 text-sm text-gray-900 placeholder:text-gray-300 font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                            />
                        </div>

                        {/* Phones */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">
                                    <Smartphone size={12} /> Móvil
                                </label>
                                <input
                                    type="tel"
                                    name="user_mobile"
                                    value={formData.user_mobile}
                                    onChange={handleChange}
                                    placeholder="600 000 000"
                                    className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 text-sm text-gray-900 placeholder:text-gray-300 font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">
                                    <Phone size={12} /> Fijo / Oficina
                                </label>
                                <input
                                    type="tel"
                                    name="office_phone"
                                    value={formData.office_phone}
                                    onChange={handleChange}
                                    placeholder="910 000 000"
                                    className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 text-sm text-gray-900 placeholder:text-gray-300 font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">
                                <Lock size={12} /> {isEditMode ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required={!isEditMode}
                                    placeholder={isEditMode ? "Dejar en blanco para no cambiar" : "••••••••"}
                                    className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 pr-12 text-sm text-gray-900 placeholder:text-gray-300 font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Admin Toggle */}
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between cursor-pointer" onClick={() => setFormData(prev => ({ ...prev, isAdmin: !prev.isAdmin }))}>
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-xl transition-colors", formData.isAdmin ? "bg-black text-white" : "bg-white text-gray-400 border border-gray-100")}>
                                    <Shield size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Permisos de Administrador</p>
                                    <p className="text-[10px] text-gray-500 font-medium">Acceso completo al sistema</p>
                                </div>
                            </div>
                            <div className={cn(
                                "w-6 h-6 rounded-full border flex items-center justify-center transition-all",
                                formData.isAdmin ? "bg-black border-black text-white" : "bg-white border-gray-300"
                            )}>
                                {formData.isAdmin && <Check size={14} strokeWidth={3} />}
                            </div>
                        </div>

                        {/* Geolocation Toggle */}
                        <div
                            className="p-4 rounded-2xl border flex items-center justify-between cursor-pointer bg-white transition-all duration-300"
                            style={{ borderColor: formData.requireGeolocation ? '#A7F2AC' : '#F07873' }}
                            onClick={() => setFormData(prev => ({ ...prev, requireGeolocation: !prev.requireGeolocation }))}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={cn("p-2 rounded-xl transition-colors")}
                                    style={{
                                        backgroundColor: formData.requireGeolocation ? '#A7F2AC20' : '#F0787320',
                                        color: formData.requireGeolocation ? '#2D6A4F' : '#9B2226'
                                    }}
                                >
                                    {formData.requireGeolocation ? <MapPin size={18} /> : <MapPinOff size={18} />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Requerir Geolocalización</p>
                                    <p className="text-[10px] text-gray-500 font-medium italic">Solicitar GPS al realizar fichajes</p>
                                </div>
                            </div>
                            <div
                                className="w-10 h-5 rounded-full relative transition-all duration-300"
                                style={{ backgroundColor: formData.requireGeolocation ? '#A7F2AC' : '#F07873' }}
                            >
                                <div className={cn(
                                    "absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 shadow-sm",
                                    formData.requireGeolocation ? "left-6" : "left-1"
                                )} />
                            </div>
                        </div>

                    </div>

                    {/* Actions */}
                    <div className="mt-8 flex gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 rounded-xl border border-gray-100 text-gray-500 text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] py-4 rounded-xl bg-black text-white text-xs font-black uppercase tracking-[0.15em] hover:opacity-90 shadow-lg shadow-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEditMode ? 'Guardar Cambios' : 'Crear Usuario')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
