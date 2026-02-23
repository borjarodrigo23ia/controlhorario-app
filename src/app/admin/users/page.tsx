'use client';
import { useState, useEffect } from 'react';
import { DolibarrUser } from '@/lib/admin-types';
import Link from 'next/link';
import { Settings, Search, CirclePower, Coffee, LogOut, Users, ChevronRight, Plus, Shield, X, User, Loader2, UserRound } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import UserFormModal from '@/components/admin/UserFormModal';
import UserDetailView from '@/components/admin/users/UserDetailView';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

import { TriangleAlert } from 'lucide-react';

interface UserWithStatus extends DolibarrUser {
    workStatus: 'working' | 'paused' | 'out';
    lastFichajeType?: string;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserWithStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [missingDataCount, setMissingDataCount] = useState(0);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('dolibarr_token');

            // Fetch users
            const usersRes = await fetch('/api/users', {
                headers: { 'DOLAPIKEY': token || '' }
            });

            if (!usersRes.ok) {
                console.error('Error fetching users');
                setLoading(false);
                return;
            }

            const usersData = await usersRes.json();
            const usersList: DolibarrUser[] = Array.isArray(usersData) ? usersData : [];

            // Calculate missing data count
            const missingCount = usersList.filter((u) => {
                const isActive = u.statut === '1' || u.status === '1' || u.active === '1';
                if (!isActive) return false;
                const dni = u.array_options?.options_dni;
                const naf = u.array_options?.options_naf;
                return !dni || !naf;
            }).length;
            setMissingDataCount(missingCount);

            // Fetch all fichajes (admin sees all)
            const fichajesRes = await fetch('/api/fichajes', {
                headers: { 'DOLAPIKEY': token || '' }
            });

            if (!fichajesRes.ok) {
                console.error('Error fetching fichajes');
                // Still show users even if fichajes fail
                setUsers(usersList.map(u => ({ ...u, workStatus: 'out' as const })));
                setLoading(false);
                return;
            }

            const fichajesData = await fichajesRes.json();
            const fichajes = Array.isArray(fichajesData.fichajes) ? fichajesData.fichajes :
                Array.isArray(fichajesData) ? fichajesData : [];

            const lastFichajeByUser = new Map<string, any>();

            fichajes.forEach((fichaje: any) => {
                const userId = fichaje.fk_user?.toString();
                if (!userId) return;

                const current = lastFichajeByUser.get(userId);
                if (!current || new Date(fichaje.fecha_creacion) > new Date(current.fecha_creacion)) {
                    lastFichajeByUser.set(userId, fichaje);
                }
            });

            const usersWithStatus: UserWithStatus[] = usersList.map(user => {
                const lastFichaje = lastFichajeByUser.get(user.id);
                let workStatus: 'working' | 'paused' | 'out' = 'out';

                if (lastFichaje?.tipo === 'entrar' || lastFichaje?.tipo === 'finp') workStatus = 'working';
                else if (lastFichaje?.tipo === 'pausa') workStatus = 'paused';
                else if (lastFichaje?.tipo === 'salida') workStatus = 'out';

                return { ...user, workStatus, lastFichajeType: lastFichaje?.tipo };
            });

            setUsers(usersWithStatus);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredUsers = users.filter(u =>
        u.login.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.firstname + ' ' + u.lastname).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen">
            <PageHeader
                title="Control de Empleados"
                subtitle="Gestión de configuración y estado de trabajo"
                icon={Users}
                showBack
                backUrl="/admin"
                badge="Administración"
            />

            <div className="flex flex-col lg:flex-row gap-8 mt-10 relative">

                {/* LIST COLUMN */}
                <div className={cn(
                    "transition-all duration-500",
                    selectedUserId ? "lg:w-2/5 xl:w-1/3" : "w-full"
                )}>
                    {/* MOBILE HEADER (Old Layout) */}
                    <div className="lg:hidden">
                        <div className="mb-6">
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-2xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-gray-200"
                            >
                                <Plus size={18} strokeWidth={2.5} />
                                Crear Usuario
                            </button>
                        </div>

