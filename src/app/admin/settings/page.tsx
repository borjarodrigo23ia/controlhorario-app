'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { DatePicker } from '@/components/ui/DatePicker';
import { Settings, CalendarDays, MapPin, Plus, Trash2, Monitor, Eye, EyeOff, Loader2, RefreshCw, Globe, Check, ChevronLeft, ChevronRight, ShieldCheck, Info, X, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    getDay,
    isSameDay,
    format,
    isWeekend,
    startOfWeek,
    endOfWeek
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const SPAIN_REGIONS: Record<string, string> = {
    'ES': 'España (Solo nacionales)',
    'ES-AN': 'Andalucía',
    'ES-AR': 'Aragón',
    'ES-AS': 'Asturias',
    'ES-IB': 'Islas Baleares',
    'ES-CN': 'Canarias',
    'ES-CB': 'Cantabria',
    'ES-CL': 'Castilla y León',
    'ES-CM': 'Castilla-La Mancha',
    'ES-CT': 'Cataluña',
    'ES-EX': 'Extremadura',
    'ES-GA': 'Galicia',
    'ES-MD': 'Comunidad de Madrid',
    'ES-MC': 'Región de Murcia',
    'ES-NC': 'Navarra',
    'ES-PV': 'País Vasco',
    'ES-RI': 'La Rioja',
    'ES-VC': 'Comunitat Valenciana',
};

interface Holiday {
    date: string;
    name: string;
    type: 'national' | 'local';
    id?: string;
}

export default function SettingsPage() {
    const currentYear = new Date().getFullYear();
    const [selectedRegion, setSelectedRegion] = useState('ES-MD');
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [localHolidays, setLocalHolidays] = useState<Holiday[]>([]);
    const [loadingHolidays, setLoadingHolidays] = useState(false);
    const [savingRegion, setSavingRegion] = useState(false);
    const [newHolidayDate, setNewHolidayDate] = useState('');
    const [newHolidayName, setNewHolidayName] = useState('');
    const [showKioskInfo, setShowKioskInfo] = useState(false);
    const [showFullYear, setShowFullYear] = useState(false);

    // Kiosk settings
    const [kioskEnabled, setKioskEnabled] = useState(false);
    const [kioskPin, setKioskPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [savingKiosk, setSavingKiosk] = useState(false);

    // Load saved settings from server and local holidays from localStorage
    useEffect(() => {
        const loadSettings = async () => {
            const token = localStorage.getItem('dolibarr_token');
            if (!token) return;

            try {
                // Load Region
                const regionRes = await fetch('/api/config/region', {
                    headers: { 'DOLAPIKEY': token }
                });
                if (regionRes.ok) {
                    const data = await regionRes.json();
                    if (data.region) setSelectedRegion(data.region);
                }

                // Load Kiosk Settings
                const kioskRes = await fetch('/api/config/kiosk', {
                    headers: { 'DOLAPIKEY': token }
                });
                if (kioskRes.ok) {
                    const data = await kioskRes.json();
                    setKioskEnabled(data.enabled);
                    setKioskPin(data.pin || '');
                }

                // Load Local Holidays (still in localStorage for now as there's no DB endpoint yet)
                const savedLocal = JSON.parse(localStorage.getItem('local_holidays') || '[]');
                setLocalHolidays(savedLocal);
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        };

        loadSettings();
    }, []);

    const fetchHolidays = useCallback(async (region: string) => {
        setLoadingHolidays(true);
        const token = localStorage.getItem('dolibarr_token');
        try {
            const res = await fetch(`/api/holidays?year=${currentYear}&region=${region}`, {
                headers: token ? { 'DOLAPIKEY': token } : {}
            });
            if (res.ok) {
                const data = await res.json();
                setHolidays(data.holidays || []);
            } else {
                toast.error('Error al cargar festivos');
            }
        } catch (e) {
            toast.error('Error de conexión');
        } finally {
            setLoadingHolidays(false);
        }
    }, [currentYear]);

    useEffect(() => {
        fetchHolidays(selectedRegion);
    }, [selectedRegion, fetchHolidays]);

    const handleSaveRegion = async () => {
        const token = localStorage.getItem('dolibarr_token');
        if (!token) {
            toast.error('Sesión no válida');
            return;
        }

        setSavingRegion(true);
        try {
            const res = await fetch('/api/config/region', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'DOLAPIKEY': token
                },
                body: JSON.stringify({ region: selectedRegion })
            });

            if (res.ok) {
                await fetchHolidays(selectedRegion);
                toast.success('Región guardada correctamente');
            } else {
                toast.error('Error al guardar la región');
            }
        } catch (error) {
            toast.error('Error de conexión');
        } finally {
            setSavingRegion(false);
        }
    };

    const handleAddLocalHoliday = () => {
        if (!newHolidayDate || !newHolidayName.trim()) {
            toast.error('Rellena la fecha y el nombre del festivo');
            return;
        }
        const newHoliday: Holiday = {
            date: newHolidayDate,
            name: newHolidayName.trim(),
            type: 'local',
            id: `local-${Date.now()}`
        };
        const updated = [...localHolidays, newHoliday].sort((a, b) => a.date.localeCompare(b.date));
        setLocalHolidays(updated);
        localStorage.setItem('local_holidays', JSON.stringify(updated));
        setNewHolidayDate('');
        setNewHolidayName('');
        toast.success('Festivo local añadido');
    };

    const handleDeleteLocalHoliday = (id: string) => {
        const updated = localHolidays.filter(h => h.id !== id);
        setLocalHolidays(updated);
        localStorage.setItem('local_holidays', JSON.stringify(updated));
        toast.success('Festivo eliminado');
    };

    const handleSaveKiosk = async () => {
        if (kioskEnabled && kioskPin.length !== 4) {
            toast.error('El PIN debe tener exactamente 4 dígitos');
            return;
        }

        const token = localStorage.getItem('dolibarr_token');
        if (!token) {
            toast.error('Sesión no válida');
            return;
        }

        setSavingKiosk(true);
        try {
            const res = await fetch('/api/config/kiosk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'DOLAPIKEY': token
                },
                body: JSON.stringify({ enabled: kioskEnabled, pin: kioskPin })
            });

            if (res.ok) {
                toast.success('Configuración de quiosco guardada');
            } else {
                toast.error('Error al guardar configuración');
            }
        } catch (error) {
            toast.error('Error de conexión');
        } finally {
            setSavingKiosk(false);
        }
    };

    // Combine national + local, sorted by date
    const allHolidays = [...holidays, ...localHolidays].sort((a, b) => a.date.localeCompare(b.date));

    const regionOptions = useMemo(() =>
        Object.entries(SPAIN_REGIONS).map(([id, label]) => ({ id, label })),
        []);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + 'T12:00:00');
        return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    const monthGroups = allHolidays.reduce((acc: Record<string, Holiday[]>, h) => {
        const month = new Date(h.date + 'T12:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        if (!acc[month]) acc[month] = [];
        acc[month].push(h);
        return acc;
    }, {});

    return (
        <div className="w-full space-y-8 pb-20">
            <PageHeader
                title="Configuración"
                subtitle="Ajustes globales del sistema de fichajes"
                badge="Sistema"
                icon={Settings}
                showBack={true}
                backUrl="/admin"
            />

            {/* ── Section 1: Días Festivos ── */}
            <section className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_20px_60px_rgb(0,0,0,0.03)] overflow-hidden">
                <div className="p-8 md:p-10 border-b border-gray-50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
                            <CalendarDays size={24} strokeWidth={2} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900 tracking-tight">Días Festivos {currentYear}</h2>
                            <p className="text-sm text-gray-400 font-medium mt-0.5">Configura los festivos nacionales y locales de tu empresa</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 md:p-10 space-y-8">
                    {/* Region Selector */}
                    <div>
                        <div className="flex flex-col sm:flex-row items-end gap-3">
                            <div className="flex-1 w-full">
                                <CustomSelect
                                    label="Comunidad Autónoma"
                                    options={regionOptions}
                                    value={selectedRegion}
                                    onChange={setSelectedRegion}
                                    icon={MapPin}
                                />
                            </div>
                            <button
                                onClick={handleSaveRegion}
                                disabled={savingRegion || loadingHolidays}
                                className="sm:w-48 w-full inline-flex items-center justify-center gap-3 px-8 h-14 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-black/10"
                            >
                                {savingRegion || loadingHolidays
                                    ? <Loader2 size={16} className="animate-spin" />
                                    : <Check size={16} strokeWidth={3} />
                                }
                                Aplicar
                            </button>
                        </div>
                        {/* Add local holiday (Quick entry below region selector) */}
                        <div className="pt-6">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                <Plus size={12} />
                                Añadir Festivo Local
                            </label>
                            <div className="flex flex-col sm:flex-row items-end gap-3">
                                <div className="flex-1 w-full">
                                    <DatePicker
                                        value={newHolidayDate}
                                        onChange={setNewHolidayDate}
                                    />
                                </div>
                                <div className="flex-1 w-full">
                                    <input
                                        type="text"
                                        value={newHolidayName}
                                        onChange={e => setNewHolidayName(e.target.value)}
                                        placeholder="Nombre del festivo local (ej. Fiestas del pueblo)"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 h-14 text-sm font-bold text-gray-900 placeholder:font-normal placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:bg-white transition-all shadow-sm"
                                        onKeyDown={e => e.key === 'Enter' && handleAddLocalHoliday()}
                                    />
                                </div>
                                <button
                                    onClick={handleAddLocalHoliday}
                                    className="sm:w-48 w-full inline-flex items-center justify-center gap-3 px-8 h-14 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-black/10"
                                >
                                    <Plus size={16} strokeWidth={3} />
                                    Añadir
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* Holiday Calendar Grid */}
                    <div>
                        <div className="flex items-center justify-between mb-8">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <CalendarDays size={12} />
                                Calendario {currentYear} — {SPAIN_REGIONS[selectedRegion]}
                            </label>
                            <button
                                onClick={() => fetchHolidays(selectedRegion)}
                                className="p-1.5 text-gray-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                                title="Recargar"
                            >
                                <RefreshCw size={14} className={loadingHolidays ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {loadingHolidays ? (
                            <div className="flex items-center justify-center py-24">
                                <Loader2 size={32} className="animate-spin text-primary" />
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                                    {Array.from({ length: 12 })
                                        .slice(0, showFullYear ? 12 : 6)
                                        .map((_, monthIndex) => {
                                            const date = new Date(currentYear, monthIndex, 1);
                                            const monthStart = startOfMonth(date);
                                            const monthEnd = endOfMonth(date);
                                            const calendarStart = startOfWeek(monthStart, { locale: es });
                                            const calendarEnd = endOfWeek(monthEnd, { locale: es });
                                            const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

                                            const monthHolidays = allHolidays.filter(h => {
                                                const hDate = new Date(h.date + 'T12:00:00');
                                                return hDate.getMonth() === monthIndex;
                                            });

                                            return (
                                                <div key={monthIndex} className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100/50 hover:bg-white hover:border-gray-200 transition-all duration-300">
                                                    <h4 className="text-[9px] font-black text-gray-900 uppercase tracking-widest mb-3 px-1 text-center">
                                                        {format(date, 'MMMM', { locale: es })}
                                                    </h4>

                                                    <div className="grid grid-cols-7 gap-0.5 mb-1.5 text-center text-[7px] font-black text-gray-300">
                                                        <span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span>
                                                    </div>

                                                    <div className="grid grid-cols-7 gap-0.5">
                                                        {days.map((day, i) => {
                                                            const isCurrentMonth = day.getMonth() === monthIndex;
                                                            const holiday = allHolidays.find(h => isSameDay(day, new Date(h.date + 'T12:00:00')));
                                                            const weekend = isWeekend(day);

                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className={cn(
                                                                        "aspect-square rounded-md flex items-center justify-center text-[9px] font-bold relative group/day",
                                                                        !isCurrentMonth && "opacity-0 pointer-events-none",
                                                                        isCurrentMonth && !holiday && !weekend && "text-gray-400 hover:bg-gray-100/50 transition-colors",
                                                                        isCurrentMonth && weekend && !holiday && "text-gray-200",
                                                                        holiday && holiday.type === 'local' && "bg-emerald-500 rounded-full text-white shadow-lg shadow-emerald-500/30",
                                                                        holiday && holiday.type === 'national' && "bg-red-600 rounded-full text-white shadow-lg shadow-red-600/30"
                                                                    )}
                                                                    title={holiday?.name}
                                                                >
                                                                    {day.getDate()}

                                                                    {holiday && (
                                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-black text-white text-[9px] p-2 rounded-xl opacity-0 group-hover/day:opacity-100 transition-opacity z-10 pointer-events-none text-center shadow-xl">
                                                                            <p className="font-black leading-tight">{holiday.name}</p>
                                                                            <p className="opacity-60 mt-0.5">{holiday.type === 'local' ? 'Local' : 'Oficial'}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>

                                <div className="mt-10 flex">
                                    <button
                                        onClick={() => setShowFullYear(!showFullYear)}
                                        className="w-full inline-flex items-center justify-center gap-3 h-14 bg-white text-gray-500 hover:text-black border border-gray-200 hover:border-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
                                    >
                                        {showFullYear ? (
                                            <>
                                                <ChevronUp size={16} strokeWidth={3} />
                                                Mostrar menos
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown size={16} strokeWidth={3} />
                                                Ver año completo
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Legend */}
                        <div className="mt-8 flex flex-wrap gap-6 px-1">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full bg-red-600" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Festivo Nacional/Regional</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Festivo Local</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-md border border-dashed border-gray-200" />
                                <span className="text-[10px] font-black text-gray-200 uppercase tracking-wider">Fin de semana</span>
                            </div>
                        </div>
                    </div>

                    {/* Manage Local Holidays Tabular List (For deleting) */}
                    {localHolidays.length > 0 && (
                        <div className="border-t border-gray-50 pt-10">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <Trash2 size={12} />
                                Gestionar Festivos Locales
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {localHolidays.map((h) => (
                                    <div key={h.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/80 border border-gray-100 group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                                <CalendarDays size={14} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-900">{h.name}</p>
                                                <p className="text-[10px] text-gray-400 font-medium">{formatDate(h.date)}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteLocalHoliday(h.id!)}
                                            className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </section>

            {/* ── Section 2: Modo Quiosco ── */}
            <section className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_20px_60px_rgb(0,0,0,0.03)] overflow-hidden mt-8">
                <div className="p-8 md:p-10 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-white shadow-xl shadow-black/10">
                            <Monitor size={28} strokeWidth={2} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-gray-900 tracking-tight">Modo Quiosco</h2>
                                <button
                                    onClick={() => setShowKioskInfo(true)}
                                    className="md:hidden p-2 text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all"
                                >
                                    <Info size={22} />
                                </button>
                            </div>
                            <p className="text-sm text-gray-400 font-medium mt-0.5">Control de presencia centralizado para oficinas</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-4">Servicio</span>
                        <button
                            onClick={() => setKioskEnabled(!kioskEnabled)}
                            className={cn(
                                "relative w-16 h-8 rounded-full transition-all duration-500",
                                kioskEnabled ? 'bg-black shadow-lg shadow-black/10' : 'bg-gray-200'
                            )}
                        >
                            <div className={cn(
                                "absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-500 flex items-center justify-center",
                                kioskEnabled ? 'translate-x-9' : 'translate-x-1'
                            )}>
                                {kioskEnabled && <div className="w-2 h-2 bg-black rounded-full" />}
                            </div>
                        </button>
                    </div>
                </div>

                <div className="p-8 md:p-10 space-y-12">
                    {/* Visual Explanation Grid - Hidden on mobile, shown in popup */}
                    <div className="hidden md:grid grid-cols-3 gap-10">
                        <div className="space-y-4">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-black border border-gray-100">
                                <Monitor size={20} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2">Pantalla Compartida</h3>
                                <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                                    Habilita un punto de fichaje en una tablet o PC navegando a <span className="text-black font-bold">/kiosk</span>.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-black border border-gray-100">
                                <Plus size={20} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2">Fichaje por PIN</h3>
                                <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                                    Los empleados se identifican con su PIN personal de 4 dígitos para registrar su jornada.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-black border border-gray-100">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2">Bloqueo de Seguridad</h3>
                                <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                                    Usa el PIN de administración para restringir el acceso al panel de control desde el quiosco.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* PIN config & Actions */}
                    <div className="bg-gray-50/50 rounded-[2.5rem] p-8 md:p-10 border border-gray-100">
                        <div className="flex flex-col md:flex-row gap-10">
                            <div className="flex-1 space-y-8">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-4 block">
                                        PIN de Configuración (Admin)
                                    </label>
                                    <div className="relative max-w-[200px]">
                                        <input
                                            type={showPin ? 'text' : 'password'}
                                            value={kioskPin}
                                            onChange={e => setKioskPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                            placeholder="····"
                                            maxLength={4}
                                            className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 text-3xl font-black text-gray-900 tracking-[0.6em] focus:outline-none focus:ring-4 focus:ring-black/5 transition-all pr-16"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPin(!showPin)}
                                            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-black transition-colors"
                                        >
                                            {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium mt-4 max-w-xs leading-relaxed">
                                        PIN maestro necesario para salir de la pantalla de quiosco y acceder a los ajustes del sistema.
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                        Cada empleado usa su PIN asignado en su ficha de usuario
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col justify-center gap-4 md:border-l md:border-gray-200/50 md:pl-10">
                                <button
                                    onClick={handleSaveKiosk}
                                    disabled={savingKiosk}
                                    className="inline-flex items-center justify-center gap-3 px-8 h-14 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-black/10 min-w-[200px]"
                                >
                                    {savingKiosk ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
                                    Guardar Ajustes
                                </button>
                                <a
                                    href="/kiosk"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center gap-3 px-8 h-14 bg-white text-black border border-gray-200 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95 shadow-sm min-w-[200px]"
                                >
                                    <Monitor size={16} strokeWidth={2.5} />
                                    Ver Quiosco
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Kiosk Mode Info Modal (Mobile Only) */}
            {showKioskInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setShowKioskInfo(false)}
                    />
                    <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
                                    <Monitor size={20} />
                                </div>
                                <h3 className="text-lg font-black text-gray-900 tracking-tight">Cómo funciona</h3>
                            </div>
                            <button
                                onClick={() => setShowKioskInfo(false)}
                                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 space-y-10">
                            <div className="flex gap-5">
                                <div className="w-12 h-12 shrink-0 rounded-[1.2rem] bg-gray-50 flex items-center justify-center text-black border border-gray-100 shadow-sm">
                                    <Monitor size={22} />
                                </div>
                                <div>
                                    <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-1.5">Pantalla Compartida</h4>
                                    <p className="text-xs text-gray-400 font-medium leading-relaxed">
                                        Configura cualquier tablet o PC como punto de fichaje accediendo a <span className="text-black font-bold">/kiosk</span>.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-5">
                                <div className="w-12 h-12 shrink-0 rounded-[1.2rem] bg-gray-50 flex items-center justify-center text-black border border-gray-100 shadow-sm">
                                    <Plus size={22} />
                                </div>
                                <div>
                                    <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-1.5">Fichaje por PIN</h4>
                                    <p className="text-xs text-gray-400 font-medium leading-relaxed">
                                        Seguro y rápido: identificación personal mediante PIN de 4 dígitos para cada empleado.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-5">
                                <div className="w-12 h-12 shrink-0 rounded-[1.2rem] bg-gray-50 flex items-center justify-center text-black border border-gray-100 shadow-sm">
                                    <ShieldCheck size={22} />
                                </div>
                                <div>
                                    <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-1.5">Seguridad Admin</h4>
                                    <p className="text-xs text-gray-400 font-medium leading-relaxed">
                                        Restringe el acceso al panel mediante el PIN de administración para evitar cambios no autorizados.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 pt-0">
                            <button
                                onClick={() => setShowKioskInfo(false)}
                                className="w-full h-14 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-black/10"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
