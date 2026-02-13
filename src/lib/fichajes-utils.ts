import { WorkCycle } from '@/lib/types';
import { format } from 'date-fns';
import { parseDolibarrDate } from '@/lib/date-utils';

export type TimelineEvent = {
    id: string;
    dbId?: string; // Real database ID from Dolibarr
    time: Date;
    originalTime?: Date; // Original time before correction (legal compliance)
    type: 'entrada' | 'salida' | 'inicio_pausa' | 'fin_pausa';
    label: string;
    location?: string;
    color: string;
    cycleId: string;
    lat?: string;
    lng?: string;
    dateStr: string; // YYYY-MM-DD for editing
    observaciones?: string;
    estado_aceptacion?: string;
    location_warning?: number;
    early_entry_warning?: number;
    justification?: string;
    pauseStart?: Date; // For pause events: start time of the pause pair
    pauseEnd?: Date;   // For pause events: end time of the pause pair
    contextEntry?: Date; // For validation: entry time of the cycle
    contextExit?: Date;  // For validation: exit time of the cycle
};

const hasValidCoords = (lat?: any, lng?: any): boolean => {
    if (!lat || !lng) return false;
    // Dolibarr sometimes returns "0.00000000" as string or 0 as number
    const nLat = parseFloat(String(lat));
    const nLng = parseFloat(String(lng));
    const isValid = !isNaN(nLat) && !isNaN(nLng) && (Math.abs(nLat) > 0.000001 || Math.abs(nLng) > 0.000001);
    return isValid;
};

export const getDailyEvents = (cycles: WorkCycle[]): TimelineEvent[] => {
    console.log('[getDailyEvents] Input cycles:', cycles.length);
    const result: TimelineEvent[] = [];

    // Sort cycles just in case
    const sortedCycles = [...cycles].sort((a, b) =>
        new Date(a.entrada.fecha_creacion).getTime() - new Date(b.entrada.fecha_creacion).getTime()
    );

    sortedCycles.forEach(cycle => {
        const cycleId = cycle.id?.toString() || Math.random().toString();
        const cycleDateStr = new Date(cycle.entrada.fecha_creacion).toISOString().split('T')[0];

        // Pre-calculate boundaries for context
        const entradaDate = parseDolibarrDate(cycle.entrada.fecha_creacion);
        const salidaDate = cycle.salida ? parseDolibarrDate(cycle.salida.fecha_creacion) : undefined;

        // Entrada
        result.push({
            id: `entrada-${entradaDate.getTime()}`,
            dbId: cycle.entrada.id,
            time: entradaDate,
            type: 'entrada',
            label: 'Entrada',
            location: hasValidCoords(cycle.entrada.latitud, cycle.entrada.longitud) ? 'Ubicación' : undefined,
            lat: cycle.entrada.latitud,
            lng: cycle.entrada.longitud,
            color: '#AFF0BA', // Green
            cycleId,
            dateStr: cycleDateStr,
            observaciones: cycle.entrada.observaciones,
            estado_aceptacion: cycle.entrada.estado_aceptacion,
            originalTime: cycle.entrada.fecha_original ? parseDolibarrDate(cycle.entrada.fecha_original) : undefined,
            location_warning: cycle.entrada.location_warning,
            early_entry_warning: cycle.entrada.early_entry_warning,
            justification: cycle.entrada.justification,
            contextEntry: entradaDate,
            contextExit: salidaDate
        });

        // Pausas
        if (cycle.pausas && cycle.pausas.length > 0) {
            cycle.pausas.forEach(pausa => {
                if (!pausa.inicio) return;

                const pausaInicio = parseDolibarrDate(pausa.inicio.fecha_creacion);
                const pausaFinDate = pausa.fin ? parseDolibarrDate(pausa.fin.fecha_creacion) : undefined;
                result.push({
                    id: `pausa-start-${pausaInicio.getTime()}`,
                    dbId: pausa.inicio.id,
                    time: pausaInicio,
                    type: 'inicio_pausa',
                    label: 'Pausa',
                    location: hasValidCoords(pausa.inicio.latitud, pausa.inicio.longitud) ? 'Ubicación' : undefined,
                    lat: pausa.inicio.latitud,
                    lng: pausa.inicio.longitud,
                    color: '#FFEEA3', // Yellow
                    cycleId,
                    dateStr: cycleDateStr,
                    observaciones: pausa.inicio.observaciones,
                    estado_aceptacion: pausa.inicio.estado_aceptacion,
                    originalTime: pausa.inicio.fecha_original ? parseDolibarrDate(pausa.inicio.fecha_original) : undefined,
                    location_warning: pausa.inicio.location_warning,
                    early_entry_warning: pausa.inicio.early_entry_warning,
                    justification: pausa.inicio.justification,
                    pauseStart: pausaInicio,
                    pauseEnd: pausaFinDate,
                    contextEntry: entradaDate,
                    contextExit: salidaDate
                });

                if (pausa.fin) {
                    const pausaFin = parseDolibarrDate(pausa.fin.fecha_creacion);
                    result.push({
                        id: `pausa-end-${pausaFin.getTime()}`,
                        dbId: pausa.fin.id,
                        time: pausaFin,
                        type: 'fin_pausa',
                        label: 'Regreso',
                        location: hasValidCoords(pausa.fin.latitud, pausa.fin.longitud) ? 'Ubicación' : undefined,
                        lat: pausa.fin.latitud,
                        lng: pausa.fin.longitud,
                        color: '#ACE4F2', // Blue
                        cycleId,
                        dateStr: cycleDateStr,
                        observaciones: pausa.fin.observaciones,
                        estado_aceptacion: pausa.fin.estado_aceptacion,
                        originalTime: pausa.fin.fecha_original ? parseDolibarrDate(pausa.fin.fecha_original) : undefined,
                        location_warning: pausa.fin.location_warning,
                        early_entry_warning: pausa.fin.early_entry_warning,
                        justification: pausa.fin.justification,
                        pauseStart: pausaInicio,
                        pauseEnd: pausaFin,
                        contextEntry: entradaDate,
                        contextExit: salidaDate
                    });
                }
            });
        }

        // Salida
        if (cycle.salida) {
            // reused calculated salidaDate
            result.push({
                id: `salida-${salidaDate!.getTime()}`, // valid here because block exists
                dbId: cycle.salida.id,
                time: salidaDate!,
                type: 'salida',
                label: 'Salida',
                location: hasValidCoords(cycle.salida.latitud, cycle.salida.longitud) ? 'Ubicación' : undefined,
                lat: cycle.salida.latitud,
                lng: cycle.salida.longitud,
                color: '#FF7A7A', // Red
                cycleId,
                dateStr: cycleDateStr,
                observaciones: cycle.salida.observaciones,
                estado_aceptacion: cycle.salida.estado_aceptacion,
                originalTime: cycle.salida.fecha_original ? parseDolibarrDate(cycle.salida.fecha_original) : undefined,
                location_warning: cycle.salida.location_warning,
                early_entry_warning: cycle.salida.early_entry_warning,
                justification: cycle.salida.justification,
                contextEntry: entradaDate,
                contextExit: salidaDate
            });
        }
    });

    // Sort events chronologically
    return result.sort((a, b) => a.time.getTime() - b.time.getTime());
};