                        <div className="mb-8 relative group max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o usuario..."
                                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm focus:outline-none focus:ring-4 focus:ring-black/5 focus:border-black/10 transition-all font-semibold text-gray-700 placeholder:text-gray-300 placeholder:font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* DESKTOP HEADER (New Layout) */}
                    <div className="hidden lg:flex mb-8 flex-row items-center justify-start gap-4">
                        <div className="relative group w-full md:max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o usuario..."
                                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm focus:outline-none focus:ring-4 focus:ring-black/5 focus:border-black/10 transition-all font-semibold text-gray-700 placeholder:text-gray-300 placeholder:font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={() => setSelectedUserId('new')}
                            className="flex items-center gap-2 bg-black text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/20 active:scale-95 transition-all shrink-0"
                        >
                            <Plus size={18} strokeWidth={3} />
                            Añadir Empleado
                        </button>
                    </div>

                    {missingDataCount > 0 && !selectedUserId && (
                        <div className="mb-8 p-5 rounded-3xl bg-red-50 border border-red-100 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 animate-pulse">
                                <TriangleAlert size={22} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-red-900 uppercase tracking-wide">Faltan datos críticos</h3>
                                <p className="text-xs text-red-700 font-bold uppercase tracking-widest opacity-70 mt-0.5">DNI y NAF pendientes en {missingDataCount} usuarios</p>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="animate-spin text-black" size={32} />
                        </div>
                    ) : (
                        <div className={cn(
                            "grid gap-4",
                            selectedUserId ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                        )}>
                            {filteredUsers.map(user => (
                                <div key={user.id}>
                                    {/* MOBILE CARD (Old Design, Link Navigation) */}
                                    <div className="lg:hidden">
                                        <Link
                                            href={`/admin/users/${user.id}`}
                                            className="group relative block bg-white rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 transition-all duration-500 hover:shadow-[0_25px_50px_rgb(0,0,0,0.06)] hover:-translate-y-1.5 cursor-pointer mb-4"
                                        >
                                            {/* Decorative Glow */}
                                            <div className={cn(
                                                "absolute inset-x-6 top-6 -z-10 h-12 w-12 rounded-full blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-40",
                                                user.workStatus === 'working' ? 'bg-green-400/20' :
                                                    user.workStatus === 'paused' ? 'bg-yellow-400/20' :
                                                        'bg-gray-400/20'
                                            )} />

                                            <div className="relative flex items-center justify-between">
                                                <div className="flex items-center gap-4 overflow-hidden">
                                                    {/* Status Icon Wrapper */}
                                                    <div className={cn(
                                                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] transition-all duration-500 border group-hover:scale-110 group-hover:rotate-3 shadow-sm",
                                                        user.workStatus === 'working' ? 'bg-green-50 text-green-600 border-green-100 group-hover:bg-green-500 group-hover:text-black' :
                                                            user.workStatus === 'paused' ? 'bg-yellow-50 text-yellow-600 border-yellow-100 group-hover:bg-yellow-500 group-hover:text-black' :
                                                                'bg-gray-50 text-gray-400 border-gray-100 group-hover:bg-gray-500 group-hover:text-black'
                                                    )}>
                                                        {user.workStatus === 'working' ? <CirclePower size={20} strokeWidth={2.5} /> :
                                                            user.workStatus === 'paused' ? <Coffee size={20} strokeWidth={2.5} /> :
                                                                <LogOut size={20} strokeWidth={2.5} />}
                                                    </div>

                                                    <div className="overflow-hidden">
                                                        <h3 className="text-base font-bold text-[#121726] tracking-tight truncate group-hover:text-black transition-colors">
                                                            {user.firstname || user.login} {user.lastname}
                                                        </h3>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                                                {user.login}
                                                            </span>
                                                            <span className={cn(
                                                                "text-[8px] font-bold px-1.5 py-0.5 rounded-full border leading-none",
                                                                user.workStatus === 'working' ? 'bg-green-50 text-green-600 border-green-100' :
                                                                    user.workStatus === 'paused' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                                                        'bg-gray-50 text-gray-500 border-gray-200'
                                                            )}>
                                                                {user.workStatus === 'working' ? 'trabajando' :
                                                                    user.workStatus === 'paused' ? 'en pausa' :
                                                                        'desconectado'}
                                                            </span>
                                                            {user.admin === '1' && (
                                                                <span className="text-[8px] bg-black text-white px-1.5 py-0.5 rounded-full border border-black font-bold leading-none flex items-center gap-1">
                                                                    <Shield size={8} className="fill-current" /> ADMIN
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-300 transition-all duration-500 group-hover:bg-black group-hover:text-white group-hover:rotate-45">
                                                    <ChevronRight size={16} />
                                                </div>
                                            </div>
                                        </Link>
                                    </div>

                                    {/* DESKTOP CARD (New Design, Split View) */}
                                    <div className="hidden lg:block h-full">
                                        <div
                                            onClick={() => setSelectedUserId(user.id)}
                                            className={cn(
                                                "group relative bg-white rounded-[2rem] border border-gray-100 p-6 transition-all duration-500 cursor-pointer overflow-hidden h-full",
                                                selectedUserId === user.id ? "bg-white border-2 border-black shadow-sm" : "shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-xl hover:-translate-y-1"
                                            )}
                                        >
                                            <div className="relative flex items-center justify-between">
                                                <div className="flex items-center gap-4 overflow-hidden">
                                                    <div className={cn(
                                                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-500 border group-hover:rotate-3 shadow-sm",
                                                        selectedUserId === user.id
                                                            ? 'bg-gray-200 text-black border-gray-300'
                                                            : 'bg-gray-50 text-gray-400 border-gray-100'
                                                    )}>
                                                        <UserRound size={20} strokeWidth={2.5} />
                                                    </div>

                                                    <div className="overflow-hidden">
                                                        <h3 className="text-sm font-black text-gray-900 tracking-tight truncate">
                                                            {user.firstname || user.login} {user.lastname}
                                                        </h3>
                                                        <div className="flex items-center gap-2 flex-wrap mt-1">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">
                                                                {user.login}
                                                            </span>
                                                            <span className={cn(
                                                                "text-[8px] font-black px-2 py-0.5 rounded-full border leading-none uppercase tracking-widest",
                                                                user.workStatus === 'working' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                    user.workStatus === 'paused' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                        'bg-gray-50 text-gray-500 border-gray-200'
                                                            )}>
                                                                {user.workStatus === 'working' ? 'trabajando' :
                                                                    user.workStatus === 'paused' ? 'en pausa' :
                                                                        'inactivo'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className={cn(
                                                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-500",
                                                    selectedUserId === user.id ? "bg-black text-white" : "bg-gray-50 text-gray-300 group-hover:bg-black group-hover:text-white group-hover:rotate-45"
                                                )}>
                                                    <ChevronRight size={18} strokeWidth={3} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* DETAIL PANEL (Desktop) */}
                {selectedUserId && (
                    <div className="hidden lg:block lg:flex-1 lg:sticky lg:top-24 lg:h-[calc(100vh-10rem)] animate-in slide-in-from-right-8 duration-500">
                        <UserDetailView
                            userId={selectedUserId}
                            onClose={() => setSelectedUserId(null)}
                            onSuccess={fetchData}
                        />
                    </div>
                )}

                {/* DETAIL OVERLAY (Mobile/Tablet) */}
                {selectedUserId && (
                    <div className="lg:hidden fixed inset-0 z-[100] bg-white animate-in slide-in-from-bottom duration-500 overflow-y-auto">
                        <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex items-center justify-between z-10">
                            <h2 className="text-sm font-black uppercase tracking-widest">Detalle Empleado</h2>
                            <button
                                onClick={() => setSelectedUserId(null)}
                                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 h-[calc(100vh-4rem)]">
                            <UserDetailView userId={selectedUserId} />
                        </div>
                    </div>
                )}
            </div>

            <UserFormModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={fetchData}
                initialData={null}
            />
        </div>
    );
}
