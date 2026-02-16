import React from 'react';
import { X, Palmtree } from 'lucide-react';
import VacationRequestForm from '@/components/vacations/VacationRequestForm';
import VacationList from '@/components/vacations/VacationList';
import VacationQuotaCard from '@/components/vacations/VacationQuotaCard';

interface PersonalVacationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PersonalVacationModal({ isOpen, onClose }: PersonalVacationModalProps) {
    const [refreshTrigger, setRefreshTrigger] = React.useState(0);

    if (!isOpen) return null;

    const handleSuccess = () => {
        setRefreshTrigger(prev => prev + 1);
        // Optional: Close modal on success? Or let user request more?
        // Let's keep it open so they can see it in the list
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative w-full max-w-4xl bg-[#FAFBFC] rounded-[2rem] shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 bg-white border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                            <Palmtree size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Mis Vacaciones</h2>
                            <p className="text-xs text-gray-500 font-medium">Gestiona tus días libres y ausencias</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto p-6 space-y-8">
                    <VacationQuotaCard refreshTrigger={refreshTrigger} />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Nueva Solicitud</h3>
                            <VacationRequestForm onSuccess={handleSuccess} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Historial Reciente</h3>
                            <div className="bg-white rounded-[2.5rem] border border-gray-100 p-2 min-h-[400px]">
                                <VacationList refreshTrigger={refreshTrigger} limit={5} compact />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
