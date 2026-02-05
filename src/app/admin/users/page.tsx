'use client';
import { useState, useEffect } from 'react';
import { DolibarrUser } from '@/lib/admin-types';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import Link from 'next/link';
import { Settings, Search, CirclePower, Coffee, LogOut, Users, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface UserWithStatus extends DolibarrUser {
    workStatus: 'working' | 'paused' | 'out';
    lastFichajeType?: string;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserWithStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchData = async () => {
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
                // API returns { success: true, fichajes: [...] }
                const fichajes = Array.isArray(fichajesData.fichajes) ? fichajesData.fichajes :
                    Array.isArray(fichajesData) ? fichajesData : [];

                console.log('Total fichajes:', fichajes.length);
                console.log('Sample fichaje:', fichajes[0]);

                // Group fichajes by user_id and get last fichaje for each
                const lastFichajeByUser = new Map<string, any>();

                fichajes.forEach((fichaje: any) => {
                    const userId = fichaje.fk_user?.toString();
                    if (!userId) {
                        console.log('Fichaje without user:', fichaje);
                        return;
                    }

                    const current = lastFichajeByUser.get(userId);
                    if (!current || new Date(fichaje.fecha_creacion) > new Date(current.fecha_creacion)) {
                        lastFichajeByUser.set(userId, fichaje);
                    }
                });

                console.log('Last fichajes by user:', Object.fromEntries(lastFichajeByUser));

                // Determine work status for each user
                const usersWithStatus: UserWithStatus[] = usersList.map(user => {
                    const lastFichaje = lastFichajeByUser.get(user.id);

                    let workStatus: 'working' | 'paused' | 'out' = 'out';
                    if (lastFichaje?.tipo === 'entrar' || lastFichaje?.tipo === 'finp') {
                        workStatus = 'working';
                    } else if (lastFichaje?.tipo === 'pausa') {
                        workStatus = 'paused';
                    }

                    console.log(`User ${user.login} (ID: ${user.id}):`, {
                        lastFichaje: lastFichaje?.tipo,
                        fecha: lastFichaje?.fecha_creacion,
                        workStatus
                    });

                    return {
                        ...user,
                        workStatus,
                        lastFichajeType: lastFichaje?.tipo
                    };
                });

                setUsers(usersWithStatus);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredUsers = users.filter(u =>
        u.login.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.firstname + ' ' + u.lastname).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex min-h-screen bg-[#FAFBFC]">
            <div className="hidden md:block"><Sidebar /></div>
            <main className="flex-1 ml-0 md:ml-64 p-6 md:p-12 pb-32">
                <PageHeader
                    title="Control de Empleados"
                    subtitle="Gestión de configuración y estado de trabajo"
                    icon={Users}
                    showBack
                    badge="Administración"
                />

                <div className="mb-8 relative group max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o usuario..."
                        className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all font-semibold text-gray-700 placeholder:text-gray-300 placeholder:font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredUsers.map(user => (
                            <Link
                                key={user.id}
                                href={`/admin/users/${user.id}`}
                                className="group relative block bg-white rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 transition-all duration-500 hover:shadow-[0_25px_50px_rgb(0,0,0,0.06)] hover:-translate-y-1.5 cursor-pointer"
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
                                            <h3 className="text-base font-bold text-[#121726] tracking-tight truncate group-hover:text-primary transition-colors">
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
                                                {user.active === '0' && (
                                                    <span className="text-[8px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full border border-red-100 font-bold leading-none">off</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-300 transition-all duration-500 group-hover:bg-primary group-hover:text-black group-hover:rotate-45">
                                        <ChevronRight size={16} />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
            <MobileNav />
        </div>
    );
}
