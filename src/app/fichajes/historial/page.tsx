'use client';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFichajes } from '@/hooks/useFichajes';
import { HistoryList } from '@/components/fichajes/HistoryList';
import { ArrowLeft, CalendarClock, History, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import ManualFichajeModal from '@/components/fichajes/ManualFichajeModal';
import AuditHistoryList from '@/components/fichajes/AuditHistoryList';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { HistoryDateRangePicker } from '@/components/fichajes/HistoryDateRangePicker';
import { cn } from '@/lib/utils';

import { getDailyEvents, TimelineEvent } from '@/lib/fichajes-utils';

export default function HistorialPage() {
    const { user } = useAuth();
    const {
        workCycles,
        loading,
        refreshFichajes
    } = useFichajes();

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
    const [targetEvent, setTargetEvent] = useState<TimelineEvent | undefined>(undefined);
    const [activeTab, setActiveTab] = useState<'activity' | 'audit'>('activity');

    // Filters state - Default to Current Month
    const [startDate, setStartDate] = useState<string>(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [endDate, setEndDate] = useState<string>(() => {
        const now = new Date();
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
    });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const handleEdit = (event: TimelineEvent) => {
        setTargetEvent(event);
        setSelectedDate(event.dateStr);
        setModalOpen(true);
    };

    // Derived data for filters and pagination
    const { paginatedCycles, totalPages } = useMemo(() => {
        if (!workCycles) return { paginatedCycles: [], totalPages: 0 };

        // 1. Group by date first
        const groups: Record<string, typeof workCycles> = {};

        // Check if we should apply date filters
        const shouldFilter = !!(startDate || endDate);

        workCycles.forEach(cycle => {
            if (!cycle.fecha) return;

            // Format for comparison and display grouping (YYYY-MM-DD)
            const dateKey = cycle.fecha.substring(0, 10);

            // Apply filters only if at least one filter is active
            if (shouldFilter) {
                // Use wide ranges as defaults if only one filter is set
                const effectiveStart = startDate || '1900-01-01';
                const effectiveEnd = endDate || '2099-12-31';

                if (dateKey < effectiveStart || dateKey > effectiveEnd) return;
            }

            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(cycle);
        });

        const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
        const totalItems = sortedDates.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        // Allow navigation to any page (will just show empty if no data)
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageDates = sortedDates.slice(startIndex, endIndex);

        // Flatten back to array for HistoryList
        const pageCycles = pageDates.flatMap(date => groups[date]);

        return {
            paginatedCycles: pageCycles,
            totalPages,
        };
    }, [workCycles, startDate, endDate, currentPage]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [startDate, endDate]);

    // Pagination Controls Component
    const renderPagination = () => {
        if (workCycles && workCycles.length === 0 && !loading) return null;

        const maxVisiblePages = 5;
        // Force at least 2 pages even if data fits in 1
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
                        aria-label="prev"
                        onClick={() => {
                            if (currentPage > 1) {
                                setCurrentPage(p => p - 1);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
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
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
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
                        aria-label="next"
                        onClick={() => {
                            if (currentPage < displayTotalPages) {
                                setCurrentPage(p => p + 1);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
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

    return (
        <>
            <PageHeader
                title="Historial Completo"
                subtitle="Consulta todos tus registros de jornada anteriores"
                icon={CalendarClock}
                showBack
                badge="Mi Actividad"
            />

            <div className="max-w-5xl space-y-8">
                {/* Tab Switcher */}
                <div className="flex p-1.5 bg-gray-100/50 backdrop-blur-sm rounded-2xl w-full border border-gray-200/30">
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300",
                            activeTab === 'activity'
                                ? "bg-white text-primary shadow-sm ring-1 ring-black/5"
                                : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        <ClipboardList size={16} />
                        Actividad
                    </button>
                    <button
                        onClick={() => setActiveTab('audit')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300",
                            activeTab === 'audit'
                                ? "bg-white text-primary shadow-sm ring-1 ring-black/5"
                                : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        <History size={16} />
                        Cambios
                    </button>
                </div>

                {activeTab === 'activity' ? (
                    <>
                        {/* Filters - Exact Custom Component Design */}
                        <div className="flex flex-col gap-4">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none ml-1">
                                Filtrar por Rango de Fechas
                            </span>

                            <HistoryDateRangePicker
                                startDate={startDate}
                                endDate={endDate}
                                onChange={(dates) => {
                                    setStartDate(dates.start);
                                    setEndDate(dates.end);
                                }}
                            />
                        </div>

                        <HistoryList
                            cycles={paginatedCycles}
                            loading={loading}
                            title="Historial de Jornadas"
                            onEdit={handleEdit}
                        />

                        {renderPagination()}
                    </>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <AuditHistoryList userId={user?.id} />
                    </div>
                )}
            </div>

            <ManualFichajeModal
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setTargetEvent(undefined);
                }}
                onSaved={refreshFichajes}
                initialDate={selectedDate}
                targetEvent={targetEvent}
            />
        </>
    );
}
