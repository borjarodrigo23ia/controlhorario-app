import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useVacations, VacationRequest } from '@/hooks/useVacations';
import { Search, Calendar, CheckCircle, XCircle, Clock, AlertCircle, Palmtree, HeartPulse, ContactRound, User, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminVacationDashboard() {
    const { fetchVacations, approveVacation, rejectVacation } = useVacations();
    const [requests, setRequests] = useState<VacationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('pendiente');
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination & Expansion State
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
    const itemsPerPage = 10;
    const listRef = useRef<HTMLDivElement>(null);

    const loadRequests = async () => {
        setLoading(true);
        const data = await fetchVacations();
        setRequests(data);
        setLoading(false);
    };

    useEffect(() => {
        loadRequests();
    }, []);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterStatus, searchTerm]);

    const handleApprove = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (confirm('¿Aprobar solicitud?')) {
            const result = await approveVacation(id, 'Aprobado por administrador');
            if (result.success) loadRequests();
        }
    };

    const handleReject = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        const reason = prompt('Motivo del rechazo:');
        if (reason !== null) {
            const result = await rejectVacation(id, reason);
            if (result.success) loadRequests();
        }
    };

    const toggleExpand = (id: number) => {
        const newExpanded = new Set(expandedCards);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedCards(newExpanded);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    const statusOptions = [
        { id: 'pendiente', label: 'Pendientes' },
        { id: 'aprobado', label: 'Aprobados' },
        { id: 'rechazado', label: 'Rechazados' },
        { id: 'all', label: 'Todos' }
    ];

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            const matchesStatus = filterStatus === 'all' || req.estado === filterStatus;
            const matchesSearch = req.usuario.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesStatus && matchesSearch;
        });
    }, [requests, filterStatus, searchTerm]);

    // Pagination Logic
    const { paginatedRequests, totalPages } = useMemo(() => {
        const totalItems = filteredRequests.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const pageRequests = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

        return {
            paginatedRequests: pageRequests,
            totalPages
        };
    }, [filteredRequests, currentPage]);

    const getTypeColor = (tipo: string) => {
        switch (tipo) {
            case 'enfermedad': return 'text-zinc-900 bg-[#EA9EFF]';
            case 'asuntos_propios': return 'text-zinc-900 bg-[#FFCE8A]';
            default: return 'text-zinc-900 bg-[#9EE8FF]';
        }
    };

    const getTypeLabel = (tipo: string) => {
        switch (tipo) {
            case 'enfermedad': return 'Baja / Enfermedad';
            case 'asuntos_propios': return 'Días Propios';
            default: return 'Vacaciones';
        }
    };

    const scrollToList = () => {
        if (listRef.current) {
            const yOffset = -120;
            const element = listRef.current;
            const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    const renderPagination = () => {
        if (requests.length === 0 && !loading) return null;
        if (filteredRequests.length === 0) return null;

        const maxVisiblePages = 5;
        const displayTotalPages = Math.max(2, totalPages);

        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = startPage + maxVisiblePages - 1;

        if (endPage > displayTotalPages) {
            endPage = displayTotalPages;
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        const pages = [];
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return (
            <div className="w-full pt-6 mt-6 border-t border-gray-100/80 dark:border-zinc-800">
                <div className="flex items-center justify-between w-full max-w-lg mx-auto text-gray-500 font-medium p-2 transition-all duration-300">
                    <button
                        type="button"
                        onClick={() => {
                            if (currentPage > 1) {
                                setCurrentPage(p => p - 1);
                                scrollToList();
                            }
                        }}
                        disabled={currentPage === 1}
                        className="rounded-full bg-slate-200/50 hover:bg-slate-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.499 12.85a.9.9 0 0 1 .57.205l.067.06a.9.9 0 0 1 .06 1.206l-.06.066-5.585 5.586-.028.027.028.027 5.585 5.587a.9.9 0 0 1 .06 1.207l-.06.066a.9.9 0 0 1-1.207.06l-.066-.06-6.25-6.25a1 1 0 0 1-.158-.212l-.038-.08a.9.9 0 0 1-.03-.606l.03-.083a1 1 0 0 1 .137-.226l.06-.066 6.25-6.25a.9.9 0 0 1 .635-.263Z" fill="#475569" stroke="#475569" strokeWidth=".078" />
                        </svg>
                    </button>

                    <div className="flex items-center gap-2 text-sm font-medium">
                        {pages.map(page => (
                            <button
                                key={page}
                                onClick={() => {
                                    setCurrentPage(page);
                                    scrollToList();
                                }}
                                className={cn(
                                    "h-10 w-10 flex items-center justify-center aspect-square transition-all duration-500",
                                    currentPage === page
                                        ? "text-indigo-600 bg-white/30 backdrop-blur-xl border border-white/50 shadow-[0_8px_20px_0_rgba(99,102,241,0.2)] rounded-full scale-125 font-bold z-10 dark:bg-indigo-900/30 dark:border-indigo-500/30 dark:text-indigo-300"
                                        : "text-gray-500 hover:bg-white/20 dark:text-gray-400"
                                )}
                            >
                                {page}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            if (currentPage < displayTotalPages) {
                                setCurrentPage(p => p + 1);
                                scrollToList();
                            }
                        }}
                        disabled={currentPage >= displayTotalPages}
                        className="rounded-full bg-slate-200/50 hover:bg-slate-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <svg className="rotate-180" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.499 12.85a.9.9 0 0 1 .57.205l.067.06a.9.9 0 0 1 .06 1.206l-.06.066-5.585 5.586-.028.027.028.027 5.585 5.587a.9.9 0 0 1 .06 1.207l-.06.066a.9.9 0 0 1-1.207.06l-.066-.06-6.25-6.25a1 1 0 0 1-.158-.212l-.038-.08a.9.9 0 0 1-.03-.606l.03-.083a1 1 0 0 1 .137-.226l.06-.066 6.25-6.25a.9.9 0 0 1 .635-.263Z" fill="#475569" stroke="#475569" strokeWidth=".078" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6" ref={listRef}>
            {/* Filters & Search */}
            <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm">
                <div className="w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 scrollbar-hide">
                    <div className="flex bg-gray-100/50 dark:bg-zinc-800 p-1.5 rounded-2xl min-w-max">
                        {statusOptions.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setFilterStatus(opt.id)}
                                className={`
                                    px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 whitespace-nowrap
                                    ${filterStatus === opt.id
                                        ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-black/5'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50'
                                    }
                                `}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="relative w-full xl:w-72">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por empleado..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border-transparent focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/20 outline-none transition-all font-medium text-sm"
                    />
                </div>
            </div>

            {/* Requests Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full py-20 text-center">
                        <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-400 font-medium">Cargando solicitudes...</p>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-gray-200 dark:border-zinc-800">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <Calendar size={32} />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No se encontraron solicitudes</p>
                    </div>
                ) : (
                    paginatedRequests.map((req) => {
                        const isExpanded = expandedCards.has(req.rowid);

                        const typeGlowColors = {
                            enfermedad: '#d946ef', // Fuchsia 500
                            asuntos_propios: '#f59e0b', // Amber 500
                            vacaciones: '#0ea5e9' // Sky 500
                        };
                        const glowColor = typeGlowColors[req.tipo as keyof typeof typeGlowColors] || '#0ea5e9';

                        return (
                            <div
                                key={req.rowid}
                                onClick={() => toggleExpand(req.rowid)}
                                className={`
                                    group relative overflow-hidden bg-white dark:bg-zinc-900 rounded-3xl p-6 border transition-all duration-300 flex flex-col cursor-pointer
                                    ${req.estado === 'pendiente'
                                        ? 'border-indigo-100 dark:border-indigo-900/20 shadow-lg shadow-indigo-500/5 hover:shadow-indigo-500/10'
                                        : 'border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-md'
                                    }
                                    ${isExpanded ? 'scale-[1.01] ring-1 ring-indigo-500/10' : ''}
                                `}
                            >
                                {/* Glow Effect based on Type - Only visible when collapsed */}
                                <div
                                    className={`absolute -bottom-6 -right-6 w-24 h-24 blur-2xl rounded-full pointer-events-none z-0 transition-opacity duration-300 ${isExpanded ? 'opacity-0' : 'opacity-90 group-hover:opacity-100'}`}
                                    style={{
                                        background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`
                                    }}
                                />
                                {/* Header - Always Visible */}
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`
                                            w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-bold
                                            ${req.estado === 'pendiente' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-400'}
                                        `}>
                                            {req.usuario.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white leading-tight">
                                                {req.usuario}
                                            </h4>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                Solicitado: {formatDate(req.fecha_creacion.split(' ')[0])}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {req.estado === 'pendiente' && !isExpanded && (
                                            <span className="flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-indigo-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                                            </span>
                                        )}
                                        <div className={`p-1 rounded-full transition-transform duration-300 ${isExpanded ? 'bg-gray-100 rotate-180' : ''}`}>
                                            <ChevronDown size={18} className="text-gray-400" />
                                        </div>
                                    </div>
                                </div>

                                {/* Collapsible Content */}
                                <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}>
                                    <div className="overflow-hidden">
                                        <div className="space-y-4">
                                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${getTypeColor(req.tipo)}`}>
                                                <Palmtree size={12} />
                                                {getTypeLabel(req.tipo)}
                                            </div>

                                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-gray-100 dark:border-zinc-800/50">
                                                <div className="flex-1 text-center border-r border-gray-200 dark:border-zinc-700/50 pr-2">
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Desde</div>
                                                    <div className="font-bold text-gray-900 dark:text-white text-sm">{formatDate(req.fecha_inicio)}</div>
                                                </div>
                                                <div className="flex-1 text-center pl-2">
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Hasta</div>
                                                    <div className="font-bold text-gray-900 dark:text-white text-sm">{formatDate(req.fecha_fin)}</div>
                                                </div>
                                            </div>

                                            {req.comentarios && (
                                                <div className="space-y-2">
                                                    {req.comentarios.split('\n').filter(Boolean).map((comment, idx) => {
                                                        const isAdmin = comment.toLowerCase().trim().startsWith('- administrador:');
                                                        let text = comment.replace(/^- administrador:\s*/i, '').trim();

                                                        // Clean up redundant/auto-generated admin messages
                                                        if (isAdmin) {
                                                            if (text.includes('Aprobado por administrador') || text.includes('Aprobado por admin')) {
                                                                text = 'Solicitud aprobada';
                                                            } else if (text.includes('Rechazado por administrador') || text.includes('Rechazado por admin')) {
                                                                const reason = text.split(':')[1];
                                                                text = reason ? `Solicitud rechazada: ${reason.trim()}` : 'Solicitud rechazada';
                                                            }
                                                        }

                                                        return (
                                                            <div key={idx} className={`px-4 py-3 rounded-xl border text-sm ${isAdmin
                                                                ? 'bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 font-medium'
                                                                : 'bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/20 text-yellow-700 dark:text-yellow-500 italic'
                                                                }`}>
                                                                {isAdmin && <span className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-bold">Respuesta Administrador</span>}
                                                                <p>{text}</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Actions within expandable area */}
                                            <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
                                                {req.estado === 'pendiente' ? (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <button
                                                            onClick={(e) => handleReject(e, req.rowid)}
                                                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                                                        >
                                                            RECHAZAR
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleApprove(e, req.rowid)}
                                                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gray-900 hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-200 transition-colors shadow-lg shadow-gray-900/10"
                                                        >
                                                            APROBAR
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className={`w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold ${req.estado === 'aprobado'
                                                        ? 'bg-green-50 text-green-600 dark:bg-green-900/10 dark:text-green-400'
                                                        : 'bg-red-50 text-red-600 dark:bg-red-900/10 dark:text-red-400'
                                                        }`}>
                                                        {req.estado === 'aprobado' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                                        {req.estado === 'aprobado' ? 'SOLICITUD APROBADA' : 'SOLICITUD RECHAZADA'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {renderPagination()}
        </div>
    );
}
