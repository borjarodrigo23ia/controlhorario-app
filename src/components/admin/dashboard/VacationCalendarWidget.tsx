'use client';

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
    startOfWeek,
    endOfWeek,
    isSameMonth
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, X } from 'lucide-react';

export default function VacationCalendarWidget() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [selectedUserId, setSelectedUserId] = useState<string>('all');

    const { users, loading: loadingUsers } = useUsers();
    const { fetchVacations } = useVacations();
    const [vacations, setVacations] = useState<VacationRequest[]>([]);
    const [loadingVacations, setLoadingVacations] = useState(true);

    const userOptions = useMemo(() => [
        { id: 'all', label: 'Todos los empleados' },
        ...users.map(u => ({ id: u.id, label: `${u.firstname} ${u.lastname}` }))
    ], [users]);

    useEffect(() => {
        const loadData = async () => {
            setLoadingVacations(true);
            const data = await fetchVacations();
            setVacations(data.filter(v => v.estado !== 'rechazado'));
            setLoadingVacations(false);
        };
        loadData();
    }, [fetchVacations]);

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { locale: es });
    const endDate = endOfWeek(monthEnd, { locale: es });
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const filteredVacations = useMemo(() => {
        if (selectedUserId === 'all') return vacations;
        const selectedUser = users.find(u => u.id === selectedUserId);
        if (!selectedUser) return [];
        return vacations.filter(v => v.usuario === selectedUser.login);
    }, [vacations, selectedUserId, users]);

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
        return (
            <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center text-gray-400">
                Cargando calendario...
            </div>
        );
    }

    return (
        <div className="flex flex-col xl:flex-row gap-6">
            {/* Main Calendar Card - Simplified version of VacationCalendarView */}
            <div className="flex-1 bg-white rounded-[2rem] p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                                <CalendarIcon size={18} className="md:w-5 md:h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 capitalize leading-none">
                                {format(currentDate, 'MMMM yyyy', { locale: es })}
                            </h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-2">
                            <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white rounded-md transition-all text-gray-400 hover:text-gray-900"><ChevronLeft size={16} /></button>
                            <button onClick={handleNextMonth} className="p-1.5 hover:bg-white rounded-md transition-all text-gray-400 hover:text-gray-900"><ChevronRight size={16} /></button>
                        </div>

                        <div className="w-full md:w-64">
                            <CustomSelect
                                label="EMPLEADO"
                                options={userOptions}
                                value={selectedUserId}
                                onChange={setSelectedUserId}
                                icon={User}
                                className="z-20 scale-90 origin-right"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-7 mb-2">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                        <div key={day} className="text-center py-2 text-[10px] font-bold text-gray-300 uppercase letter tracking-widest">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {calendarDays.map((day) => {
                        const isCurrentMonth = isSameMonth(day, currentDate);
                        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                        const absences = getAbsencesForDate(day);
                        const isTodayDate = isToday(day);

                        return (
                            <div
                                key={day.toISOString()}
                                onClick={() => setSelectedDate(day)}
                                className={`
                                    relative aspect-square rounded-xl flex flex-col items-center justify-start py-2 cursor-pointer transition-all border-2
                                    ${!isCurrentMonth ? 'opacity-20' : 'opacity-100'}
                                    ${isSelected
                                        ? 'border-transparent'
                                        : 'border-transparent hover:bg-gray-100'
                                    }
                                `}
                            >
                                <span
                                    className={`
                                        text-xs md:text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mb-1 transition-all
                                        ${isTodayDate
                                            ? `bg-red-600 text-white shadow-lg shadow-red-200 ${isSelected ? 'scale-110' : ''}`
                                            : isSelected
                                                ? 'bg-black text-white shadow-lg shadow-black/20 scale-110'
                                                : (absences.length > 0 ? 'text-zinc-900' : 'text-zinc-700')
                                        }
                                    `}
                                    style={!isSelected && !isTodayDate && absences.length > 0 ? {
                                        backgroundColor: getTypeColor(absences[0].tipo),
                                        boxShadow: `0 4px 14px ${getTypeColor(absences[0].tipo)}80`
                                    } : {}}
                                >
                                    {format(day, 'd')}
                                </span>
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 mt-6 pt-6 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#9EE8FF' }}></div>
                        <span>Vacaciones</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FFCE8A' }}></div>
                        <span>Días Propios</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#EA9EFF' }}></div>
                        <span>Enfermedad</span>
                    </div>
                </div>
            </div>

            {/* Selected Day Details Panel */}
            <div className="xl:w-80 bg-white rounded-[2rem] border border-gray-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col">
                <div className="mb-6">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">DETALLES DEL DÍA</h4>
                    <p className="text-xl font-bold text-gray-900 capitalize">
                        {selectedDate ? format(selectedDate, 'EEEE, d MMMM', { locale: es }) : 'Selecciona un día'}
                    </p>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto pr-1 scrollbar-thin max-h-[250px] xl:max-h-[300px]">
                    {selectedDayAbsences.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center bg-gray-50 rounded-[1.5rem] border border-dashed border-gray-200">
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider text-center px-4">No hay ausencias para este día</p>
                        </div>
                    ) : (
                        selectedDayAbsences.map((abs, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                <div className="w-9 h-9 rounded-full bg-white border flex items-center justify-center font-bold text-gray-400 text-xs shrink-0 shadow-sm">
                                    {(abs.usuario || 'U').substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col mb-1">
                                        <h5 className="font-bold text-gray-900 truncate text-sm">
                                            {users.find(u => u.login === abs.usuario)
                                                ? `${users.find(u => u.login === abs.usuario)?.firstname} ${users.find(u => u.login === abs.usuario)?.lastname}`
                                                : abs.usuario}
                                        </h5>
                                        <span
                                            className="text-[9px] font-black uppercase tracking-widest w-fit px-1.5 py-0.5 rounded shadow-sm mt-1"
                                            style={{ backgroundColor: getTypeColor(abs.tipo), color: 'rgba(0,0,0,0.7)' }}
                                        >
                                            {getTypeLabel(abs.tipo)}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-gray-500 font-bold">
                                        {format(new Date(abs.fecha_inicio), 'd MMM', { locale: es })} ➜ {format(new Date(abs.fecha_fin), 'd MMM', { locale: es })}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Upcoming Events This Week */}
                <div className="mt-2 pt-2 border-t border-gray-100 flex-1 flex flex-col min-h-0">
                    <div className="mb-2">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">PRÓXIMOS EVENTOS (SEMANA)</h4>
                    </div>

                    <div className="space-y-3 overflow-y-auto pr-1 scrollbar-thin max-h-[300px]">
                        {(() => {
                            const now = new Date();
                            const weekStart = startOfWeek(now, { locale: es });
                            const weekEnd = endOfWeek(now, { locale: es });

                            const weekEvents = filteredVacations.filter(v => {
                                const start = new Date(v.fecha_inicio);
                                const end = new Date(v.fecha_fin);
                                start.setHours(0, 0, 0, 0);
                                end.setHours(23, 59, 59, 999);
                                return (start <= weekEnd && end >= weekStart);
                            }).sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime());

                            if (weekEvents.length === 0) {
                                return (
                                    <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-[1.5rem] border border-dashed border-gray-100">
                                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Nada programado esta semana</p>
                                    </div>
                                );
                            }

                            return weekEvents.map((abs, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                                    <div
                                        className="w-1.5 h-8 rounded-full shrink-0"
                                        style={{ backgroundColor: getTypeColor(abs.tipo) }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">
                                            {users.find(u => u.login === abs.usuario)
                                                ? `${users.find(u => u.login === abs.usuario)?.firstname} ${users.find(u => u.login === abs.usuario)?.lastname}`
                                                : abs.usuario}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">
                                                {format(new Date(abs.fecha_inicio), 'd MMM', { locale: es })} - {format(new Date(abs.fecha_fin), 'd MMM', { locale: es })}
                                            </p>
                                            <span className="text-[9px] font-black text-gray-400 uppercase">
                                                {getTypeLabel(abs.tipo).split(' ')[0]}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
}
