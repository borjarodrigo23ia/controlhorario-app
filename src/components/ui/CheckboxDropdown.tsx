'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Option {
    id: string;
    label: string;
}

interface CheckboxDropdownProps {
    label: string;
    options: Option[];
    selectedValues: string[];
    onToggle: (id: string) => void;
    className?: string;
    compact?: boolean;
}

export const CheckboxDropdown: React.FC<CheckboxDropdownProps> = ({
    label,
    options,
    selectedValues,
    onToggle,
    className,
    compact = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedCount = selectedValues.filter(v => v !== '0').length;
    const isAllSelected = selectedValues.includes('0');

    return (
        <div className={cn("relative inline-block", className)} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "group flex items-center justify-between transition-all duration-300 border focus:outline-none focus:ring-4 focus:ring-primary/10 w-full",
                    compact ? "gap-2 px-3 md:px-5 py-2 md:py-3 rounded-xl" : "gap-6 px-10 py-3.5 rounded-2xl",
                    isOpen
                        ? "bg-white text-[#121726] border-primary shadow-lg ring-2 ring-primary/5"
                        : "bg-white text-gray-700 border-gray-200 shadow-sm hover:border-primary/30 hover:shadow-md active:scale-95"
                )}
            >
                <div className={cn("flex items-center min-w-0 flex-1", compact ? "gap-2" : "gap-4")}>
                    <div className={cn(
                        "rounded-full ring-2 ring-offset-2 transition-all shrink-0",
                        compact ? "w-1.5 h-1.5" : "w-2.5 h-2.5",
                        isAllSelected ? "bg-green-500 ring-green-100 scale-110" : (selectedCount > 0 ? "bg-green-500 ring-green-100 scale-110" : "bg-gray-300 ring-transparent")
                    )} />
                    <span className={cn("font-black tracking-tight uppercase truncate", compact ? "text-[10px]" : "text-sm")}>{label}</span>
                </div>
                <ChevronDown
                    className={cn(
                        "transition-transform duration-300",
                        compact ? "w-3 h-3" : "w-5 h-5",
                        isOpen ? "rotate-180 opacity-100" : "opacity-40 group-hover:opacity-100"
                    )}
                />
            </button>

            {/* Dropdown menu - Simplified & Realigned */}
            <div
                className={cn(
                    "absolute left-0 lg:left-auto lg:right-0 z-[100] mt-3 bg-white border border-gray-200 rounded-[2.5rem] shadow-2xl w-80 transition-all duration-300 origin-top overflow-visible",
                    isOpen ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-4 scale-95 pointer-events-none"
                )}
            >
                <div className="p-5 border-b border-gray-50 bg-gray-50/50 rounded-t-[2.5rem]">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Filtrar por Empleados</p>
                </div>
                <ul className="p-4 space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar">
                    {options.map((option) => (
                        <li key={option.id}>
                            <div
                                onClick={() => onToggle(option.id)}
                                className={cn(
                                    "flex items-center gap-4 px-5 py-4 rounded-2xl cursor-pointer transition-all duration-200 group relative border-2",
                                    selectedValues.includes(option.id)
                                        ? "bg-white border-primary text-primary shadow-md shadow-primary/5 scale-[1.02]"
                                        : "bg-white border-transparent hover:bg-gray-50 text-gray-700"
                                )}
                            >
                                <div className={cn(
                                    "relative flex items-center justify-center w-6 h-6 rounded-lg border-2 transition-all duration-200",
                                    selectedValues.includes(option.id)
                                        ? "bg-primary border-primary shadow-sm"
                                        : "border-gray-200 group-hover:border-primary/40"
                                )}>
                                    {selectedValues.includes(option.id) && (
                                        <div className="w-2 h-2 rounded-full bg-green-400 shadow-inner animate-in zoom-in-50 duration-300" />
                                    )}
                                </div>
                                <span className={cn(
                                    "text-sm font-black tracking-tight",
                                    selectedValues.includes(option.id) ? "text-primary" : "text-gray-700"
                                )}>
                                    {option.label}
                                </span>
                            </div>
                        </li>
                    ))}
                    {options.length === 0 && (
                        <div className="p-8 text-center text-gray-400 font-medium italic text-sm">
                            No se encontraron empleados
                        </div>
                    )}
                </ul>
            </div>
        </div>
    );
};
