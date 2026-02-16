'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, Calendar as CalendarIcon, Save, X, AlertCircle, Users, LayoutGrid, PencilLine } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BreakPeriod {
    id?: number;
    hora_inicio: string;
    hora_fin: string;
    descripcion?: string;
    orden?: number;
}

interface Shift {
    id: number;
    fk_user: number;
    tipo_jornada: 'intensiva' | 'partida';
    tipo_turno: 'fijo' | 'rotativo';
    hora_inicio_jornada: string;
    hora_fin_jornada: string;
    pausas: BreakPeriod[];
    observaciones?: string;
    active: number;
}

interface ShiftConfiguratorProps {
    userId: string;
}

export default function ShiftConfigurator({ userId }: ShiftConfiguratorProps) {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setStartPos({
            x: e.clientX - dragPos.x,
            y: e.clientY - dragPos.y
        });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            setDragPos({
                x: e.clientX - startPos.x,
                y: e.clientY - startPos.y
            });
        };
        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, startPos]);

    // Reset position when opening
    useEffect(() => {
        if (isCreating) setDragPos({ x: 0, y: 0 });
    }, [isCreating]);

    // New Shift State
    const [newShift, setNewShift] = useState<Partial<Shift>>({
        tipo_jornada: 'partida',
        tipo_turno: 'fijo',
        hora_inicio_jornada: '09:00',
        hora_fin_jornada: '18:00',
        pausas: []
    });

    const fetchShifts = async () => {
        try {
            const token = localStorage.getItem('dolibarr_token');
            const res = await fetch(`/api/jornadas?user_id=${userId}`, {
                headers: { 'DOLAPIKEY': token || '' }
            });
            if (res.ok) {
                const data = await res.json();
                setShifts(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Error fetching shifts:', error);
            toast.error('Error al cargar jornadas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) fetchShifts();
    }, [userId]);

    const handleCreate = async () => {
        try {
            const token = localStorage.getItem('dolibarr_token');
            const payload = {
                ...newShift,
                fk_user: userId
            };

            const url = editingId ? `/api/jornadas/${editingId}` : '/api/jornadas';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'DOLAPIKEY': token || ''
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success(editingId ? 'Jornada actualizada' : 'Jornada creada correctamente');
                setIsCreating(false);
                setEditingId(null);
                fetchShifts();
            } else {
                const err = await res.json();
                toast.error(err.error?.message || `Error al ${editingId ? 'actualizar' : 'crear'} jornada`);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error inesperado');
        }
    };

    const handleEdit = (shift: Shift) => {
        setNewShift({
            tipo_jornada: shift.tipo_jornada,
            tipo_turno: shift.tipo_turno,
            hora_inicio_jornada: shift.hora_inicio_jornada.substring(0, 5),
            hora_fin_jornada: shift.hora_fin_jornada.substring(0, 5),
            pausas: shift.pausas.map(p => ({
                ...p,
                hora_inicio: p.hora_inicio.substring(0, 5),
                hora_fin: p.hora_fin.substring(0, 5)
            }))
        });
        setEditingId(shift.id);
        setIsCreating(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar esta jornada?')) return;

        try {
            const token = localStorage.getItem('dolibarr_token');
            const res = await fetch(`/api/jornadas/${id}`, {
                method: 'DELETE',
                headers: { 'DOLAPIKEY': token || '' }
            });

            if (res.ok) {
                toast.success('Jornada eliminada');
                fetchShifts();
            } else {
                toast.error('Error al eliminar');
            }
        } catch (error) {
            toast.error('Error de conexión');
        }
    };

    if (loading) return <div className="p-4 text-center text-gray-400">Cargando turnos...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-baseline md:gap-3">
                <h3 className="text-lg font-bold text-[#121726] flex items-center gap-2">
                    <CalendarIcon size={20} className="text-primary" />
                    <span>Jornadas Laborales</span>
                </h3>
                <p className="text-xs font-semibold text-gray-400 opacity-70">
                    Horarios habituales del empleado
                </p>
            </div>

            {/* List */}
            <div className="grid gap-4">
                {shifts.map(shift => (
                    <div key={shift.id} className="relative bg-white p-5 rounded-2xl border border-gray-100 shadow-sm group hover:border-blue-100 transition-all overflow-hidden">
                        {/* Decorative Glow */}
                        <div
                            className={`absolute -bottom-12 -right-12 w-32 h-32 rounded-full blur-2xl transition-all duration-500 opacity-40 group-hover:opacity-70 group-hover:scale-110`}
                            style={{
                                backgroundColor: shift.tipo_jornada === 'intensiva' ? '#AEF5B4' : '#F5E7AE'
                            }}
                        />

                        <div className="relative space-y-3 pr-8">
                            <div className="flex items-center gap-2">
                                <span
                                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider border transition-colors"
                                    style={{
                                        backgroundColor: shift.tipo_jornada === 'intensiva' ? '#AEF5B4' : '#F5E7AE',
                                        color: shift.tipo_jornada === 'intensiva' ? '#1b4d21' : '#5c4d1a',
                                        borderColor: shift.tipo_jornada === 'intensiva' ? '#8de696' : '#dec47c'
                                    }}
                                >
                                    {shift.tipo_jornada}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{shift.tipo_turno}</span>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-base font-bold text-gray-900">
                                    <Clock size={16} className="text-gray-400" />
                                    <span>{shift.hora_inicio_jornada.substring(0, 5)} - {shift.hora_fin_jornada.substring(0, 5)}</span>
                                </div>

                                {shift.tipo_jornada === 'partida' && shift.pausas && shift.pausas.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {shift.pausas.map((pausa, idx) => (
                                            <div key={idx} className="flex flex-col gap-0.5 bg-white/50 backdrop-blur-sm border border-gray-100 px-2.5 py-1.5 rounded-xl shadow-sm">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight truncate max-w-[80px]">
                                                        {pausa.descripcion || `Pausa ${idx + 1}`}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-bold text-gray-700 inline-block">
                                                    {pausa.hora_inicio.substring(0, 5)} - {pausa.hora_fin.substring(0, 5)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="absolute top-4 right-4 flex items-center gap-1 z-10">
                            <button
                                onClick={() => handleEdit(shift)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar jornada"
                            >
                                <PencilLine size={18} />
                            </button>
                            <button
                                onClick={() => handleDelete(shift.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar jornada"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}

                {shifts.length === 0 && !isCreating && (
                    <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CalendarIcon className="text-gray-400" size={20} />
                        </div>
                        <p className="text-sm text-gray-500 font-medium">No hay jornadas configuradas</p>
                    </div>
                )}
            </div>

            <button
                onClick={() => {
                    setEditingId(null);
                    setNewShift({
                        tipo_jornada: 'partida',
                        tipo_turno: 'fijo',
                        hora_inicio_jornada: '09:00',
                        hora_fin_jornada: '18:00',
                        pausas: []
                    });
                    setIsCreating(true);
                }}
                className="w-full flex items-center justify-start gap-4 bg-white border-2 border-dashed border-gray-100 text-gray-400 p-4 rounded-2xl hover:border-black hover:text-black hover:bg-gray-50/50 transition-all group"
            >
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all shrink-0">
                    <Plus size={20} />
                </div>
                <div className="text-left">
                    <p className="text-[11px] font-bold uppercase tracking-widest leading-none mb-1.5">Nueva Jornada</p>
                    <p className="text-[10px] font-medium opacity-60 whitespace-nowrap">Configura un nuevo horario para el empleado</p>
                </div>
            </button>

            {/* Create Form */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-12 md:pt-20">
                    <div
                        style={{ transform: `translate(${dragPos.x}px, ${dragPos.y}px)` }}
                        className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[82vh] select-none"
                    >
                        {/* Header - Fixed & Draggable */}
                        <div
                            onMouseDown={handleMouseDown}
                            className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 cursor-move active:cursor-grabbing"
                        >
                            <div className="flex flex-col">
                                <h3 className="text-lg font-bold">{editingId ? 'Editar Jornada' : 'Nueva Jornada'}</h3>
                                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-[0.2em]">
                                    {editingId ? 'Modificar horario existente' : 'Configurar horario de trabajo'}
                                </p>
                            </div>
                            <button
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={() => {
                                    setIsCreating(false);
                                    setEditingId(null);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="overflow-y-auto px-8 py-6 space-y-8 flex-1">
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Tipo de Jornada</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: 'partida', label: 'Partida', icon: LayoutGrid },
                                            { id: 'intensiva', label: 'Intensiva', icon: Clock }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setNewShift({ ...newShift, tipo_jornada: opt.id as any })}
                                                className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${newShift.tipo_jornada === opt.id
                                                    ? 'border-black bg-white text-black shadow-sm'
                                                    : 'border-gray-50 bg-gray-50/50 text-gray-400 hover:border-gray-100 hover:bg-gray-100/50'
                                                    }`}
                                            >
                                                <opt.icon size={16} />
                                                <span className="text-xs font-bold uppercase tracking-wide">{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Sistema de Turno</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: 'fijo', label: 'Fijo', icon: Users },
                                            { id: 'rotativo', label: 'Rotativo', icon: LayoutGrid }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setNewShift({ ...newShift, tipo_turno: opt.id as any })}
                                                className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${newShift.tipo_turno === opt.id
                                                    ? 'border-black bg-white text-black shadow-sm'
                                                    : 'border-gray-50 bg-gray-50/50 text-gray-400 hover:border-gray-100 hover:bg-gray-100/50'
                                                    }`}
                                            >
                                                <opt.icon size={16} />
                                                <span className="text-xs font-bold uppercase tracking-wide">{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                    <Clock size={16} className="text-gray-400" />
                                    <h4 className="text-sm font-bold text-gray-900">Horario de trabajo</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Entrada</label>
                                        <input
                                            type="time"
                                            step="60"
                                            className="w-full bg-white border border-gray-200 focus:border-black focus:ring-0 rounded-2xl p-3 md:p-4 text-sm md:text-base font-bold transition-all min-w-0"
                                            value={newShift.hora_inicio_jornada}
                                            onChange={e => setNewShift({ ...newShift, hora_inicio_jornada: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Salida</label>
                                        <input
                                            type="time"
                                            step="60"
                                            className="w-full bg-white border border-gray-200 focus:border-black focus:ring-0 rounded-2xl p-3 md:p-4 text-sm md:text-base font-bold transition-all min-w-0"
                                            value={newShift.hora_fin_jornada}
                                            onChange={e => setNewShift({ ...newShift, hora_fin_jornada: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {newShift.tipo_jornada === 'partida' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} className="text-gray-400" />
                                            <h4 className="text-sm font-bold text-gray-900">Pausas</h4>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const pausas = newShift.pausas || [];
                                                setNewShift({
                                                    ...newShift,
                                                    pausas: [...pausas, { hora_inicio: '14:00', hora_fin: '15:00', descripcion: '' }]
                                                });
                                            }}
                                            className="px-3 py-1.5 bg-gray-50 hover:bg-black hover:text-white border border-gray-200 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                                        >
                                            <Plus size={12} />
                                            <span>Añadir Pausa</span>
                                        </button>
                                    </div>

                                    <div className="grid gap-4">
                                        {newShift.pausas && newShift.pausas.map((pausa, index) => (
                                            <div key={index} className="group relative bg-white border border-gray-200 rounded-[1.5rem] p-5 hover:border-black transition-all">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const pausas = (newShift.pausas || []).filter((_, i) => i !== index);
                                                        setNewShift({ ...newShift, pausas });
                                                    }}
                                                    className="absolute -top-2 -right-2 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-100 shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
                                                >
                                                    <X size={14} />
                                                </button>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 block mb-1.5">Etiqueta</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Ej: Almuerzo, Comida..."
                                                            value={pausa.descripcion || ''}
                                                            onChange={(e) => {
                                                                const pausas = [...(newShift.pausas || [])];
                                                                pausas[index] = { ...pausas[index], descripcion: e.target.value };
                                                                setNewShift({ ...newShift, pausas });
                                                            }}
                                                            className="w-full bg-gray-50/50 border-none focus:ring-0 rounded-xl p-3 text-sm font-medium"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Desde</label>
                                                            <input
                                                                type="time"
                                                                step="60"
                                                                className="w-full bg-white border border-gray-200 focus:border-black focus:ring-0 rounded-xl p-2 md:p-3 text-xs md:text-sm font-bold appearance-none min-w-0"
                                                                value={pausa.hora_inicio}
                                                                onChange={(e) => {
                                                                    const pausas = [...(newShift.pausas || [])];
                                                                    pausas[index] = { ...pausas[index], hora_inicio: e.target.value };
                                                                    setNewShift({ ...newShift, pausas });
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Hasta</label>
                                                            <input
                                                                type="time"
                                                                step="60"
                                                                className="w-full bg-white border border-gray-200 focus:border-black focus:ring-0 rounded-xl p-2 md:p-3 text-xs md:text-sm font-bold appearance-none min-w-0"
                                                                value={pausa.hora_fin}
                                                                onChange={(e) => {
                                                                    const pausas = [...(newShift.pausas || [])];
                                                                    pausas[index] = { ...pausas[index], hora_fin: e.target.value };
                                                                    setNewShift({ ...newShift, pausas });
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {(!newShift.pausas || newShift.pausas.length === 0) && (
                                        <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-[1.5rem]">
                                            <p className="text-xs text-gray-400 font-medium">Sin pausas configuradas</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                    <AlertCircle size={16} className="text-gray-400" />
                                    <h4 className="text-sm font-bold text-gray-900">Información adicional</h4>
                                </div>
                                <textarea
                                    className="w-full bg-gray-50/50 border border-gray-100 focus:border-black focus:ring-0 rounded-2xl p-4 text-sm font-medium h-24 resize-none transition-all"
                                    placeholder="Añade notas u observaciones sobre esta jornada..."
                                    value={newShift.observaciones || ''}
                                    onChange={e => setNewShift({ ...newShift, observaciones: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Footer - Fixed */}
                        <div className="p-6 pt-3 border-t border-gray-100 bg-white rounded-b-[2rem]">
                            <button
                                onClick={handleCreate}
                                className="w-full bg-black text-white py-3.5 rounded-xl font-bold text-xs shadow-lg shadow-black/5 hover:shadow-black/10 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                            >
                                <Save size={16} />
                                <span className="tracking-widest uppercase">Guardar Configuración</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
