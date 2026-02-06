import React, { useEffect, useState } from 'react';
import { useVacations, VacationRequest } from '@/hooks/useVacations';
import { Search, Calendar, CheckCircle, XCircle, Clock, AlertCircle, Palmtree, HeartPulse, ContactRound, User, Check, X } from 'lucide-react';

export default function AdminVacationDashboard() {
    const { fetchVacations, approveVacation, rejectVacation } = useVacations();
    const [requests, setRequests] = useState<VacationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('pendiente');
    const [searchTerm, setSearchTerm] = useState('');

    const loadRequests = async () => {
        setLoading(true);
        // Fetch all (or filter by backend if needed, for now client filter is easier for small dataset)
        const data = await fetchVacations();
        setRequests(data);
        setLoading(false);
    };

    useEffect(() => {
        loadRequests();
    }, []);

    const handleApprove = async (id: number) => {
        if (confirm('¿Aprobar solicitud?')) {
            const result = await approveVacation(id, 'Aprobado por administrador');
            if (result.success) loadRequests();
        }
    };

    const handleReject = async (id: number) => {
        const reason = prompt('Motivo del rechazo:');
        if (reason !== null) {
            const result = await rejectVacation(id, reason);
            if (result.success) loadRequests();
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    const filteredRequests = requests.filter(req => {
        const matchesStatus = filterStatus === 'all' || req.estado === filterStatus;
        const matchesSearch = req.usuario.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const getTypeBadge = (tipo: string) => {
        switch (tipo) {
            case 'enfermedad':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400">
                        <HeartPulse size={14} />
                        Enfermedad
                    </span>
                );
            case 'asuntos_propios':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400">
                        <ContactRound size={14} />
                        Asuntos Propios
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400">
                        <Palmtree size={14} />
                        Vacaciones
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm">
                <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl w-full md:w-auto">
                    <button
                        onClick={() => setFilterStatus('pendiente')}
                        className={`px - 4 py - 2 rounded - lg text - sm font - medium transition - all ${filterStatus === 'pendiente'
                            ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm'
                            : 'text-gray-500 hover:text-black dark:hover:text-white'
                            } `}
                    >
                        Pendientes
                    </button>
                    <button
                        onClick={() => setFilterStatus('aprobado')}
                        className={`px - 4 py - 2 rounded - lg text - sm font - medium transition - all ${filterStatus === 'aprobado'
                            ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm'
                            : 'text-gray-500 hover:text-black dark:hover:text-white'
                            } `}
                    >
                        Aprobados
                    </button>
                    <button
                        onClick={() => setFilterStatus('rechazado')}
                        className={`px - 4 py - 2 rounded - lg text - sm font - medium transition - all ${filterStatus === 'rechazado'
                            ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm'
                            : 'text-gray-500 hover:text-black dark:hover:text-white'
                            } `}
                    >
                        Rechazados
                    </button>
                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`px - 4 py - 2 rounded - lg text - sm font - medium transition - all ${filterStatus === 'all'
                            ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm'
                            : 'text-gray-500 hover:text-black dark:hover:text-white'
                            } `}
                    >
                        Todos
                    </button>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar usuario..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-transparent focus:bg-white dark:focus:bg-black focus:border-primary outline-none transition-all"
                    />
                </div>
            </div>

            {/* List */}
            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center py-10 text-gray-400">Cargando solicitudes...</div>
                ) : filteredRequests.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800">
                        No se encontraron solicitudes
                    </div>
                ) : (
                    filteredRequests.map((req) => (
                        <div
                            key={req.rowid}
                            className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row justify-between gap-6"
                        >
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">
                                            {req.usuario}
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Solicitado el {formatDate(req.fecha_creacion.split(' ')[0])}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-sm flex-wrap">
                                    {getTypeBadge(req.tipo)}
                                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-zinc-800">
                                        <Calendar size={16} className="text-gray-400" />
                                        <span className="font-medium">{formatDate(req.fecha_inicio)}</span>
                                        <span className="text-gray-300">➜</span>
                                        <span className="font-medium">{formatDate(req.fecha_fin)}</span>
                                    </div>
                                </div>

                                {req.comentarios && (
                                    <div className="bg-gray-50 dark:bg-zinc-800/30 p-3 rounded-xl text-sm italic text-gray-600 dark:text-gray-300">
                                        "{req.comentarios}"
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-3 justify-center min-w-[150px]">
                                {req.estado === 'pendiente' ? (
                                    <>
                                        <button
                                            onClick={() => handleApprove(req.rowid)}
                                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:opacity-90 transition-all active:scale-95"
                                        >
                                            <Check size={16} />
                                            Aprobar
                                        </button>
                                        <button
                                            onClick={() => handleReject(req.rowid)}
                                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-xl font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/20 transition-all active:scale-95"
                                        >
                                            <X size={16} />
                                            Rechazar
                                        </button>
                                    </>
                                ) : (
                                    <div className={`text - center py - 2 rounded - xl font - bold text - sm ${req.estado === 'aprobado'
                                        ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                                        : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                                        } `}>
                                        {req.estado === 'aprobado' ? 'Aprobada' : 'Rechazada'}
                                    </div>
                                )}

                                {req.aprobado_por && (
                                    <p className="text-xs text-center text-gray-400">
                                        por {req.aprobado_por}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
