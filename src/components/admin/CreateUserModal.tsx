'use client';

import { useState } from 'react';
import { X, User, Mail, Lock, Shield, Check, Loader2, Fingerprint } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils'; // Assuming cn utility exists, based on other files

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export default function CreateUserModal({ isOpen, onClose, onCreated }: CreateUserModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstname: '',
        lastname: '',
        login: '',
        email: '',
        password: '',
        dni: '',
        isAdmin: false
    });

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
            const res = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'DOLAPIKEY': token || ''
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Error al crear usuario');
            }

            toast.success('Usuario creado exitosamente');
            onCreated();
            onClose();
            // Reset form
            setFormData({
                firstname: '',
                lastname: '',
                login: '',
                email: '',
                password: '',
                dni: '',
                isAdmin: false
            });

        } catch (error: any) {
            console.error('Error creating user:', error);
            toast.error(error.message || 'Error desconocido al crear usuario');
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
            <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 md:p-8 md:pb-4 flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-black/5 rounded-2xl">
                            <User size={24} className="text-black" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">
                                Crear Nuevo Usuario
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
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">DNI / NIE</label>
                            <input
                                type="text"
                                name="dni"
                                value={formData.dni}
                                onChange={handleChange}
                                placeholder="12345678X"
                                className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 text-sm text-gray-900 placeholder:text-gray-300 font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                            />
                        </div>

                        {/* Login & Email */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">
                                <Fingerprint size={12} /> Usuario (Login)
                            </label>
                            <input
                                type="text"
                                name="login"
                                value={formData.login}
                                onChange={handleChange}
                                required
                                placeholder="usuario123"
                                className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 text-sm text-gray-900 placeholder:text-gray-300 font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
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

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">
                                <Lock size={12} /> Contraseña
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="••••••••"
                                className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 text-sm text-gray-900 placeholder:text-gray-300 font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                            />
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

                    </div>

                    {/* Actions */}
                    <div className="mt-8 flex gap-3">
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
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear Usuario"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
