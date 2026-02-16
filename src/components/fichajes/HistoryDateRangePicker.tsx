'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, BrushCleaning, ChevronDown } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, eachDayOfInterval, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility to merge tailwind classes safely
 */
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface DateRangePickerProps {
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    onChange: (dates: { start: string; end: string }) => void;
    vacations?: any[]; // Optional prop for highlighting absences
}

export const HistoryDateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onChange, vacations = [] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeInput, setActiveInput] = useState<'start' | 'end' | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [monthSelectorOpen, setMonthSelectorOpen] = useState(false);
    const [yearSelectorOpen, setYearSelectorOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setActiveInput(null);
                setMonthSelectorOpen(false);
                setYearSelectorOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputClick = (type: 'start' | 'end') => {
        setIsOpen(true);
        setActiveInput(type);
        setMonthSelectorOpen(false);
        setYearSelectorOpen(false);
        // If an input has a date, center the calendar there
        const existingDate = type === 'start' ? startDate : endDate;
        if (existingDate) {
            setCurrentMonth(parseISO(existingDate));
        }
    };

    const handleDateSelect = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');

        if (activeInput === 'start') {
            // If selecting start and it's after end, clear end or adjust
            if (endDate && dateStr > endDate) {
                onChange({ start: dateStr, end: '' });
            } else {
                onChange({ start: dateStr, end: endDate });
            }
            // Optional: move to end input automatically
            setActiveInput('end');
        } else {
            // Selecting end
            if (startDate && dateStr < startDate) {
                // If end is before start, make this the new start
                onChange({ start: dateStr, end: '' });
                setActiveInput('end');
            } else {
                onChange({ start: startDate, end: dateStr });
                setIsOpen(false);
                setActiveInput(null);
            }
        }
    };

    const clearFilters = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange({ start: '', end: '' });
        setIsOpen(false);
        setActiveInput(null);
    };

    // Calendar logic
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDateCal = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDateCal = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarDays = eachDayOfInterval({
        start: startDateCal,
        end: endDateCal,
    });

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const range = [];
        // Show a wider range for selection
        for (let i = currentYear - 10; i <= currentYear + 2; i++) {
            range.push(i);
        }
        return range.sort((a, b) => b - a);
    }, []);

    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    return (
        <div className="relative inline-block w-full max-w-xl" ref={containerRef}>
            {/* Input fields - matching the user's snippet design */}
            <div id="date-range-picker" className="flex items-center">
                {/* Start input */}
                <div className="relative group flex-1">
                    <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 10h16m-8-3V4M7 7V4m10 3V4M5 20h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Zm3-7h.01v.01H8V13Zm4 0h.01v.01H12V13Zm4 0h.01v.01H16V13Zm-8 4h.01v.01H8V17Zm4 0h.01v.01H12V17Zm4 0h.01v.01H16V17Z" />
                        </svg>
                    </div>
                    <input
                        readOnly
                        onClick={() => handleInputClick('start')}
                        value={startDate || ''}
                        className={cn(
                            "block w-full ps-8 md:ps-10 pe-2 md:pe-3 py-2 md:py-2.5 bg-white border text-gray-900 text-base md:text-sm rounded-xl cursor-pointer transition-all outline-none shadow-sm",
                            activeInput === 'start' ? "border-primary ring-2 ring-primary/10 bg-white" : "border-gray-100 bg-neutral-secondary-medium hover:border-gray-200"
                        )}
                        placeholder="Fecha inicio"
                    />
                </div>

                <span className="mx-1.5 md:mx-4 text-gray-400 font-medium text-xs md:text-sm whitespace-nowrap">a</span>

                {/* End input */}
                <div className="relative group flex-1">
                    <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 10h16m-8-3V4M7 7V4m10 3V4M5 20h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Zm3-7h.01v.01H8V13Zm4 0h.01v.01H12V13Zm4 0h.01v.01H16V13Zm-8 4h.01v.01H8V17Zm4 0h.01v.01H12V17Zm4 0h.01v.01H16V17Z" />
                        </svg>
                    </div>
                    <input
                        readOnly
                        onClick={() => handleInputClick('end')}
                        value={endDate || ''}
                        className={cn(
                            "block w-full ps-8 md:ps-10 pe-2 md:pe-3 py-2 md:py-2.5 bg-white border text-gray-900 text-base md:text-sm rounded-xl cursor-pointer transition-all outline-none shadow-sm",
                            activeInput === 'end' ? "border-primary ring-2 ring-primary/10 bg-white" : "border-gray-100 bg-neutral-secondary-medium hover:border-gray-200"
                        )}
                        placeholder="Fecha fin"
                    />
                </div>

                {/* Clear button */}
                {(startDate || endDate) && (
                    <button
                        onClick={clearFilters}
                        className="ml-2 md:ml-4 p-1.5 md:p-2 text-red-500 hover:text-red-600 transition-colors"
                        title="Limpiar filtros"
                    >
                        <BrushCleaning size={18} />
                    </button>
                )}
            </div>

            {/* Custom Calendar Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 lg:left-0 lg:translate-x-0 mt-3 z-[110] bg-white border border-gray-100 rounded-[2rem] shadow-2xl p-4 md:p-6 animate-fade-in w-[calc(100vw-32px)] max-w-[320px]">
                    {/* Header: Month/Year navigation */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => {
                                setCurrentMonth(subMonths(currentMonth, 1));
                                setMonthSelectorOpen(false);
                                setYearSelectorOpen(false);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ChevronLeft size={18} className="text-gray-500" />
                        </button>

                        <div className="flex items-center gap-4 relative">
                            {/* Custom Month Selector */}
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        setMonthSelectorOpen(!monthSelectorOpen);
                                        setYearSelectorOpen(false);
                                    }}
                                    className={cn(
                                        "px-2 py-1 rounded-lg text-sm font-bold transition-colors hover:bg-gray-100 flex items-center gap-1",
                                        monthSelectorOpen ? "text-primary bg-primary/5" : "text-gray-900"
                                    )}
                                >
                                    <span>{months[currentMonth.getMonth()]}</span>
                                    <ChevronDown size={14} className={cn("transition-transform", monthSelectorOpen && "rotate-180")} />
                                </button>
                                {monthSelectorOpen && (
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl py-1 z-[120] max-h-[200px] overflow-y-auto w-[120px]">
                                        {months.map((m, i) => (
                                            <button
                                                key={m}
                                                onClick={() => {
                                                    const newDate = new Date(currentMonth);
                                                    newDate.setMonth(i);
                                                    setCurrentMonth(newDate);
                                                    setMonthSelectorOpen(false);
                                                }}
                                                className={cn(
                                                    "w-full text-left px-4 py-2 text-xs transition-colors hover:bg-gray-50",
                                                    currentMonth.getMonth() === i ? "text-primary font-bold bg-primary/5" : "text-gray-600"
                                                )}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Custom Year Selector */}
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        setYearSelectorOpen(!yearSelectorOpen);
                                        setMonthSelectorOpen(false);
                                    }}
                                    className={cn(
                                        "px-2 py-1 rounded-lg text-sm font-bold transition-colors hover:bg-gray-100 flex items-center gap-1",
                                        yearSelectorOpen ? "text-primary bg-primary/5" : "text-gray-500"
                                    )}
                                >
                                    <span>{currentMonth.getFullYear()}</span>
                                    <ChevronDown size={14} className={cn("transition-transform", yearSelectorOpen && "rotate-180")} />
                                </button>
                                {yearSelectorOpen && (
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl py-1 z-[120] max-h-[200px] overflow-y-auto w-[100px]">
                                        {years.map(y => (
                                            <button
                                                key={y}
                                                onClick={() => {
                                                    const newDate = new Date(currentMonth);
                                                    newDate.setFullYear(y);
                                                    setCurrentMonth(newDate);
                                                    setYearSelectorOpen(false);
                                                }}
                                                className={cn(
                                                    "w-full text-left px-4 py-2 text-xs transition-colors hover:bg-gray-50",
                                                    currentMonth.getFullYear() === y ? "text-primary font-bold bg-primary/5" : "text-gray-600"
                                                )}
                                            >
                                                {y}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setCurrentMonth(addMonths(currentMonth, 1));
                                setMonthSelectorOpen(false);
                                setYearSelectorOpen(false);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ChevronRight size={18} className="text-gray-500" />
                        </button>
                    </div>

                    {/* Day Names Row */}
                    <div className="grid grid-cols-7 mb-2">
                        {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(day => (
                            <div key={day} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, i) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const isSelectedStart = startDate ? isSameDay(day, parseISO(startDate)) : false;
                            const isSelectedEnd = endDate ? isSameDay(day, parseISO(endDate)) : false;
                            const isInRange = (startDate && endDate)
                                ? isWithinInterval(day, { start: parseISO(startDate), end: parseISO(endDate) })
                                : false;
                            const isToday = isSameDay(day, new Date());

                            // Check for absences in vacations array
                            const dayAbsence = vacations.find(v => {
                                const start = v.fecha_inicio;
                                const end = v.fecha_fin;
                                return dateStr >= start && dateStr <= end && v.estado !== 'rechazado';
                            });

                            const getSolidColor = (tipo: string) => {
                                switch (tipo) {
                                    case 'vacaciones': return '#9EE8FF';
                                    case 'enfermedad': return '#EA9EFF';
                                    case 'asuntos_propios': return '#FFCE8A';
                                    default: return '#e4e4e7';
                                }
                            };

                            const hasAbsence = dayAbsence && !isSelectedStart && !isSelectedEnd && !isToday;
                            const showToday = isToday && !isSelectedStart && !isSelectedEnd;

                            return (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleDateSelect(day)}
                                    className={cn(
                                        "relative h-9 w-9 flex items-center justify-center rounded-full text-xs font-semibold transition-all",
                                        !isSameMonth(day, monthStart) ? "opacity-20" : "text-gray-700 hover:bg-gray-100",
                                        isInRange && !isSelectedStart && !isSelectedEnd && !hasAbsence && !showToday && "bg-gray-100",
                                        (isSelectedStart || isSelectedEnd) && "bg-black text-white font-bold shadow-md transform scale-110 z-10",
                                        showToday && "bg-red-600 text-white shadow-lg shadow-red-200 z-10"
                                    )}
                                    style={hasAbsence ? {
                                        backgroundColor: getSolidColor(dayAbsence.tipo),
                                        boxShadow: `0 4px 10px ${getSolidColor(dayAbsence.tipo)}80`
                                    } : {}}
                                >
                                    <span className="relative z-10">{format(day, 'd')}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Quick navigation hint */}
                    <div className="mt-4 pt-4 border-t border-gray-50 text-center">
                        <span className="text-[10px] text-gray-400 font-medium">
                            {activeInput === 'start' ? 'Selecciona fecha de inicio' : 'Selecciona fecha de fin'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};
