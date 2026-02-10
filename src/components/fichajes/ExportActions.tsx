'use client';

import React from 'react';
import { Download, StickyNote, SquareDashedBottomCode } from 'lucide-react';
import { WorkCycle } from '@/lib/types';
import { exportToCSV, exportToPDF } from '@/lib/export-utils';
import { cn } from '@/lib/utils';

interface ExportActionsProps {
    cycles: WorkCycle[];
    userName?: string;
    className?: string;
}

export const ExportActions: React.FC<ExportActionsProps> = ({ cycles, userName, className }) => {
    const hasData = cycles && cycles.length > 0;

    const handleExportPDF = () => {
        if (!hasData) return;
        const title = `Informe de Fichajes - ${userName || 'Global'}`;
        const subtitle = userName ? `Empleado: ${userName}` : 'Reporte de equipo completo';
        exportToPDF(cycles, title, subtitle);
    };

    const handleExportCSV = () => {
        if (!hasData) return;
        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `fichajes-${(userName || 'global').toLowerCase().replace(/\s+/g, '-')}-${dateStr}.csv`;
        exportToCSV(cycles, fileName);
    };

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <button
                onClick={handleExportPDF}
                disabled={!hasData}
                className="group flex items-center gap-1.5 px-3 md:px-5 py-2 md:py-3 bg-white hover:bg-red-50 text-gray-700 hover:text-red-600 rounded-xl border border-gray-100 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 h-full"
                title="Exportar a PDF"
            >
                <div className="p-1 bg-red-50 group-hover:bg-red-100 rounded-lg text-red-500 transition-colors">
                    <StickyNote size={14} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">PDF</span>
            </button>

            <button
                onClick={handleExportCSV}
                disabled={!hasData}
                className="group flex items-center gap-1.5 px-3 md:px-5 py-2 md:py-3 bg-white hover:bg-green-50 text-gray-700 hover:text-green-600 rounded-xl border border-gray-100 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 h-full"
                title="Exportar a Excel (CSV)"
            >
                <div className="p-1 bg-green-50 group-hover:bg-green-100 rounded-lg text-green-500 transition-colors">
                    <SquareDashedBottomCode size={14} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">CSV</span>
            </button>
        </div>
    );
};
