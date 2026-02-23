'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { useFichajes } from '@/hooks/useFichajes';
import { CustomSelect } from '@/components/ui/CustomSelect';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameDay,
    addMonths,
    subMonths,
    isToday,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, X, Clock, Briefcase, Globe } from 'lucide-react';
import { useHolidays } from '@/hooks/useHolidays';
import { WorkCycle } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function AttendanceCalendarView() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [selectedUserId, setSelectedUserId] = useState<string>('0');
    const { holidays, isHoliday } = useHolidays(currentDate.getFullYear());

    const { users, loading: loadingUsers } = useUsers();

    // We want to fetch all users if selectedUserId is '0'
    const { workCycles, loading: loadingFichajes, setFilter, filter } = useFichajes({
        fkUser: selectedUserId,
        initialFilter: {
            startDate: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
            endDate: format(endOfMonth(currentDate), 'yyyy-MM-dd')
        }
    });

    const userOptions = useMemo(() => [
        { id: '0', label: 'Todos los empleados' },
        ...users.map(u => ({ id: u.id, label: `${u.firstname || u.login} ${u.lastname || ''}` }))
    ], [users]);

    // Update filter when month or user changes
    useEffect(() => {
        setFilter({
            startDate: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
            endDate: format(endOfMonth(currentDate), 'yyyy-MM-dd')
        });
    }, [currentDate, setFilter]);

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    // Calendar Generation Logic
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { locale: es });
    const endDate = endOfWeek(monthEnd, { locale: es });
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Helper to get sessions for a specific day
    const getCyclesForDate = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return workCycles.filter(c => c.fecha?.startsWith(dateStr));
    };

    const selectedDayCycles = selectedDate ? getCyclesForDate(selectedDate) : [];

    // Stats for the month
    const monthStats = useMemo(() => {
        if (!workCycles.length) return { totalHours: 0, workingDays: 0, distinctUsers: 0 };

        let totalMinutes = 0;
        const days = new Set<string>();
        const uniqueUsers = new Set<string>();

        workCycles.forEach(c => {
            if (c.duracion_efectiva) totalMinutes += c.duracion_efectiva;
            if (c.fecha) days.add(c.fecha.substring(0, 10));
            if (c.entrada.usuario_nombre) uniqueUsers.add(c.entrada.usuario_nombre);
        });

        return {
            totalHours: Math.round(totalMinutes / 60),
            workingDays: days.size,
            distinctUsers: uniqueUsers.size
        };
    }, [workCycles]);

    if (loadingUsers && !users.length) {
        return <div className="p-12 text-center text-gray-400">Cargando datos...</div>;
    }

    return (
        <div className="flex flex-col xl:flex-row gap-6">
            {/* Main Calendar Card */}
            <div className="flex-1 bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 md:p-8 border border-gray-100 dark:border-zinc-800 shadow-sm h-fit">
                {/* Header & Controls */}
                <div className="flex flex-col gap-6 mb-10">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white shadow-sm rounded-2xl flex items-center justify-center text-black shrink-0">
                                <CalendarIcon size={24} />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-6">
                                    <button
                                        onClick={handlePrevMonth}
                                        className="p-1.5 text-gray-400 hover:text-black transition-colors"
                                        title="Mes anterior"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white capitalize leading-tight min-w-[140px] text-center">
                                        {format(currentDate, 'MMMM yyyy', { locale: es })}
                                    </h3>
                                    <button
                                        onClick={handleNextMonth}
                                        className="p-1.5 text-gray-400 hover:text-black transition-colors"
                                        title="Mes siguiente"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 text-center">
                                    {monthStats.workingDays} días con actividad
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                        {/* User Filter */}
                        <div className="min-w-[240px]">
                            <CustomSelect
                                label="FILTRAR POR"
                                options={userOptions}
                                value={selectedUserId}
                                onChange={setSelectedUserId}
                                icon={User}
                                className="z-30"
                            />
                        </div>
                    </div>
                </div>

                {/* Days Header */}
                <div className="grid grid-cols-7 mb-4 border-b border-gray-50 dark:border-zinc-800/50 pb-2">
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                        <div key={day} className="text-center py-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">
                            <span className="hidden md:inline">{day}</span>
                            <span className="md:hidden">{day.substring(0, 3)}</span>
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2 md:gap-3">
                    {calendarDays.map((day, idx) => {
                        const isCurrentMonth = isSameMonth(day, currentDate);
                        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                        const cycles = getCyclesForDate(day);
                        const holiday = isHoliday(day);
                        const isTodayDate = isToday(day);
                        const hasActivity = cycles.length > 0;

                        return (
                            <button
                                key={day.toISOString()}
                                onClick={() => setSelectedDate(day)}
                                className={cn(
                                    "relative group aspect-square rounded-[1.5rem] flex flex-col items-center justify-center transition-all border-2",
                                    !isCurrentMonth ? "opacity-20 pointer-events-none" : "opacity-100",
                                    isSelected
                                        ? "bg-primary/5 border-primary/40 shadow-sm"
                                        : holiday
                                            ? holiday.type === 'national'
                                                ? "bg-amber-50/50 border-amber-200/50"
                                                : "bg-emerald-50/50 border-emerald-200/50"
                                            : "bg-white dark:bg-zinc-800/20 border-transparent hover:bg-gray-50 dark:hover:bg-zinc-800"
                                )}
                            >
                                <span className={cn(
                                    "text-sm font-black w-7 h-7 flex items-center justify-center rounded-full transition-all",
                                    isTodayDate
                                        ? "bg-red-600 text-white shadow-lg shadow-red-200 dark:shadow-none"
                                        : holiday
                                            ? holiday.type === 'national'
                                                ? "text-amber-600 font-black scale-110"
                                                : "text-emerald-600 font-black scale-110"
                                            : (isSelected ? "text-primary scale-110" : "text-gray-700 dark:text-gray-300")
                                )}>
                                    {format(day, 'd')}
                                </span>

                                {hasActivity && (
                                    <div className="mt-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Selected Day Details Panel */}
            <div className={cn(
                "fixed inset-x-0 bottom-0 z-[100] transform transition-transform duration-500 rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] xl:shadow-none xl:transform-none xl:static xl:w-[400px]",
                "bg-white dark:bg-zinc-900 border-t xl:border border-gray-100 dark:border-zinc-800 xl:rounded-[2.5rem] p-8",
                selectedDate ? "translate-y-0" : "translate-y-full xl:translate-y-0"
            )}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Detalle de Actividad</h4>
                        <p className="text-2xl font-black text-gray-900 dark:text-white capitalize leading-none">
                            {selectedDate ? format(selectedDate, 'EEEE, d', { locale: es }) : 'Selecciona un día'}
                        </p>
                    </div>
                    <button
                        onClick={() => setSelectedDate(null)}
                        className="xl:hidden p-3 bg-gray-50 dark:bg-zinc-800 rounded-2xl text-gray-400 hover:text-gray-900 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4 max-h-[50vh] xl:max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Holiday Info */}
                    {selectedDate && isHoliday(selectedDate) && (
                        <div className="flex items-center gap-4 p-5 rounded-[1.8rem] bg-amber-50 border border-amber-100 mb-2 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="w-10 h-10 rounded-xl bg-amber-400 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-200">
                                <Globe size={20} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h5 className="font-black text-amber-900 leading-tight">Día Festivo</h5>
                                <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mt-0.5">
                                    {isHoliday(selectedDate)?.name}
                                </p>
                            </div>
                        </div>
                    )}

                    {loadingFichajes ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                            <p className="text-xs font-bold uppercase tracking-wider">Cargando jornadas...</p>
                        </div>
                    ) : selectedDayCycles.length === 0 ? (
                        <div className="text-center py-16 px-4 bg-gray-50/50 dark:bg-zinc-800/30 rounded-[2rem] border border-dashed border-gray-200 dark:border-zinc-700/50">
                            <Clock size={32} className="mx-auto text-gray-300 mb-4 opacity-50" />
                            <p className="text-gray-400 text-sm font-medium">No se registraron jornadas este día</p>
                        </div>
                    ) : (
                        <div className="space-y-4 pb-4">
                            {selectedDayCycles.map((cycle, idx) => (
                                <div key={idx} className="group flex flex-col gap-3 p-5 rounded-[1.5rem] bg-white dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800 hover:border-primary/20 hover:shadow-md transition-all">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center font-black text-primary text-xs shadow-sm shrink-0">
                                                {(cycle.entrada.usuario_nombre || '??').substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h5 className="font-black text-gray-900 dark:text-white text-sm truncate">{cycle.entrada.usuario_nombre}</h5>
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                    <Clock size={10} />
                                                    {cycle.duracion_efectiva ? `${Math.floor(cycle.duracion_efectiva / 60)}h ${cycle.duracion_efectiva % 60}m` : 'En curso'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest",
                                            cycle.salida ? "bg-green-50 text-green-600 border border-green-100" : "bg-amber-50 text-amber-600 border border-amber-100 animate-pulse"
                                        )}>
                                            {cycle.salida ? 'Completado' : 'Activo'}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-gray-50 dark:border-zinc-800/50 pt-3">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Entrada</span>
                                            <span className="text-xs font-bold text-gray-700 dark:text-zinc-300">
                                                {format(parseISO(cycle.entrada.fecha_creacion), 'HH:mm')}
                                            </span>
                                        </div>
                                        <div className="w-px h-6 bg-gray-50 dark:bg-zinc-800" />
                                        <div className="flex flex-col items-end">
                                            <span className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Salida</span>
                                            <span className="text-xs font-bold text-gray-700 dark:text-zinc-300">
                                                {cycle.salida ? format(parseISO(cycle.salida.fecha_creacion), 'HH:mm') : '--:--'}
                                            </span>
                                        </div>
                                    </div>

                                    {cycle.entrada.observaciones && (
                                        <p className="text-[11px] text-gray-500 italic bg-gray-50/50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-zinc-800/50 line-clamp-2">
                                            "{cycle.entrada.observaciones}"
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Backdrop for mobile */}
            {
                selectedDate && (
                    <div
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[90] xl:hidden animate-in fade-in duration-500"
                        onClick={() => setSelectedDate(null)}
                    />
                )
            }
        </div >
    );
}
