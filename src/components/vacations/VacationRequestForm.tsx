import React, { useState } from 'react';
import { useVacations } from '@/hooks/useVacations';
import { Calendar, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

interface VacationRequestFormProps {
    onSuccess: () => void;
}

export default function VacationRequestForm({ onSuccess }: VacationRequestFormProps) {
    const { createVacation, loading, error: hookError } = useVacations();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [comments, setComments] = useState('');
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
            comentarios: comments
        });

        if (result.success) {
            setStartDate('');
            setEndDate('');
            setComments('');
            onSuccess();
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
                <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                            Desde
                        </label>
                        <div className="relative group">
                            <input
                                type="date"
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
