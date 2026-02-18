'use client';

import React from 'react';
import { Download, StickyNote, SquareDashedBottomCode, FileText } from 'lucide-react';
import { WorkCycle } from '@/lib/types';
import { exportToCSV, exportToPDF } from '@/lib/export-utils';
import { cn } from '@/lib/utils';
import { PDFPreviewModal } from './PDFPreviewModal';

interface ExportActionsProps {
    cycles: WorkCycle[];
    user?: any; // The full user object
    userName?: string; // Fallback
    className?: string;
}

export const ExportActions: React.FC<ExportActionsProps> = ({ cycles, user, userName, className }) => {
    const hasData = cycles && cycles.length > 0;
    const [companyInfo, setCompanyInfo] = React.useState<any>(null);
    const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
    const [pdfDoc, setPdfDoc] = React.useState<any>(null);
    const [pdfTitle, setPdfTitle] = React.useState('');
    const [isGenerating, setIsGenerating] = React.useState(false);

    React.useEffect(() => {
        const loadCompany = async () => {
            try {
                const response = await fetch('/api/setupempresa', {
                    headers: { 'DOLAPIKEY': localStorage.getItem('dolibarr_token') || '' }
                });
                if (response.ok) {
                    const data = await response.json();
                    setCompanyInfo(data);
                }
            } catch (e) {
                console.error('Error loading company info for PDF:', e);
            }
        };
        loadCompany();
    }, []);

    const handleExportPDF = async () => {
        if (!hasData || isGenerating) return;

        setIsGenerating(true);
        try {
            // 1. Fetch full user object if missing options (needed for DNI/NAF)
            let fullUser = user;
            if (user?.id && !user.array_options) {
                const response = await fetch(`/api/users/${user.id}`, {
                    headers: { 'DOLAPIKEY': localStorage.getItem('dolibarr_token') || '' }
                });
                if (response.ok) {
                    fullUser = await response.json();
                }
            }

            // 2. Fetch Audit Logs for Traceability Annex & Shifts for Expected Hours
            let auditLogs = [];
            let dailyHours = 8; // Default standard

            try {
                // Determine target user ID from cycles data (most reliable) or fallback to user prop
                const targetUserId = cycles.length > 0 && cycles[0].fk_user
                    ? cycles[0].fk_user
                    : user?.id;

                if (targetUserId) {
                    const headers = { 'DOLAPIKEY': localStorage.getItem('dolibarr_token') || '' };

                    // Parallel fetch: Logs + Shifts
                    const [logsRes, shiftsRes] = await Promise.all([
                        fetch(`/api/fichajes/history?id_user=${targetUserId}`, { headers }),
                        fetch(`/api/jornadas?user_id=${targetUserId}`, { headers })
                    ]);

                    if (logsRes.ok) {
                        const logsData = await logsRes.json();
                        auditLogs = Array.isArray(logsData) ? logsData : [];
                    }

                    if (shiftsRes.ok) {
                        const shiftsData = await shiftsRes.json();
                        // Find active shift or fallback to first
                        const activeShift = Array.isArray(shiftsData) ? (shiftsData.find((s: any) => s.active) || shiftsData[0]) : null;

                        if (activeShift) {
                            const parseTime = (t: string) => {
                                const [h, m] = t.split(':').map(Number);
                                return h * 60 + m;
                            };

                            const start = parseTime(activeShift.hora_inicio_jornada);
                            const end = parseTime(activeShift.hora_fin_jornada);
                            let breakTime = 0;

                            if (activeShift.pausas && Array.isArray(activeShift.pausas)) {
                                breakTime = activeShift.pausas.reduce((acc: number, p: any) => {
                                    return acc + (parseTime(p.hora_fin) - parseTime(p.hora_inicio));
                                }, 0);
                            }

                            dailyHours = (end - start - breakTime) / 60;
                        }
                    }
                }
            } catch (e) {
                console.error('Error fetching data for PDF:', e);
            }

            const title = `Informe de Fichajes - ${fullUser?.firstname || userName || 'Global'}`;
            const subtitle = (fullUser?.firstname || userName) ? `Empleado: ${fullUser?.firstname || userName}` : 'Reporte de equipo completo';

            // Match logic from UserDetailsCard.tsx
            const dniMatch = fullUser?.note_private?.match(/DNI:\s*([^\n]*)/i);
            const extractedDni = fullUser?.array_options?.options_dni || (dniMatch ? dniMatch[1].trim() : '---');
            const extractedNaf = fullUser?.array_options?.options_naf || '---';

            // Prepare userData
            const userData = fullUser ? {
                dni: extractedDni,
                naf: extractedNaf,
                name: `${fullUser.firstname || ''} ${fullUser.lastname || ''}`.trim() || fullUser.login
            } : undefined;

            // Prepare companyData
            const companyData = companyInfo ? {
                name: companyInfo.name,
                cif: companyInfo.siren, // ID Prof 1 is SIREN/CIF in Dolibarr
                center: user?.workplace_center_id || 'Principal'
            } : undefined;

            const doc = await exportToPDF(cycles, title, subtitle, userData, companyData, auditLogs, dailyHours);
            setPdfDoc(doc);
            setPdfTitle(title);
            setIsPreviewOpen(true);
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExportCSV = () => {
        if (!hasData) return;
        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `fichajes-${(user?.login || userName || 'global').toLowerCase().replace(/\s+/g, '-')}-${dateStr}.csv`;
        exportToCSV(cycles, fileName);
    };

    return (
        <>
            <div className={cn("flex items-center gap-2", className)}>
                <button
                    onClick={handleExportPDF}
                    disabled={!hasData || isGenerating}
                    className="group flex items-center gap-1.5 px-3 md:px-5 py-2 md:py-3 bg-white hover:bg-red-50 text-gray-700 hover:text-red-600 rounded-xl border border-gray-100 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 h-full"
                    title="Previsualizar PDF"
                >
                    <div className="p-1 bg-red-50 group-hover:bg-red-100 rounded-lg text-red-500 transition-colors">
                        {isGenerating ? (
                            <span className="block w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <FileText size={14} />
                        )}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">
                        {isGenerating ? 'Generando...' : 'PDF'}
                    </span>
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

            <PDFPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                pdfDoc={pdfDoc}
                title={pdfTitle}
            />
        </>
    );
};
