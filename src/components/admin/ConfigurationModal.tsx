import { Portal } from '@/components/ui/Portal';
import { TriangleAlert, ExternalLink, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ConfigurationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ConfigurationModal({ isOpen, onClose }: ConfigurationModalProps) {
    const router = useRouter();

    if (!isOpen) return null;

    const handleConfirm = () => {
        router.push('/admin/empresa');
        onClose();
    };

    return (
        <Portal>
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="w-full max-w-md bg-white rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/20">

                    {/* Header with visual impact */}
                    <div className="bg-gradient-to-br from-amber-50 to-white px-8 pt-10 pb-6 border-b border-amber-50 relative flex items-center gap-6">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="w-14 h-14 bg-amber-100 rounded-[1.2rem] flex items-center justify-center shrink-0 shadow-xl shadow-amber-500/10 animate-in zoom-in duration-300">
                            <TriangleAlert size={24} className="text-amber-600" strokeWidth={2.2} />
                        </div>

                        <div className="text-left">
                            <h2 className="text-xl font-black text-gray-900 tracking-tight leading-tight mb-1">
                                Configuración Pendiente
                            </h2>
                            <p className="text-xs font-medium text-gray-400">
                                Detectamos que faltan datos esenciales de la empresa.
                            </p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-8 pt-5 pb-8 space-y-6 bg-white">
                        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-gray-900 mb-1">Identidad Corporativa</h4>
                                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                                    Es necesario configurar la <span className="text-gray-900 font-bold">Razón Social</span> y el <span className="text-gray-900 font-bold">CIF/NIF</span> para que los informes y documentos sean válidos.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 pt-2">
                            <button
                                onClick={handleConfirm}
                                className="w-full h-14 bg-black hover:bg-gray-800 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl shadow-black/5 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                            >
                                <span>Configurar Ahora</span>
                                <ExternalLink size={16} strokeWidth={2.5} />
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full h-12 text-gray-400 hover:text-gray-600 hover:bg-gray-50 font-bold text-[10px] uppercase tracking-widest rounded-2xl transition-colors"
                            >
                                Recordar más tarde
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Portal>
    );
}
