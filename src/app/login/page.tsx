'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth';
import { Loader2, Eye, EyeOff, Info, X } from 'lucide-react';
import LoginInstallPrompt from '@/components/pwa/LoginInstallPrompt';
import CompanyLogo from '@/components/ui/CompanyLogo';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [state, setState] = useState<"login" | "register">("login");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showForgotModal, setShowForgotModal] = useState(false);

    const [centers, setCenters] = useState<{ rowid: number, label: string }[]>([]);

    const [formData, setFormData] = useState({
        firstname: '',
        lastname: '',
        login: '',
        email: '',
        password: '',
        dni: '',
        user_mobile: '',
        center_ids: [] as number[]
    });

    React.useEffect(() => {
        if (state === "register") {
            fetch('/api/centers')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setCenters(data);
                    }
                })
                .catch(err => console.error("Error loading centers", err));
        }
    }, [state]);

    const handleCenterToggle = (centerId: number) => {
        setFormData(prev => {
            const current = prev.center_ids;
            if (current.includes(centerId)) {
                return { ...prev, center_ids: current.filter(id => id !== centerId) };
            } else {
                return { ...prev, center_ids: [...current, centerId] };
            }
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        const target = e.target;
        // Pequeño delay para permitir que el teclado virtual se abra
        setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Forzar cierre del teclado móvil
        (document.activeElement as HTMLElement)?.blur();

        setError(null);
        setSuccess(null);

        setLoading(true);

        try {
            if (state === "register") {
                // Registration Logic
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        firstname: formData.firstname,
                        lastname: formData.lastname,
                        login: formData.login,
                        email: formData.email,
                        password: formData.password,
                        dni: formData.dni,
                        user_mobile: formData.user_mobile,
                        center_ids: formData.center_ids
                    })
                });

                const data = await res.json();

                if (res.ok && data.success) {
                    setSuccess("Cuenta creada exitosamente. Iniciando sesión...");

                    // Auto login using context
                    const loginRes = await login(formData.login, formData.password);
                    if (loginRes.success) {
                        router.push('/verify-connection');
                    } else {
                        setState("login");
                        setSuccess("Cuenta creada. Por favor inicia sesión.");
                        setFormData(prev => ({ ...prev, password: '' }));
                    }
                } else {
                    setError(data.message || "Error al crear la cuenta");
                }

            } else {
                // Login Logic
                const response = await login(formData.login, formData.password);

                if (response.success) {
                    router.push('/verify-connection');
                } else {
                    setError(response.message || 'Credenciales inválidas');
                }
            }
        } catch (err: any) {
            console.error(err);
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    }

    return (

        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-zinc-950 font-sans p-4">
            <div className="w-full max-w-[400px] bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8 pb-6">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-48 h-48 relative mb-4">
                            {/* Placeholder for user-provided logo */}
                            {/* Dynamic Company Logo */}
                            <CompanyLogo
                                alt="Logo App"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                            {state === "login" ? "Bienvenido de nuevo" : "Crear cuenta"}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
                            {state === "login"
                                ? "Ingresa tus credenciales para acceder"
                                : "Rellena los datos para registrarte"}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 text-red-500 text-sm border border-red-100 dark:bg-red-900/10 dark:border-red-900/20">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="p-3 rounded-lg bg-green-50 text-green-500 text-sm border border-green-100 dark:bg-green-900/10 dark:border-green-900/20">
                                {success}
                            </div>
                        )}

                        {state === "register" && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider ml-1">Nombre</label>
                                    <input
                                        type="text"
                                        name="firstname"
                                        placeholder="Ej. Juan"
                                        className="w-full h-11 px-4 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white/20 transition-all text-sm"
                                        value={formData.firstname}
                                        onChange={handleChange}
                                        onFocus={handleFocus}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider ml-1">Apellidos</label>
                                    <input
                                        type="text"
                                        name="lastname"
                                        placeholder="Ej. Pérez"
                                        className="w-full h-11 px-4 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white/20 transition-all text-sm"
                                        value={formData.lastname}
                                        onChange={handleChange}
                                        onFocus={handleFocus}
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {state === "register" && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider ml-1">DNI / NIE *</label>
                                    <input
                                        type="text"
                                        name="dni"
                                        placeholder="12345678X"
                                        className="w-full h-11 px-4 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white/20 transition-all text-sm"
                                        value={formData.dni}
                                        onChange={handleChange}
                                        onFocus={handleFocus}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider ml-1">Móvil *</label>
                                    <input
                                        type="tel"
                                        name="user_mobile"
                                        placeholder="600123456"
                                        className="w-full h-11 px-4 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white/20 transition-all text-sm"
                                        value={formData.user_mobile}
                                        onChange={handleChange}
                                        onFocus={handleFocus}
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {state === "register" && (
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider ml-1">Email (Opcional)</label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="correo@ejemplo.com"
                                    className="w-full h-11 px-4 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white/20 transition-all text-sm"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onFocus={handleFocus}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider ml-1">Usuario</label>
                            <input
                                type="text"
                                name="login"
                                placeholder="Tu nombre de usuario"
                                className="w-full h-11 px-4 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white/20 transition-all text-sm"
                                value={formData.login}
                                onChange={handleChange}
                                onFocus={handleFocus}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider ml-1">Contraseña</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    placeholder="••••••••"
                                    className="w-full h-11 px-4 pr-12 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white/20 transition-all text-sm"
                                    value={formData.password}
                                    onChange={handleChange}
                                    onFocus={handleFocus}
                                    autoComplete="new-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-0 top-0 h-full px-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {state === "register" && centers.length > 0 && (
                            <div className="space-y-3 pt-2">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider ml-1">
                                    Centros de trabajo
                                </label>
                                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                                    {centers.map(center => (
                                        <div
                                            key={center.rowid}
                                            onClick={() => handleCenterToggle(center.rowid)}
                                            className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${formData.center_ids.includes(center.rowid)
                                                ? 'bg-black/5 border-black/20 dark:bg-white/10 dark:border-white/20'
                                                : 'bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center mr-3 transition-colors ${formData.center_ids.includes(center.rowid)
                                                ? 'bg-black dark:bg-white border-black dark:border-white'
                                                : 'border-gray-300 bg-white dark:bg-zinc-900 dark:border-zinc-600'
                                                }`}>
                                                {formData.center_ids.includes(center.rowid) && (
                                                    <svg className="w-3.5 h-3.5 text-white dark:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                {center.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {state === "login" && (
                            <div className="flex justify-end pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowForgotModal(true)}
                                    className="text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 mt-6 rounded-xl bg-black dark:bg-white text-white dark:text-black font-medium text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {state === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
                        </button>
                    </form>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 border-t border-gray-100 dark:border-zinc-800 text-center">
                    <p className="text-sm text-gray-500">
                        {state === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}
                        <button
                            type="button"
                            onClick={() => { setState(prev => prev === "login" ? "register" : "login"); setError(null); setSuccess(null); }}
                            className="ml-1.5 font-medium text-black dark:text-white hover:underline transition-all"
                        >
                            {state === "login" ? "Regístrate" : "Inicia sesión"}
                        </button>
                    </p>
                </div>
            </div >

            {/* Background Details */}
            < div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" >
                <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-gray-200/50 dark:bg-zinc-800/20 blur-[100px]" />
                <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] rounded-full bg-gray-200/50 dark:bg-zinc-800/20 blur-[100px]" />
            </div >

            <LoginInstallPrompt />

            {/* Forgot Password Modal */}
            {
                showForgotModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
                        <div
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setShowForgotModal(false)}
                        />
                        <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl p-8 text-center animate-slide-up overflow-hidden group">
                            <button
                                onClick={() => setShowForgotModal(false)}
                                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="w-16 h-16 bg-black/[0.03] dark:bg-white/[0.05] rounded-2xl flex items-center justify-center mx-auto mb-6 text-black dark:text-white">
                                <Info size={32} strokeWidth={1.5} />
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                ¿Necesitas ayuda?
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-8">
                                Para resetear tu contraseña, por favor <span className="font-bold text-black dark:text-white">contacta con tu administrador</span> o responsable de personal. Ellos podrán generarte una nueva clave de acceso.
                            </p>

                            <button
                                onClick={() => setShowForgotModal(false)}
                                className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm tracking-tight hover:opacity-90 active:scale-[0.98] transition-all"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
