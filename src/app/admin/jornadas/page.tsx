'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { CalendarRange, Save, User, Check, Search, Calendar, Clock, Loader2, Users, LayoutGrid, CalendarDays, CalendarMinus2, LocateFixed, RefreshCcw, X } from 'lucide-react';
import { TimePicker } from '@/components/ui/TimePicker';
import { toast } from 'react-hot-toast';
import { DolibarrUser } from '@/lib/admin-types';

export default function ScheduleManagementPage() {
    // Data State
    const [users, setUsers] = useState<DolibarrUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [userSearch, setUserSearch] = useState('');

    // Selection State
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

    // Form State
    const [formData, setFormData] = useState({
        tipo_jornada: 'partida', // partida | intensiva
        tipo_turno: 'fijo',      // fijo | rotativo
        hora_inicio_jornada: '09:00',
        hora_fin_jornada: '18:00',
        pausas: [] as { hora_inicio: string, hora_fin: string, descripcion?: string }[],
        observaciones: '',
        dias_semana: [1, 2, 3, 4, 5] as number[] // default Mon-Fri
    });

    const [isSaving, setIsSaving] = useState(false);

    // Fetch Users
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = localStorage.getItem('dolibarr_token');
                const res = await fetch('/api/users?limit=1000', {
                    headers: { 'DOLAPIKEY': token || '' },
                    cache: 'no-store'
                });
                if (res.ok) {
                    const data: DolibarrUser[] = await res.json();
                    // Filter active users
                    const activeUsers = data.filter(u => u.active !== '0');
                    setUsers(activeUsers);
                } else {
                    toast.error('Error al cargar empleados');
                }
            } catch (error) {
                toast.error('Error de conexión');
            } finally {
                setLoadingUsers(false);
            }
        };
        fetchUsers();
    }, []);

    const handleSelectAll = () => {
        if (selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0) {
            setSelectedUserIds(new Set());
        } else {
            const allIds = filteredUsers.map(u => u.id);
            setSelectedUserIds(new Set(allIds));
        }
    };

    const toggleUser = (id: string) => {
        const newSet = new Set(selectedUserIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedUserIds(newSet);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const addPausa = () => {
        setFormData(prev => ({
            ...prev,
            pausas: [...prev.pausas, { hora_inicio: '14:00', hora_fin: '15:00', descripcion: '' }]
        }));
    };

    const removePausa = (index: number) => {
        setFormData(prev => ({
            ...prev,
            pausas: prev.pausas.filter((_, i) => i !== index)
        }));
    };

    const updatePausa = (index: number, field: string, value: string) => {
        setFormData(prev => {
            const newPausas = [...prev.pausas];
            newPausas[index] = { ...newPausas[index], [field]: value };
            return { ...prev, pausas: newPausas };
        });
    };

    const handleSubmit = async () => {
        if (selectedUserIds.size === 0) {
            toast.error('Selecciona al menos un empleado');
            return;
        }

        if (!formData.hora_inicio_jornada || !formData.hora_fin_jornada) {
            toast.error('Horas de inicio y fin son obligatorias');
            return;
        }

        if (formData.tipo_jornada === 'partida' && formData.pausas.length === 0) {
            if (!confirm('Ha seleccionado jornada partida sin pausas. ¿Desea continuar?')) return;
        }

        if (!confirm(`¿Estás seguro de asignar esta jornada a ${selectedUserIds.size} empleados?`)) return;

        setIsSaving(true);
        const token = localStorage.getItem('dolibarr_token');
        let successCount = 0;
        let errorCount = 0;

        const promises = Array.from(selectedUserIds).map(async (userId) => {
            try {
                const payload = {
                    fk_user: userId,
                    ...formData,
                    active_days: formData.dias_semana // Map to backend field
                };

                // If intensiva, clear pauses
                if (payload.tipo_jornada === 'intensiva') {
                    payload.pausas = [];
                }

                const res = await fetch('/api/jornadas', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'DOLAPIKEY': token || ''
                    },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    successCount++;
                } else {
                    errorCount++;
                    console.error(`Error assigning to user ${userId}`);
                }
            } catch (e) {
                errorCount++;
                console.error(e);
            }
        });

        await Promise.all(promises);

        setIsSaving(false);
        if (successCount > 0) toast.success(`Jornada asignada a ${successCount} empleados`);
        if (errorCount > 0) toast.error(`Falló la asignación en ${errorCount} empleados`);
    };

    const filteredUsers = users.filter(u =>
        u.login.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.firstname + ' ' + u.lastname).toLowerCase().includes(userSearch.toLowerCase())
    );

    return (
        <>
            <PageHeader
                title="Gestión de Jornadas"
                subtitle="Centro de control para asignación de horarios"
                icon={CalendarRange}
                badge="RRHH"
                showBack={true}
            />

            <div className="max-w-[1400px] w-full mx-auto">
                {/* ========================================
                    MOBILE LAYOUT — Preserved exactly as-is
                   ======================================== */}
                <div className="block lg:hidden bg-white rounded-[2rem] p-6 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col gap-10">

                    {/* SECTION 1: CONFIGURATION */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-black flex items-center gap-3">
                            <div className="p-2.5 bg-black rounded-xl text-white">
                                <Clock size={20} strokeWidth={2} />
                            </div>
                            Configuración del Horario
                        </h2>

                        <div className="space-y-5 p-1">
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {/* Tipo de Jornada */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Tipo de Jornada</label>
                                        <div className="grid grid-cols-3 gap-2 bg-gray-50 p-1 rounded-2xl border border-gray-100/50">
                                            {[
                                                { id: 'partida', label: 'Partida', icon: CalendarDays },
                                                { id: 'intensiva', label: 'Intensiva', icon: CalendarMinus2 },
                                                { id: 'flexible', label: 'Flexible', icon: CalendarRange }
                                            ].map(opt => (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, tipo_jornada: opt.id as any }))}
                                                    className={`flex items-center justify-center gap-1.5 py-3 rounded-xl transition-all duration-200 ${formData.tipo_jornada === opt.id
                                                        ? 'bg-white text-black shadow-sm font-bold'
                                                        : 'text-gray-400 hover:text-gray-600 font-medium'
                                                        }`}
                                                >
                                                    <opt.icon size={13} />
                                                    <span className="text-[10px] uppercase tracking-wide">{opt.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Modalidad (Tipo de Turno) */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Modalidad</label>
                                        <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-2xl border border-gray-100/50">
                                            {[
                                                { id: 'fijo', label: 'Fijo', icon: LocateFixed },
                                                { id: 'rotativo', label: 'Rotativo', icon: RefreshCcw }
                                            ].map(opt => (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, tipo_turno: opt.id as any }))}
                                                    className={`flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-200 ${formData.tipo_turno === opt.id
                                                        ? 'bg-white text-black shadow-sm font-bold'
                                                        : 'text-gray-400 hover:text-gray-600 font-medium'
                                                        }`}
                                                >
                                                    <opt.icon size={14} />
                                                    <span className="text-[11px] uppercase tracking-wide">{opt.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Days of Week Selector */}
                                <div className="space-y-3 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Calendar size={14} className="text-gray-400" />
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Días de la semana</label>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { id: 1, label: 'L', name: 'Lunes' },
                                            { id: 2, label: 'M', name: 'Martes' },
                                            { id: 3, label: 'X', name: 'Miércoles' },
                                            { id: 4, label: 'J', name: 'Jueves' },
                                            { id: 5, label: 'V', name: 'Viernes' },
                                            { id: 6, label: 'S', name: 'Sábado' },
                                            { id: 0, label: 'D', name: 'Domingo' }
                                        ].map(day => {
                                            const isSelected = formData.dias_semana.includes(day.id);
                                            return (
                                                <button
                                                    key={day.id}
                                                    type="button"
                                                    onClick={() => {
                                                        const newDays = isSelected
                                                            ? formData.dias_semana.filter(d => d !== day.id)
                                                            : [...formData.dias_semana, day.id].sort();
                                                        setFormData(prev => ({ ...prev, dias_semana: newDays }));
                                                    }}
                                                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-[12px] font-black transition-all duration-200 border shadow-sm active:scale-95 ${isSelected
                                                        ? 'bg-black border-black text-white shadow-lg shadow-black/10'
                                                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                                                        }`}
                                                    title={day.name}
                                                >
                                                    {day.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest pl-1">
                                        Selección para cálculo de horas esperadas
                                    </p>
                                </div>

                                {/* Hours Configuration */}
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-sm shadow-emerald-200"></div>
                                            Entrada
                                        </label>
                                        <TimePicker
                                            value={formData.hora_inicio_jornada}
                                            onChange={(v) => setFormData(prev => ({ ...prev, hora_inicio_jornada: v }))}
                                        />
                                    </div>

                                    {/* Dynamic Pauses (In Between) */}
                                    {formData.tipo_jornada === 'partida' && (
                                        <div className="space-y-4 pt-2 border-t border-b border-gray-100 py-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Pausas / Descansos</label>
                                                <button
                                                    onClick={addPausa}
                                                    className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                                                >
                                                    + Añadir Pausa
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {formData.pausas.map((pausa, idx) => (
                                                    <div key={idx} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 relative group animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <button
                                                            onClick={() => removePausa(idx)}
                                                            className="absolute -top-2 -right-2 bg-white text-gray-400 hover:text-red-500 p-1.5 rounded-full shadow-sm border border-gray-200 opacity-100 transition-all z-10"
                                                        >
                                                            <X size={14} />
                                                        </button>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1">Inicio Pausa</label>
                                                                <TimePicker
                                                                    value={pausa.hora_inicio}
                                                                    onChange={(v) => updatePausa(idx, 'hora_inicio', v)}
                                                                    compact
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1">Fin Pausa</label>
                                                                <TimePicker
                                                                    value={pausa.hora_fin}
                                                                    onChange={(v) => updatePausa(idx, 'hora_fin', v)}
                                                                    compact
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="mt-4">
                                                            <input
                                                                type="text"
                                                                placeholder="Descripción (opcional)"
                                                                value={pausa.descripcion || ''}
                                                                onChange={(e) => updatePausa(idx, 'descripcion', e.target.value)}
                                                                className="w-full bg-white border border-gray-100 focus:border-black/10 focus:ring-4 focus:ring-black/2 rounded-xl text-xs font-bold py-3 px-4 outline-none transition-all placeholder:text-gray-300 shadow-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}

                                                {formData.pausas.length === 0 && (
                                                    <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-2xl text-gray-300 text-xs font-medium">
                                                        Sin pausas configuradas
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                            Salida
                                        </label>
                                        <TimePicker
                                            value={formData.hora_fin_jornada}
                                            onChange={(v) => setFormData(prev => ({ ...prev, hora_fin_jornada: v }))}
                                        />
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="space-y-2 pt-2">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1">Observaciones</label>
                                    <textarea
                                        name="observaciones"
                                        value={formData.observaciones}
                                        onChange={handleInputChange}
                                        rows={2}
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-black/10 focus:bg-white rounded-2xl p-4 text-sm font-medium outline-none transition-all resize-none placeholder:text-gray-300"
                                        placeholder="Opcional: detalles adicionales..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-gray-100 w-full" />

                        {/* SECTION 2: USERS */}
                        <div className="space-y-6 flex-1 flex flex-col min-h-[400px]">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <h2 className="text-xl font-bold text-black flex items-center gap-3 self-start sm:self-center">
                                    <div className="p-2.5 bg-black rounded-xl text-white">
                                        <Users size={20} strokeWidth={2} />
                                    </div>
                                    Selección de Empleados
                                </h2>

                                <div className="flex items-center gap-3 w-full sm:w-auto bg-gray-50 p-1.5 rounded-2xl">
                                    <div className="relative flex-1 sm:w-56">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Buscar usuario..."
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                            className="w-full pl-10 pr-3 py-2 bg-white rounded-xl text-sm font-bold shadow-sm outline-none placeholder:text-gray-300"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSelectAll}
                                        className="p-2.5 text-xs font-bold text-gray-500 hover:text-black hover:bg-white rounded-xl transition-all whitespace-nowrap"
                                    >
                                        {selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0 ? 'Ninguno' : 'Todos'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[500px]">
                                {loadingUsers ? (
                                    <div className="flex flex-col items-center justify-center h-48 text-gray-300 gap-3">
                                        <Loader2 className="animate-spin" size={32} />
                                        <span className="text-xs font-bold uppercase tracking-widest">Cargando Usuarios</span>
                                    </div>
                                ) : filteredUsers.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-48 text-gray-300 gap-3">
                                        <Users size={48} strokeWidth={1} />
                                        <span className="text-sm font-medium">No se encontraron resultados</span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {filteredUsers.map(user => {
                                            const isSelected = selectedUserIds.has(user.id);
                                            return (
                                                <div
                                                    key={user.id}
                                                    onClick={() => toggleUser(user.id)}
                                                    className={`group relative flex items-center gap-4 p-4 rounded-2xl cursor-pointer border-2 transition-all duration-200 ${isSelected
                                                        ? 'bg-white border-green-500 text-gray-900 shadow-xl shadow-green-500/10'
                                                        : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-lg hover:shadow-black/5'
                                                        }`}
                                                >
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-colors ${isSelected ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-black'
                                                        }`}>
                                                        {user.firstname?.[0] || user.login[0]}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-sm truncate text-gray-900">
                                                            {user.firstname} {user.lastname}
                                                        </p>
                                                        <p className="text-xs font-medium truncate text-gray-400">
                                                            @{user.login}
                                                        </p>
                                                    </div>

                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-green-500 text-white scale-100' : 'bg-gray-100 text-transparent scale-90 group-hover:scale-100'
                                                        }`}>
                                                        <Check size={14} strokeWidth={4} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                                <span>{filteredUsers.length} Empleados</span>
                                <span>{selectedUserIds.size} Seleccionados</span>
                            </div>
                        </div>

                        {/* SECTION 3: ACTION */}
                        <div className="pt-2">
                            <button
                                onClick={handleSubmit}
                                disabled={isSaving || selectedUserIds.size === 0}
                                className="w-full bg-black text-white p-5 rounded-2xl font-bold text-lg shadow-xl shadow-black/20 hover:-translate-y-1 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="animate-spin" size={24} />
                                        <span>Procesando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={24} />
                                        <span>Guardar Asignación</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ========================================
                    DESKTOP LAYOUT — Dual panel
                   ======================================== */}
                <div className="hidden lg:grid grid-cols-[1.5fr_1fr] gap-8 items-start w-full">
                    {/* Left Column: Form & Settings */}
                    <div className="bg-white rounded-[2.5rem] p-8 pb-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col gap-6">
                        <div className="flex items-center gap-3 mb-2 pb-6 border-b border-gray-100 shrink-0">
                            <div className="p-2.5 bg-black rounded-xl text-white">
                                <Clock size={20} strokeWidth={2} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-black tracking-tight">Configuración del Horario</h2>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Parámetros de la jornada</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-5">
                                {/* Tipo de Jornada */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Tipo de Jornada</label>
                                    <div className="grid grid-cols-3 gap-2 bg-gray-50 p-1 rounded-2xl border border-gray-100/50">
                                        {[
                                            { id: 'partida', label: 'Partida', icon: CalendarDays },
                                            { id: 'intensiva', label: 'Intensiva', icon: CalendarMinus2 },
                                            { id: 'flexible', label: 'Flexible', icon: CalendarRange }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, tipo_jornada: opt.id as any }))}
                                                className={`flex items-center justify-center gap-1.5 py-3 rounded-xl transition-all duration-200 ${formData.tipo_jornada === opt.id
                                                    ? 'bg-white text-black shadow-sm font-bold'
                                                    : 'text-gray-400 hover:text-gray-600 font-medium'
                                                    }`}
                                            >
                                                <opt.icon size={13} />
                                                <span className="text-[10px] uppercase tracking-wide">{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Modalidad (Tipo de Turno) */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Modalidad</label>
                                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-2xl border border-gray-100/50">
                                        {[
                                            { id: 'fijo', label: 'Fijo', icon: LocateFixed },
                                            { id: 'rotativo', label: 'Rotativo', icon: RefreshCcw }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, tipo_turno: opt.id as any }))}
                                                className={`flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-200 ${formData.tipo_turno === opt.id
                                                    ? 'bg-white text-black shadow-sm font-bold'
                                                    : 'text-gray-400 hover:text-gray-600 font-medium'
                                                    }`}
                                            >
                                                <opt.icon size={14} />
                                                <span className="text-[11px] uppercase tracking-wide">{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Days of Week Selector */}
                            <div className="space-y-3 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 flex items-center justify-between">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Calendar size={14} className="text-gray-400" />
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Días de la semana</label>
                                    </div>
                                    <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest pl-1 max-w-[150px]">
                                        Selección para cálculo de horas esperadas
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { id: 1, label: 'L', name: 'Lunes' },
                                        { id: 2, label: 'M', name: 'Martes' },
                                        { id: 3, label: 'X', name: 'Miércoles' },
                                        { id: 4, label: 'J', name: 'Jueves' },
                                        { id: 5, label: 'V', name: 'Viernes' },
                                        { id: 6, label: 'S', name: 'Sábado' },
                                        { id: 0, label: 'D', name: 'Domingo' }
                                    ].map(day => {
                                        const isSelected = formData.dias_semana.includes(day.id);
                                        return (
                                            <button
                                                key={day.id}
                                                type="button"
                                                onClick={() => {
                                                    const newDays = isSelected
                                                        ? formData.dias_semana.filter(d => d !== day.id)
                                                        : [...formData.dias_semana, day.id].sort();
                                                    setFormData(prev => ({ ...prev, dias_semana: newDays }));
                                                }}
                                                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-[12px] font-black transition-all duration-200 border shadow-sm active:scale-95 ${isSelected
                                                    ? 'bg-black border-black text-white shadow-lg shadow-black/10'
                                                    : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                                                    }`}
                                                title={day.name}
                                            >
                                                {day.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Hours Configuration Desktop (Side-by-side) */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-sm shadow-emerald-200"></div>
                                        Entrada
                                    </label>
                                    <TimePicker
                                        value={formData.hora_inicio_jornada}
                                        onChange={(v) => setFormData(prev => ({ ...prev, hora_inicio_jornada: v }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                        Salida
                                    </label>
                                    <TimePicker
                                        value={formData.hora_fin_jornada}
                                        onChange={(v) => setFormData(prev => ({ ...prev, hora_fin_jornada: v }))}
                                    />
                                </div>
                            </div>

                            {/* Dynamic Pauses (In Between) Desktop */}
                            {formData.tipo_jornada === 'partida' && (
                                <div className="space-y-4 pt-4 border-t border-b border-gray-100 py-6">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Pausas / Descansos</label>
                                        <button
                                            onClick={addPausa}
                                            className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                                        >
                                            + Añadir Pausa
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {formData.pausas.map((pausa, idx) => (
                                            <div key={idx} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 relative group animate-in fade-in slide-in-from-top-2 duration-200">
                                                <button
                                                    onClick={() => removePausa(idx)}
                                                    className="absolute -top-2 -right-2 bg-white text-gray-400 hover:text-red-500 p-1.5 rounded-full shadow-sm border border-gray-200 opacity-0 group-hover:opacity-100 transition-all z-10"
                                                >
                                                    <X size={14} />
                                                </button>

                                                <div className="grid grid-cols-2 lg:grid-cols-[1fr_1fr_2fr] gap-4 items-end">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1">Inicio Pausa</label>
                                                        <TimePicker
                                                            value={pausa.hora_inicio}
                                                            onChange={(v) => updatePausa(idx, 'hora_inicio', v)}
                                                            compact
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1">Fin Pausa</label>
                                                        <TimePicker
                                                            value={pausa.hora_fin}
                                                            onChange={(v) => updatePausa(idx, 'hora_fin', v)}
                                                            compact
                                                        />
                                                    </div>
                                                    <div className="pb-1">
                                                        <input
                                                            type="text"
                                                            placeholder="Descripción (opcional)"
                                                            value={pausa.descripcion || ''}
                                                            onChange={(e) => updatePausa(idx, 'descripcion', e.target.value)}
                                                            className="w-full bg-white border border-gray-100 focus:border-black/10 focus:ring-4 focus:ring-black/2 rounded-xl text-xs font-bold py-3 px-4 outline-none transition-all placeholder:text-gray-300 shadow-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {formData.pausas.length === 0 && (
                                            <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-2xl text-gray-300 text-xs font-medium">
                                                Sin pausas configuradas
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Notes Desktop */}
                            <div className="space-y-2 pt-2">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1">Observaciones</label>
                                <textarea
                                    name="observaciones"
                                    value={formData.observaciones}
                                    onChange={handleInputChange}
                                    rows={2}
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-black/10 focus:bg-white rounded-2xl p-4 text-sm font-medium outline-none transition-all resize-none placeholder:text-gray-300"
                                    placeholder="Opcional: detalles adicionales..."
                                />
                            </div>
                        </div>

                        {/* SECTION 3: ACTION (Desktop at the bottom left) */}
                        <div className="mt-auto pt-6 border-t border-gray-100">
                            <button
                                onClick={handleSubmit}
                                disabled={isSaving || selectedUserIds.size === 0}
                                className="w-full bg-black text-white p-5 rounded-2xl font-bold text-lg shadow-xl shadow-black/20 hover:-translate-y-1 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="animate-spin" size={24} />
                                        <span>Procesando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={24} />
                                        <span>Guardar Asignación de Horario</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right Column: User Selection */}
                    <div className="bg-gray-50/50 p-8 rounded-[2.5rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-[calc(100vh-12rem)] min-h-[750px] sticky top-8 flex flex-col">
                        <div className="flex flex-col gap-6 h-full">
                            <div className="flex flex-col gap-4">
                                <h2 className="text-xl font-bold text-black flex items-center gap-3 self-start">
                                    <div className="p-2.5 bg-black rounded-xl text-white">
                                        <Users size={20} strokeWidth={2} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span>Selección de Personal</span>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{selectedUserIds.size} / {filteredUsers.length} Empleados</span>
                                    </div>
                                </h2>

                                <div className="flex items-center gap-3 w-full bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Buscar usuario..."
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                            className="w-full pl-10 pr-3 py-2 bg-transparent rounded-xl text-sm font-bold shadow-none outline-none placeholder:text-gray-300"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSelectAll}
                                        className="p-2.5 text-xs font-bold text-gray-500 hover:text-black hover:bg-gray-50 rounded-xl transition-all whitespace-nowrap border border-transparent hover:border-gray-200"
                                    >
                                        {selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0 ? 'Deseleccionar' : 'Todos'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 bg-white/50 rounded-2xl border border-gray-100 p-2">
                                {loadingUsers ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3 min-h-[200px]">
                                        <Loader2 className="animate-spin" size={32} />
                                        <span className="text-xs font-bold uppercase tracking-widest">Cargando Usuarios</span>
                                    </div>
                                ) : filteredUsers.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3 min-h-[200px]">
                                        <Users size={48} strokeWidth={1} />
                                        <span className="text-sm font-medium">No se encontraron resultados</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {filteredUsers.map(user => {
                                            const isSelected = selectedUserIds.has(user.id);
                                            return (
                                                <div
                                                    key={user.id}
                                                    onClick={() => toggleUser(user.id)}
                                                    className={`group relative flex items-center gap-4 p-3 rounded-2xl cursor-pointer border-2 transition-all duration-200 ${isSelected
                                                        ? 'bg-white border-green-500 text-gray-900 shadow-md shadow-green-500/10'
                                                        : 'bg-white border-transparent hover:border-gray-200 hover:shadow-sm'
                                                        }`}
                                                >
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-colors shrink-0 ${isSelected ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-black'
                                                        }`}>
                                                        {user.firstname?.[0] || user.login[0]}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-sm truncate leading-tight text-gray-900">
                                                            {user.firstname} {user.lastname}
                                                        </p>
                                                        <p className="text-[11px] font-medium truncate text-gray-400">
                                                            @{user.login}
                                                        </p>
                                                    </div>

                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-green-500 text-white scale-100' : 'bg-gray-100 text-transparent scale-90 group-hover:scale-100'
                                                        }`}>
                                                        <Check size={14} strokeWidth={4} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
