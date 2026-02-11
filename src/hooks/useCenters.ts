import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export interface WorkCenter {
    id: number;
    label: string;
    latitude: number;
    longitude: number;
    radius: number;
}

export const useCenters = () => {
    const { user } = useAuth();
    const [centers, setCenters] = useState<WorkCenter[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCenters = async () => {
        setLoading(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('dolibarr_token') : '';
            const response = await fetch('/api/centers', {
                headers: {
                    'DOLAPIKEY': token || ''
                }
            });
            if (!response.ok) throw new Error('Failed to fetch centers');
            const data = await response.json();
            setCenters(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchCenters();
        }
    }, [user]);

    return { centers, loading, error, refreshCenters: fetchCenters };
};
