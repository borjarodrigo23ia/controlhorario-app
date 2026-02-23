import React, { useState, useEffect, useMemo } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { useVacations, VacationRequest } from '@/hooks/useVacations';
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
    isWeekend,
    startOfWeek,
    endOfWeek,
    isSameMonth
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Filter, X, Globe } from 'lucide-react';
import { useHolidays } from '@/hooks/useHolidays';

export default function VacationCalendarView({ leftPanel }: { leftPanel?: React.ReactNode }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string>('all');

    const { users, loading: loadingUsers } = useUsers();
    const { fetchVacations } = useVacations();
    const [vacations, setVacations] = useState<VacationRequest[]>([]);
    const [loadingVacations, setLoadingVacations] = useState(true);
    const { holidays, isHoliday } = useHolidays(currentDate.getFullYear());

    const userOptions = useMemo(() => [
        { id: 'all', label: 'Todos los empleados' },
        ...users.map(u => ({ id: u.id, label: `${u.firstname} ${u.lastname}` }))
    ], [users]);

    useEffect(() => {
        const loadData = async () => {
            setLoadingVacations(true);
            const data = await fetchVacations();
            // Filter to show valid absences (approved/pending)
            setVacations(data.filter(v => v.estado !== 'rechazado'));
            setLoadingVacations(false);
        };
        loadData();
    }, [fetchVacations]);

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    // Calendar Generation Logic
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { locale: es });
    const endDate = endOfWeek(monthEnd, { locale: es });
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Filter vacations based on selected user
    const filteredVacations = useMemo(() => {
        if (selectedUserId === 'all') return vacations;
        // Verify if user ID matches (some logic uses login, some ID, let's check generic match)
        // Adjust based on your data structure. VacationRequest has 'usuario' (login).
        // Users hook returns objects with id and login.
        const selectedUser = users.find(u => u.id === selectedUserId);
        if (!selectedUser) return [];
        return vacations.filter(v => v.usuario === selectedUser.login);
    }, [vacations, selectedUserId, users]);

    // Helper to get absences for a specific day
    const getAbsencesForDate = (date: Date) => {
        return filteredVacations.filter(v => {
            const start = new Date(v.fecha_inicio);
            const end = new Date(v.fecha_fin);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            const check = new Date(date);
            check.setHours(0, 0, 0, 0);
            return check >= start && check <= end;
        });
    };

    const holidayOnDate = (date: Date) => isHoliday(date);

    const getTypeColor = (tipo: string) => {
        switch (tipo) {
            case 'vacaciones': return '#9EE8FF';
            case 'enfermedad': return '#EA9EFF';
            case 'asuntos_propios': return '#FFCE8A';
            default: return '#9ca3af';
        }
    };

    const getTypeLabel = (tipo: string) => {
        switch (tipo) {
            case 'vacaciones': return 'Vacaciones';
            case 'enfermedad': return 'Baja / Enfermedad';
            case 'asuntos_propios': return 'Asuntos Propios';
            default: return 'Ausencia';
        }
    };

    const selectedDayAbsences = selectedDate ? getAbsencesForDate(selectedDate) : [];

    if (loadingUsers || loadingVacations) {
        return <div className="p-12 text-center text-gray-400">Cargando calendario...</div>;
    }

    return (
        <div className="flex flex-col xl:flex-row gap-6 xl:gap-8 items-stretch h-full">
            {/* Left Panel (e.g. Bulk Assign) */}
            {leftPanel && (
                <div className="w-full xl:w-[350px] 2xl:w-[400px] shrink-0 flex flex-col h-full">
                    {leftPanel}
                </div>
            )}

            {/* Right Column: Calendar & Details */}
            <div className="flex-1 flex flex-col gap-6 xl:gap-8 min-w-0 h-full">
                {/* Main Calendar Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col">
                    {/* Header & Controls */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-black">
                                <CalendarIcon size={20} />
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handlePrevMonth}
                                    className="p-1.5 text-gray-400 hover:text-black transition-colors"
                                    title="Mes anterior"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white capitalize min-w-[140px] text-center">
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
                        </div>

                        <div className="flex items-center gap-3">
                            {/* User Filter */}
                            <div className="w-full md:w-72">
                                <CustomSelect
                                    label="EMPLEADO"
                                    options={userOptions}
                                    value={selectedUserId}
                                    onChange={setSelectedUserId}
                                    icon={User}
                                    className="z-20"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Days Header */}
                    <div className="grid grid-cols-7 mb-2">
                        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                            <div key={day} className="text-center py-2 text-xs font-bold text-gray-400 uppercase">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1 md:gap-2">
                        {calendarDays.map((day, idx) => {
                            const isCurrentMonth = isSameMonth(day, currentDate);
                            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                            const absences = getAbsencesForDate(day);
                            const holiday = holidayOnDate(day);
                            const isTodayDate = isToday(day);
                            const isWeekendDay = isWeekend(day);

                            return (
                                <div
                                    key={day.toISOString()}
                                    onClick={() => setSelectedDate(day)}
                                    className={`
                                    relative aspect-square xl:aspect-[1/0.8] 2xl:aspect-[1/0.7] rounded-xl flex flex-col items-center justify-start py-2 cursor-pointer transition-all border-2
                                    ${!isCurrentMonth ? 'opacity-30' : 'opacity-100'}
                                    ${isSelected
                                            ? 'border-red-500 bg-red-50/50 dark:bg-red-900/10'
                                            : 'border-transparent hover:bg-gray-50 dark:hover:bg-zinc-800'
                                        }
                                `}
                                >
                                    <span
                                        className={`
                                        text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mb-1 transition-all
                                        ${isTodayDate ? 'bg-red-600 text-white shadow-lg shadow-red-200 dark:shadow-none' : (absences.length > 0 || holiday ? 'text-zinc-900' : 'text-zinc-700 dark:text-zinc-300')}
                                        ${!isTodayDate && isWeekendDay && !holiday && absences.length === 0 ? 'text-gray-300' : ''}
                                    `}
                                        style={!isTodayDate ? (
                                            absences.length > 0
                                                ? { backgroundColor: getTypeColor(absences[0].tipo), boxShadow: `0 4px 14px ${getTypeColor(absences[0].tipo)}80` }
                                                : holiday
                                                    ? holiday.type === 'national'
                                                        ? { backgroundColor: '#FFD700', boxShadow: '0 4px 14px rgba(255, 215, 0, 0.4)' }
                                                        : { backgroundColor: '#10b981', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }
                                                    : {}
                                        ) : {}}
                                    >
                                        {format(day, 'd')}
                                    </span>

                                    {/* Absences indicators removed as per request */}
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap items-center justify-center gap-4 mt-8 pt-6 border-t border-gray-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2 text-xs">
                            <div className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: '#9EE8FF' }}></div>
                            <span className="text-gray-500 dark:text-gray-400">Vacaciones</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <div className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: '#FFCE8A' }}></div>
                            <span className="text-gray-500 dark:text-gray-400">Días Propios</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <div className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: '#EA9EFF' }}></div>
                            <span className="text-gray-500 dark:text-gray-400">Enfermedad</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <div className="w-2.5 h-2.5 rounded-full shadow-xs border border-amber-200" style={{ backgroundColor: '#FFD700' }}></div>
                            <span className="text-amber-600 font-bold">Festivo Nacional</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <div className="w-2.5 h-2.5 rounded-full shadow-xs border border-emerald-200" style={{ backgroundColor: '#10b981' }}></div>
                            <span className="text-emerald-600 font-bold">Festivo Local</span>
                        </div>
                    </div>
                </div>

                {/* Selected Day Details Panel */}
                <div className={`
                fixed inset-x-0 bottom-0 z-[100] transform transition-transform duration-300 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] xl:shadow-none xl:transform-none xl:static xl:flex-1
                bg-white dark:bg-zinc-900 border-t xl:border border-gray-100 dark:border-zinc-800 xl:rounded-3xl p-6 flex flex-col xl:flex-row gap-6 xl:gap-8 items-start
                ${selectedDate ? 'translate-y-0' : 'translate-y-full xl:translate-y-0'}
            `}>
                    <div className="flex items-center justify-between w-full xl:w-64 shrink-0 xl:border-r xl:border-gray-100 dark:xl:border-zinc-800 xl:pr-6 xl:h-full">
                        <div>
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Detalles del día</h4>
                            <p className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                                {selectedDate ? format(selectedDate, 'EEEE, d MMMM', { locale: es }) : 'Selecciona un día'}
                            </p>
                        </div>
                        <button
                            onClick={() => setSelectedDate(null)}
                            className="xl:hidden p-2 hover:bg-gray-100 rounded-full shrink-0"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="w-full flex-1 max-h-[40vh] xl:max-h-[300px] overflow-y-auto pr-1 min-h-0">
                        {/* Holiday Info */}
                        {selectedDate && holidayOnDate(selectedDate) && (
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-100 mb-3 animate-in fade-in slide-in-from-left-4 duration-300">
                                <div className="w-10 h-10 rounded-xl bg-amber-400 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-200">
                                    <Globe size={20} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h5 className="font-black text-amber-900 leading-tight">Día Festivo</h5>
                                    <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mt-0.5">
                                        {holidayOnDate(selectedDate)?.name}
                                    </p>
                                </div>
                            </div>
                        )}

                        {selectedDayAbsences.length === 0 && (!selectedDate || !holidayOnDate(selectedDate)) ? (
                            <div className="text-center py-10 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-700">
                                <p className="text-gray-400 text-sm">No hay ausencias registradas</p>
                            </div>
                        ) : (
                            selectedDayAbsences.map((abs, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-gray-50/80 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 mb-3">
                                    <div className="flex items-center gap-4 sm:w-1/3 shrink-0">
                                        <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border flex items-center justify-center font-bold text-gray-500 text-sm shadow-sm shrink-0">
                                            {abs.usuario.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <h5 className="font-bold text-gray-900 dark:text-white truncate">{abs.usuario}</h5>
                                            <span
                                                className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md text-zinc-900 shadow-sm"
                                                style={{ backgroundColor: getTypeColor(abs.tipo) }}
                                            >
                                                {getTypeLabel(abs.tipo)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0 border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-zinc-700 pt-3 sm:pt-0 sm:pl-4">
                                        <div className="text-xs font-medium text-gray-500 flex items-center gap-2">
                                            <CalendarIcon size={14} className="text-gray-400" />
                                            <span>{abs.fecha_inicio} ➜ {abs.fecha_fin}</span>
                                        </div>
                                        {abs.comentarios && (
                                            <p className="text-xs text-gray-400 mt-2 italic bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-gray-100 dark:border-zinc-800">
                                                "{abs.comentarios}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* End of Right Column Wrapper */}
            </div>

            {/* Backdrop for mobile when modal is open */}
            {selectedDate && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSelectedDate(null)}
                />
            )}
        </div>
    );
}
