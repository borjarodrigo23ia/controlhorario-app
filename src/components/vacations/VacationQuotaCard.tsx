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
        if (days > 15) return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' };
        if (days >= 7) return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' };
        return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' };
    };

    const status = getStatusColors(remainingDays);

    return (
        <div className="bg-white rounded-[2rem] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-6 transition-all hover:shadow-md">
            <div className="flex items-center gap-4">
                <div className={`${status.bg} px-4 py-2.5 rounded-2xl border ${status.border} min-w-[60px] text-center shadow-inner`}>
                    <span className={`text-2xl font-black ${status.text} leading-none block`}>
                        {remainingDays}
                    </span>
                </div>
                <div>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em] leading-none mb-1.5">
                        Días Disponibles
                    </h4>
                    <p className="text-[11px] font-medium text-gray-400">
                        Restantes para el periodo {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </div>
    );
}
