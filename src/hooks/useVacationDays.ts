import { useState, useCallback } from 'react';
import { authService } from '@/services/auth';

export interface UserVacationDays {
    rowid: number;
    fk_user: number;
    anio: number;
    dias: number;
    login: string;
    lastname: string;
    firstname: string;
}

export interface User {
    id: number;
    login: string;
    lastname: string;
    firstname: string;
}

export const useVacationDays = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchVacationDays = useCallback(async (year?: number) => {
        const token = authService.getToken();
        if (!token) return [];
        setLoading(true);
        setError(null);
        try {
            const y = year || new Date().getFullYear();
            const response = await fetch(`/api/vacations/dias?anio=${y}`, {
                headers: {
                    'DOLAPIKEY': token
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Error al cargar días de vacaciones');
            }

            const data = await response.json();
            return data as UserVacationDays[];
        } catch (err) {
            console.error('Error fetching vacation days:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const setVacationDays = useCallback(async (userId: number, year: number, days: number) => {
        const token = authService.getToken();
        if (!token) return { success: false, message: 'No autenticado' };
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/vacations/dias/set`, {
                method: 'POST',
                headers: {
                    'DOLAPIKEY': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fk_user: userId,
                    anio: year,
                    dias: days
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error?.message || 'Error al asignar días');
            }

            return { success: true, message: 'Días asignados correctamente' };
        } catch (err) {
            console.error('Error setting vacation days:', err);
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            setError(msg);
            return { success: false, message: msg };
        } finally {
            setLoading(false);
        }
    }, []);

    const bulkSetVacationDays = useCallback(async (userIds: number[], year: number, days: number) => {
        const token = authService.getToken();
        if (!token) return { success: false, message: 'No autenticado', successCount: 0, failCount: 0 };

        setLoading(true);
        setError(null);

        let successCount = 0;
        let failCount = 0;
        const errors: string[] = [];

        try {
            // Process sequentially to avoid overwhelming the server
            for (const userId of userIds) {
                try {
                    const response = await fetch(`/api/vacations/dias/set`, {
                        method: 'POST',
                        headers: {
                            'DOLAPIKEY': token,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            fk_user: userId,
                            anio: year,
                            dias: days
                        })
                    });

                    if (response.ok) {
                        successCount++;
                    } else {
                        failCount++;
                        const result = await response.json();
                        errors.push(`Usuario ${userId}: ${result.error?.message || 'Error'}`);
                    }
                } catch (err) {
                    failCount++;
                    errors.push(`Usuario ${userId}: ${err instanceof Error ? err.message : 'Error desconocido'}`);
                }
            }

            const message = `Asignados: ${successCount}/${userIds.length} usuarios${failCount > 0 ? `. Fallos: ${failCount}` : ''}`;

            if (failCount > 0) {
                setError(errors.join(', '));
            }

            return {
                success: failCount === 0,
                message,
                successCount,
                failCount,
                errors
            };
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            setError(msg);
            return { success: false, message: msg, successCount, failCount };
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        fetchVacationDays,
        setVacationDays,
        bulkSetVacationDays
    };
};
