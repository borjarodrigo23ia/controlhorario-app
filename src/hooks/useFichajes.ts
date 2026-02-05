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

export interface UseFichajesOptions {
    fkUser?: string | null;
}

export const useFichajes = (options?: UseFichajesOptions) => {
    const { user, logout } = useAuth();
    const { enabled: geolocationEnabled, loading: geolocationLoading } = useGeolocationConfig();
    const { enabled: logoutAfterClockEnabled } = useLogoutAfterClockConfig();
    const targetFkUser = options?.fkUser ?? null;
    const instanceIdRef = useRef<string>(`fichajes-${Date.now()}-${Math.random().toString(16).slice(2)}`);

    // Estados principales
    const [fichajes, setFichajes] = useState<Fichaje[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FichajeFilter>({});
    const [currentState, setCurrentState] = useState<FichajeState>('sin_iniciar');
    const [workCycles, setWorkCycles] = useState<WorkCycle[]>([]);
    const [activeCycle, setActiveCycle] = useState<WorkCycle | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const ITEMS_PER_PAGE = 5;

    // Función para agrupar fichajes en ciclos de trabajo
    const groupFichajesIntoCycles = useCallback((fichajesArray: Fichaje[]) => {
        if (!Array.isArray(fichajesArray) || fichajesArray.length === 0) {
            return [];
        }

        // --- SOLUCIÓN: Agrupar por usuario primero para soportar Historial Global ---
        const fichajesByUser: Record<string, Fichaje[]> = {};
        fichajesArray.forEach(f => {
            const key = f.fk_user || f.usuario || 'unknown';
            if (!fichajesByUser[key]) fichajesByUser[key] = [];
            fichajesByUser[key].push(f);
        });

        let allCycles: WorkCycle[] = [];

        // Procesar cada usuario de forma independiente
        Object.values(fichajesByUser).forEach(userFichajes => {
            const sortedFichajes = [...userFichajes].sort((a, b) => {
                const dateA = a.fecha_creacion;
                const dateB = b.fecha_creacion;
                return parseDolibarrDate(dateA).getTime() - parseDolibarrDate(dateB).getTime();
            });

            const userCycles: WorkCycle[] = [];
            let currentCycle: WorkCycle | null = null;

            for (const fichaje of sortedFichajes) {
                if (!fichaje || !fichaje.tipo || !fichaje.fecha_creacion) continue;

                const dateStr = fichaje.fecha_creacion;
                const fecha = parseDolibarrDate(dateStr);

                switch (fichaje.tipo) {
                    case 'entrar':
                        if (currentCycle?.entrada) {
                            const lastEntryDateStr = currentCycle.entrada.fecha_creacion;
                            const hoursFromLastEntry = differenceInMinutes(fecha, parseDolibarrDate(lastEntryDateStr)) / 60;
                            if (hoursFromLastEntry > 12) {
                                currentCycle.salida = { ...currentCycle.entrada, id: '-1', tipo: 'salir', fecha_creacion: currentCycle.entrada.fecha_creacion, observaciones: 'Cierre automático > 12h' };
                                userCycles.push(currentCycle);
                                currentCycle = null;
                            }
                        }
                        if (!currentCycle) {
                            currentCycle = { entrada: { ...fichaje, tipo: 'entrar', fecha_creacion: dateStr }, pausas: [], fecha: dateStr };
                        }
                        break;

                    case 'salir':
                        if (currentCycle) {
                            currentCycle.salida = { ...fichaje, tipo: 'salir', fecha_creacion: dateStr };
                            const entradaDateStr = currentCycle.entrada.fecha_creacion;
                            const tiempoTotal = differenceInMinutes(fecha, parseDolibarrDate(entradaDateStr));
                            let tiempoPausado = 0;
                            currentCycle.pausas.forEach(p => {
                                if (p.inicio && p.fin) {
                                    const finS = p.fin.fecha_creacion;
                                    const iniS = p.inicio.fecha_creacion;
                                    tiempoPausado += differenceInMinutes(parseDolibarrDate(finS), parseDolibarrDate(iniS));
                                }
                            });
                            currentCycle.duracion_total = tiempoTotal;
                            currentCycle.duracion_pausas = tiempoPausado;
                            currentCycle.duracion_efectiva = tiempoTotal - tiempoPausado;
                            userCycles.push(currentCycle);
                            currentCycle = null;
                        }
                        break;

                    case 'iniciar_pausa':
                        if (currentCycle) currentCycle.pausas.push({ inicio: { ...fichaje, tipo: 'iniciar_pausa', fecha_creacion: dateStr } });
                        break;

                    case 'terminar_pausa':
                        if (currentCycle && currentCycle.pausas.length > 0) {
                            const lastP = currentCycle.pausas[currentCycle.pausas.length - 1];
                            if (!lastP.fin) lastP.fin = { ...fichaje, tipo: 'terminar_pausa', fecha_creacion: dateStr };
                        }
                        break;
                }
            }

            if (currentCycle?.entrada) {
                const now = new Date();
                const entradaDateStr = currentCycle.entrada.fecha_creacion;
                const tiempoTotal = differenceInMinutes(now, parseDolibarrDate(entradaDateStr));
                let tiempoPausado = 0;
                currentCycle.pausas.forEach(p => {
                    if (p.inicio && p.fin) {
                        const finS = p.fin.fecha_creacion;
                        const iniS = p.inicio.fecha_creacion;
                        tiempoPausado += differenceInMinutes(parseDolibarrDate(finS), parseDolibarrDate(iniS));
                    }
                });
                currentCycle.duracion_total = tiempoTotal;
                currentCycle.duracion_pausas = tiempoPausado;
                currentCycle.duracion_efectiva = tiempoTotal - tiempoPausado;
                userCycles.push(currentCycle);
            }

            allCycles = [...allCycles, ...userCycles];
        });

        // Ordenar todos los ciclos por fecha de entrada (más reciente primero)
        return allCycles.sort((a, b) => {
            const dateA = a.entrada.fecha_creacion;
            const dateB = b.entrada.fecha_creacion;
            return parseDolibarrDate(dateB).getTime() - parseDolibarrDate(dateA).getTime();
        });
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
        // Don't fetch if user is not authenticated
        if (!user) {
            setIsLoading(false);
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
                // Always filter by current user if no specific target is set and not explicitly requesting '0' (all)
                // This prevents Admins from inadvertently seeing ALL records in the personal dashboard
                searchParams.set('fk_user', user.id);
            }

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

            setFichajes(normalized);

        } catch (err) {
            console.error('Error fetching fichajes:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setIsLoading(false);
            setIsInitialLoad(false);
        }
    }, [targetFkUser, user?.admin, user]);

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
    const registrarFichaje = useCallback(async (tipo: FichajeTipo, observaciones?: string, coords?: { lat: string, lng: string }, geolocationEnabledParam?: boolean) => {
        try {
            const isGeoEnabled = geolocationEnabledParam ?? geolocationEnabled;
            let finalCoords = coords;

            // CAPTURE GEOLOCATION IF ENABLED AND NOT PROVIDED
            if (isGeoEnabled && !finalCoords) {
                try {
                    // Notify user that geolocation is being used
                    toast.loading('Capturando ubicación...', {
                        icon: '📍',
                        duration: 3000
                    });
                    finalCoords = await getCurrentPosition();
                    // Success notification
                    toast.success('Ubicación capturada correctamente', {
                        icon: '✓',
                        duration: 2000
                    });
                } catch (geoError) {
                    console.error('Geolocation error:', geoError);
                    toast.error('No se pudo obtener la ubicación. ' + (geoError instanceof Error ? geoError.message : ''));
                    // User requested MANDATORY geolocation. If it fails, we should probably STOP?
                    // "Geolocalización Obligatoria" -> Stop.
                    throw new Error('La geolocalización es obligatoria pero no se pudo obtener.');
                }
            }

            const requestData = {
                tipo,
                observaciones: observaciones || '',
                geolocationEnabled: isGeoEnabled,
                ...(finalCoords && { latitud: finalCoords.lat, longitud: finalCoords.lng }),
                usuario: user?.login,
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
    }, [geolocationEnabled, fetchFichajes, logoutAfterClockEnabled, logout, user]);

    // Funciones de conveniencia
    const registrarEntrada = useCallback((observaciones?: string, coords?: { lat: string, lng: string }, geolocationEnabledParam?: boolean) =>
        registrarFichaje('entrar', observaciones, coords, geolocationEnabledParam), [registrarFichaje]);

    const registrarSalida = useCallback((observaciones?: string, coords?: { lat: string, lng: string }, geolocationEnabledParam?: boolean) =>
        registrarFichaje('salir', observaciones, coords, geolocationEnabledParam), [registrarFichaje]);

    const iniciarPausa = useCallback((observaciones?: string, coords?: { lat: string, lng: string }, geolocationEnabledParam?: boolean) =>
        registrarFichaje('iniciar_pausa', observaciones, coords, geolocationEnabledParam), [registrarFichaje]);

    const terminarPausa = useCallback((observaciones?: string, coords?: { lat: string, lng: string }, geolocationEnabledParam?: boolean) =>
        registrarFichaje('terminar_pausa', observaciones, coords, geolocationEnabledParam), [registrarFichaje]);

    return {
        fichajes,
        workCycles,
        activeCycle,
        loading: isLoading,
        isInitialLoad,
        error,
        currentState,
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
        terminarPausa
    };
};
