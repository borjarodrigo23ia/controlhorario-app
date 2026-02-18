'use client';
import React, { useEffect, useState } from 'react';
import { X, Download, Loader2, FileText, Printer, Share2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PDFPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfDoc: any; // jsPDF instance
    title: string;
}

export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({ isOpen, onClose, pdfDoc, title }) => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [pageCount, setPageCount] = useState(1);

    useEffect(() => {
        if (isOpen && pdfDoc) {
            setLoading(true);
            let url: string | null = null;
            try {
                const blob = pdfDoc.output('blob');
                url = URL.createObjectURL(blob);
                setPdfUrl(url);
                setPageCount(pdfDoc.internal.getNumberOfPages());
            } catch (error) {
                console.error('Error generating PDF URL:', error);
            }
            setLoading(false);

            return () => {
                if (url) {
                    URL.revokeObjectURL(url);
                    setPdfUrl(null);
                }
            };
        }
    }, [isOpen, pdfDoc]);

    if (!isOpen) return null;

    const handleDownload = () => {
        if (pdfDoc) {
            const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const filename = `${title.toLowerCase().replace(/\s+/g, '-')}-${dateStr}.pdf`;
            pdfDoc.save(filename);
        }
    };

    const handlePrint = () => {
        const iframe = document.getElementById('pdf-preview-iframe') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.print();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 lg:p-8 animate-in fade-in duration-300">
            {/* Soft Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-all"
                onClick={onClose}
            />

            {/* Modal Container: Clean Paper & Slate Design */}
            <div className="relative w-full h-full md:max-w-5xl md:h-[90vh] bg-slate-50 md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">

                {/* Clean Simplified Toolbar */}
                <div className="z-20 flex items-center justify-between px-4 md:px-8 py-4 bg-white border-b border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <FileText size={20} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-900 truncate tracking-tight">{title}</h3>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                Documento PDF · {pageCount} {pageCount === 1 ? 'Página' : 'Páginas'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="hidden sm:flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all text-xs font-bold"
                        >
                            <Printer size={16} /> <span className="hidden md:inline">Imprimir</span>
                        </button>

                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg font-bold text-xs hover:bg-red-700 active:scale-95 transition-all shadow-md shadow-red-600/20"
                        >
                            <Download size={16} /> <span>Descargar</span>
                        </button>

                        <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>

                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                            title="Cerrar"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Main Content Area: High Visibility White Background */}
                <div className="flex-1 relative bg-slate-200/50 flex flex-col">
                    {loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4">
                            <div className="w-12 h-12 border-4 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cargando visualizador...</p>
                        </div>
                    ) : pdfUrl ? (
                        <div className="flex-1 w-full h-full bg-slate-600 p-0 md:p-6 overflow-hidden flex items-center justify-center">
                            <div className="w-full h-full max-w-5xl bg-white shadow-2xl md:rounded-lg overflow-hidden relative">
                                <iframe
                                    id="pdf-preview-iframe"
                                    src={`${pdfUrl}#view=Fit&toolbar=0&navpanes=0`}
                                    className="w-full h-full border-none"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        minWidth: '100%'
                                    }}
                                    title="Previsualización de Informe"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <AlertCircle className="text-slate-300 mb-4" size={48} />
                            <h4 className="text-lg font-bold text-slate-900">No se pudo cargar el PDF</h4>
                            <p className="text-sm text-slate-500 mb-6">Ha ocurrido un error al intentar previsualizar el documento.</p>
                            <button onClick={handleDownload} className="text-indigo-600 font-bold hover:underline">Descargar directamente</button>
                        </div>
                    )}
                </div>

                {/* Status Bar */}
                <div className="hidden md:flex px-8 py-2.5 bg-white border-t border-slate-200 items-center justify-between">
                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Visualización Optimizada</span>
                        <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> A4 Portrait</span>
                    </div>
                    <div className="text-[10px] font-black text-slate-300 uppercase italic">
                        Software Gestor
                    </div>
                </div>
            </div>
        </div>
    );
};
