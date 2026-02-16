'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { MapPinHouse, Plus, MapPin, Trash2, Save, X, Users, Search, Loader2, Check, PencilLine, MapPinned, AlertTriangle, ArrowRight } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { toast } from 'react-hot-toast';
import { DolibarrUser } from '@/lib/admin-types';
import dynamic from 'next/dynamic';
import { isProject, getCleanLabel, formatLabelForSave } from '@/lib/center-utils';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
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
    assignedCenters: number[]; // Array of center IDs
    configLoaded?: boolean;
}

export default function CentersPage() {
    const [centers, setCenters] = useState<Center[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit/Create State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCenter, setEditingCenter] = useState<Partial<Center> | null>(null);
    const [selectedType, setSelectedType] = useState<'center' | 'project'>('center');
    const [conflictData, setConflictData] = useState<{ user: UserWithConfig, centers: Center[] } | null>(null);

    // Employee Assignment State
    const [users, setUsers] = useState<UserWithConfig[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [assignedUserIds, setAssignedUserIds] = useState<Set<string>>(new Set());

    const fetchCenters = async () => {
        try {
            const token = localStorage.getItem('dolibarr_token');
            const res = await fetch('/api/centers', {
                headers: { 'DOLAPIKEY': token || '' },
                cache: 'no-store'
            });
            if (res.ok) {
                const data = await res.json();
                setCenters(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar centros');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsersAndConfigs = async () => {
        setLoadingUsers(true);
        try {
            const token = localStorage.getItem('dolibarr_token');

            // 1. Fetch Users
            const usersRes = await fetch('/api/users?limit=1000', {
                headers: { 'DOLAPIKEY': token || '' },
                cache: 'no-store'
            });
            if (!usersRes.ok) throw new Error('Error fetching users');
            const usersData: DolibarrUser[] = await usersRes.json();

            // 2. Fetch Configs in Batches to avoid server overload
            const BATCH_SIZE = 5;
            const usersWithConfig: UserWithConfig[] = [];

            for (let i = 0; i < usersData.length; i += BATCH_SIZE) {
                const batch = usersData.slice(i, i + BATCH_SIZE);
                const batchResults = await Promise.all(batch.map(async (user) => {
                    try {
                        const configRes = await fetch(`/api/users/${user.id}/config`, {
                            headers: { 'DOLAPIKEY': token || '' },
                            cache: 'no-store'
                        });

                        if (!configRes.ok) throw new Error('Config fetch failed');

                        const config = await configRes.json();

                        // Parse work_centers_ids: "1,2,3"
                        const idsStr = String(config.work_centers_ids || '');
                        const centerIds = idsStr.split(',').map(id => parseInt(id.trim())).filter(n => !isNaN(n));

                        return { ...user, assignedCenters: centerIds, configLoaded: true };
                    } catch (e) {
                        console.error(`Error loading config for user ${user.id}`, e);
                        // Important: Mark as NOT loaded so we don't accidentally overwrite with empty list
                        return { ...user, assignedCenters: [], configLoaded: false };
                    }
                }));
                usersWithConfig.push(...batchResults);
            }

            // Deduplicate users just in case
            const uniqueUsers = Array.from(
                new Map(usersWithConfig.map(user => [user.id, user])).values()
            );

            // Only active users
            setUsers(uniqueUsers.filter(u => u.active !== '0'));

        } catch (error) {
            console.error(error);
            toast.error('Error al cargar empleados');
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        fetchCenters();
    }, []);

    const openCreateModal = () => {
        setEditingCenter({ radius: 100 });
        setSelectedType('center');
        setAssignedUserIds(new Set());
        setUsers([]);
        setIsModalOpen(true);
        fetchUsersAndConfigs();
    };

    const openEditModal = (center: Center) => {
        setEditingCenter({
            ...center,
            label: getCleanLabel(center.label) // Clean label for editing
        });
        setSelectedType(isProject(center.label) ? 'project' : 'center');
        setUsers([]);
        setIsModalOpen(true);

        fetchUsersAndConfigs();
    };

    // Effect to update assignedUserIds when users loaded and editingCenter is set
    useEffect(() => {
        if (users.length > 0 && editingCenter?.rowid) {
            const assigned = new Set<string>();
            users.forEach(u => {
                if (u.assignedCenters.includes(Number(editingCenter.rowid!))) {
                    assigned.add(u.id);
                }
            });
            setAssignedUserIds(assigned);
        } else if (users.length > 0 && !editingCenter?.rowid) {
            // New center, no assignments initially
            setAssignedUserIds(new Set());
        }
    }, [users, editingCenter?.rowid]);


    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!editingCenter?.label || !editingCenter?.latitude || !editingCenter?.longitude) {
            toast.error('Completa todos los campos obligatorios');
            return;
        }

        setIsSaving(true);
        const token = localStorage.getItem('dolibarr_token');
        let centerId = editingCenter.rowid;

        try {
            // Format label with prefix if needed
            const finalLabel = formatLabelForSave(editingCenter.label, selectedType === 'project');
            const dataToSave = { ...editingCenter, label: finalLabel };

            // 1. Save/Update Center
            if (centerId) {
                // Update
                const res = await fetch(`/api/centers/${centerId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'DOLAPIKEY': token || '' },
                    body: JSON.stringify(dataToSave)
                });
                if (!res.ok) throw new Error('Error al actualizar centro');
                toast.success('Centro actualizado');
            } else {
                // Create
                const res = await fetch('/api/centers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'DOLAPIKEY': token || '' },
                    body: JSON.stringify(dataToSave)
                });
                if (!res.ok) throw new Error('Error al crear centro');
                const data = await res.json();
                centerId = data;
                toast.success('Centro creado');
            }

            // 2. Update Employee Assignments
            if (!centerId) return;

            toast.loading('Guardando asignaciones...', { id: 'save-assignments' });

            const processedIds = new Set<string>();

            const updates = users.map(async (user) => {
                // Safety: Skip users whose config failed to load
                if (user.configLoaded === false) return;

                // Deduplicate execution in case state has dupes
                if (processedIds.has(user.id)) return;
                processedIds.add(user.id);

                const isAssigned = assignedUserIds.has(user.id);
                const wasAssigned = user.assignedCenters.includes(Number(centerId));

                if (isAssigned === wasAssigned) return; // No change

                let newCenterIds = [...user.assignedCenters];
                if (isAssigned) {
                    newCenterIds.push(Number(centerId));
                } else {
                    newCenterIds = newCenterIds.filter(id => id !== Number(centerId));
                }

                // Call API to update user config
                const res = await fetch(`/api/users/${user.id}/config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'DOLAPIKEY': token || '' },
                    body: JSON.stringify({
                        param_name: 'work_centers_ids',
                        value: newCenterIds.join(',')
                    })
                });

                if (!res.ok) throw new Error(`Failed to update user ${user.id}`);
            });

            await Promise.all(updates);
            toast.dismiss('save-assignments');
            if (updates.length > 0) toast.success('Asignaciones completadas');

            setIsModalOpen(false);
            fetchCenters(); // Refresh list

        } catch (error) {
            console.error(error);
            toast.dismiss('save-assignments');
            toast.error(`Error al guardar: ${error instanceof Error ? error.message : 'Desconocido'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar este centro?')) return;
        try {
            const token = localStorage.getItem('dolibarr_token');
            const res = await fetch(`/api/centers/${id}`, {
                method: 'DELETE',
                headers: { 'DOLAPIKEY': token || '' }
            });
            if (res.ok) {
                toast.success('Centro eliminado');
                fetchCenters();
            } else {
                toast.error('Error al eliminar');
            }
        } catch (error) {
            toast.error('Error de conexión');
        }
    };

    const detectLocation = () => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setEditingCenter(prev => ({
                        ...(prev || {}),
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    }));
                    toast.success('Ubicación detectada');
                },
                (error) => toast.error('Error al detectar ubicación')
            );
        } else {
            toast.error('Navegador no soporta geolocalización');
        }
    };

    const toggleUserAssignment = (userId: string) => {
        const newSet = new Set(assignedUserIds);
        const user = users.find(u => u.id === userId);

        if (newSet.has(userId)) {
            newSet.delete(userId);
        } else {
            newSet.add(userId);
            // Check if user is already assigned to OTHER centers
            if (user) {
                const currentCenterId = Number(editingCenter?.rowid || 0);

                // Determine centers user is assigned to that are NOT the current one being edited
                const otherAssignments = user.assignedCenters.filter(id =>
                    Number(id) !== currentCenterId
                );

                if (otherAssignments.length > 0) {
                    const conflictingCenters = centers.filter(c => otherAssignments.includes(c.rowid));
                    setConflictData({
                        user,
                        centers: conflictingCenters
                    });
                }
            }
        }
        setAssignedUserIds(newSet);
    };

    const filteredUsers = users.filter(u =>
        u.login.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.firstname + ' ' + u.lastname).toLowerCase().includes(userSearch.toLowerCase())
    );

    const workCenters = centers.filter(c => !isProject(c.label));
    const projects = centers.filter(c => isProject(c.label));

    const renderCenterCard = (center: Center, index: number, isProj: boolean) => {
        const colors = [
            { bg: 'bg-emerald-50', border: 'border-emerald-100', hover: 'group-hover:border-emerald-500/20', color: '#10b981', btn: 'hover:bg-emerald-100/50 text-emerald-600' },
            { bg: 'bg-blue-50', border: 'border-blue-100', hover: 'group-hover:border-blue-500/20', color: '#3b82f6', btn: 'hover:bg-blue-100/50 text-blue-600' },
            { bg: 'bg-amber-50', border: 'border-amber-100', hover: 'group-hover:border-amber-500/20', color: '#f59e0b', btn: 'hover:bg-amber-100/50 text-amber-600' },
            { bg: 'bg-rose-50', border: 'border-rose-100', hover: 'group-hover:border-rose-500/20', color: '#f43f5e', btn: 'hover:bg-rose-100/50 text-rose-600' },
            { bg: 'bg-violet-50', border: 'border-violet-100', hover: 'group-hover:border-violet-500/20', color: '#8b5cf6', btn: 'hover:bg-violet-100/50 text-violet-600' },
            { bg: 'bg-indigo-50', border: 'border-indigo-100', hover: 'group-hover:border-indigo-500/20', color: '#6366f1', btn: 'hover:bg-indigo-100/50 text-indigo-600' },
        ];
        const color = colors[index % colors.length];

        return (
            <div
                key={center.rowid}
                className={cn(
                    "group relative flex items-center gap-5 p-5 rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-500 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 overflow-hidden",
                    "bg-gradient-to-br from-white from-60% transition-all",
                    color.hover
                )}
                style={{ '--tw-gradient-to': `${color.color}33` } as any} // 33 is ~20% opacity
            >
                {/* Icon Container - Left */}
                <div className={`relative shrink-0 flex h-16 w-16 items-center justify-center rounded-[1.2rem] bg-gray-50 border border-gray-100 text-black transition-all duration-500 group-hover:scale-110 group-hover:bg-white group-hover:shadow-md z-10`}>
                    {isProj ? <MapPinned size={28} strokeWidth={1.5} /> : <MapPinHouse size={28} strokeWidth={1.5} />}
                </div>

                {/* Content - Right */}
                <div className="flex-1 min-w-0 relative z-10">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                            <h3 className="text-lg font-bold text-[#121726] tracking-tight truncate pr-2">
                                {getCleanLabel(center.label)}
                            </h3>
                            <div className="flex items-center gap-1.5 -mt-0.5">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-gray-400">Radio: {center.radius}m</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => openEditModal(center)}
                                className={`p-2 rounded-xl transition-all ${color.btn} hover:scale-110 active:scale-95`}
                                title="Editar"
                            >
                                <PencilLine size={18} strokeWidth={2} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(center.rowid); }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all hover:scale-110 active:scale-95"
                                title="Borrar"
                            >
                                <Trash2 size={18} strokeWidth={2} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex min-h-screen bg-[#FAFBFC]">
            <div className="hidden md:block"><Sidebar /></div>
            <main className="flex-1 ml-0 md:ml-64 p-6 md:p-12 pb-32">
                <PageHeader
                    title="Centros y Proyectos"
                    subtitle="Gestiona las ubicaciones y proyectos para los fichajes"
                    icon={MapPinHouse}
                    badge="Configuración"
                    showBack={true}
                />

                <div className="max-w-6xl space-y-8">
                    <div className="flex justify-start">
                        <button
                            onClick={openCreateModal}
                            className="bg-black text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-black/5 hover:shadow-black/10 hover:-translate-y-0.5 transition-all"
                        >
                            <Plus size={20} />
                            <span>Nuevo Registro</span>
                        </button>
                    </div>

                    {/* Work Centers Section */}
                    {workCenters.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold flex items-center gap-2 px-1">
                                <MapPinHouse className="text-black" size={24} />
                                Centros de Trabajo
                            </h3>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {workCenters.map((center, index) => renderCenterCard(center, index, false))}
                            </div>
                        </div>
                    )}

                    {/* Projects Section */}
                    {projects.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold flex items-center gap-2 px-1 pt-6">
                                <MapPinned className="text-black" size={24} />
                                Proyectos / Obras
                            </h3>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {projects.map((center, index) => renderCenterCard(center, index, true))}
                            </div>
                        </div>
                    )}

                    {centers.length === 0 && !loading && (
                        <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-[2rem] border border-dashed border-gray-200">
                            No hay centros ni proyectos configurados
                        </div>
                    )}
                </div>
            </main>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg max-h-[85vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
                        {/* Header */}
                        <div className="px-6 py-5 flex items-center justify-between border-b border-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-black text-white rounded-xl shadow-lg shadow-black/10">
                                    {editingCenter?.rowid ? <PencilLine size={18} /> : <Plus size={18} />}
                                </div>
                                <h3 className="text-lg font-extrabold text-[#121726] tracking-tight">
                                    {editingCenter?.rowid ? 'Editar' : 'Nuevo Registro'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                            >
                                <X size={18} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-5">
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
                                        Nombre {selectedType === 'project' ? 'del Proyecto' : 'del Centro'}
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50/50 border-2 border-transparent focus:border-black/5 focus:bg-white rounded-xl p-2.5 text-sm font-bold transition-all outline-none"
                                        placeholder={selectedType === 'project' ? "Ej. Reforma Calle Mayor" : "Ej. Sede Principal"}
                                        value={editingCenter?.label || ''}
                                        onChange={e => setEditingCenter(prev => ({ ...(prev || {}), label: e.target.value }))}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Latitud</label>
                                        <input
                                            type="number"
                                            className="w-full bg-gray-50/50 border-2 border-transparent focus:border-black/5 focus:bg-white rounded-xl p-2.5 text-xs font-mono font-bold transition-all outline-none"
                                            value={editingCenter?.latitude || ''}
                                            onChange={e => setEditingCenter(prev => ({ ...(prev || {}), latitude: parseFloat(e.target.value) }))}
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Longitud</label>
                                        <input
                                            type="number"
                                            className="w-full bg-gray-50/50 border-2 border-transparent focus:border-black/5 focus:bg-white rounded-xl p-2.5 text-xs font-mono font-bold transition-all outline-none"
                                            value={editingCenter?.longitude || ''}
                                            onChange={e => setEditingCenter(prev => ({ ...(prev || {}), longitude: parseFloat(e.target.value) }))}
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

                                <div className="pt-2">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 block">
                                        Seleccionar en Mapa
                                    </label>
                                    <LocationMapPicker
                                        initialLat={editingCenter?.latitude}
                                        initialLng={editingCenter?.longitude}
                                        onLocationSelect={(lat, lng) => {
                                            setEditingCenter(prev => ({
                                                ...(prev || {}),
                                                latitude: parseFloat(lat.toFixed(6)),
                                                longitude: parseFloat(lng.toFixed(6))
                                            }));
                                        }}
                                    />
                                </div>

                                <div className="relative">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Radio de Fichaje (metros)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full bg-gray-50/50 border-2 border-transparent focus:border-black/5 focus:bg-white rounded-xl p-2.5 text-sm font-bold transition-all outline-none"
                                            value={editingCenter?.radius || ''}
                                            onChange={e => setEditingCenter(prev => ({ ...(prev || {}), radius: parseInt(e.target.value) }))}
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 font-bold text-[10px] uppercase">metros</div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Assignments */}
                            <div className="pt-1">
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
                                                                <p className={`text-[11px] font-extra-bold truncate ${isAssigned ? 'text-gray-900' : 'text-gray-900'}`}>
                                                                    {user.firstname} {user.lastname} {user.configLoaded === false && <span className="text-red-500 text-[9px]">(Error de carga)</span>}
                                                                </p>
                                                                <p className={`text-[8px] font-bold truncate ${isAssigned ? 'text-gray-500' : 'text-gray-400'}`}>{user.login}</p>
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
                        <div className="px-6 pb-6 pt-2">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full bg-black text-white py-3 rounded-xl font-bold tracking-tight shadow-xl shadow-black/20 hover:-translate-y-1 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
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
                    </div>
                </div>
            )}

            {/* Conflict Warning Bottom Sheet */}
            <div className={`fixed inset-x-0 bottom-0 z-[100] transform transition-transform duration-500 ease-out ${conflictData ? 'translate-y-0' : 'translate-y-full'}`}>
                {/* Backdrop for click-outside dismissal */}
                {conflictData && (
                    <div className="absolute inset-0 -top-[100vh] bg-black/5 backdrop-blur-[1px]" onClick={() => setConflictData(null)} />
                )}

                <div className="relative bg-white border-t border-gray-100 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] rounded-t-[2.5rem] p-8 max-w-md mx-auto md:mb-8 md:rounded-[2.5rem] md:border">
                    <div className="w-12 h-1 bg-gray-100 rounded-full mx-auto mb-8" />

                    <div className="flex flex-col items-center text-center space-y-5">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                            <AlertTriangle size={22} strokeWidth={2.5} />
                        </div>

                        <div className="space-y-1.5">
                            <h4 className="text-base font-bold text-gray-900 tracking-tight">
                                Asignación Múltiple
                            </h4>
                            <p className="text-xs text-gray-500 font-medium max-w-[280px] leading-relaxed">
                                <span className="text-gray-900 font-bold">{conflictData?.user.firstname} {conflictData?.user.lastname}</span> ya tiene otro/s centro/s asignado/s. ¿Deseas proceder con la asignación?
                            </p>
                        </div>

                        <div className="w-full flex flex-wrap justify-center gap-2">
                            {conflictData?.centers.map(center => {
                                const isProj = isProject(center.label);
                                return (
                                    <div key={center.rowid} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100">
                                        <div className={`${isProj ? 'text-gray-400' : 'text-blue-400'}`}>
                                            {isProj ? <MapPinned size={11} /> : <MapPinHouse size={11} />}
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">{getCleanLabel(center.label)}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="w-full pt-1">
                            <button
                                onClick={() => setConflictData(null)}
                                className="w-full bg-black text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-black/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-[11px]"
                            >
                                <span>Continuar asignación</span>
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <MobileNav />
        </div>
    );
}
