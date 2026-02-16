import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Portal } from '../ui/Portal';

interface SoftBlockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (justification: string) => void;
    distance?: number;
    centerName?: string;
}

export const SoftBlockModal: React.FC<SoftBlockModalProps> = ({ isOpen, onClose, onConfirm, distance, centerName }) => {
    const [justification, setJustification] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(justification);
        setJustification('');
    };

    return (
        <Portal>
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-600 font-semibold text-lg">
                            <AlertTriangle className="h-5 w-5" />
                            <span>Ubicación fuera de rango</span>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        <p className="text-sm text-gray-800 font-medium leading-relaxed">
                            Estás fuera del radio de tu centro de trabajo. Se registrará tu ubicación actual. ¿Deseas continuar?
                        </p>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Motivo (Obligatorio)
                            </label>
                            <textarea
                                placeholder="Debes indicar un motivo para continuar..."
                                value={justification}
                                onChange={(e) => setJustification(e.target.value)}
                                className="w-full min-h-[80px] p-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all resize-none"
                            />
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200/50 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!justification.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
                        >
                            Continuar
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
};
