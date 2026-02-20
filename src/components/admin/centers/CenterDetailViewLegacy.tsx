'use client';

import { useState, useEffect } from 'react';
import { MapPinHouse, Plus, MapPin, Trash2, Save, X, Users, Search, Loader2, Check, PencilLine, MapPinned, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DolibarrUser } from '@/lib/admin-types';
import dynamic from 'next/dynamic';
import { isProject, getCleanLabel, formatLabelForSave } from '@/lib/center-utils';

const LocationMapPicker = dynamic(() => import('@/components/ui/LocationMapPicker'), {
    ssr: false,
    loading: () => <div className="h-[200px] w-full bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400 text-[10px]">Cargando mapa...</div>
});

interface Center {
    rowid: number;
    label: string;
    latitude: number;
    longitude: number;
    radius: number;
}

interface UserWithConfig extends DolibarrUser {
    assignedCenters: number[];
    configLoaded?: boolean;
}

interface CenterDetailViewLegacyProps {
    centerId?: number | null;
    onClose: () => void;
    onSaveSuccess: () => void;
    centersList: Center[];
}

export default function CenterDetailViewLegacy({ centerId, onClose, onSaveSuccess, centersList }: CenterDetailViewLegacyProps) {
    const [loading, setLoading] = useState(true);
    const [editingCenter, setEditingCenter] = useState<Partial<Center>>({ radius: 100 });
    const [selectedType, setSelectedType] = useState<'center' | 'project'>('center');
    const [isSaving, setIsSaving] = useState(false);

    // Employee Assignment State
    const [users, setUsers] = useState<UserWithConfig[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [assignedUserIds, setAssignedUserIds] = useState<Set<string>>(new Set());
    const [conflictData, setConflictData] = useState<{ user: UserWithConfig, centers: Center[] } | null>(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('dolibarr_token') : '';

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (centerId) {
                    const res = await fetch(`/api/centers`, {
                        headers: { 'DOLAPIKEY': token || '' }
                    });
                    if (res.ok) {
                        const allCenters: Center[] = await res.json();
                        const center = allCenters.find(c => c.rowid === centerId);
                        if (center) {
                            setEditingCenter({
                                ...center,
                                label: getCleanLabel(center.label)
                            });
                            setSelectedType(isProject(center.label) ? 'project' : 'center');
                        }
                    }
                }
                await fetchUsersAndConfigs();
            } catch (error) {
                console.error(error);
                toast.error('Error al cargar datos');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [centerId]);

    const fetchUsersAndConfigs = async () => {
        setLoadingUsers(true);
        try {
            const usersRes = await fetch('/api/users?limit=1000', {
                headers: { 'DOLAPIKEY': token || '' }
            });
            if (!usersRes.ok) throw new Error('Error fetching users');
            const usersData: DolibarrUser[] = await usersRes.json();

            // Fetch Configs in Batches
            const BATCH_SIZE = 10;
            const usersWithConfig: UserWithConfig[] = [];

            for (let i = 0; i < usersData.length; i += BATCH_SIZE) {
                const batch = usersData.slice(i, i + BATCH_SIZE);
                const batchResults = await Promise.all(batch.map(async (user) => {
                    try {
                        const configRes = await fetch(`/api/users/${user.id}/config`, {
                            headers: { 'DOLAPIKEY': token || '' }
                        });
                        if (!configRes.ok) throw new Error('Config fetch failed');
                        const config = await configRes.json();
                        const idsStr = String(config.work_centers_ids || '');
                        const centerIds = idsStr.split(',').map(id => parseInt(id.trim())).filter(n => !isNaN(n));
                        return { ...user, assignedCenters: centerIds, configLoaded: true };
                    } catch (e) {
                        return { ...user, assignedCenters: [], configLoaded: false };
                    }
                }));
                usersWithConfig.push(...batchResults);
            }

            const uniqueUsers = Array.from(new Map(usersWithConfig.map(u => [u.id, u])).values());
            const activeUsers = uniqueUsers.filter(u => u.active !== '0');
            setUsers(activeUsers);

            if (centerId) {
                const assigned = new Set<string>();
                activeUsers.forEach(u => {
                    if (u.assignedCenters.includes(Number(centerId))) {
                        assigned.add(u.id);
                    }
                });
                setAssignedUserIds(assigned);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar empleados');
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleSave = async () => {
        if (!editingCenter?.label || !editingCenter?.latitude || !editingCenter?.longitude) {
            toast.error('Completa todos los campos obligatorios');
            return;
        }

        setIsSaving(true);
        let currentCenterId = centerId;

        try {
            const finalLabel = formatLabelForSave(editingCenter.label, selectedType === 'project');
            const dataToSave = { ...editingCenter, label: finalLabel };

            if (currentCenterId) {
                const res = await fetch(`/api/centers/${currentCenterId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'DOLAPIKEY': token || '' },
                    body: JSON.stringify(dataToSave)
                });
                if (!res.ok) throw new Error('Error al actualizar');
            } else {
                const res = await fetch('/api/centers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'DOLAPIKEY': token || '' },
                    body: JSON.stringify(dataToSave)
                });
                if (!res.ok) throw new Error('Error al crear');
                currentCenterId = await res.json();
            }

            const updates = users.map(async (user) => {
                if (user.configLoaded === false) return;
                const isAssigned = assignedUserIds.has(user.id);
                const wasAssigned = user.assignedCenters.includes(Number(currentCenterId));
                if (isAssigned === wasAssigned) return;

                let newCenterIds = [...user.assignedCenters];
                if (isAssigned) newCenterIds.push(Number(currentCenterId));
                else newCenterIds = newCenterIds.filter(id => id !== Number(currentCenterId));

                await fetch(`/api/users/${user.id}/config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'DOLAPIKEY': token || '' },
                    body: JSON.stringify({ param_name: 'work_centers_ids', value: newCenterIds.join(',') })
                });
            });

            await Promise.all(updates);
            toast.success('Cambios guardados');
            onSaveSuccess();
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar');
        } finally {
            setIsSaving(false);
        }
    };

    const detectLocation = () => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setEditingCenter(prev => ({
                        ...prev,
                        latitude: parseFloat(position.coords.latitude.toFixed(6)),
                        longitude: parseFloat(position.coords.longitude.toFixed(6))
                    }));
                    toast.success('Ubicación detectada');
                },
                () => toast.error('Error al detectar ubicación')
            );
        }
    };

    const toggleUserAssignment = (userId: string) => {
        const newSet = new Set(assignedUserIds);
        const user = users.find(u => u.id === userId);

        if (newSet.has(userId)) {
            newSet.delete(userId);
        } else {
            newSet.add(userId);
            if (user) {
                const otherAssignments = user.assignedCenters.filter(id => Number(id) !== Number(centerId || 0));
                if (otherAssignments.length > 0) {
                    const conflictingCenters = centersList.filter(c => otherAssignments.includes(c.rowid));
                    setConflictData({ user, centers: conflictingCenters });
                }
            }
        }
        setAssignedUserIds(newSet);
    };

    const filteredUsers = users.filter(u =>
        u.login.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.firstname + ' ' + u.lastname).toLowerCase().includes(userSearch.toLowerCase())
    );

    return (
        <div className="bg-white rounded-[2rem] w-full h-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
            {/* Header - EXACT REPLICA FROM COMMIT ce4b5304 */}
            <div className="px-6 py-5 flex items-center justify-between border-b border-gray-50 bg-white">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-black text-white rounded-xl shadow-lg shadow-black/10">
                        {centerId ? <PencilLine size={18} /> : <Plus size={18} />}
                    </div>
                    <h3 className="text-lg font-extrabold text-[#121726] tracking-tight">
                        {centerId ? 'Editar' : 'Nuevo Registro'}
                    </h3>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                >
                    <X size={18} strokeWidth={2.5} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-5 bg-white">
                {/* Section: Type Selection */}
                <div className="space-y-2">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Tipo de Ubicación</label>
                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
                        <button
                            onClick={() => setSelectedType('center')}
                            className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${selectedType === 'center'
                                ? 'bg-white shadow-sm text-black ring-1 ring-black/5'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <MapPinHouse size={14} />
                            Centro de Trabajo
                        </button>
                        <button
                            onClick={() => setSelectedType('project')}
                            className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${selectedType === 'project'
                                ? 'bg-white shadow-sm text-black ring-1 ring-black/5'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <MapPinned size={14} />
                            Proyecto / Obra
                        </button>
                    </div>
                </div>

                {/* Section: General Info */}
                <div className="space-y-3">
                    <div className="relative">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1 flex items-center gap-1">
                            Nombre {selectedType === 'project' ? 'del Proyecto' : 'del Centro'} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full bg-gray-50/50 border-2 border-transparent focus:border-black/5 focus:bg-white rounded-xl p-2.5 text-sm font-bold transition-all outline-none"
                            placeholder={selectedType === 'project' ? "Ej. Reforma Calle Mayor" : "Ej. Sede Principal"}
                            value={editingCenter?.label || ''}
                            onChange={e => setEditingCenter(prev => ({ ...prev, label: e.target.value }))}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Latitud</label>
                            <input
                                type="number"
                                className="w-full bg-gray-50/50 border-2 border-transparent focus:border-black/5 focus:bg-white rounded-xl p-2.5 text-xs font-mono font-bold transition-all outline-none"
                                value={editingCenter?.latitude || ''}
                                onChange={e => setEditingCenter(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))}
                            />
                        </div>
                        <div className="relative">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Longitud</label>
                            <input
                                type="number"
                                className="w-full bg-gray-50/50 border-2 border-transparent focus:border-black/5 focus:bg-white rounded-xl p-2.5 text-xs font-mono font-bold transition-all outline-none"
                                value={editingCenter?.longitude || ''}
                                onChange={e => setEditingCenter(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
                            />
                        </div>
                    </div>

                    <button
                        onClick={detectLocation}
                        className="w-full py-2.5 text-[10px] font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                        <MapPin size={12} strokeWidth={2.5} />
                        <span>Obtener coordenadas actuales</span>
                    </button>

                    <button
                        onClick={() => document.getElementById('assign-employees-section')?.scrollIntoView({ behavior: 'smooth' })}
                        className="w-full py-2.5 text-[10px] font-bold text-white bg-black rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-black/5"
                    >
                        <Users size={12} strokeWidth={2.5} />
                        <span>Asignar Trabajadores</span>
                    </button>

                    <div className="pt-2">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 block">
                            Seleccionar en Mapa
                        </label>
                        <div className="h-[200px] rounded-2xl overflow-hidden border border-gray-100">
                            <LocationMapPicker
                                initialLat={editingCenter?.latitude}
                                initialLng={editingCenter?.longitude}
                                onLocationSelect={(lat, lng) => {
                                    setEditingCenter(prev => ({
                                        ...prev,
                                        latitude: parseFloat(lat.toFixed(6)),
                                        longitude: parseFloat(lng.toFixed(6))
                                    }));
                                }}
                            />
                        </div>
                    </div>

                    <div className="relative">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Radio de Fichaje (metros)</label>
                        <div className="relative">
                            <input
                                type="number"
                                className="w-full bg-gray-50/50 border-2 border-transparent focus:border-black/5 focus:bg-white rounded-xl p-2.5 text-sm font-bold transition-all outline-none"
                                value={editingCenter?.radius || ''}
                                onChange={e => setEditingCenter(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 font-bold text-[10px] uppercase">metros</div>
                        </div>
                    </div>
                </div>

                {/* Section: Assignments */}
                <div className="pt-1" id="assign-employees-section">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Users size={12} />
                            Asignar Empleados
                        </label>
                        <span className="bg-black text-white text-[9px] font-black px-2 py-0.5 rounded-full">{assignedUserIds.size}</span>
                    </div>

                    <div className="bg-gray-50/50 rounded-2xl p-3 space-y-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                            <input
                                type="text"
                                placeholder="Buscar empleado..."
                                className="w-full pl-8 pr-3 py-2 bg-white border-none rounded-lg text-xs font-bold shadow-sm focus:ring-2 focus:ring-black/5 placeholder:text-gray-300 transition-all outline-none"
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                            />
                        </div>

                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {loadingUsers ? (
                                <div className="flex flex-col items-center justify-center py-6 text-gray-300 gap-2">
                                    <Loader2 size={18} className="animate-spin" />
                                </div>
                            ) : (
                                filteredUsers.map(user => {
                                    const isAssigned = assignedUserIds.has(user.id);
                                    return (
                                        <div
                                            key={user.id}
                                            onClick={() => user.configLoaded !== false && toggleUserAssignment(user.id)}
                                            className={`flex items-center justify-between p-2 rounded-xl cursor-pointer border-2 transition-all ${user.configLoaded === false
                                                ? 'opacity-50 cursor-not-allowed bg-red-50 border-red-100'
                                                : isAssigned
                                                    ? 'bg-white border-green-500 shadow-md shadow-green-500/10'
                                                    : 'bg-white/50 border-transparent hover:bg-gray-100'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black ${isAssigned ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                                                    }`}>
                                                    {user.firstname?.[0] || user.login[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`text-[11px] font-bold truncate text-gray-900`}>
                                                        {user.firstname} {user.lastname}
                                                    </p>
                                                    <p className={`text-[8px] font-bold truncate text-gray-400`}>{user.login}</p>
                                                </div>
                                            </div>

                                            {isAssigned && (
                                                <div className="w-4 h-4 bg-green-500 text-white rounded-full flex items-center justify-center animate-in zoom-in duration-200">
                                                    <Check size={8} strokeWidth={4} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 pb-6 pt-2 bg-white">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full bg-black text-white py-3 rounded-xl font-bold tracking-tight shadow-xl shadow-black/20 hover:-translate-y-1 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Guardando...</span>
                        </>
                    ) : (
                        <>
                            <Save size={16} />
                            <span>Guardar Cambios</span>
                        </>
                    )}
                </button>
            </div>

            {/* Conflict Modal */}
            {conflictData && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConflictData(null)} />
                    <div className="relative bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-amber-50 flex items-center justify-center text-amber-500">
                                <AlertTriangle size={32} />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-lg font-black text-gray-900 tracking-tight">Asignación Múltiple</h4>
                                <p className="text-xs text-gray-500 font-bold leading-relaxed px-4">
                                    <span className="text-black">{conflictData.user.firstname}</span> ya tiene otros centros asignados. ¿Quieres añadir este también?
                                </p>
                            </div>
                            <button
                                onClick={() => setConflictData(null)}
                                className="w-full bg-black text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-black/10 active:scale-95 transition-all"
                            >
                                Sí, continuar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
