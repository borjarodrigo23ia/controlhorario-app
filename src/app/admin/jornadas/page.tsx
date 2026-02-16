'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { CalendarRange, Save, User, Check, Search, Calendar, Clock, Loader2, Users } from 'lucide-react';
import { TimePicker } from '@/components/ui/TimePicker';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
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
        observaciones: ''
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
            // Optional warning, or just allow it? Usually 'partida' implies breaks.
            // Let's enforce at least one break if they chose 'partida'
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
                    ...formData
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
        <div className="flex min-h-screen bg-[#FAFBFC]">
            <div className="hidden md:block"><Sidebar /></div>
            <main className="flex-1 ml-0 md:ml-64 p-4 md:p-12 pb-32">
                <PageHeader
                    title="Gestión de Jornadas"
                    subtitle="Centro de control para asignación de horarios"
                    icon={CalendarRange}
                    badge="RRHH"
                    showBack={true}
                />

                <div className="max-w-3xl mx-auto">

                    {/* UNIFIED CARD */}
                    <div className="bg-white rounded-[2rem] p-6 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col gap-10">

                        {/* SECTION 1: CONFIGURATION */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-black flex items-center gap-3">
                                <div className="p-2.5 bg-black rounded-xl text-white">
                                    <Clock size={20} strokeWidth={2} />
                                </div>
                                Configuración del Horario
                            </h2>

                            <div className="space-y-5 p-1">
                                {/* Selects Row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="space-y-2 group">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Tipo de Jornada</label>
                                        <div className="relative">
                                            <select
                                                name="tipo_jornada"
                                                value={formData.tipo_jornada}
                                                onChange={handleInputChange}
                                                className="w-full appearance-none bg-gray-50 border-2 border-transparent focus:border-black/5 rounded-2xl p-4 text-sm font-bold text-gray-900 outline-none transition-all cursor-pointer hover:bg-gray-100"
                                            >
                                                <option value="partida">Jornada Partida</option>
                                                <option value="intensiva">Jornada Intensiva</option>
                                            </select>
                                            <Users size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                                        </div>
                                    </div>
                                    <div className="space-y-2 group">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Modalidad</label>
                                        <div className="relative">
                                            <select
                                                name="tipo_turno"
                                                value={formData.tipo_turno}
                                                onChange={handleInputChange}
                                                className="w-full appearance-none bg-gray-50 border-2 border-transparent focus:border-black/5 rounded-2xl p-4 text-sm font-bold text-gray-900 outline-none transition-all cursor-pointer hover:bg-gray-100"
                                            >
                                                <option value="fijo">Turno Fijo</option>
                                                <option value="rotativo">Turno Rotativo</option>
                                            </select>
                                            <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                                        </div>
                                    </div>
                                </div>

                                {/* Hours Configuration */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
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
                                                            className="absolute -top-2 -right-2 bg-white text-gray-400 hover:text-red-500 p-1.5 rounded-full shadow-sm border border-gray-200 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all z-10"
                                                        >
                                                            <Check size={14} className="rotate-45" />
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
                                                        <div className="mt-3">
                                                            <input
                                                                type="text"
                                                                placeholder="Descripción (opcional)"
                                                                value={pausa.descripcion || ''}
                                                                onChange={(e) => updatePausa(idx, 'descripcion', e.target.value)}
                                                                className="w-full bg-transparent border-b border-gray-200 focus:border-black text-xs font-medium py-1 px-1 outline-none transition-colors placeholder:text-gray-300"
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
                                                        ? 'bg-black border-black text-white shadow-xl shadow-black/10'
                                                        : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-lg hover:shadow-black/5'
                                                        }`}
                                                >
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-colors ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-black'
                                                        }`}>
                                                        {user.firstname?.[0] || user.login[0]}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <p className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                                                            {user.firstname} {user.lastname}
                                                        </p>
                                                        <p className={`text-xs font-medium truncate ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>
                                                            @{user.login}
                                                        </p>
                                                    </div>

                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-white text-black scale-100' : 'bg-gray-100 text-transparent scale-90 group-hover:scale-100'
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
            </main>
            <MobileNav />
        </div>
    );
}
