import React, { useState, useEffect } from 'react';
import { useVacations, VacationRequest } from '@/hooks/useVacations';
import { useAuth } from '@/context/AuthContext';
import { Palmtree, HeartPulse, ContactRound, Calendar, Save, AlertCircle, Info, CalendarClock } from 'lucide-react';
import { checkVacationOverlap } from '@/lib/vacation-logic';
import { cn } from '@/lib/utils';
import { HistoryDateRangePicker } from '@/components/fichajes/HistoryDateRangePicker';

interface VacationRequestFormProps {
    onSuccess: () => void;
}

export default function VacationRequestForm({ onSuccess }: VacationRequestFormProps) {
    const { user } = useAuth();
    const { createVacation, fetchVacations, loading, error: hookError } = useVacations();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [comments, setComments] = useState('');
    const [selectedType, setSelectedType] = useState<'vacaciones' | 'enfermedad' | 'asuntos_propios'>('vacaciones');
    const [formError, setFormError] = useState<string | null>(null);
    const [existingRequests, setExistingRequests] = useState<VacationRequest[]>([]);

    useEffect(() => {
        const loadExisting = async () => {
            // Fetch all vacations to show in the calendar picker
            const requests = await fetchVacations();
            setExistingRequests(requests);
        };
        loadExisting();
    }, [fetchVacations]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!startDate || !endDate) {
            setFormError('Debes seleccionar fecha de inicio y fin');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            setFormError('La fecha de fin no puede ser anterior a la de inicio');
            return;
        }

        // --- VALIDACIÓN DE SOLAPAMIENTO (Solo para el propio usuario) ---
        const userRequests = existingRequests.filter(v => v.usuario === user?.login);
        const overlap = checkVacationOverlap(startDate, endDate, userRequests);
        if (overlap) {
            setFormError(`Ya tienes una solicitud de ${overlap.tipo} que se solapa con estas fechas (${overlap.fecha_inicio} a ${overlap.fecha_fin})`);
            return;
        }

        const result = await createVacation({
            fecha_inicio: startDate,
            fecha_fin: endDate,
            comentarios: comments,
            tipo: selectedType
        });

        if (result.success) {
            setStartDate('');
            setEndDate('');
            setComments('');
            setSelectedType('vacaciones');
            onSuccess();
        } else {
            // Show error message from API
            setFormError(result.message || 'Error al crear la solicitud');
        }
    };

    return (
        <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 h-full">

            <h3 className="text-xl font-bold text-[#121726] mb-8 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <Calendar className="w-5 h-5" />
                </div>
                Solicitar Vacaciones
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tipo de Ausencia Selector */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                        Tipo de Ausencia
                    </label>
                    <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 gap-1">
                        <button
                            type="button"
                            onClick={() => setSelectedType('vacaciones')}
                            className={cn(
                                "relative overflow-hidden flex-1 px-3 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap border-2",
                                selectedType === 'vacaciones'
                                    ? "bg-[#9EE8FF] border-[#9EE8FF] text-blue-900 shadow-[0_8px_25px_rgba(158,232,255,0.5)] scale-[1.02]"
                                    : "bg-gradient-to-br from-white from-60% to-[#9EE8FF]/20 border-gray-100 text-gray-500 hover:text-gray-700 hover:to-[#9EE8FF]/80"
                            )}
                        >
                            <Palmtree size={16} className="relative z-10 shrink-0 text-black" />
                            <span className="relative z-10 hidden sm:inline">Vacaciones</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedType('enfermedad')}
                            className={cn(
                                "relative overflow-hidden flex-1 px-3 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap border-2",
                                selectedType === 'enfermedad'
                                    ? "bg-[#EA9EFF] border-[#EA9EFF] text-purple-900 shadow-[0_8px_25px_rgba(234,158,255,0.5)] scale-[1.02]"
                                    : "bg-gradient-to-br from-white from-60% to-[#EA9EFF]/20 border-gray-100 text-gray-500 hover:text-gray-700 hover:to-[#EA9EFF]/80"
                            )}
                        >
                            <HeartPulse size={16} className="relative z-10 shrink-0 text-black" />
                            <span className="relative z-10 hidden sm:inline">Enfermedad</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedType('asuntos_propios')}
                            className={cn(
                                "relative overflow-hidden flex-1 px-3 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap border-2",
                                selectedType === 'asuntos_propios'
                                    ? "bg-[#FFCE8A] border-[#FFCE8A] text-amber-900 shadow-[0_8px_25px_rgba(255,206,138,0.5)] scale-[1.02]"
                                    : "bg-gradient-to-br from-white from-60% to-[#FFCE8A]/20 border-gray-100 text-gray-500 hover:text-gray-700 hover:to-[#FFCE8A]/80"
                            )}
                        >
                            <ContactRound size={16} className="relative z-10 shrink-0 text-black" />
                            <span className="relative z-10 hidden sm:inline">Asuntos</span>
                        </button>
                    </div>

                    <div className="text-center py-2">
                        <p className="text-sm font-medium text-gray-600">
                            Seleccionado: <span className="font-bold text-black">
                                {selectedType === 'vacaciones' ? 'Vacaciones' :
                                    selectedType === 'enfermedad' ? 'Enfermedad' :
                                        'Asuntos Propios'}
                            </span>
                        </p>
                    </div>
                </div>

                {/* Date Range Selection - Using HistoryDateRangePicker Style */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                        Período de Ausencia
                    </label>
                    <HistoryDateRangePicker
                        startDate={startDate}
                        endDate={endDate}
                        vacations={existingRequests}
                        onChange={(dates) => {
                            setStartDate(dates.start);
                            setEndDate(dates.end);
                        }}
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                        Comentarios <span className="text-gray-300 font-normal normal-case tracking-normal">(Opcional)</span>
                    </label>
                    <textarea
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        placeholder="Ej: Vacaciones de verano..."
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none min-h-[120px] resize-none"
                    />
                </div>

                {(formError || hookError) && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 text-sm font-medium">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <p>{formError || hookError}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#121726] text-white hover:bg-black active:scale-[0.98] font-bold py-4.5 rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-gray-200 mt-2"
                >
                    {loading ? (
                        <>Procesando...</>
                    ) : (
                        <>
                            <Save size={20} />
                            Enviar Solicitud
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
