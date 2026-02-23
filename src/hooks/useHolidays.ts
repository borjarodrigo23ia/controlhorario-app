import { useState, useEffect, useCallback } from 'react';

export interface Holiday {
    date: string;
    name: string;
    type: 'national' | 'local';
    global?: boolean;
}

export function useHolidays(year?: number) {
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHolidays = useCallback(async () => {
        setLoading(true);
        try {
            const currentYear = year || new Date().getFullYear();
            const region = localStorage.getItem('app_region') || 'ES-MD';
            const localHolidaysRaw = localStorage.getItem('local_holidays') || '[]';
            const localHolidays = JSON.parse(localHolidaysRaw);

            const res = await fetch(`/api/holidays?year=${currentYear}&region=${region}`);
            if (!res.ok) throw new Error('Error al cargar festivos');

            const data = await res.json();
            const apiHolidays = data.holidays || [];

            // Merge with local holidays
            const combined = [...apiHolidays, ...localHolidays].sort((a, b) =>
                a.date.localeCompare(b.date)
            );

            setHolidays(combined);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [year]);

    useEffect(() => {
        fetchHolidays();
    }, [fetchHolidays]);

    const isHoliday = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return holidays.find(h => h.date === dateStr);
    };

    return { holidays, loading, error, isHoliday, refresh: fetchHolidays };
}
