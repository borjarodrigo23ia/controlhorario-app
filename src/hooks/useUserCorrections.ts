'use client';

import { useState, useCallback, useEffect } from 'react';
import { CorrectionRequest } from '@/lib/admin-types';
import { useAuth } from '@/context/AuthContext';

/**
 * Hook for EMPLOYEES to view their own correction requests.
 * Fetches all corrections (pending, approved, rejected) for the logged-in user.
 */
export const useUserCorrections = () => {
    const { user } = useAuth();
    const [corrections, setCorrections] = useState<CorrectionRequest[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchMyCorrections = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('dolibarr_token');
            const params = new URLSearchParams({ fk_user: user.id });

            const res = await fetch(`/api/corrections?${params.toString()}`, {
                headers: { 'DOLAPIKEY': token || '' }
            });
            if (res.ok) {
                const data = await res.json();
                setCorrections(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('[useUserCorrections] Error:', e);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchMyCorrections();
    }, [fetchMyCorrections]);

    // Helper: get pending corrections for a specific date (for visual diff in history)
    const getPendingForDate = useCallback((dateStr: string) => {
        return corrections.filter(
            c => c.fecha_jornada === dateStr && c.estado === 'pendiente'
        );
    }, [corrections]);

    return {
        corrections,
        loading,
        fetchMyCorrections,
        getPendingForDate
    };
};
