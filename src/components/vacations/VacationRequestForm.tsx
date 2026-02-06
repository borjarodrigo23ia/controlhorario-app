import React, { useState } from 'react';
import { useVacations, VacationRequest } from '@/hooks/useVacations';
import { useAuth } from '@/context/AuthContext';
import { Palmtree, HeartPulse, ContactRound, Calendar, Save, AlertCircle, Info } from 'lucide-react';

interface VacationRequestFormProps {
    onSuccess: () => void;
}

export default function VacationRequestForm({ onSuccess }: VacationRequestFormProps) {
    const { createVacation, loading, error: hookError } = useVacations();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [comments, setComments] = useState('');
    const [selectedType, setSelectedType] = useState<'vacaciones' | 'enfermedad' | 'asuntos_propios'>('vacaciones');
    const [formError, setFormError] = useState<string | null>(null);

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
                            className={`flex-1 px-3 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${selectedType === 'vacaciones'
                                ? 'bg-white text-black shadow-md shadow-gray-200'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Palmtree size={16} className="shrink-0" />
                            <span className="hidden sm:inline">Vacaciones</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedType('enfermedad')}
                            className={`flex-1 px-3 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${selectedType === 'enfermedad'
                                ? 'bg-white text-black shadow-md shadow-gray-200'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <HeartPulse size={16} className="shrink-0" />
                            <span className="hidden sm:inline">Enfermedad</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedType('asuntos_propios')}
                            className={`flex-1 px-3 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${selectedType === 'asuntos_propios'
                                ? 'bg-white text-black shadow-md shadow-gray-200'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <ContactRound size={16} className="shrink-0" />
                            <span className="hidden sm:inline">Asuntos</span>
                        </button>
                    </div>

                    {/* Selected Type Indicator */}
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

                <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                            Desde
                        </label>
                        <div className="relative group">
                            <input
                                type="date"
                                lang="es-ES"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none group-hover:bg-gray-50/80"
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                            Hasta
                        </label>
                        <div className="relative group">
                            <input
                                type="date"
                                lang="es-ES"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none group-hover:bg-gray-50/80"
                                required
                            />
                        </div>
                    </div>
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
