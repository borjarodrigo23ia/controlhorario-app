import { WorkCycle } from '@/lib/types';
import { format } from 'date-fns';
import { parseDolibarrDate } from '@/lib/date-utils';

export type TimelineEvent = {
    id: string;
    time: Date;
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
};

export const getDailyEvents = (cycles: WorkCycle[]): TimelineEvent[] => {
    const result: TimelineEvent[] = [];

    // Sort cycles just in case
    const sortedCycles = [...cycles].sort((a, b) =>
        new Date(a.entrada.fecha_creacion).getTime() - new Date(b.entrada.fecha_creacion).getTime()
    );

    sortedCycles.forEach(cycle => {
        const cycleId = cycle.id?.toString() || Math.random().toString();
        const cycleDateStr = new Date(cycle.entrada.fecha_creacion).toISOString().split('T')[0];

        // Entrada
        const entradaDate = parseDolibarrDate(cycle.entrada.fecha_creacion);
        result.push({
            id: `entrada-${entradaDate.getTime()}`,
            time: entradaDate,
            type: 'entrada',
            label: 'Entrada',
            location: cycle.entrada.latitud ? 'Ubicación registrada' : undefined,
            lat: cycle.entrada.latitud,
            lng: cycle.entrada.longitud,
            color: '#AFF0BA', // Green
            cycleId,
            dateStr: cycleDateStr,
            observaciones: cycle.entrada.observaciones,
            estado_aceptacion: cycle.entrada.estado_aceptacion,
            location_warning: cycle.entrada.location_warning,
            early_entry_warning: cycle.entrada.early_entry_warning,
            justification: cycle.entrada.justification
        });

        // Pausas
        if (cycle.pausas && cycle.pausas.length > 0) {
            cycle.pausas.forEach(pausa => {
                if (!pausa.inicio) return;

                const pausaInicio = parseDolibarrDate(pausa.inicio.fecha_creacion);
                result.push({
                    id: `pausa-start-${pausaInicio.getTime()}`,
                    time: pausaInicio,
                    type: 'inicio_pausa',
                    label: 'Pausa',
                    color: '#FFEEA3', // Yellow
                    cycleId,
                    dateStr: cycleDateStr,
                    observaciones: pausa.inicio.observaciones,
                    estado_aceptacion: pausa.inicio.estado_aceptacion
                });

                if (pausa.fin) {
                    const pausaFin = parseDolibarrDate(pausa.fin.fecha_creacion);
                    result.push({
                        id: `pausa-end-${pausaFin.getTime()}`,
                        time: pausaFin,
                        type: 'fin_pausa',
                        label: 'Reanudación',
                        color: '#ACE4F2', // Blue
                        cycleId,
                        dateStr: cycleDateStr,
                        observaciones: pausa.fin.observaciones,
                        estado_aceptacion: pausa.fin.estado_aceptacion
                    });
                }
            });
        }

        // Salida
        if (cycle.salida) {
            const salidaDate = parseDolibarrDate(cycle.salida.fecha_creacion);
            result.push({
                id: `salida-${salidaDate.getTime()}`,
                time: salidaDate,
                type: 'salida',
                label: 'Salida',
                location: cycle.salida.latitud ? 'Ubicación registrada' : undefined,
                lat: cycle.salida.latitud,
                lng: cycle.salida.longitud,
                color: '#FF7A7A', // Red
                cycleId,
                dateStr: cycleDateStr,
                observaciones: cycle.salida.observaciones,
                estado_aceptacion: cycle.salida.estado_aceptacion
            });
        }
    });

    // Sort events chronologically
    return result.sort((a, b) => a.time.getTime() - b.time.getTime());
};
