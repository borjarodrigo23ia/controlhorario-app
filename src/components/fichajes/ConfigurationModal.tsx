import React from 'react';
import { useRouter } from 'next/navigation';
import { X, Settings, MapPin, ArrowRight } from 'lucide-react';
import { useGeolocationConfig } from '@/hooks/useGeolocationConfig';
import { useAuth } from '@/context/AuthContext';
import { Portal } from '../ui/Portal';

interface ConfigurationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ConfigurationModal({ isOpen, onClose }: ConfigurationModalProps) {
    const { enabled, loading } = useGeolocationConfig();
    const { user } = useAuth();
    const router = useRouter();

    if (!isOpen) return null;

    const handleGoToConfig = () => {
        if (user?.id) {
            router.push(`/admin/users/${user.id}`);
            onClose();
        }
    };

    return (
        <Portal>
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-lg md:text-xl font-bold text-gray-900">Configuración</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    <div className="p-4 md:p-6 space-y-6">
                        {/* Geolocation Section */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Geolocalización</h3>
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                                        <MapPin size={24} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Registro de Ubicación</p>
                                        <p className="text-sm text-gray-500">
                                            {loading ? 'Cargando...' : (enabled ? 'Activado' : 'Desactivado')}
                                        </p>
                                    </div>
                                </div>

                                <div className={`w-3 h-3 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                            </div>
                            <p className="text-xs text-gray-400 px-1">
                                Esta configuración determina si se solicita la ubicación del dispositivo al realizar un fichaje.
                            </p>
                        </div>

                        {/* Admin Notice */}
                        {user?.admin && (
                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                <div className="flex items-start gap-3">
                                    <Settings className="w-5 h-5 text-blue-600 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-blue-900">Panel de Administración</p>
                                        <p className="text-xs text-blue-700 mt-1">
                                            Como administrador, puedes gestionar la configuración de todos los usuarios desde el panel de administración.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 md:p-6 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
                        {user?.admin && (
                            <button
                                onClick={handleGoToConfig}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors touch-manipulation"
                            >
                                <Settings size={18} />
                                Gestionar Configuración
                                <ArrowRight size={16} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors touch-manipulation"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
}
