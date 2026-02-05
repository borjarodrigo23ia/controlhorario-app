'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, Calendar as CalendarIcon, Save, X, AlertCircle, Users, LayoutGrid } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

interface Shift {
    id: number;
    fk_user: number;
    tipo_jornada: 'intensiva' | 'partida';
    tipo_turno: 'fijo' | 'rotativo';
    hora_inicio_jornada: string;
    hora_inicio_pausa?: string;
    hora_fin_pausa?: string;
    hora_fin_jornada: string;
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

    // New Shift State
    const [newShift, setNewShift] = useState<Partial<Shift>>({
        tipo_jornada: 'partida',
        tipo_turno: 'fijo',
        hora_inicio_jornada: '09:00',
        hora_fin_jornada: '18:00',
        hora_inicio_pausa: '14:00',
        hora_fin_pausa: '15:00'
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

            const res = await fetch('/api/jornadas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'DOLAPIKEY': token || ''
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success('Jornada creada correctamente');
                setIsCreating(false);
                fetchShifts();
            } else {
                const err = await res.json();
                toast.error(err.error?.message || 'Error al crear jornada');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error inesperado');
        }
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col md:flex-row md:items-baseline md:gap-3">
                    <h3 className="text-lg font-bold text-[#121726] flex items-center gap-2">
                        <CalendarIcon size={20} className="text-primary" />
                        <span>Jornadas Laborales</span>
                    </h3>
                    <p className="text-xs font-semibold text-gray-400 opacity-70">
                        Horarios habituales del empleado
                    </p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-zinc-800 transition-all active:scale-95 shrink-0"
                >
                    <Plus size={14} strokeWidth={3} />
                    <span>Nueva Jornada</span>
                </button>
            </div>

            {/* List */}
            <div className="grid gap-4">
                {shifts.map(shift => (
                    <div key={shift.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-blue-100 transition-all">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded-lg uppercase tracking-wide ${shift.tipo_jornada === 'intensiva' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                                    }`}>
                                    {shift.tipo_jornada}
                                </span>
                                <span className="text-xs font-medium text-gray-400 uppercase">{shift.tipo_turno}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm font-semibold text-gray-700">
                                <div className="flex items-center gap-1.5">
                                    <Clock size={14} className="text-gray-400" />
                                    <span>{shift.hora_inicio_jornada.substring(0, 5)} - {shift.hora_fin_jornada.substring(0, 5)}</span>
                                </div>
                                {shift.tipo_jornada === 'partida' && (
                                    <div className="flex items-center gap-1.5 text-gray-500">
                                        <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">Pausa</span>
                                        <span>{shift.hora_inicio_pausa?.substring(0, 5)} - {shift.hora_fin_pausa?.substring(0, 5)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => handleDelete(shift.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={18} />
                        </button>
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

            {/* Create Form */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold">Nueva Jornada</h3>
                            <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <SegmentedControl
                                label="Tipo de Jornada"
                                icon={LayoutGrid}
                                options={[
                                    { id: 'partida', label: 'Partida' },
                                    { id: 'intensiva', label: 'Intensiva' }
                                ]}
                                value={newShift.tipo_jornada || 'partida'}
                                onChange={val => setNewShift({ ...newShift, tipo_jornada: val as any })}
                                className="bg-gray-50/50 border-none p-4"
                            />

                            <SegmentedControl
                                label="Turno"
                                icon={Users}
                                options={[
                                    { id: 'fijo', label: 'Fijo' },
                                    { id: 'rotativo', label: 'Rotativo' }
                                ]}
                                value={newShift.tipo_turno || 'fijo'}
                                onChange={val => setNewShift({ ...newShift, tipo_turno: val as any })}
                                className="bg-gray-50/50 border-none p-4"
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Entrada</label>
                                    <input
                                        type="time"
                                        className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold"
                                        value={newShift.hora_inicio_jornada}
                                        onChange={e => setNewShift({ ...newShift, hora_inicio_jornada: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Salida</label>
                                    <input
                                        type="time"
                                        className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold"
                                        value={newShift.hora_fin_jornada}
                                        onChange={e => setNewShift({ ...newShift, hora_fin_jornada: e.target.value })}
                                    />
                                </div>
                            </div>

                            {newShift.tipo_jornada === 'partida' && (
                                <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                                    <h4 className="text-xs font-bold text-orange-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Clock size={12} /> Pausa para comer
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-orange-600/70 uppercase block mb-1">Inicio</label>
                                            <input
                                                type="time"
                                                className="w-full bg-white border-orange-200 rounded-lg p-2 text-sm font-bold focus:ring-orange-200"
                                                value={newShift.hora_inicio_pausa}
                                                onChange={e => setNewShift({ ...newShift, hora_inicio_pausa: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-orange-600/70 uppercase block mb-1">Fin</label>
                                            <input
                                                type="time"
                                                className="w-full bg-white border-orange-200 rounded-lg p-2 text-sm font-bold focus:ring-orange-200"
                                                value={newShift.hora_fin_pausa}
                                                onChange={e => setNewShift({ ...newShift, hora_fin_pausa: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Observaciones</label>
                                <textarea
                                    className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-medium h-20 resize-none"
                                    placeholder="Detalles adicionales..."
                                    value={newShift.observaciones || ''}
                                    onChange={e => setNewShift({ ...newShift, observaciones: e.target.value })}
                                />
                            </div>

                            <button
                                onClick={handleCreate}
                                className="w-full bg-black text-white py-4 rounded-xl font-bold text-sm shadow-lg shadow-black/5 hover:shadow-black/10 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                            >
                                <Save size={18} />
                                <span>Guardar Jornada</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
