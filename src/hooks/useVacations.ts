import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth';

export interface VacationRequest {
    rowid: number;
    usuario: string; // Login string
    fecha_inicio: string; // YYYY-MM-DD
    fecha_fin: string; // YYYY-MM-DD
    estado: 'pendiente' | 'aprobado' | 'rechazado';
    comentarios: string;
    aprobado_por: string | null;
    fecha_aprobacion: string | null;
    fecha_creacion: string;
}

export interface VacationDays {
    rowid: number;
    fk_user: number;
    anio: number;
    dias: number;
    entity: number;
    usuario_nombre?: string;
}

export const useVacations = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchVacations = useCallback(async (filters?: { estado?: string; usuario?: string }) => {
        const token = authService.getToken();
        if (!token) return [];
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            if (filters?.estado) queryParams.append('estado', filters.estado);
            if (filters?.usuario) queryParams.append('usuario', filters.usuario);

            const response = await fetch(`/api/vacations?${queryParams.toString()}`, {
                headers: {
                    'DOLAPIKEY': token
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Error al cargar vacaciones');
            }

            const data = await response.json();
            return data as VacationRequest[];
        } catch (err) {
            console.error('Error fetching vacations:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const createVacation = useCallback(async (data: { fecha_inicio: string; fecha_fin: string; comentarios?: string }) => {
        const token = authService.getToken();
        if (!token || !user) return { success: false, message: 'No autenticado' };
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/vacations/crear`, {
                method: 'POST',
                headers: {
                    'DOLAPIKEY': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    usuario: user.login,
                    ...data
                })
            });

            const result = await response.json();

            if (!response.ok) {
                // If the proxy returns { error: "message" }, use it directly.
                const errMsg = result.error?.message || result.error || 'Error al solicitar vacaciones';
                throw new Error(errMsg);
            }

            return { success: true, message: 'Solicitud creada correctamente', id: result.id };
        } catch (err) {
            console.error('Error creating vacation:', err);
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            setError(msg);
            return { success: false, message: msg };
        } finally {
            setLoading(false);
        }
    }, [user]);

    const approveVacation = useCallback(async (id: number, comentarios?: string) => {
        const token = authService.getToken();
        if (!token || !user) return { success: false, message: 'No autenticado' };
        setLoading(true);
        try {
            const response = await fetch(`/api/vacations/${id}/aprobar`, {
                method: 'POST',
                headers: {
                    'DOLAPIKEY': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    supervisor: user.login,
                    comentarios
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error?.message || 'Error al aprobar solicitud');
            }

            return { success: true, message: 'Solicitud aprobada' };
        } catch (err) {
            return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' };
        } finally {
            setLoading(false);
        }
    }, [user]);

    const rejectVacation = useCallback(async (id: number, comentarios?: string) => {
        const token = authService.getToken();
        if (!token || !user) return { success: false, message: 'No autenticado' };
        setLoading(true);
        try {
            const response = await fetch(`/api/vacations/${id}/rechazar`, {
                method: 'POST',
                headers: {
                    'DOLAPIKEY': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    supervisor: user.login,
                    comentarios
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error?.message || 'Error al rechazar solicitud');
            }

            return { success: true, message: 'Solicitud rechazada' };
        } catch (err) {
            return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' };
        } finally {
            setLoading(false);
        }
    }, [user]);

    const deleteVacation = useCallback(async (id: number) => {
        const token = authService.getToken();
        if (!token) return { success: false, message: 'No autenticado' };
        setLoading(true);
        try {
            const response = await fetch(`/api/vacations/${id}`, {
                method: 'DELETE',
                headers: {
                    'DOLAPIKEY': token
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error?.message || 'Error al eliminar solicitud');
            }

            return { success: true, message: 'Solicitud eliminada' };
        } catch (err) {
            return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' };
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchVacationDays = useCallback(async (year?: number) => {
        const token = authService.getToken();
        if (!token) return [];
        setLoading(true);
        try {
            const y = year || new Date().getFullYear();
            const response = await fetch(`/api/vacations/dias?anio=${y}`, {
                headers: {
                    'DOLAPIKEY': token
                }
            });
            const data = await response.json();
            return data as VacationDays[];
        } catch (err) {
            console.error('Error fetching vacation days:', err);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        fetchVacations,
        createVacation,
        approveVacation,
        rejectVacation,
        deleteVacation,
        fetchVacationDays
    };
};
