import React, { useEffect, useState } from 'react';
import { useVacations, VacationRequest } from '@/hooks/useVacations';
import { CalendarCheck, CalendarX, Clock, Trash2, AlertCircle } from 'lucide-react';

interface VacationListProps {
    refreshTrigger: number;
}

export default function VacationList({ refreshTrigger }: VacationListProps) {
    const { fetchVacations, deleteVacation } = useVacations();
    const [vacations, setVacations] = useState<VacationRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const loadVacations = async () => {
        setLoading(true);
        const data = await fetchVacations();
        setVacations(data);
        setLoading(false);
    };

    useEffect(() => {
        loadVacations();
    }, [refreshTrigger]);

    const handleDelete = async (id: number) => {
        if (confirm('¿Estás seguro de que quieres eliminar esta solicitud?')) {
            const result = await deleteVacation(id);
            if (result.success) {
                loadVacations();
            }
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'aprobado':
                return (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E8FBF0] text-[#00D16B]">
                        <CalendarCheck size={16} />
                        Aprobado
                    </span>
                );
            case 'rechazado':
                return (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FEF2F2] text-[#EF4444]">
                        <CalendarX size={16} />
                        Rechazado
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FFF8EB] text-[#F59E0B]">
                        <Clock size={16} />
                        Pendiente
                    </span>
                );
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    if (loading) {
        return <div className="p-12 text-center text-gray-400 font-medium animate-pulse">Cargando solicitudes...</div>;
    }

    if (vacations.length === 0) {
        return (
            <div className="bg-white rounded-[2.5rem] p-12 text-center border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-300">
                    <CalendarCheck size={40} />
                </div>
                <h3 className="text-xl font-bold text-[#121726] mb-2 tracking-tight">
                    No tienes solicitudes
                </h3>
                <p className="text-gray-400 font-medium">
                    Utiliza el formulario para solicitar tus días de vacaciones.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-[#121726] px-2 tracking-tight">
                Historial de Solicitudes
            </h3>

            <div className="grid gap-5">
                {vacations.map((vacation) => (
                    <div
                        key={vacation.rowid}
                        className="bg-white rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] group"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                {getStatusBadge(vacation.estado)}
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    {formatDate(vacation.fecha_creacion.split(' ')[0])}
                                </span>
                            </div>

                            {vacation.estado === 'pendiente' && (
                                <button
                                    onClick={() => handleDelete(vacation.rowid)}
                                    className="self-end sm:self-auto p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all rounded-xl"
                                    title="Eliminar solicitud"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>

                        <div className="mb-2">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-0.5">
                                Periodo solicitado
                            </p>
                            <p className="text-2xl font-bold text-[#121726] flex items-center gap-3 tracking-tight">
                                {formatDate(vacation.fecha_inicio)}
                                <span className="text-gray-200">➜</span>
                                {formatDate(vacation.fecha_fin)}
                            </p>
                        </div>

                        {vacation.comentarios && (
                            <div className="mt-6 pt-5 border-t border-gray-50">
                                <p className="text-sm font-medium text-gray-500 italic flex gap-2">
                                    <span className="w-1 h-auto bg-gray-200 rounded-full"></span>
                                    "{vacation.comentarios}"
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
