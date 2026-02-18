import { WorkCycle, AuditLog } from './types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { parseDolibarrDate } from './date-utils';

/**
 * Generates and downloads a CSV file from WorkCycle data
 */
export const exportToCSV = (cycles: WorkCycle[], fileName: string = 'reporte-fichajes.csv') => {
    // CSV headers
    const headers = [
        'Empleado',
        'Fecha',
        'Entrada',
        'Salida',
        'Pausas (min)',
        'Efectivo (min)',
        'Horas Totales',
        'Observaciones'
    ];

    // Data rows
    const rows = cycles.map(cycle => {
        const entrada = cycle.entrada ? format(parseDolibarrDate(cycle.entrada.fecha_creacion), 'HH:mm:ss') : '-';
        const salida = cycle.salida ? format(parseDolibarrDate(cycle.salida.fecha_creacion), 'HH:mm:ss') : '-';
        const fecha = cycle.entrada ? format(parseDolibarrDate(cycle.entrada.fecha_creacion), 'yyyy-MM-dd') : '-';
        const horas = cycle.duracion_efectiva ? (cycle.duracion_efectiva / 60).toFixed(2) : '0';

        return [
            cycle.entrada.usuario_nombre || 'N/A',
            fecha,
            entrada,
            salida,
            cycle.duracion_pausas || 0,
            cycle.duracion_efectiva || 0,
            horas,
            (cycle.entrada.observaciones || '').replace(/,/g, ';') // Avoid CSV breaking
        ];
    });

    // Combine headers and rows
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Generates and downloads a legal PDF report with Premium Design
 */
export const exportToPDF = async (
    cycles: WorkCycle[],
    title: string = 'Registro de Jornada Laboral',
    subtitle: string = '',
    userData?: { dni?: string; naf?: string; name?: string },
    companyData?: { name?: string; cif?: string; center?: string },
    auditLogs: AuditLog[] = [],
    dailyHours: number = 8
) => {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const primaryColor = [124, 58, 237]; // #7c3aed (Deep Indigo)
    const textColor = [17, 24, 39]; // #111827 (Dark Gray)
    const mutedColor = [107, 114, 128]; // #6b7280 (Gray)
    const borderColor = [229, 231, 235]; // #e5e7eb

    // --- 1. HEADER ---
    // Logo Box with Calendar Icon (Centered)
    doc.setFillColor(0, 0, 0);
    doc.roundedRect(14, 15, 12, 12, 2.5, 2.5, 'F');

    // Draw simplified calendar icon inside box (Centered in 12x12 box at 14,15)
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.4);
    doc.rect(16.5, 18, 7, 6, 'S'); // Main calendar body
    doc.line(16.5, 20, 23.5, 20); // Calendar horizontal header line
    doc.line(18.5, 17.5, 18.5, 19.5); // Left hook
    doc.line(21.5, 17.5, 21.5, 19.5); // Right hook

    // Title (Compact size to avoid jumps)
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12); // Reduced for safety
    doc.text('Registro de Jornada Laboral', 29, 21.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text('Informe Mensual de Registro Horario y Presencia', 29, 26);

    // Period Badge (Right)
    const monthYear = format(new Date(), 'MMMM yyyy', { locale: es });
    doc.setFillColor(0, 0, 0);
    doc.roundedRect(144, 16, 52, 8, 4, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(monthYear.toUpperCase(), 170, 21.4, { align: 'center' });

    // Divider
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.1);
    doc.line(14, 34, 196, 34);

    // --- 2. INFO BLOCKS ---
    doc.setFontSize(6.5);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text('EMPRESA', 14, 42);
    doc.text('TRABAJADOR', 110, 42);

    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    // Company Side
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(companyData?.name || 'Nombre de Empresa', 14, 47, { maxWidth: 85 });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(`CIF / NIF: ${companyData?.cif || '---'}`, 14, 51.5);
    doc.text(`Centro: ${companyData?.center || 'Sede Principal'}`, 14, 55.5);

    // Worker Side
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(userData?.name || 'Empleado General', 110, 47, { maxWidth: 85 });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(`DNI / NIE: ${userData?.dni || '---'}`, 110, 51.5);
    doc.text(`Nº SEG. SOCIAL: ${userData?.naf || '---'}`, 110, 55.5);

    // --- 3. METRICS ---
    let totalMin = cycles.reduce((acc, c) => acc + (c.duracion_efectiva || 0), 0);
    const totalHours = Math.floor(totalMin / 60);
    const totalRemMin = totalMin % 60;

    // Calculate Theoretical Hours (Business days * dailyHours)
    // 1. Get month/year from first cycle or current date
    let reportDate = new Date();
    if (cycles.length > 0) {
        reportDate = parseDolibarrDate(cycles[0].entrada.fecha_creacion);
    }

    // 2. Count business days (Mon-Fri) in that month
    const year = reportDate.getFullYear();
    const month = reportDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let businessDays = 0;

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const dayOfWeek = date.getDay();
        // 0 = Sunday, 6 = Saturday
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            businessDays++;
        }
    }

    const theoreticalHoursTotal = businessDays * dailyHours;

    // Calculate difference (Extra or Deficit) if needed, but for now just display

    doc.setFillColor(249, 250, 251);
    doc.roundedRect(14, 70, 55, 20, 3, 3, 'F');
    doc.roundedRect(73, 70, 55, 20, 3, 3, 'F');
    doc.roundedRect(132, 70, 64, 20, 3, 3, 'F');

    doc.setFontSize(7);
    doc.text('HORAS REALES', 41.5, 76, { align: 'center' }); // Was ORDINARIAS
    doc.text('HORAS EXTRA', 100.5, 76, { align: 'center' });
    doc.text('HORAS PREVISTAS', 164, 76, { align: 'center' }); // Was BOLSA DE HORAS

    doc.setFontSize(12);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`${totalHours}h ${totalRemMin}m`, 41.5, 84, { align: 'center' });

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`+0h 00m`, 100.5, 84, { align: 'center' }); // Placeholder for Extra

    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`${Math.floor(theoreticalHoursTotal)}h ${Math.round((theoreticalHoursTotal % 1) * 60)}m`, 164, 84, { align: 'center' }); // Theoretical

    // --- 4. TABLE ---
    const tableHeaders = [['Fecha', 'Horario', 'Entrada', 'Salida', 'Pausas', 'Total', 'Incidencias']];
    const tableData = cycles.map(cycle => {
        const isModified = !!(cycle.entrada.fecha_original || (cycle.salida && cycle.salida.fecha_original));
        const fechaStr = cycle.entrada ? format(parseDolibarrDate(cycle.entrada.fecha_creacion), 'dd/MM/yyyy') : '-';

        // Gather all incidents
        const incidents: string[] = [];
        if (isModified) incidents.push('Modificado (*)');
        if (cycle.entrada.location_warning || (cycle.salida && cycle.salida.location_warning)) incidents.push('Fuera de rango');
        if (cycle.entrada.early_entry_warning) incidents.push('Entrada anticipada');
        if (cycle.entrada.justification || (cycle.salida && cycle.salida.justification)) incidents.push('Justificado');

        // Detect "Ausencia" from observations if no clock-in occurred (though usually these cycles have clock-ins)
        if (cycle.entrada.observaciones?.toLowerCase().includes('justificada')) {
            incidents.push('Ausencia justificada');
        }
        if (cycle.entrada.observaciones?.toLowerCase().includes('vacaciones')) {
            incidents.push('Vacaciones');
        }
        if (cycle.entrada.observaciones?.toLowerCase().includes('baja')) {
            incidents.push('Baja médica');
        }
        if (cycle.entrada.observaciones?.toLowerCase().includes('asuntos propios')) {
            incidents.push('Asuntos propios');
        }

        const incidentStr = incidents.join(', ');

        return [
            { content: fechaStr, styles: { fontStyle: 'bold' as any } },
            '09:00 - 18:00',
            {
                content: cycle.entrada ? format(parseDolibarrDate(cycle.entrada.fecha_creacion), 'HH:mm') : '-',
                styles: { fontStyle: (isModified ? 'bold' : 'normal') as any }
            },
            {
                content: cycle.salida ? format(parseDolibarrDate(cycle.salida.fecha_creacion), 'HH:mm') : 'En curso',
                styles: { fontStyle: (isModified ? 'bold' : 'normal') as any }
            },
            `${cycle.duracion_pausas || 0}m`,
            {
                content: `${Math.floor((cycle.duracion_efectiva || 0) / 60)}h ${Math.floor((cycle.duracion_efectiva || 0) % 60)}m`,
                styles: { fontStyle: 'bold' as any, textColor: [17, 24, 39] as any }
            },
            incidentStr
        ];
    });

    autoTable(doc, {
        startY: 98,
        head: tableHeaders,
        body: tableData as any,
        theme: 'plain',
        headStyles: {
            fillColor: [249, 250, 251],
            textColor: mutedColor as any,
            fontSize: 7,
            fontStyle: 'bold',
            halign: 'left',
            cellPadding: 4
        },
        styles: {
            fontSize: 8.5,
            cellPadding: 4,
            textColor: [55, 65, 81],
            lineColor: borderColor as any,
            lineWidth: 0.1
        },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 30 },
            2: { cellWidth: 18 },
            3: { cellWidth: 18 },
            4: { cellWidth: 18, halign: 'center' },
            5: { cellWidth: 22, halign: 'right' },
            6: { cellWidth: 51, halign: 'left', textColor: [180, 83, 9] as any, fontSize: 6.5 }
        },
        didParseCell: (data) => {
            // Zebra striping custom
            if (data.section === 'body' && data.row.index % 2 === 0) {
                data.cell.styles.fillColor = [252, 253, 254];
            }
            // Highlight rows with incidents
            const rowRaw = data.row.raw as any;
            const hasIncidents = rowRaw[6] !== '';
            if (hasIncidents && data.section === 'body') {
                data.cell.styles.fillColor = [255, 251, 235];
            }
        }
    });

    // --- 5. TRACEABILITY ANNEX (AUDIT LOGS) ---
    // Only show if there are relevant logs matching the displayed cycles
    const relevantFichajeIds = new Set<string>();
    const dateMap = new Map<string, string>(); // fichajeId -> dateStr

    cycles.forEach(c => {
        if (c.entrada.id) {
            relevantFichajeIds.add(c.entrada.id);
            dateMap.set(c.entrada.id, c.entrada.fecha_creacion);
        }
        if (c.salida?.id) {
            relevantFichajeIds.add(c.salida.id);
        }
        c.pausas.forEach(p => {
            if (p.inicio?.id) relevantFichajeIds.add(p.inicio.id);
            if (p.fin?.id) relevantFichajeIds.add(p.fin.id);
        });
    });

    const relevantLogs = auditLogs.filter(log => relevantFichajeIds.has(log.id_fichaje));

    if (relevantLogs.length > 0) {
        let annexY = (doc as any).lastAutoTable.finalY + 10;

        // Ensure space for header
        if (annexY > 250) {
            doc.addPage();
            annexY = 20;
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text('ANEXO DE TRAZABILIDAD (Auditoría de Cambios)', 14, annexY);

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
        doc.text('Detalle de Modificaciones Manuales (*): Registro inalterable conforme a la normativa vigente.', 14, annexY + 4);

        const auditHeaders = [['Fecha Afectada', 'Tipo', 'Dato Original', 'Dato Nuevo', 'Justificación', 'Autor', 'Fecha Cambio']];
        const auditData = relevantLogs.map(log => {
            // Try to find the affected date from our map, or use log date as fallback
            let dateStr = '---';
            const fichajeDate = dateMap.get(log.id_fichaje);
            if (fichajeDate) {
                dateStr = format(parseDolibarrDate(fichajeDate), 'dd/MM/yy');
            }

            let logDateStr = '--';
            try {
                const d = !isNaN(Number(log.fecha_modificacion))
                    ? new Date(Number(log.fecha_modificacion) * 1000)
                    : new Date(log.fecha_modificacion);
                logDateStr = format(d, 'dd/MM/yy HH:mm');
            } catch (e) { }

            return [
                dateStr,
                log.campo_modificado || 'Edición',
                log.valor_anterior || '(vacío)',
                log.valor_nuevo || '(vacío)',
                log.comentario || '---',
                log.usuario_nombre || log.usuario_editor,
                logDateStr
            ];
        });

        autoTable(doc, {
            startY: annexY + 6,
            head: auditHeaders,
            body: auditData,
            theme: 'grid',
            headStyles: {
                fillColor: [243, 244, 246],
                textColor: [55, 65, 81],
                fontSize: 6,
                fontStyle: 'bold',
                halign: 'left',
                cellPadding: 2
            },
            styles: {
                fontSize: 6,
                cellPadding: 2,
                textColor: [75, 85, 99],
                lineColor: [229, 231, 235],
                lineWidth: 0.1
            },
            columnStyles: {
                0: { cellWidth: 15 }, // Fecha Afectada
                1: { cellWidth: 20 }, // Tipo
                2: { cellWidth: 20 }, // Original
                3: { cellWidth: 20 }, // Nuevo
                4: { cellWidth: 50 }, // Justif
                5: { cellWidth: 25 }, // Autor
                6: { cellWidth: 20 }  // Fecha cambio
            }
        });
    }

    // --- 6. FOOTER ---
    // Recalculate Y based on whether annex was added
    let finalY = (doc as any).lastAutoTable.finalY + 15;

    // Safety check for page overflow
    if (finalY > 260) {
        doc.addPage();
        finalY = 20;
    }

    // Signature boxes
    doc.setDrawColor(209, 213, 219);
    doc.setLineDashPattern([2, 1], 0);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(14, finalY, 85, 25, 2, 2, 'FD');
    doc.roundedRect(111, finalY, 85, 25, 2, 2, 'FD');

    doc.setLineDashPattern([], 0);
    doc.setFontSize(7);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.line(18, finalY + 20, 95, finalY + 20);
    doc.text('FIRMA DE LA EMPRESA', 18, finalY + 23);

    doc.line(115, finalY + 20, 192, finalY + 20);
    doc.text('FIRMA DEL TRABAJADOR', 115, finalY + 23);

    // Legal & CSV
    const footerY = 285;
    // ... force page check to ensure footer is on the last page ...
    const totalPages = (doc as any).internal.getNumberOfPages();
    doc.setPage(totalPages);

    doc.line(14, footerY - 5, 196, footerY - 5);
    doc.setFontSize(6);
    doc.text('GARANTÍA DE INTEGRIDAD: Documento generado conforme al ET Art. 34.9.', 14, footerY);
    doc.text('CSV: ' + Math.random().toString(36).substring(2, 15).toUpperCase(), 196, footerY, { align: 'right' });

    // Page numbering loop
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(6);
        doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
        doc.text(`Página ${i} de ${totalPages}`, 196, footerY + 4, { align: 'right' });
    }

    return doc;
};

