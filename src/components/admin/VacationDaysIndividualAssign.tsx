'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useVacationDays, UserVacationDays } from '@/hooks/useVacationDays';
import { useVacations } from '@/hooks/useVacations';
import { Calendar, Save, Loader2, CheckCircle2, AlertCircle, ChevronRight, Palmtree, PencilLine, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface VacationDaysIndividualAssignProps {
    userId: string;
}

export default function VacationDaysIndividualAssign({ userId }: VacationDaysIndividualAssignProps) {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [days, setDays] = useState<number | string>(22);
    const [currentData, setCurrentData] = useState<UserVacationDays | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [consumedDays, setConsumedDays] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [isYearOpen, setIsYearOpen] = useState(false);
    const yearRef = useRef<HTMLDivElement>(null);

    const { fetchVacationDays, setVacationDays, loading } = useVacationDays();
    const { fetchVacations } = useVacations();

    const calculateBusinessDays = (startDate: string, endDate: string) => {
        let count = 0;
        const curDate = new Date(startDate);
        const end = new Date(endDate);

        while (curDate <= end) {
            const dayOfWeek = curDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
            curDate.setDate(curDate.getDate() + 1);
        }
        return count;
    };

    const loadData = async () => {
        const allDays = await fetchVacationDays(selectedYear);
        const userData = allDays.find(d => d.fk_user.toString() === userId);

        if (userData) {
            setCurrentData(userData);
            setDays(userData.dias);
            setIsEditing(false);
        } else {
            setCurrentData(null);
            setDays(22); // Default
            setIsEditing(true);
        }

        // Calculate consumed days from approved vacations
        // We need the user's login to filter vacations properly. 
        // For now, if we have userData (from vacation days endpoint), we use it.
        // If not, we might need to fetch user details first or rely on prop if available.
        // Assuming fetchVacations can filter by user ID or we filter manually if needed.
        // The fetchVacations hook expects filters:{ usuario: string }. 
        // We don't have the login here directly unless we fetch user details.
        // Let's rely on the parent component passing user details OR fetch user details here.
        // Given complexity, let's fetch user details to get login for vacation filtering.
        try {
            const token = localStorage.getItem('dolibarr_token');
            const userRes = await fetch(`/api/users/${userId}`, { headers: { 'DOLAPIKEY': token || '' } });
            if (userRes.ok) {
                const user = await userRes.json();
                const vacations = await fetchVacations({ usuario: user.login, estado: 'aprobado' });

                // Filter by year
                const yearVacations = vacations.filter(v => {
                    const d = new Date(v.fecha_inicio);
                    return d.getFullYear() === selectedYear;
                });

                let totalConsumed = 0;
                yearVacations.forEach(v => {
                    totalConsumed += calculateBusinessDays(v.fecha_inicio, v.fecha_fin);
                });
                setConsumedDays(totalConsumed);
            }
        } catch (e) {
            console.error("Error fetching consumed days", e);
        }
    };

    useEffect(() => {
        if (userId) {
            loadData();
        }
    }, [userId, selectedYear]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (yearRef.current && !yearRef.current.contains(event.target as Node)) {
                setIsYearOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setIsSuccess(false);
        try {
            const result = await setVacationDays(parseInt(userId), selectedYear, Number(days) || 0);
            if (result.success) {
                toast.success(`Días asignados correctamente para ${selectedYear}`);
                setIsSuccess(true);
                await loadData();
                setIsEditing(false);
                setTimeout(() => setIsSuccess(false), 3000);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Error al guardar los días');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-3">
            {/* Top Row: Selectors */}
            <div className="flex items-center gap-2">
                {/* Year Selector */}
                <div ref={yearRef} className="relative flex-1">
                    <button
                        onClick={() => setIsYearOpen(!isYearOpen)}
                        className="flex items-center justify-between w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 px-4 py-2 h-[54px] rounded-2xl shadow-sm transition-all hover:bg-white dark:hover:bg-zinc-800 hover:border-blue-500/20 active:scale-95"
                    >
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className={isYearOpen ? "text-blue-600" : "text-gray-400"} />
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {selectedYear}
                            </span>
                        </div>
                        <ChevronRight size={12} className={`text-gray-400 transition-transform duration-300 ${isYearOpen ? 'rotate-90 text-blue-600' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {isYearOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                            <div className="space-y-1">
                                {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                                    <button
                                        key={y}
                                        onClick={() => {
                                            setSelectedYear(y);
                                            setIsYearOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${selectedYear === y
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800 dark:text-gray-400'
                                            }`}
                                    >
                                        {y}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Days Input - Shown only in Edit Mode */}
                {isEditing && (
                    <div className="flex-1 flex items-center bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 px-4 py-2 h-[54px] rounded-2xl shadow-sm group focus-within:bg-white dark:focus-within:bg-zinc-800 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                        <div className="flex flex-col flex-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-0.5">Días</span>
                            <input
                                type="number"
                                value={days}
                                onChange={(e) => setDays(e.target.value)}
                                className="bg-transparent text-lg font-black text-gray-900 dark:text-white outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Content Area */}
            {isEditing ? (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <button
                        onClick={() => {
                            setDays(currentData?.dias || 22);
                            setIsEditing(false);
                        }}
                        className="w-14 h-[54px] flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                        title="Cancelar"
                    >
                        <X size={20} className="text-red-600" />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`group relative flex-1 h-[54px] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all overflow-hidden active:scale-[0.98] disabled:opacity-50 ${isSuccess
                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                            : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90 shadow-xl shadow-black/5'
                            }`}
                    >
                        <div className="relative z-10 flex items-center justify-center gap-3">
                            {isSaving ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : isSuccess ? (
                                <>
                                    <CheckCircle2 size={18} />
                                    <span>Guardado</span>
                                </>
                            ) : (
                                <>
                                    <Save size={18} className="group-hover:scale-110 transition-transform" />
                                    <span>Guardar Cambios</span>
                                </>
                            )}
                        </div>
                    </button>
                </div>
            ) : (
                <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="relative overflow-hidden bg-white p-4 rounded-2xl border border-gray-200 flex flex-col items-center justify-center text-center space-y-1 group hover:border-green-200 transition-colors">
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500/80 blur-xl rounded-full group-hover:bg-green-500 transition-all" />
                            <span className="relative z-10 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Asignados</span>
                            <span className="relative z-10 text-2xl font-black text-black">{days}</span>
                        </div>
                        <div className="relative overflow-hidden bg-white p-4 rounded-2xl border border-gray-200 flex flex-col items-center justify-center text-center space-y-1 group hover:border-red-200 transition-colors">
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-red-500/80 blur-xl rounded-full group-hover:bg-red-500 transition-all" />
                            <span className="relative z-10 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Consumidos</span>
                            <span className="relative z-10 text-2xl font-black text-black">{consumedDays}</span>
                        </div>
                        <div className="relative overflow-hidden bg-white p-4 rounded-2xl border border-gray-200 flex flex-col items-center justify-center text-center space-y-1 group hover:border-yellow-200 transition-colors">
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-yellow-500/80 blur-xl rounded-full group-hover:bg-yellow-500 transition-all" />
                            <span className="relative z-10 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Disponibles</span>
                            <span className="relative z-10 text-2xl font-black text-black">{Number(days) - consumedDays}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsEditing(true)}
                        className="w-full bg-black text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-gray-900 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2 group"
                    >
                        <PencilLine size={14} className="group-hover:scale-110 transition-transform" />
                        <span>Editar Asignación</span>
                    </button>
                </div>
            )}
        </div>
    );
}
