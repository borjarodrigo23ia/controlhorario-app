'use client';

import { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimePickerProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    disabled?: boolean;
    className?: string;
    compact?: boolean;
}

export function TimePicker({ value, onChange, label, disabled = false, className, compact = false }: TimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse value (HH:MM)
    const [hours, minutes] = value ? value.split(':').map(Number) : [null, null];

    const hoursList = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minutesList = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')); // 5 minute steps for easier picking, or full 60?
    // Let's do full 60 for precision but maybe scrollable
    const minutesListFull = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleHourClick = (h: string) => {
        const m = minutes !== null ? minutes.toString().padStart(2, '0') : '00';
        onChange(`${h}:${m}`);
    };

    const handleMinuteClick = (m: string) => {
        const h = hours !== null ? hours.toString().padStart(2, '0') : '00';
        onChange(`${h}:${m}`);
    };

    // Scroll to current time on open
    const scrollRefHours = useRef<HTMLDivElement>(null);
    const scrollRefMinutes = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && hours !== null && scrollRefHours.current) {
            const el = scrollRefHours.current.querySelector(`[data-value="${hours.toString().padStart(2, '0')}"]`);
            if (el) el.scrollIntoView({ block: 'center' });
        }
        if (isOpen && minutes !== null && scrollRefMinutes.current) {
            const el = scrollRefMinutes.current.querySelector(`[data-value="${minutes.toString().padStart(2, '0')}"]`);
            if (el) el.scrollIntoView({ block: 'center' });
        }
    }, [isOpen, hours, minutes]);


    return (
        <div className={cn("relative", className)} ref={containerRef}>
            {label && (
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2">
                    <Clock size={16} /> {label}
                </label>
            )}

            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={cn(
                    "w-full bg-white border border-gray-100 rounded-2xl px-5 font-bold text-gray-900 flex items-center justify-between tracking-tight shadow-sm transition-all focus:ring-2 focus:ring-primary/20",
                    compact ? "py-2.5 h-10 text-sm" : "py-4 h-12 md:h-14 text-base",
                    disabled && "opacity-50 cursor-not-allowed bg-gray-50",
                    !value && "text-gray-300"
                )}
            >
                <span className="flex items-center gap-3">
                    {!label && <Clock size={18} className="text-gray-400" />}
                    {value || '--:--'}
                </span>
                <ChevronDown size={18} className={cn("text-gray-400 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex gap-4 animate-in fade-in zoom-in-95 duration-200 min-w-[280px]">
                    {/* Hours */}
                    <div className="flex-1 flex flex-col items-center">
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">Hora</span>
                        <div className="h-48 overflow-y-auto w-full custom-scrollbar scroll-smooth" ref={scrollRefHours}>
                            <div className="space-y-1">
                                {hoursList.map((h) => (
                                    <button
                                        key={h}
                                        data-value={h}
                                        type="button"
                                        onClick={() => handleHourClick(h)}
                                        className={cn(
                                            "w-full py-2 rounded-xl text-sm font-bold transition-colors",
                                            hours?.toString().padStart(2, '0') === h
                                                ? "bg-gray-900 text-white"
                                                : "text-gray-600 hover:bg-gray-50"
                                        )}
                                    >
                                        {h}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Separator */}
                    <div className="h-48 w-px bg-gray-100 my-auto" />

                    {/* Minutes */}
                    <div className="flex-1 flex flex-col items-center">
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">Min</span>
                        <div className="h-48 overflow-y-auto w-full custom-scrollbar scroll-smooth" ref={scrollRefMinutes}>
                            <div className="space-y-1">
                                {minutesListFull.map((m) => (
                                    <button
                                        key={m}
                                        data-value={m}
                                        type="button"
                                        onClick={() => handleMinuteClick(m)}
                                        className={cn(
                                            "w-full py-2 rounded-xl text-sm font-bold transition-colors",
                                            minutes?.toString().padStart(2, '0') === m
                                                ? "bg-gray-900 text-white"
                                                : "text-gray-600 hover:bg-gray-50"
                                        )}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
