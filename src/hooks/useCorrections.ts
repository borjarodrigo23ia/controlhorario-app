import { useState, useCallback } from 'react';
import { CorrectionRequest } from '@/lib/admin-types';
import { toast } from 'react-hot-toast';

export const useCorrections = () => {
    const [corrections, setCorrections] = useState<CorrectionRequest[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchCorrections = useCallback(async (fkUser?: string, estado?: string) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('dolibarr_token');
            const params = new URLSearchParams();
            if (fkUser) params.set('fk_user', fkUser);
            if (estado) params.set('estado', estado);

            const res = await fetch(`/api/corrections?${params.toString()}`, {
                headers: { 'DOLAPIKEY': token || '' }
            });
            if (res.ok) {
                const data = await res.json();
                setCorrections(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error(e);
            toast.error('Error cargando correcciones');
        } finally {
            setLoading(false);
        }
    }, []);

    const createCorrection = useCallback(async (data: Partial<CorrectionRequest>) => {
        try {
            const token = localStorage.getItem('dolibarr_token');
            const res = await fetch('/api/corrections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'DOLAPIKEY': token || ''
                },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Error al crear solicitud');
            toast.success('Solicitud enviada');
            return true;
        } catch (e) {
            toast.error('Error al enviar solicitud');
            return false;
        }
    }, []);

    const approveCorrection = useCallback(async (id: string, note?: string) => {
        try {
            const token = localStorage.getItem('dolibarr_token');
            const res = await fetch(`/api/corrections/${id}/approve`, {
                method: 'POST',
                headers: {
                    'DOLAPIKEY': token || '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ note })
            });
            if (!res.ok) throw new Error();
            toast.success('Solicitud aprobada correctamente');
            return true;
        } catch {
            toast.error('Error al aprobar la solicitud');
            return false;
        }
    }, []);

    const rejectCorrection = useCallback(async (id: string, note?: string) => {
        try {
            const token = localStorage.getItem('dolibarr_token');
            const res = await fetch(`/api/corrections/${id}/reject`, {
                method: 'POST',
                headers: {
                    'DOLAPIKEY': token || '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ note })
            });
            if (!res.ok) throw new Error();
            toast.success('Solicitud rechazada correctamente');
            return true;
        } catch {
            toast.error('Error al rechazar la solicitud');
            return false;
        }
    }, []);

    return {
        corrections,
        loading,
        fetchCorrections,
        createCorrection,
        approveCorrection,
        rejectCorrection
    };
};
