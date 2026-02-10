import React, { useEffect, useState } from 'react';
import { useVacations } from '@/hooks/useVacations';
import { useAuth } from '@/context/AuthContext';

interface VacationQuotaCardProps {
    refreshTrigger?: number;
}

export default function VacationQuotaCard({ refreshTrigger }: VacationQuotaCardProps) {
    const { fetchVacationDays, fetchVacations } = useVacations();
    const { user } = useAuth();
    const [assignedDays, setAssignedDays] = useState<number | null>(null);
    const [consumedDays, setConsumedDays] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const loadQuota = async () => {
        if (!user) return;
        setLoading(true);
        const year = new Date().getFullYear();
        try {
            const [daysData, vacationsData] = await Promise.all([
                fetchVacationDays(year),
                fetchVacations()
            ]);

            const userDays = daysData.find((d: any) => d.fk_user === user.id || d.rowid === user.id);
            const quota = userDays ? userDays.dias : 0;
            setAssignedDays(quota);

            const yearStr = year.toString();
            const currentYearVacs = vacationsData.filter(v =>
                v.fecha_inicio.startsWith(yearStr) && v.estado !== 'rechazado'
            );

            let totalUsed = 0;
            currentYearVacs.forEach(v => {
                const start = new Date(v.fecha_inicio);
                const end = new Date(v.fecha_fin);
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                totalUsed += diffDays;
            });
            setConsumedDays(totalUsed);
        } catch (error) {
            console.error('Error loading quota:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadQuota();
    }, [user, refreshTrigger]);

    if (loading || assignedDays === null) return null;

    const remainingDays = assignedDays - consumedDays;

    // Determine colors based on remaining days
    const getStatusColors = (days: number) => {
        if (days > 15) return { text: 'text-emerald-500', border: 'border-emerald-100', shadow: 'shadow-emerald-500/10' };
        if (days >= 7) return { text: 'text-amber-500', border: 'border-amber-100', shadow: 'shadow-amber-500/10' };
        return { text: 'text-red-500', border: 'border-red-100', shadow: 'shadow-red-500/10' };
    };

    const status = getStatusColors(remainingDays);

    return (
        <div className="bg-white rounded-[2.5rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/50 mb-6 transition-all hover:shadow-lg hover:scale-[1.01]">
            <div className="flex items-center gap-6">
                <div className={`bg-white px-5 py-3 rounded-2xl border ${status.border} min-w-[80px] text-center shadow-xl ${status.shadow}`}>
                    <span className={`text-3xl font-black ${status.text} leading-none block`}>
                        {remainingDays}
                    </span>
                </div>
                <div>
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] leading-none mb-2">
                        Días Disponibles
                    </h4>
                    <p className="text-sm font-bold text-[#121726]">
                        Periodo {new Date().getFullYear()}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${remainingDays > 15 ? 'bg-emerald-500' : remainingDays >= 7 ? 'bg-amber-500' : 'bg-red-500'} transition-all duration-1000`}
                                style={{ width: `${Math.min(100, (remainingDays / (assignedDays || 1)) * 100)}%` }}
                            />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                            {consumedDays} / {assignedDays} consumidos
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
