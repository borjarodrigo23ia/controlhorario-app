'use client';

import { useState, useEffect } from 'react';
import { MapPinHouse, Plus, MapPin, Trash2, Save, X, Users, Search, Loader2, Check, PencilLine, MapPinned, AlertTriangle, ArrowRight, Briefcase } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DolibarrUser } from '@/lib/admin-types';
import dynamic from 'next/dynamic';
import { isProject, getCleanLabel, formatLabelForSave } from '@/lib/center-utils';
import { cn } from '@/lib/utils';

const LocationMapPicker = dynamic(() => import('@/components/ui/LocationMapPicker'), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400">Cargando mapa...</div>
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

interface CenterDetailViewProps {
    centerId?: number | null;
    onClose: () => void;
    onSaveSuccess: () => void;
    centersList: Center[]; // Used for conflict detection
    isStandalone?: boolean; // If true, mimics the old modal style (white bg, specific rounding)
}

export default function CenterDetailView({ centerId, onClose, onSaveSuccess, centersList, isStandalone = false }: CenterDetailViewProps) {
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

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const token = localStorage.getItem('dolibarr_token');

            try {
                // 1. Fetch Center Details if centerId exists
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

                // 2. Fetch Users and Configs
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
            const token = localStorage.getItem('dolibarr_token');
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

            // Set initially assigned users
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
        const token = localStorage.getItem('dolibarr_token');
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

            // Update assignments
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
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
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

    // if (loading) return (
    //     <div className="flex bg-white h-full items-center justify-center rounded-[2.5rem] border border-gray-100">
    //         <Loader2 className="animate-spin text-black" size={32} />
    //     </div>
    // );

    return (
        <div className={cn(
            "h-full flex flex-col overflow-hidden shadow-2xl relative transition-all",
            isStandalone
                ? "bg-white rounded-[2rem] border-none shadow-none" // Old Modal Style
                : "bg-[#FAFBFC] rounded-[2.5rem] border border-gray-100" // New Desktop Card Style
        )}>
            <div className="bg-white p-6 border-b border-gray-100 flex items-center justify-between z-20">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-white shrink-0">
                        {selectedType === 'project' ? <MapPinned size={24} /> : <MapPinHouse size={24} />}
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900 leading-tight truncate max-w-[200px]">
                            {editingCenter?.label || 'Nueva Ubicación'}
                        </h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {selectedType === 'project' ? 'Proyecto / Obra' : 'Centro de Trabajo'}
                        </p>
                    </div>
                </div>
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all">
                    <X size={20} />
                </button>
            </div>

            <div className={cn(
                "flex-1 overflow-y-auto custom-scrollbar pb-24",
                isStandalone ? "px-6 py-5 space-y-5" : "p-6 md:p-8 space-y-8"
            )}>
                {/* Type Selection */}
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Tipo de Registro</label>
                    <div className="grid grid-cols-2 gap-3 p-1.5 bg-gray-50 rounded-2xl border border-gray-100">
                        <button
                            onClick={() => setSelectedType('center')}
                            className={cn(
                                "py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                selectedType === 'center' ? "bg-white text-black shadow-md shadow-black/5 ring-1 ring-black/5" : "text-gray-400 hover:text-gray-600"
                            )}
                        >
                            <MapPinHouse size={14} />
                            Centro
                        </button>
                        <button
                            onClick={() => setSelectedType('project')}
                            className={cn(
                                "py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                selectedType === 'project' ? "bg-white text-black shadow-md shadow-black/5 ring-1 ring-black/5" : "text-gray-400 hover:text-gray-600"
                            )}
                        >
                            <MapPinned size={14} />
                            Proyecto
                        </button>
                    </div>
                </div>

                {/* General Info */}
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-6">
                    <div className="space-y-4">
                        <div className="relative group">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 mb-2 block">Nombre Ubicación</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black transition-colors">
                                    <Briefcase size={18} />
                                </div>
                                <input
                                    type="text"
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-black/10 focus:ring-4 focus:ring-black/5 transition-all outline-none"
                                    placeholder="Ej. Sede Central"
                                    value={editingCenter?.label || ''}
                                    onChange={e => setEditingCenter(prev => ({ ...prev, label: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Latitud</label>
                                <input
                                    type="number"
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-mono font-bold outline-none focus:bg-white"
                                    value={editingCenter?.latitude || ''}
                                    onChange={e => setEditingCenter(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Longitud</label>
                                <input
                                    type="number"
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-mono font-bold outline-none focus:bg-white"
                                    value={editingCenter?.longitude || ''}
                                    onChange={e => setEditingCenter(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
                                />
                            </div>
                        </div>

                        <button
                            onClick={detectLocation}
                            className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-all"
                        >
                            <MapPin size={14} />
                            Detectar mi posición
                        </button>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Radio Máximo (Metros)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:bg-white"
                                    value={editingCenter?.radius || ''}
                                    onChange={e => setEditingCenter(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300">METROS</span>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-50 pt-6">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 mb-4 block">Seleccionar en el Mapa</label>
                        <div className="h-[300px] rounded-[2rem] overflow-hidden border border-gray-100">
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
                </div>

                {/* Assignments Section */}
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-black text-gray-900 flex items-center gap-2 uppercase tracking-wide">
                            <Users size={20} className="text-black" />
                            <span>Trabajadores</span>
                        </h3>
                        <span className="bg-black text-white text-[10px] font-black px-3 py-1 rounded-full">{assignedUserIds.size}</span>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre..."
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:bg-white transition-all shadow-sm"
                            value={userSearch}
                            onChange={e => setUserSearch(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        {loadingUsers ? (
                            <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
                        ) : (
                            filteredUsers.map(user => {
                                const isSelected = assignedUserIds.has(user.id);
                                return (
                                    <button
                                        key={user.id}
                                        onClick={() => user.configLoaded !== false && toggleUserAssignment(user.id)}
                                        className={cn(
                                            "w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                                            user.configLoaded === false ? "opacity-50 grayscale" : isSelected ? "bg-black border-black text-white shadow-xl shadow-black/10" : "bg-white border-gray-100 hover:border-gray-300"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black",
                                                isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                                            )}>
                                                {user.firstname?.[0] || user.login[0]}
                                            </div>
                                            <div>
                                                <div className="text-sm font-black leading-tight">{user.firstname} {user.lastname}</div>
                                                <div className={cn("text-[9px] font-bold uppercase tracking-widest", isSelected ? "text-white/60" : "text-gray-400")}>{user.login}</div>
                                            </div>
                                        </div>
                                        {isSelected && <Check size={18} strokeWidth={3} />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Save Button */}
                <div className="fixed bottom-0 inset-x-0 p-6 bg-gradient-to-t from-[#FAFBFC] via-[#FAFBFC] to-transparent z-30 lg:relative lg:p-0 lg:bg-none">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full bg-black text-white py-5 rounded-[1.8rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-black/30 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        <span>Guardar Cambios</span>
                    </button>
                </div>
            </div>

            {/* Conflict Modal */}
            {conflictData && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConflictData(null)} />
                    <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in">
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
                                className="w-full bg-black text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-black/10 active:scale-95 transition-all"
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
