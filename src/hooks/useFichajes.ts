'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useGeolocationConfig } from './useGeolocationConfig';
import { useLogoutAfterClockConfig } from './useLogoutAfterClockConfig';
import { Fichaje, FichajeFilter, WorkCycle, FichajeState, FichajeTipo } from '@/lib/types';
import { differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { dlogFichajes as dlog } from '@/lib/debug-fichajes';
import { parseDolibarrDate } from '@/lib/date-utils';
import { getCurrentPosition } from '@/lib/geolocation';
import { groupFichajesIntoCycles as groupFichajesIntoCyclesLogic } from '@/lib/fichajes-logic';
import { offlineStore, QueuedFichaje } from '@/lib/offline-store';
import { useCenters } from './useCenters';
import { calculateDistance } from '@/lib/geolocation';

export interface UseFichajesOptions {
    fkUser?: string | null;
    initialFilter?: FichajeFilter;
}

export const useFichajes = (options?: UseFichajesOptions) => {
    const { user, logout } = useAuth();
    const { enabled: geolocationEnabled, loading: geolocationLoading } = useGeolocationConfig();
    const { enabled: logoutAfterClockEnabled } = useLogoutAfterClockConfig();
    const targetFkUser = options?.fkUser ?? null;
    const instanceIdRef = useRef<string>(`fichajes-${Date.now()}-${Math.random().toString(16).slice(2)}`);

    // Centers
    const { centers, refreshCenters } = useCenters();

    // Estados principales
    const [fichajes, setFichajes] = useState<Fichaje[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FichajeFilter>(options?.initialFilter || {});
    const [currentState, setCurrentState] = useState<FichajeState>('sin_iniciar');
    const [workCycles, setWorkCycles] = useState<WorkCycle[]>([]);
    const [activeCycle, setActiveCycle] = useState<WorkCycle | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [offlineQueueCount, setOfflineQueueCount] = useState(0);
    const ITEMS_PER_PAGE = 5;

    // Actualizar estado de red y cola
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const updateOnlineStatus = () => setIsOnline(navigator.onLine);
        const updateQueueCount = () => setOfflineQueueCount(offlineStore.getQueue().length);

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateQueueCount();

        // Check queue periodically or on focus
        const interval = setInterval(updateQueueCount, 5000);
        window.addEventListener('focus', updateQueueCount);

        return () => {
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
            window.removeEventListener('focus', updateQueueCount);
            clearInterval(interval);
        };
    }, []);

    // Función de sincronización automática
    const syncOfflineFichajes = useCallback(async () => {
        if (!navigator.onLine || isLoading || !user) return;

        const queue = offlineStore.getQueue();
        if (queue.length === 0) return;

        toast.loading(`Sincronizando ${queue.length} fichajes offline...`, { id: 'sync-toast' });

        let successCount = 0;
        const token = typeof window !== 'undefined' ? localStorage.getItem('dolibarr_token') : '';

        for (const item of queue) {
            try {
                const requestData = {
                    tipo: item.tipo,
                    observaciones: item.observaciones + ' (Sincronizado offline)',
                    geolocationEnabled: !!(item.latitud && item.longitud),
                    ...(item.latitud && { latitud: item.latitud, longitud: item.longitud }),
                    usuario: item.usuario || user?.login,
                    fecha_manual: item.fecha // Enviar la fecha real en que ocurrió
                };

                const response = await fetch('/api/fichajes/registrar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'DOLAPIKEY': token || ''
                    },
                    body: JSON.stringify(requestData)
                });

                if (response.ok || response.status === 409) {
                    offlineStore.removeFromQueue(item.id);
                    successCount++;
                }
            } catch (err) {
                console.error('Error sincronizando item:', item.id, err);
            }
        }

        if (successCount > 0) {
            toast.success(`${successCount} fichajes sincronizados`, { id: 'sync-toast' });
            fetchFichajes();
            setOfflineQueueCount(offlineStore.getQueue().length);
        } else {
            toast.dismiss('sync-toast');
        }
    }, [isLoading, user]);

    // Trigger sync when coming back online
    useEffect(() => {
        if (isOnline) {
            syncOfflineFichajes();
        }
    }, [isOnline, syncOfflineFichajes]);

    // Función para agrupar fichajes en ciclos de trabajo
    const groupFichajesIntoCycles = useCallback((fichajesArray: Fichaje[]) => {
        return groupFichajesIntoCyclesLogic(fichajesArray);
    }, []);

    useEffect(() => {
        const cycles = groupFichajesIntoCycles(fichajes);
        setWorkCycles(cycles);
        setTotalPages(Math.ceil(cycles.length / ITEMS_PER_PAGE));

        const active = cycles.find(cycle => !cycle.salida);
        setActiveCycle(active || null);

        if (!active) {
            setCurrentState('sin_iniciar');
        } else {
            const ultimaPausa = active.pausas[active.pausas.length - 1];
            if (ultimaPausa && !ultimaPausa.fin) {
                setCurrentState('en_pausa');
            } else {
                setCurrentState('trabajando');
            }
        }
    }, [fichajes, groupFichajesIntoCycles]);

    const fetchFichajes = useCallback(async () => {
        // Don't fetch if user is not authenticated or offline
        if (!user || !navigator.onLine) {
            setIsLoading(false);
            if (!user) setIsInitialLoad(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const searchParams = new URLSearchParams();
            if (user?.admin && targetFkUser === '0') {
                // Admin requesting all users: don't set fk_user so API returns all
            } else if (targetFkUser && user?.admin) {
                searchParams.set('fk_user', targetFkUser);
            } else if (user?.id) {
                searchParams.set('fk_user', user.id);
            }

            // Filtros de fecha
            if (filter.startDate) searchParams.set('date_start', filter.startDate);
            if (filter.endDate) searchParams.set('date_end', filter.endDate);

            // ADDED: Obtener token del localStorage
            const token = typeof window !== 'undefined' ? localStorage.getItem('dolibarr_token') : '';

            // If no token, abort silently (user is logging out or not authenticated)
            if (!token) {
                setIsLoading(false);
                return;
            }

            const url = `/api/fichajes${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'DOLAPIKEY': token || '' // ADDED HEADER
                },
            });

            if (!response.ok) {
                // If unauthorized (401), it means user is logging out or session expired
                // Handle silently without showing error
                if (response.status === 401) {
                    setIsLoading(false);
                    return;
                }

                const errorData = await response.json();
                throw new Error(errorData.error || errorData.message || 'Error al obtener fichajes');
            }

            const data = await response.json();
            const fichajesData: Fichaje[] = (data.fichajes || data || []) as Fichaje[];

            const normalized = Array.isArray(fichajesData)
                ? fichajesData.map(f => ({
                    ...f,
                    tipo: (f.tipo as string) === 'pausa'
                        ? 'iniciar_pausa'
                        : ((f.tipo as string) === 'finp' ? 'terminar_pausa' : f.tipo) as FichajeTipo,
                    fecha_creacion: f.fecha_creacion,
                    // Ensure usuario_nombre is preserved
                    usuario_nombre: f.usuario_nombre || f.usuario
                }))
                : [];

            console.log(`[useFichajes] Normalized ${normalized.length} fichajes. First one geo:`, {
                id: normalized[0]?.id,
                lat: normalized[0]?.latitud,
                lng: normalized[0]?.longitud
            });

            setFichajes(normalized);

        } catch (err) {
            console.error('Error fetching fichajes:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setIsLoading(false);
            setIsInitialLoad(false);
        }
    }, [targetFkUser, user?.admin, user, filter]);

    useEffect(() => {
        fetchFichajes();
    }, [fetchFichajes, filter]);

    // Listen for logout events and reset state
    useEffect(() => {
        const handleLogout = () => {
            setFichajes([]);
            setWorkCycles([]);
            setActiveCycle(null);
            setCurrentState('sin_iniciar');
            setError(null);
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('auth:logout', handleLogout);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('auth:logout', handleLogout);
            }
        };
    }, []);

    useEffect(() => {
        const handler = (evt: Event) => {
            const e = evt as CustomEvent<{ sourceId?: string }>;
            if (e?.detail?.sourceId && e.detail.sourceId === instanceIdRef.current) return;
            fetchFichajes();
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('fichajes:update', handler as EventListener);
        }
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('fichajes:update', handler as EventListener);
            }
        };
    }, [fetchFichajes]);

    // Registrar fichaje usando el nuevo endpoint
    const registrarFichaje = useCallback(async (
        tipo: FichajeTipo,
        observaciones?: string,
        coords?: { lat: string, lng: string },
        geolocationEnabledParam?: boolean,
        justification?: string // ADDED: Justification support
    ) => {
        try {
            // Guard: wait for geolocation config to fully load before proceeding
            if (geolocationLoading) {
                toast('Cargando configuración de ubicación...', { icon: '⏳', duration: 2000 });
                return;
            }

            let finalCoords = coords;

            // Determine if we should capture location:
            // - Use explicit param if provided, otherwise fall back to global config
            const shouldCaptureLocation = geolocationEnabledParam ?? geolocationEnabled;

            console.log('[registrarFichaje] Iniciando. Tipo:', tipo);
            console.log('[registrarFichaje] Configuración Geolocalización:', {
                shouldCaptureLocation,
                globalEnabled: geolocationEnabled,
                paramEnabled: geolocationEnabledParam
            });

            if (coords) {
                finalCoords = coords;
                console.log('[registrarFichaje] Coordenadas proporcionadas manualmente:', finalCoords);
            } else if (shouldCaptureLocation) {
                try {
                    // Check permission state first if possible (optional)
                    console.log('[registrarFichaje] Intentando capturar ubicación...');
                    // toast.loading('Capturando ubicación...', {
                    //     icon: '📍',
                    //     duration: 3000
                    // });
                    const position = await getCurrentPosition();
                    finalCoords = {
                        lat: position.lat,
                        lng: position.lng
                    };
                    // toast.success('Ubicación capturada correctamente', {
                    //     icon: '✓',
                    //     duration: 2000
                    // });
                    console.log('[registrarFichaje] Ubicación capturada:', finalCoords);
                } catch (error: any) {
                    console.error('[registrarFichaje] Error capturando ubicación:', error);

                    // shouldCaptureLocation is always true here (we entered via its if-branch)
                    let msg = 'Error al obtener ubicación.';
                    if (error.code === 1) msg = 'Permiso de geolocalización denegado.';
                    else if (error.code === 2) msg = 'Ubicación no disponible.';
                    else if (error.code === 3) msg = 'Tiempo de espera agotado.';

                    if (error.message) msg += ` (${error.message})`;

                    toast.error(msg);
                    throw new Error('La geolocalización es obligatoria pero no se pudo obtener.');
                }
            } else {
                console.log('[registrarFichaje] Saltando captura de ubicación (No requerida)');
            }


            // --- CHECK LOCATION AGAINST CENTERS (SOFT-BLOCKING) ---
            // Only check if we have coords, centers exist, and NO justification is provided yet.
            console.log('DEBUG: Validating Location?', {
                hasCoords: !!finalCoords,
                centersCount: centers.length,
                hasJustification: !!justification,
                tipo,
                coords: finalCoords
            });

            if (finalCoords && centers.length > 0 && !justification) {
                const lat = parseFloat(finalCoords.lat);
                const lng = parseFloat(finalCoords.lng);

                let insideAny = false;
                let minDistance = Infinity;
                let closestCenterLabel = '';

                // FILTER CENTERS: If user has assigned center, ONLY check that one.
                // Otherwise check all.
                // NOTE: The backend returns 'work_centers_ids' (comma separated) and 'workplace_center_id' (legacy/singular).
                // The Admin UI uses 'work_centers_ids'.
                const workCentersIdsStr = (user as any)?.work_centers_ids;
                const legacyCenterId = (user as any)?.workplace_center_id;

                let assignedIds: string[] = [];

                if (workCentersIdsStr) {
                    assignedIds = workCentersIdsStr.split(',').filter(Boolean);
                } else if (legacyCenterId) {
                    assignedIds = [legacyCenterId.toString()];
                }

                const centersToCheck = assignedIds.length > 0
                    ? centers.filter(c => assignedIds.includes(((c as any).rowid || c.id).toString()))
                    : centers;

                centersToCheck.forEach(center => {
                    const dist = calculateDistance(lat, lng, center.latitude, center.longitude);
                    if (dist <= center.radius) {
                        insideAny = true;
                    }
                    if (dist < minDistance) {
                        minDistance = dist;
                        closestCenterLabel = center.label;
                    }
                });

                if (!insideAny) {
                    // Normalize message
                    const centerName = centersToCheck.length === 1 ? centersToCheck[0].label : 'su centro de trabajo';

                    // Start SOFT BLOCK

                    // Start SOFT BLOCK
                    // Instead of throwing, we return a special object or throw a specific error 
                    // that the UI can catch to show the modal.
                    /* eslint-disable-next-line no-throw-literal */
                    throw {
                        code: 'LOCATION_OUT_OF_RANGE',
                        message: `Estás fuera del radio de fichaje de ${centerName}`,
                        distance: minDistance,
                        centerName: closestCenterLabel,
                        coords: finalCoords
                    };
                }
            }

            // --- MANEJO OFFLINE ---
            if (!navigator.onLine) {
                offlineStore.enqueue({
                    tipo,
                    observaciones: observaciones || '',
                    latitud: finalCoords?.lat,
                    longitud: finalCoords?.lng,
                    usuario: user?.login
                });

                toast.success('Fichaje guardado localmente (Modo Offline)', { icon: '📴' });
                setOfflineQueueCount(offlineStore.getQueue().length);

                // Simular actualización local para feedback inmediato si es posible
                return { success: true, offline: true };
            }

            const requestData = {
                tipo,
                observaciones: observaciones || '',
                geolocationEnabled: shouldCaptureLocation,
                ...(finalCoords && { latitud: finalCoords.lat, longitud: finalCoords.lng }),
                usuario: user?.login,
                justification: justification || undefined,
                location_warning: justification ? true : false
            };

            // ADDED: Token header
            const token = typeof window !== 'undefined' ? localStorage.getItem('dolibarr_token') : '';

            const response = await fetch('/api/fichajes/registrar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'DOLAPIKEY': token || '' // ADDED HEADER
                },
                body: JSON.stringify(requestData)
            });

            // Safe parse
            const responseText = await response.text();
            let responseData: any = {};
            try { responseData = responseText ? JSON.parse(responseText) : {}; } catch { }

            if (response.status === 409) {
                const msg = responseData?.message || 'La acción ya estaba registrada o hay conflicto de estado.';
                setError(msg);
                toast(msg);
                await fetchFichajes();
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('fichajes:update', { detail: { sourceId: instanceIdRef.current } }));
                }
                return responseData;
            }

            if (!response.ok) {
                throw new Error(responseData.message || responseData.error || 'Error al registrar el fichaje');
            }

            await fetchFichajes();

            const locationMsg = finalCoords ? ' (Ubicación registrada)' : '';
            if (tipo === 'entrar') toast.success('Entrada registrada' + locationMsg);
            else if (tipo === 'salir') toast.success('Salida registrada' + locationMsg);
            else if (tipo === 'iniciar_pausa') toast.success('Pausa iniciada' + locationMsg);
            else if (tipo === 'terminar_pausa') toast.success('Pausa terminada' + locationMsg);

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('fichajes:update', { detail: { sourceId: instanceIdRef.current } }));
            }

            if (logoutAfterClockEnabled) {
                try {
                    await logout();
                } catch (e) {
                    console.error('Error durante logout tras fichaje:', e);
                }
            }
            return responseData;
        } catch (err) {
            console.error('Error al registrar fichaje:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido');
            throw err;
        }
    }, [geolocationEnabled, geolocationLoading, fetchFichajes, logoutAfterClockEnabled, logout, user, centers]);

    // Funciones de conveniencia
    const registrarEntrada = useCallback((observaciones?: string, coords?: { lat: string, lng: string }, geolocationEnabledParam?: boolean, justification?: string) =>
        registrarFichaje('entrar', observaciones, coords, geolocationEnabledParam, justification), [registrarFichaje]);

    const registrarSalida = useCallback((observaciones?: string, coords?: { lat: string, lng: string }, geolocationEnabledParam?: boolean, justification?: string) =>
        registrarFichaje('salir', observaciones, coords, geolocationEnabledParam, justification), [registrarFichaje]);

    const iniciarPausa = useCallback((observaciones?: string, coords?: { lat: string, lng: string }, geolocationEnabledParam?: boolean, justification?: string) =>
        registrarFichaje('iniciar_pausa', observaciones, coords, geolocationEnabledParam, justification), [registrarFichaje]);

    const terminarPausa = useCallback((observaciones?: string, coords?: { lat: string, lng: string }, geolocationEnabledParam?: boolean, justification?: string) =>
        registrarFichaje('terminar_pausa', observaciones, coords, geolocationEnabledParam, justification), [registrarFichaje]);

    return {
        fichajes,
        workCycles,
        activeCycle,
        loading: isLoading,
        isInitialLoad,
        error,
        currentState,
        isOnline,
        offlineQueueCount,
        geolocationEnabled,
        geolocationLoading,
        currentPage,
        totalPages,
        setCurrentPage,
        filter,
        setFilter,
        refreshFichajes: fetchFichajes,
        registrarFichaje,
        registrarEntrada,
        registrarSalida,
        iniciarPausa,
        terminarPausa,
        centers, // Expose centers
        refreshCenters
    };
};
