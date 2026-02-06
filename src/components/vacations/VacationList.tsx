import React, { useEffect, useState, useMemo } from 'react';
import { useVacations, VacationRequest } from '@/hooks/useVacations';
import { CalendarCheck, CalendarX, Clock, Trash2, Palmtree, HeartPulse, ContactRound, Filter, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { cn } from '@/lib/utils';

interface VacationListProps {
    refreshTrigger: number;
}

export default function VacationList({ refreshTrigger }: VacationListProps) {
    const { fetchVacations, deleteVacation } = useVacations();
    const [vacations, setVacations] = useState<VacationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 7;

    const loadVacations = async () => {
        setLoading(true);
        const data = await fetchVacations();
        setVacations(data);
        setLoading(false);
    };

    useEffect(() => {
        loadVacations();
    }, [refreshTrigger]);

    const toggleExpand = (id: number) => {
        const newExpanded = new Set(expandedCards);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedCards(newExpanded);
    };

    // Get unique years from vacations
    const availableYears = useMemo(() => {
        const years = new Set<string>();
        vacations.forEach(v => {
            const year = v.fecha_inicio.split('-')[0];
            years.add(year);
        });
        return Array.from(years).sort().reverse();
    }, [vacations]);

    // Count requests per year
    const yearCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        vacations.forEach(v => {
            const year = v.fecha_inicio.split('-')[0];
            counts[year] = (counts[year] || 0) + 1;
        });
        return counts;
    }, [vacations]);

    const yearOptions = useMemo(() => {
        const options = [{ id: 'all', label: 'Todos los años' }];
        availableYears.forEach(year => {
            options.push({
                id: year,
                label: `${year} (${yearCounts[year]} solicitud${yearCounts[year] !== 1 ? 'es' : ''})`
            });
        });
        return options;
    }, [availableYears, yearCounts]);

    // Filter vacations by selected year
    const filteredVacations = useMemo(() => {
        let filtered = vacations;
        if (selectedYear !== 'all') {
            filtered = vacations.filter(v => v.fecha_inicio.startsWith(selectedYear));
        }
        return filtered;
    }, [vacations, selectedYear]);

    // Pagination logic
    const { paginatedVacations, totalPages } = useMemo(() => {
        const totalItems = filteredVacations.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const pageVacations = filteredVacations.slice(startIndex, startIndex + itemsPerPage);

        return {
            paginatedVacations: pageVacations,
            totalPages
        };
    }, [filteredVacations, currentPage]);

    // Reset page when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedYear]);

    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (confirm('¿Estás seguro de que quieres eliminar esta solicitud?')) {
            const result = await deleteVacation(id);
            if (result.success) {
                loadVacations();
            }
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'aprobado':
                return <CalendarCheck size={18} className="text-[#00D16B]" />;
            case 'rechazado':
                return <CalendarX size={18} className="text-[#EF4444]" />;
            default:
                return <Clock size={18} className="text-[#F59E0B]" />;
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    const getTypeBadge = (tipo: string) => {
        switch (tipo) {
            case 'enfermedad':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-100">
                        <HeartPulse size={14} />
                        Enfermedad
                    </span>
                );
            case 'asuntos_propios':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-600 border border-purple-100">
                        <ContactRound size={14} />
                        Asuntos Propios
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
                        <Palmtree size={14} />
                        Vacaciones
                    </span>
                );
        }
    };

    const formatCommentContent = (comments: string) => {
        const parts = comments.split('\n')
            .map(p => p.trim())
            .filter(p => p.length > 0);

        return parts.map((part, index) => {
            const isAdmin = part.toLowerCase().includes('- administrador:');
            const isUser = part.toLowerCase().includes('- usuario:');

            let text = part;
            if (isAdmin) {
                text = part.replace(/- administrador:/i, '').trim();
            } else if (isUser) {
                text = part.replace(/- usuario:/i, '').trim();
            }

            return (
                <div key={index} className="space-y-1">
                    {index > 0 && <div className="h-px bg-gray-100 my-2" />}
                    <div className="flex gap-2">
                        <span className="text-[10px] font-bold text-gray-400 mt-1 min-w-[55px]">
                            {isAdmin ? 'ADMIN:' : 'USER:'}
                        </span>
                        <p className={`text-sm leading-relaxed flex-1 ${isAdmin ? 'text-blue-900 font-bold' : 'text-gray-600 italic'}`}>
                            {text.trim()}
                        </p>
                    </div>
                </div>
            );
        });
    };

    // Pagination Controls Component
    const renderPagination = () => {
        if (filteredVacations.length === 0 && !loading) return null;

        const maxVisiblePages = 5;
        // Force at least 2 pages even if data fits in 1 to match history logic
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
            <div className="fixed bottom-0 left-0 right-0 md:left-64 p-4 md:p-6 z-[60] mb-[74px] md:mb-0 pointer-events-none">
                <div className="flex items-center justify-between w-full max-w-lg mx-auto text-gray-500 font-medium pointer-events-auto p-2 px-4 transition-all duration-300">
                    <button
                        type="button"
                        onClick={() => {
                            if (currentPage > 1) {
                                setCurrentPage(p => p - 1);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                        }}
                        disabled={currentPage === 1}
                        className="p-2 rounded-full bg-slate-200/50 hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronDown className="rotate-90 text-gray-600" size={20} />
                    </button>

                    <div className="flex items-center gap-2">
                        {pages.map(page => (
                            <button
                                key={page}
                                onClick={() => {
                                    setCurrentPage(page);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={cn(
                                    "h-10 w-10 flex items-center justify-center rounded-full transition-all duration-500",
                                    currentPage === page
                                        ? "text-primary bg-white/30 backdrop-blur-xl border border-white/50 shadow-[0_8px_20px_0_rgba(var(--primary-rgb),0.2)] scale-125 font-bold z-10"
                                        : "text-gray-500 hover:bg-white/20"
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
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                        }}
                        disabled={currentPage >= displayTotalPages}
                        className="p-2 rounded-full bg-slate-200/50 hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronDown className="-rotate-90 text-gray-600" size={20} />
                    </button>
                </div>
            </div>
        );
    };

    if (loading) {
        return <div className="p-12 text-center text-gray-400 font-medium animate-pulse">Cargando solicitudes...</div>;
    }

    if (vacations.length === 0) {
        return (
            <div className="bg-white rounded-[2.5rem] p-12 text-center border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-300">
                    <CalendarCheck size={40} />
                </div>
                <h3 className="text-xl font-bold text-[#121726] mb-2 tracking-tight">
                    No tienes solicitudes
                </h3>
                <p className="text-gray-400 font-medium">
                    Utiliza el formulario para solicitar tus días de vacaciones.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Year Filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 px-2">
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-[#121726] tracking-tight mb-1">
                        Historial de Solicitudes
                    </h3>
                    <p className="text-sm text-gray-500">
                        Mostrando {paginatedVacations.length} de {filteredVacations.length} solicitud{filteredVacations.length !== 1 ? 'es' : ''}
                    </p>
                </div>

                <div className="w-full sm:w-64">
                    <CustomSelect
                        label="Filtrar por Año"
                        options={yearOptions}
                        value={selectedYear}
                        onChange={setSelectedYear}
                        icon={Filter}
                    />
                </div>
            </div>

            {/* Vacation Cards */}
            <div className="grid gap-4 max-w-2xl mx-auto">
                {paginatedVacations.map((vacation) => {
                    const isExpanded = expandedCards.has(vacation.rowid);
                    const hasComments = !!vacation.comentarios;
                    // Can delete if pending OR rejected
                    const canDelete = vacation.estado === 'pendiente' || vacation.estado === 'rechazado';

                    return (
                        <div
                            key={vacation.rowid}
                            onClick={() => (hasComments || true) && toggleExpand(vacation.rowid)}
                            className={`group relative bg-white rounded-2xl border transition-all cursor-pointer ${isExpanded ? 'border-primary/10 shadow-md' : 'border-gray-100 shadow-sm hover:shadow-md'
                                }`}
                        >
                            <div className="p-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100/50">
                                            {getStatusIcon(vacation.estado)}
                                        </div>
                                        <div>
                                            <p className="text-base font-bold text-[#121726] tracking-tight flex items-center gap-2">
                                                <span>{formatDate(vacation.fecha_inicio)}</span>
                                                <span className="text-gray-300 text-sm">→</span>
                                                <span>{formatDate(vacation.fecha_fin)}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {canDelete && (
                                            <button
                                                onClick={(e) => handleDelete(e, vacation.rowid)}
                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all rounded-lg"
                                                title="Eliminar solicitud"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                        <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-primary/10 text-primary' : 'text-gray-300'}`}>
                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Expandable Section */}
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out border-t border-gray-50 bg-gray-50/30 ${isExpanded ? 'max-h-[500px] opacity-100 p-4' : 'max-h-0 opacity-0'
                                }`}>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between pb-2 border-b border-gray-100/50">
                                        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
                                            {getTypeBadge(vacation.tipo)}
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
                                            Creada el {formatDate(vacation.fecha_creacion.split(' ')[0])}
                                        </div>
                                    </div>
                                    {hasComments ? (
                                        <div className="space-y-3">
                                            {formatCommentContent(vacation.comentarios)}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">No hay comentarios adicionales.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {renderPagination()}
        </div>
    );
}
