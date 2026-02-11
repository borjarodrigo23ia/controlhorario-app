'use client';
import { useState, useMemo, useEffect } from 'react';
import { useFichajes } from '@/hooks/useFichajes';
import { useUsers } from '@/hooks/useUsers';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { useRouter } from 'next/navigation';
import { HistoryList } from '@/components/fichajes/HistoryList';
import { CheckboxDropdown } from '@/components/ui/CheckboxDropdown';
import { PageHeader } from '@/components/ui/PageHeader';
import { Filter, CalendarClock, History, ClipboardList, Calendar } from 'lucide-react';
import AuditHistoryList from '@/components/fichajes/AuditHistoryList';
import { ExportActions } from '@/components/fichajes/ExportActions';
import { HistoryDateRangePicker } from '@/components/fichajes/HistoryDateRangePicker';
import { cn } from '@/lib/utils';
import { TimelineEvent } from '@/lib/fichajes-utils';
import ManualFichajeModal from '@/components/fichajes/ManualFichajeModal';
import AttendanceCalendarView from '@/components/admin/AttendanceCalendarView';

export default function AdminFichajesPage() {
    const router = useRouter();
    const [selectedUsers, setSelectedUsers] = useState<string[]>(['0']);
    const { users, loading: loadingUsers } = useUsers();

    const [manualModalOpen, setManualModalOpen] = useState(false);
    const [targetEvent, setTargetEvent] = useState<TimelineEvent | undefined>(undefined);
    const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);

    const initialFilter = useMemo(() => {
        const now = new Date();
        const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const end = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
        return { startDate: start, endDate: end };
    }, []);

    // Pass comma-separated IDs to useFichajes
    const { workCycles, loading, setFilter, filter, refreshFichajes } = useFichajes({
        fkUser: selectedUsers.includes('0') ? '0' : selectedUsers.join(','),
        initialFilter
    });

    const [activeTab, setActiveTab] = useState<'activity' | 'audit' | 'calendar'>('activity');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const handleUserToggle = (id: string) => {
        setSelectedUsers(prev => {
            if (id === '0') return ['0']; // selecting "All" clears others

            const newSelection = prev.includes('0') ? [] : [...prev];
            if (newSelection.includes(id)) {
                const updated = newSelection.filter(uid => uid !== id);
                return updated.length === 0 ? ['0'] : updated;
            } else {
                return [...newSelection, id];
            }
        });
    };

    const handleEditFichaje = (event: TimelineEvent) => {
        console.log('[AdminFichajesPage] Editing individual event:', event);
        setTargetEvent(event);
        setSelectedDate(event.dateStr); // event.dateStr comes from getDailyEvents
        setManualModalOpen(true);
    };

    // Derived data for filters and pagination
    const { paginatedCycles, totalPages } = useMemo(() => {
        if (!workCycles) return { paginatedCycles: [], totalPages: 0 };

        // 1. Group by date first
        const groups: Record<string, typeof workCycles> = {};

        workCycles.forEach(cycle => {
            if (!cycle.fecha) return;
            const dateKey = cycle.fecha.substring(0, 10);
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(cycle);
        });

        const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
        const totalItems = sortedDates.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageDates = sortedDates.slice(startIndex, endIndex);

        const pageCycles = pageDates.flatMap(date => groups[date]);

        return {
            paginatedCycles: pageCycles,
            totalPages,
        };
    }, [workCycles, currentPage]);

    // Reset page when filters (users or dates) change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedUsers, filter.startDate, filter.endDate]);

    // Pagination Controls Component
    const renderPagination = () => {
        if ((workCycles && workCycles.length === 0 && !loading) || activeTab !== 'activity') return null;

        const maxVisiblePages = 5;
        const displayTotalPages = Math.max(1, totalPages);

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
            <div className="w-full pt-4 mt-2 border-t border-gray-100/80 mb-10">
                <div className="flex items-center justify-between w-full max-w-lg mx-auto text-gray-500 font-medium pb-2 transition-all duration-300">
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
                                        ? "text-primary bg-white/30 backdrop-blur-xl border border-white/50 shadow-[0_8px_20px_0_rgba(99,102,241,0.2)] rounded-full scale-125 font-bold z-10"
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

    // --- Statistics Computation ---
    const stats = useMemo(() => {
        if (!workCycles?.length) return { totalHours: 0, activeNow: 0, totalSessions: 0 };

        let totalMinutes = 0;
        let activeNow = 0;

        workCycles.forEach(cycle => {
            if (cycle.duracion_efectiva) totalMinutes += cycle.duracion_efectiva;
            if (!cycle.salida) activeNow++;
        });

        return {
            totalHours: Math.round(totalMinutes / 60),
            activeNow,
            totalSessions: workCycles.length
        };
    }, [workCycles]);

    const getLabel = () => {
        if (selectedUsers.includes('0')) return 'Todos los empleados';
        if (selectedUsers.length === 1) {
            const u = users.find(u => u.id === selectedUsers[0]);
            return u ? `${u.firstname || u.login}` : 'Filtrar';
        }
        return `${selectedUsers.length} empleados`;
    };

    return (
        <div className="flex min-h-screen bg-[#FAFBFC]">
            <div className="hidden md:block"><Sidebar /></div>
            <main className="flex-1 ml-0 md:ml-64 p-4 md:p-12 pb-32">
                <PageHeader
                    title={<>Historial <span className="text-primary italic">Global</span></>}
                    subtitle="Consulta los registros de jornada de todos los usuarios"
                    badge="Administración"
                    icon={CalendarClock}
                    showBack
                    isLive
                />


                {/* Stats Section - Small Square Badges with Visible Color Accents */}
                <div className="flex flex-nowrap gap-4 mb-3 overflow-x-auto pb-4 scrollbar-hide px-1">
                    <div className="relative overflow-hidden w-32 aspect-square bg-white p-4 rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all hover:shadow-md group flex flex-col items-center justify-center text-center shrink-0">
                        {/* Blue Gradient Accent - More Visible */}
                        <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-blue-500/20 blur-xl rounded-full" />
                        <div className="absolute bottom-0 right-0 w-12 h-12 bg-gradient-to-br from-transparent via-blue-50/30 to-blue-100/60 rounded-br-[2rem]" />

                        <p className="relative z-10 text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-2 group-hover:text-blue-500 transition-colors leading-none">Horas</p>
                        <span className="relative z-10 text-3xl font-black text-[#121726] leading-none mb-1">{stats.totalHours}</span>
                        <span className="relative z-10 text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Totales</span>
                    </div>

                    <div className="relative overflow-hidden w-32 aspect-square bg-white p-4 rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all hover:shadow-md group flex flex-col items-center justify-center text-center shrink-0">
                        {/* Green Gradient Accent - More Visible */}
                        <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-green-500/25 blur-xl rounded-full" />
                        <div className="absolute bottom-0 right-0 w-12 h-12 bg-gradient-to-br from-transparent via-green-50/30 to-green-100/60 rounded-br-[2rem]" />

                        <p className="relative z-10 text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-2 group-hover:text-green-500 transition-colors leading-none">Activos</p>
                        <span className="relative z-10 text-3xl font-black text-green-500 leading-none mb-1">{stats.activeNow}</span>
                        <span className="relative z-10 text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Ahora</span>
                    </div>

                    <div className="relative overflow-hidden w-32 aspect-square bg-white p-4 rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all hover:shadow-md group flex flex-col items-center justify-center text-center shrink-0">
                        {/* Yellow Gradient Accent - More Visible */}
                        <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-yellow-400/25 blur-xl rounded-full" />
                        <div className="absolute bottom-0 right-0 w-12 h-12 bg-gradient-to-br from-transparent via-yellow-50/30 to-yellow-100/60 rounded-br-[2rem]" />

                        <p className="relative z-10 text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-2 group-hover:text-yellow-600 transition-colors leading-none">Sesiones</p>
                        <span className="relative z-10 text-3xl font-black text-[#121726] leading-none mb-1">{stats.totalSessions}</span>
                        <span className="relative z-10 text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Jornadas</span>
                    </div>
                </div>


                {/* Tab Switcher - Distinct Components on One Line */}
                <div className="flex gap-2 md:gap-4 mb-4 overflow-x-auto pb-8 pt-2 px-2 no-scrollbar">
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 md:gap-3 px-3 md:px-6 py-3 md:py-4 rounded-2xl md:rounded-3xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all duration-300 border-2 shrink-0",
                            activeTab === 'activity'
                                ? "bg-white text-primary border-primary/20 shadow-[0_10px_30px_rgba(99,102,241,0.15)] md:scale-105 z-10"
                                : "bg-white/50 text-gray-400 border-gray-100 hover:border-gray-200 hover:text-gray-600 shadow-sm"
                        )}
                    >
                        <div className={cn(
                            "p-1 rounded-md md:rounded-lg transition-colors hidden xs:block",
                            activeTab === 'activity' ? "bg-primary/10" : "bg-gray-100"
                        )}>
                            <ClipboardList size={14} className="md:w-4 md:h-4" />
                        </div>
                        Global
                    </button>

                    <button
                        onClick={() => setActiveTab('audit')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 md:gap-3 px-3 md:px-6 py-3 md:py-4 rounded-2xl md:rounded-3xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all duration-300 border-2 shrink-0",
                            activeTab === 'audit'
                                ? "bg-white text-primary border-primary/20 shadow-[0_10px_30px_rgba(99,102,241,0.15)] md:scale-105 z-10"
                                : "bg-white/50 text-gray-400 border-gray-100 hover:border-gray-200 hover:text-gray-600 shadow-sm"
                        )}
                    >
                        <div className={cn(
                            "p-1 rounded-md md:rounded-lg transition-colors hidden xs:block",
                            activeTab === 'audit' ? "bg-primary/10" : "bg-gray-100"
                        )}>
                            <History size={14} className="md:w-4 md:h-4" />
                        </div>
                        Auditoría
                    </button>

                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 md:gap-3 px-3 md:px-6 py-3 md:py-4 rounded-2xl md:rounded-3xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all duration-300 border-2 shrink-0",
                            activeTab === 'calendar'
                                ? "bg-white text-primary border-primary/20 shadow-[0_10px_30px_rgba(99,102,241,0.15)] md:scale-105 z-10"
                                : "bg-white/50 text-gray-400 border-gray-100 hover:border-gray-200 hover:text-gray-600 shadow-sm"
                        )}
                    >
                        <div className={cn(
                            "p-1 rounded-md md:rounded-lg transition-colors hidden xs:block",
                            activeTab === 'calendar' ? "bg-primary/10" : "bg-gray-100"
                        )}>
                            <Calendar size={14} className="md:w-4 md:h-4" />
                        </div>
                        Calendario
                    </button>
                </div>

                {/* Date Selection Box - Centered between tabs and list */}
                {activeTab !== 'calendar' && (
                    <div className="relative z-20 flex flex-col items-center justify-center gap-4 mb-8 bg-white/80 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm mx-auto w-full max-w-xl animate-in fade-in slide-in-from-top-4 duration-700">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none">Filtrado de Fechas y Empleado</p>
                        <HistoryDateRangePicker
                            startDate={filter.startDate || ''}
                            endDate={filter.endDate || ''}
                            onChange={(dates) => {
                                setFilter(prev => ({ ...prev, startDate: dates.start, endDate: dates.end }));
                            }}
                        />

                        {/* Employee Filter & Export Actions - Moved here */}
                        <div className="flex flex-wrap items-center justify-center gap-3 mt-4 pt-6 border-t border-gray-200/60 w-full">
                            <CheckboxDropdown
                                label={getLabel()}
                                options={[
                                    { id: '0', label: 'Todos los empleados' },
                                    ...users.map(u => ({ id: u.id, label: `${u.firstname || u.login} ${u.lastname}` }))
                                ]}
                                selectedValues={selectedUsers}
                                onToggle={handleUserToggle}
                                className="z-50"
                                compact
                            />
                            <ExportActions
                                cycles={workCycles}
                                userName={selectedUsers.length === 1 && selectedUsers[0] !== '0' ? getLabel() : undefined}
                            />
                        </div>
                    </div>
                )}

                {
                    activeTab === 'activity' ? (
                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative animate-in fade-in duration-500">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-primary/5 text-primary rounded-2xl">
                                    <Filter size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[#121726] tracking-tight mb-0.5">Actividad Reciente</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        {selectedUsers.includes('0') ? 'Equipo completo' : `${selectedUsers.length} Empleados seleccionados`}
                                    </p>
                                </div>
                            </div>

                            <HistoryList
                                cycles={paginatedCycles}
                                loading={loading}
                                showUserName={selectedUsers.includes('0') || selectedUsers.length > 1}
                                isGlobal
                                onEdit={handleEditFichaje}
                            />

                            {renderPagination()}
                        </div>
                    ) : activeTab === 'audit' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <AuditHistoryList
                                userId={selectedUsers.includes('0') ? undefined : selectedUsers.join(',')}
                            />
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <AttendanceCalendarView />
                        </div>
                    )
                }

                <ManualFichajeModal
                    isOpen={manualModalOpen}
                    onClose={() => {
                        setManualModalOpen(false);
                        setTargetEvent(undefined);
                        setSelectedDate(undefined);
                    }}
                    onSaved={refreshFichajes}
                    initialDate={selectedDate}
                    targetEvent={targetEvent}
                />
            </main >
            <MobileNav />
        </div >
    );
}
