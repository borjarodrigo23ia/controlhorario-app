'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DatePickerProps {
    value: string; // YYYY-MM-DD
    onChange: (date: string) => void;
    label?: string;
    disabled?: boolean;
    className?: string;
    minDate?: string;
    maxDate?: string;
}

export function DatePicker({ value, onChange, label, disabled = false, className, minDate, maxDate }: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(value ? parseISO(value) : new Date());
    const [monthSelectorOpen, setMonthSelectorOpen] = useState(false);
    const [yearSelectorOpen, setYearSelectorOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setMonthSelectorOpen(false);
                setYearSelectorOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Sync calendar with value when opened
    useEffect(() => {
        if (isOpen && value) {
            setCurrentMonth(parseISO(value));
        }
    }, [isOpen, value]);

    const handleDateSelect = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        onChange(dateStr);
        setIsOpen(false);
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
        // Show a wider range for selection (e.g. 10 years back, 2 forward)
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
        <div className={cn("relative w-full", className)} ref={containerRef}>
            {label && (
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2">
                    <CalendarIcon size={16} /> {label}
                </label>
            )}

            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={cn(
                    "w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 flex items-center justify-between tracking-tight shadow-sm transition-all focus:ring-2 focus:ring-primary/20 h-14",
                    disabled && "opacity-50 cursor-not-allowed bg-gray-50",
                    !value && "text-gray-300"
                )}
            >
                <span className="flex items-center gap-3">
                    {!label && <CalendarIcon size={18} className="text-gray-400" />}
                    {value ? format(parseISO(value), "dd 'de' MMMM, yyyy", { locale: es }) : 'Seleccionar fecha'}
                </span>
                <ChevronDown size={18} className={cn("text-gray-400 transition-transform", isOpen && "rotate-180")} />
            </button>


            {/* Custom Calendar Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 z-[60] bg-white border border-gray-100 rounded-[2rem] shadow-xl p-4 md:p-6 animate-in fade-in zoom-in-95 duration-200 min-w-[300px]">
                    {/* Header: Month/Year navigation */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrentMonth(subMonths(currentMonth, 1));
                                setMonthSelectorOpen(false);
                                setYearSelectorOpen(false);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ChevronLeft size={18} className="text-gray-500" />
                        </button>

                        <div className="flex items-center gap-2 relative">
                            {/* Custom Month Selector */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
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
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl py-1 z-[70] max-h-[200px] overflow-y-auto w-[120px] custom-scrollbar">
                                        {months.map((m, i) => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
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
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
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
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl py-1 z-[70] max-h-[200px] overflow-y-auto w-[100px] custom-scrollbar">
                                        {years.map(y => (
                                            <button
                                                key={y}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
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
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
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
                            const isSelected = value === dateStr;
                            const isToday = isSameDay(day, new Date());
                            const isCurrentMonth = isSameMonth(day, monthStart);

                            return (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleDateSelect(day)}
                                    className={cn(
                                        "relative h-9 w-9 flex items-center justify-center rounded-full text-xs font-semibold transition-all",
                                        !isCurrentMonth ? "opacity-20" : "text-gray-700 hover:bg-gray-100",
                                        isSelected && "bg-black text-white font-bold shadow-md transform scale-110 z-10 hover:bg-gray-900",
                                        isToday && !isSelected && "bg-red-600 text-white shadow-lg shadow-red-200 z-10"
                                    )}
                                >
                                    <span className="relative z-10">{format(day, 'd')}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
