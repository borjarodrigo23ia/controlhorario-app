'use client';

import React, { useState } from 'react';
import { X, Share, PlusSquare, MoreVertical, Smartphone, MonitorSmartphone, Ellipsis } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Portal } from '../ui/Portal';

interface InstallGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function InstallGuideModal({ isOpen, onClose }: InstallGuideModalProps) {
    const [activeTab, setActiveTab] = useState<'ios' | 'android'>('ios');

    if (!isOpen) return null;

    return (
        <Portal>
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 animate-fade-in">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
                    {/* Header */}
                    <div className="bg-primary/5 p-6 pb-8 text-center border-b border-gray-100">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 bg-white rounded-full text-gray-400 hover:text-gray-600 transition-colors shadow-sm"
                        >
                            <X size={20} />
                        </button>

                        <div className="w-16 h-16 bg-white rounded-2xl mx-auto shadow-sm flex items-center justify-center mb-4 text-primary">
                            <MonitorSmartphone size={32} strokeWidth={1.5} />
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Instalar App</h2>
                        <p className="text-gray-500 text-sm px-6">
                            Instala la aplicación en tu pantalla de inicio para una mejor experiencia.
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="flex p-2 gap-2 border-b border-gray-100">
                        <button
                            onClick={() => setActiveTab('ios')}
                            className={cn(
                                "flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2",
                                activeTab === 'ios'
                                    ? "bg-black text-white shadow-md"
                                    : "text-gray-500 hover:bg-gray-50"
                            )}
                        >
                            <span>iPhone / iPad</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('android')}
                            className={cn(
                                "flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2",
                                activeTab === 'android'
                                    ? "bg-black text-white shadow-md"
                                    : "text-gray-500 hover:bg-gray-50"
                            )}
                        >
                            <span>Android</span>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {activeTab === 'ios' ? (
                            <div className="relative">
                                {/* Step 1 */}
                                <div className="flex gap-4 relative z-10 pb-1">
                                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 text-primary z-10 relative">
                                        <span className="font-bold">1</span>
                                    </div>
                                    <div className="pt-2 pb-6">
                                        <p className="text-gray-700 font-medium mb-1 leading-none">Pulsa los puntos suspensivos <Ellipsis size={18} className="inline-flex mb-1" /></p>
                                        <p className="text-sm text-gray-500 mt-2 leading-tight">Si no ves el botón compartir, pulsa los puntos <Ellipsis size={14} className="inline mx-1" /> para ver más opciones.</p>
                                    </div>
                                </div>

                                {/* Connecting Line 1-2 */}
                                <div className="absolute left-[1.25rem] top-10 bottom-0 w-0.5 bg-gray-100 -ml-[1px]" style={{ height: 'calc(100% - 2.5rem)' }} />

                                {/* Step 2 */}
                                <div className="flex gap-4 relative z-10 pb-1">
                                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 text-primary z-10 relative">
                                        <span className="font-bold">2</span>
                                    </div>
                                    <div className="pt-2 pb-6">
                                        <p className="text-gray-700 font-medium mb-1 leading-none">Pulsa el botón "Compartir"</p>
                                        <p className="text-sm text-gray-500 mt-2 leading-tight">Busca el icono <Share size={14} className="inline mx-1" /> en el menú o en la barra inferior.</p>
                                    </div>
                                </div>

                                {/* Step 3 */}
                                <div className="flex gap-4 relative z-10 pb-1">
                                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 text-primary z-10 relative">
                                        <span className="font-bold">3</span>
                                    </div>
                                    <div className="pt-2 pb-6">
                                        <p className="text-gray-700 font-medium mb-1 leading-none">Selecciona "Añadir a inicio"</p>
                                        <p className="text-sm text-gray-500 mt-2 leading-tight">Desliza hacia abajo y pulsa <PlusSquare size={14} className="inline mx-1" /> "Añadir a pantalla de inicio".</p>
                                    </div>
                                </div>

                                {/* Step 4 */}
                                <div className="flex gap-4 relative z-10">
                                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 text-primary z-10 relative">
                                        <span className="font-bold">4</span>
                                    </div>
                                    <div className="pt-2">
                                        <p className="text-gray-700 font-medium mb-1 leading-none">Confirma pulsando "Añadir"</p>
                                        <p className="text-sm text-gray-500 mt-2 leading-tight">El icono aparecerá en tu pantalla de inicio.</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="relative">
                                {/* Step 1 */}
                                <div className="flex gap-4 relative z-10 pb-1">
                                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 text-primary z-10 relative">
                                        <span className="font-bold">1</span>
                                    </div>
                                    <div className="pt-2 pb-6">
                                        <p className="text-gray-700 font-medium mb-1 leading-none">Abre el menú de Chrome</p>
                                        <p className="text-sm text-gray-500 mt-2 leading-tight">Pulsa los tres puntos <MoreVertical size={14} className="inline mx-1" /> en la esquina superior derecha.</p>
                                    </div>
                                </div>

                                {/* Connecting Line 1-2 */}
                                <div className="absolute left-[1.25rem] top-10 bottom-0 w-0.5 bg-gray-100 -ml-[1px]" style={{ height: 'calc(100% - 2.5rem)' }} />

                                {/* Step 2 */}
                                <div className="flex gap-4 relative z-10 pb-1">
                                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 text-primary z-10 relative">
                                        <span className="font-bold">2</span>
                                    </div>
                                    <div className="pt-2 pb-6">
                                        <p className="text-gray-700 font-medium mb-1 leading-none">Selecciona "Instalar aplicación"</p>
                                        <p className="text-sm text-gray-500 mt-2 leading-tight">O busca la opción "Añadir a pantalla de inicio".</p>
                                    </div>
                                </div>

                                {/* Step 3 */}
                                <div className="flex gap-4 relative z-10">
                                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 text-primary z-10 relative">
                                        <span className="font-bold">3</span>
                                    </div>
                                    <div className="pt-2">
                                        <p className="text-gray-700 font-medium mb-1 leading-none">Confirma la instalación</p>
                                        <p className="text-sm text-gray-500 mt-2 leading-tight">La aplicación se instalará como nativa.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-gray-50 text-center">
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
}
