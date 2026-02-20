'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, Settings, User as UserIcon, MapPinned, MapPinCheck, Clock as ClockIcon, AlertCircle, ExternalLink, Check, CircleCheck, Loader2, HousePlus, Palmtree, Trash2, Briefcase, MapPinHouse, X } from 'lucide-react';
import { isProject, getCleanLabel } from '@/lib/center-utils';
import ShiftConfigurator from '@/components/admin/ShiftConfigurator';
import { toast } from 'react-hot-toast';
import { CustomToggle } from '@/components/ui/CustomToggle';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import VacationDaysIndividualAssign from '@/components/admin/VacationDaysIndividualAssign';
import UserDetailsCard from '@/components/admin/UserDetailsCard';
import UserFormModal from '@/components/admin/UserFormModal';
import { DolibarrUser } from '@/lib/admin-types';

interface UserData extends DolibarrUser {
    address?: string;
    zip?: string;
    town?: string;
    job?: string;
    gender?: string;
    birth?: string;
}

interface Center {
    rowid: number;
    label: string;
    latitude: number;
    longitude: number;
    radius: number;
}

interface UserDetailViewProps {
    userId: string;
    onClose?: () => void;
}

export default function UserDetailView({ userId, onClose }: UserDetailViewProps) {
    const [config, setConfig] = useState<Record<string, string>>({});
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [availableCenters, setAvailableCenters] = useState<Center[]>([]);
    const [initialCenters, setInitialCenters] = useState<string | null>(null);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('dolibarr_token');

            // Fetch User Data
            const userRes = await fetch(`/api/users/${userId}`, {
                headers: { 'DOLAPIKEY': token || '' }
            });
            if (userRes.ok) setUserData(await userRes.json());

            // Fetch Config
            const configRes = await fetch(`/api/users/${userId}/config`, {
                headers: { 'DOLAPIKEY': token || '' }
            });
            if (configRes.ok) {
                const data = await configRes.json();
                const flatConfig: Record<string, string> = {};
                Object.keys(data).forEach(key => {
                    flatConfig[key] = data[key] || '';
                });

                setConfig(prev => Object.keys(prev).length ? prev : { ...flatConfig });

                if (initialCenters === null) {
                    setInitialCenters(flatConfig.work_centers_ids || '');
                }
            }

            // Fetch Centers
            const centersRes = await fetch('/api/centers', {
                headers: { 'DOLAPIKEY': token || '' }
            });
            if (centersRes.ok) {
                setAvailableCenters(await centersRes.json());
            }

        } catch (error) {
            console.error(error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [userId]);

    const handleChange = (key: string, value: string) => {
        setConfig((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const token = localStorage.getItem('dolibarr_token');
        const promisess = Object.keys(config).map(key =>
            fetch(`/api/users/${userId}/config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'DOLAPIKEY': token || ''
                },
                body: JSON.stringify({ param_name: key, value: config[key] })
            })
        );

        try {
            const responses = await Promise.all(promisess);
            const errors = responses.filter(r => !r.ok);
            if (errors.length > 0) throw new Error('Error al guardar');

            toast.success('Configuración guardada');
            setInitialCenters(config.work_centers_ids || '');
        } catch {
            toast.error('Error al guardar');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return (
        <div className="flex bg-white h-full items-center justify-center rounded-[2.5rem]">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-black" size={32} />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Cargando perfil...</span>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-[#FAFBFC] rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-2xl relative">
            {/* Header with Close */}
            <div className="bg-white p-6 border-b border-gray-100 flex items-center justify-between z-20">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-white shrink-0">
                        <UserIcon size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900 leading-tight truncate max-w-[200px]">
                            {userData?.firstname || userData?.login} {userData?.lastname || ''}
                        </h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ficha de Empleado</p>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar pb-40 overscroll-contain">

                {userData && (
                    <UserDetailsCard
                        user={userData}
                        onEdit={() => setShowEditModal(true)}
                    />
                )}

                <UserFormModal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    onSuccess={fetchData}
                    initialData={userData}
                />

                {/* Geolocation Toggle (Compact) */}
                <div className="group relative bg-white p-6 rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center justify-between overflow-hidden transition-all hover:shadow-md">
                    <div
                        className={`absolute -bottom-10 -right-10 w-28 h-28 rounded-full blur-2xl transition-all duration-700 opacity-40 group-hover:opacity-70 group-hover:scale-110`}
                        style={{
                            backgroundColor: config.require_geolocation == '1' ? '#B6F5AE' : '#F5AEAE'
                        }}
                    />

                    <h3 className="relative z-10 text-sm font-bold text-gray-900 flex items-center gap-2">
                        <MapPinned size={18} className="text-black" />
                        <span>Geolocalización</span>
                    </h3>
                    <button
                        type="button"
                        onClick={async () => {
                            const newValue = config.require_geolocation == '1' ? '0' : '1';
                            handleChange('require_geolocation', newValue);
                            try {
                                const token = localStorage.getItem('dolibarr_token');
                                await fetch(`/api/users/${userId}/config`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'DOLAPIKEY': token || '' },
                                    body: JSON.stringify({ param_name: 'require_geolocation', value: newValue })
                                });
                                toast.success('Preferencia guardada');
                            } catch (e) {
                                toast.error('Error al guardar preferencia');
                            }
                        }}
                        className={`relative z-10 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${config.require_geolocation == '1' ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${config.require_geolocation == '1' ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                    </button>
                </div>

                {/* Work Centers Section */}
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-black text-gray-900 flex items-center gap-2 uppercase tracking-wide">
                            <HousePlus size={20} className="text-black" />
                            <span>Ubicaciones</span>
                        </h3>
                    </div>

                    <div className="space-y-6">
                        {/* Assigned Centers */}
                        <div className="space-y-3">
                            {availableCenters
                                .filter(center => config.work_centers_ids?.split(',').includes(center.rowid.toString()))
                                .map(center => (
                                    <div
                                        key={center.rowid}
                                        className="relative group p-4 rounded-2xl bg-gray-50/50 border border-gray-100 flex items-center justify-between transition-all hover:bg-white hover:shadow-sm"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-black shadow-sm group-hover:bg-red-50 group-hover:text-red-500 transition-colors">
                                                {isProject(center.label) ? <MapPinned size={18} /> : <MapPinCheck size={18} />}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900 leading-tight">{getCleanLabel(center.label)}</div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{isProject(center.label) ? 'Proyecto' : 'Centro'}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const currentIds = config.work_centers_ids ? config.work_centers_ids.split(',').filter(Boolean) : [];
                                                const newIds = currentIds.filter(id => id !== center.rowid.toString());
                                                handleChange('work_centers_ids', newIds.join(','));
                                            }}
                                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}

                            {(!config.work_centers_ids || config.work_centers_ids.split(',').filter(Boolean).length === 0) && (
                                <div className="text-center py-8 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sin centros asignados</p>
                                </div>
                            )}

                            {initialCenters !== null && (config.work_centers_ids || '') !== initialCenters && (
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="w-full bg-black text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-black/10 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    <span>Guardar Ubicaciones</span>
                                </button>
                            )}
                        </div>

                        {/* Available Centers (Dropdown-like list) */}
                        <div className="pt-4 border-t border-gray-50">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Añadir Nueva Ubicación</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {availableCenters
                                    .filter(center => !config.work_centers_ids?.split(',').includes(center.rowid.toString()))
                                    .map(center => (
                                        <button
                                            key={center.rowid}
                                            onClick={() => {
                                                const currentIds = config.work_centers_ids ? config.work_centers_ids.split(',').filter(Boolean) : [];
                                                const newIds = [...currentIds, center.rowid.toString()];
                                                handleChange('work_centers_ids', newIds.join(','));
                                            }}
                                            className="w-full p-4 rounded-2xl bg-white border border-gray-100 flex items-center justify-between group hover:border-black active:scale-[0.98] transition-all text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-all">
                                                    {isProject(center.label) ? <Briefcase size={18} /> : <MapPinHouse size={18} />}
                                                </div>
                                                <div className="text-sm font-bold text-gray-600 group-hover:text-black transition-colors">{getCleanLabel(center.label)}</div>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                <Check size={14} className="text-black" />
                                            </div>
                                        </button>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Shift Management Section */}
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                    <div className="mb-6">
                        <h3 className="text-base font-black text-gray-900 flex items-center gap-2 uppercase tracking-wide">
                            <ClockIcon size={20} className="text-black" />
                            <span>Horarios</span>
                        </h3>
                    </div>
                    <ShiftConfigurator userId={userId} />
                </div>

                {/* Vacation Section */}
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-6">
                    <div>
                        <h3 className="text-base font-black text-gray-900 flex items-center gap-2 uppercase tracking-wide">
                            <Palmtree size={20} className="text-black" />
                            <span>Vacaciones</span>
                        </h3>
                    </div>
                    <VacationDaysIndividualAssign userId={userId} />
                </div>
            </div>
        </div>
    );
}
