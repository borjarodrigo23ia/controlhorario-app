import React, { useEffect, useState, useMemo } from 'react';
import { useVacations, VacationRequest } from '@/hooks/useVacations';
import { CalendarCheck, CalendarX, Clock, Trash2, Palmtree, HeartPulse, ContactRound, Filter, ChevronDown, ChevronUp, MessageSquare, CalendarClock } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Skeleton } from '@/components/ui/Skeleton';

interface VacationListProps {
    refreshTrigger: number;
    compact?: boolean;
    limit?: number;
}

export default function VacationList({ refreshTrigger, compact = false, limit }: VacationListProps) {
    const { fetchVacations, deleteVacation } = useVacations();
    const [vacations, setVacations] = useState<VacationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 7;

    const historyRef = React.useRef<HTMLDivElement>(null);

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
        if (!compact && selectedYear !== 'all') {
            filtered = vacations.filter(v => v.fecha_inicio.startsWith(selectedYear));
        }
        return limit ? filtered.slice(0, limit) : filtered;
    }, [vacations, selectedYear, compact, limit]);

    // Pagination logic
    const { paginatedVacations, totalPages } = useMemo(() => {
        if (compact) {
            return { paginatedVacations: filteredVacations, totalPages: 1 };
        }
        const totalItems = filteredVacations.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const pageVacations = filteredVacations.slice(startIndex, startIndex + itemsPerPage);

        return {
            paginatedVacations: pageVacations,
            totalPages
        };
    }, [filteredVacations, currentPage, compact]);

    // Reset page when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedYear]);

    const scrollToHistory = () => {
        if (historyRef.current) {
            const yOffset = -100; // Offset for sticky headers or breathing room
            const element = historyRef.current;
            const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

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
                return <CalendarClock size={18} className="text-[#F59E0B]" />;
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
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#EA9EFF] text-black border border-purple-200/50 shadow-sm shadow-purple-500/20">
                        <HeartPulse size={14} className="text-black" />
                        Enfermedad
                    </span>
                );
            case 'asuntos_propios':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#FFCE8A] text-black border border-amber-200/50 shadow-sm shadow-amber-500/20">
                        <ContactRound size={14} className="text-black" />
                        Asuntos Propios
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#9EE8FF] text-black border border-blue-200/50 shadow-sm shadow-blue-500/20">
                        <Palmtree size={14} className="text-black" />
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

    function cn(...classes: any[]) {
        return classes.filter(Boolean).join(' ');
    }

    // Pagination Controls Component
    const renderPagination = () => {
        if (filteredVacations.length === 0 && !loading) return null;

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
            <div className="w-full pt-6 mt-8 border-t border-gray-100/80">
                <div className="flex items-center justify-between w-full max-w-lg mx-auto text-gray-500 font-medium p-2 transition-all duration-300">
                    <button
                        type="button"
                        onClick={() => {
                            if (currentPage > 1) {
                                setCurrentPage(p => p - 1);
                                scrollToHistory();
                            }
                        }}
                        disabled={currentPage === 1}
                        className="rounded-full bg-slate-200/50 hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                                    scrollToHistory();
                                }}
                                className={cn(
                                    "h-10 w-10 flex items-center justify-center aspect-square transition-all duration-500",
                                    currentPage === page
                                        ? "text-indigo-600 bg-white/30 backdrop-blur-xl border border-white/50 shadow-[0_8px_20px_0_rgba(99,102,241,0.2)] rounded-full scale-125 font-bold z-10"
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
                                scrollToHistory();
                            }
                        }}
                        disabled={currentPage >= displayTotalPages}
                        className="rounded-full bg-slate-200/50 hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <svg className="rotate-180" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.499 12.85a.9.9 0 0 1 .57.205l.067.06a.9.9 0 0 1 .06 1.206l-.06.066-5.585 5.586-.028.027.028.027 5.585 5.587a.9.9 0 0 1 .06 1.207l-.06.066a.9.9 0 0 1-1.207.06l-.066-.06-6.25-6.25a1 1 0 0 1-.158-.212l-.038-.08a.9.9 0 0 1-.03-.606l.03-.083a1 1 0 0 1 .137-.226l.06-.066 6.25-6.25a.9.9 0 0 1 .635-.263Z" fill="#475569" stroke="#475569" strokeWidth=".078" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 px-2">
                    <div className="space-y-2">
                        <Skeleton width={200} height={28} />
                        <Skeleton width={150} height={18} />
                    </div>
                    <Skeleton width={256} height={48} borderRadius="full" />
                </div>
                <div className="grid gap-4 max-w-2xl mx-auto w-full">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Skeleton width={40} height={40} borderRadius="xl" />
                                <div className="space-y-2">
                                    <Skeleton width={180} height={20} />
                                    <Skeleton width={100} height={14} />
                                </div>
                            </div>
                            <Skeleton width={24} height={24} borderRadius="lg" />
                        </div>
                    ))}
                </div>
            </div>
        );
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
        <div className="space-y-6" ref={historyRef}>
            {/* Header with Year Filter - Hide if compact */}
            {!compact && (
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
            )}

            {/* Vacation Cards */}
            <div className="grid gap-4 max-w-2xl mx-auto">
                {paginatedVacations.map((vacation) => {
                    const isExpanded = expandedCards.has(vacation.rowid);
                    const hasComments = !!vacation.comentarios;
                    const canDelete = vacation.estado === 'pendiente' || vacation.estado === 'rechazado';

                    const statusGlowColors = {
                        aprobado: '#10B981', // Emerald
                        rechazado: '#EF4444', // Red
                        pendiente: '#F59E0B'  // Amber
                    };
                    const glowColor = statusGlowColors[vacation.estado as keyof typeof statusGlowColors] || '#9ca3af';

                    return (
                        <div
                            key={vacation.rowid}
                            onClick={() => (hasComments || true) && toggleExpand(vacation.rowid)}
                            className={`group overflow-hidden relative bg-white rounded-2xl border transition-all cursor-pointer ${isExpanded ? 'border-primary/10 shadow-md scale-[1.01]' : 'border-gray-100 shadow-sm hover:shadow-md hover:scale-[1.01]'
                                }`}
                        >
                            {/* Diagonal Glow Effect */}
                            <div
                                className={`absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-tl from-transparent to-transparent blur-2xl rounded-tl-full pointer-events-none z-0 transition-opacity duration-300 ${isExpanded ? 'opacity-0' : 'opacity-60 group-hover:opacity-100'}`}
                                style={{
                                    background: `radial-gradient(circle at bottom right, ${glowColor}, transparent)`
                                }}
                            />

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
                                                className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 transition-all rounded-lg"
                                                title="Eliminar solicitud"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                        <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-black/5 text-black' : 'text-black'}`}>
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

            {!compact && renderPagination()}
        </div>
    );
}
