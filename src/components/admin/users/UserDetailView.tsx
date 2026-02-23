'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, Settings, User as UserIcon, MapPinned, MapPinCheck, Clock as ClockIcon, AlertCircle, ExternalLink, Check, CircleCheck, Loader2, HousePlus, Palmtree, Trash2, Briefcase, MapPinHouse, X, Plus, Fingerprint, Shield, Mail, Smartphone, Phone as PhoneIcon, Lock, EyeOff, Eye, MapPin, MapPinOff } from 'lucide-react';
import { isProject, getCleanLabel } from '@/lib/center-utils';
import { cn } from '@/lib/utils';
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
    onSuccess?: () => void;
}

export default function UserDetailView({ userId, onClose, onSuccess }: UserDetailViewProps) {
    const [config, setConfig] = useState<Record<string, string>>({});
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [availableCenters, setAvailableCenters] = useState<Center[]>([]);
    const [initialCenters, setInitialCenters] = useState<string | null>(null);

    // Create Mode State
    const isCreateMode = userId === 'new';
    const [createFormData, setCreateFormData] = useState({
        firstname: '',
        lastname: '',
        login: '',
        email: '',
        password: '',
        dni: '',
        naf: '',
        user_mobile: '',
        office_phone: '',
        isAdmin: false,
        requireGeolocation: false
    });

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);

    const fetchData = async () => {
        if (isCreateMode) {
            setLoading(false);
            return;
        }

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

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const token = localStorage.getItem('dolibarr_token');
            const url = '/api/admin/create-user';

            const payload: any = {
                ...createFormData,
                admin: createFormData.isAdmin ? 1 : 0,
                user_mobile: createFormData.user_mobile,
                office_phone: createFormData.office_phone,
                array_options: {
                    options_dni: createFormData.dni,
                    options_naf: createFormData.naf
                }
            };

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'DOLAPIKEY': token || ''
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error al crear el usuario');
            }

            const savedUser = await res.json();
            const newUserId = savedUser.data?.id || savedUser.data?.log_id || savedUser.id || savedUser.log_id;

            if (newUserId) {
                await fetch(`/api/users/${newUserId}/config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'DOLAPIKEY': token || '' },
                    body: JSON.stringify({
                        param_name: 'require_geolocation',
                        value: createFormData.requireGeolocation ? '1' : '0'
                    })
                });
            }

            toast.success('Usuario creado correctamente');
            onSuccess?.();
            onClose?.();
        } catch (error: any) {
            toast.error(error.message || 'Error al crear usuario');
        } finally {
            setIsSaving(false);
        }
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

    const [showPassword, setShowPassword] = useState(false);

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
                        {isCreateMode ? <Plus size={24} /> : <UserIcon size={24} />}
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900 leading-tight truncate max-w-[200px]">
                            {isCreateMode ? 'Nuevo Empleado' : `${userData?.firstname || userData?.login} ${userData?.lastname || ''}`}
                        </h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {isCreateMode ? 'Registro de Usuario' : 'Ficha de Empleado'}
                        </p>
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

                {isCreateMode ? (
                    <div className="space-y-6">
                        {/* Name Fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">Nombre</label>
                                <input
                                    type="text"
                                    value={createFormData.firstname}
                                    onChange={e => setCreateFormData(prev => ({ ...prev, firstname: e.target.value }))}
                                    required
                                    placeholder="Ej. Juan"
                                    className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 text-sm text-gray-900 placeholder:text-gray-300 font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">Apellidos</label>
                                <input
                                    type="text"
                                    value={createFormData.lastname}
                                    onChange={e => setCreateFormData(prev => ({ ...prev, lastname: e.target.value }))}
                                    required
                                    placeholder="Ej. Pérez"
                                    className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 text-sm text-gray-900 placeholder:text-gray-300 font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                                />
                            </div>
                        </div>

                        {/* DNI Field */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">
                                <Fingerprint size={12} /> DNI / NIE
                            </label>
                            <input
                                type="text"
                                value={createFormData.dni}
                                onChange={e => setCreateFormData(prev => ({ ...prev, dni: e.target.value }))}
                                placeholder="12345678X"
                                className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 text-sm text-gray-900 placeholder:text-gray-300 font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                            />
                        </div>

                        {/* NAF Field */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">
                                <Shield size={12} /> Nº Seguridad Social (NAF)
                            </label>
                            <input
                                type="text"
                                value={createFormData.naf}
                                onChange={e => setCreateFormData(prev => ({ ...prev, naf: e.target.value }))}
                                placeholder="00/00000000/00"
                                className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 text-sm text-gray-900 placeholder:text-gray-300 font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                            />
                        </div>

                        {/* Login & Email */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">
                                <UserIcon size={12} /> Usuario (Login)
                            </label>
                            <input
                                type="text"
                                value={createFormData.login}
                                onChange={e => setCreateFormData(prev => ({ ...prev, login: e.target.value }))}
                                required
                                placeholder="usuario123"
                                className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 text-sm text-gray-900 placeholder:text-gray-300 font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">
                                <Mail size={12} /> Email
                            </label>
                            <input
                                type="email"
                                value={createFormData.email}
                                onChange={e => setCreateFormData(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="juan@empresa.com"
                                className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 text-sm text-gray-900 placeholder:text-gray-300 font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                            />
                        </div>

                        {/* Phones */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">
                                    <Smartphone size={12} /> Móvil
                                </label>
                                <input
                                    type="tel"
                                    value={createFormData.user_mobile}
                                    onChange={e => setCreateFormData(prev => ({ ...prev, user_mobile: e.target.value }))}
                                    placeholder="600 000 000"
                                    className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 text-sm text-gray-900 placeholder:text-gray-300 font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">
                                    <PhoneIcon size={12} /> Fijo / Oficina
                                </label>
                                <input
                                    type="tel"
                                    value={createFormData.office_phone}
                                    onChange={e => setCreateFormData(prev => ({ ...prev, office_phone: e.target.value }))}
                                    placeholder="910 000 000"
                                    className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 text-sm text-gray-900 placeholder:text-gray-300 font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">
                                <Lock size={12} /> Contraseña
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={createFormData.password}
                                    onChange={e => setCreateFormData(prev => ({ ...prev, password: e.target.value }))}
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 pr-12 text-sm text-gray-900 placeholder:text-gray-300 font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Admin Toggle */}
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between cursor-pointer" onClick={() => setCreateFormData(prev => ({ ...prev, isAdmin: !prev.isAdmin }))}>
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-xl transition-colors", createFormData.isAdmin ? "bg-black text-white" : "bg-white text-gray-400 border border-gray-100")}>
                                    <Shield size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Permisos de Administrador</p>
                                    <p className="text-[10px] text-gray-500 font-medium">Acceso completo al sistema</p>
                                </div>
                            </div>
                            <div className={cn(
                                "w-6 h-6 rounded-full border flex items-center justify-center transition-all",
                                createFormData.isAdmin ? "bg-black border-black text-white" : "bg-white border-gray-300"
                            )}>
                                {createFormData.isAdmin && <Check size={14} strokeWidth={3} />}
                            </div>
                        </div>

                        {/* Geolocation Toggle */}
                        <div
                            className="p-4 rounded-2xl border flex items-center justify-between cursor-pointer bg-white transition-all duration-300"
                            style={{ borderColor: createFormData.requireGeolocation ? '#A7F2AC' : '#F07873' }}
                            onClick={() => setCreateFormData(prev => ({ ...prev, requireGeolocation: !prev.requireGeolocation }))}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={cn("p-2 rounded-xl transition-colors")}
                                    style={{
                                        backgroundColor: createFormData.requireGeolocation ? '#A7F2AC20' : '#F0787320',
                                        color: createFormData.requireGeolocation ? '#2D6A4F' : '#9B2226'
                                    }}
                                >
                                    {createFormData.requireGeolocation ? <MapPin size={18} /> : <MapPinOff size={18} />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Requerir Geolocalización</p>
                                    <p className="text-[10px] text-gray-500 font-medium italic">Solicitar GPS al realizar fichajes</p>
                                </div>
                            </div>
                            <div
                                className="w-10 h-5 rounded-full relative transition-all duration-300"
                                style={{ backgroundColor: createFormData.requireGeolocation ? '#A7F2AC' : '#F07873' }}
                            >
                                <div className={cn(
                                    "absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 shadow-sm",
                                    createFormData.requireGeolocation ? "left-6" : "left-1"
                                )} />
                            </div>
                        </div>

                        <button
                            onClick={handleCreateSubmit}
                            disabled={isSaving}
                            className="w-full bg-black text-white py-5 rounded-[1.8rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-black/30 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            <span>Crear Usuario</span>
                        </button>
                    </div>
                ) : (
                    <>
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

                        {/* Kiosk PIN Section */}
                        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-black/5 text-black">
                                    <Fingerprint size={18} />
                                </div>
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                                    PIN Modo Quiosco
                                </h3>
                            </div>
                            <div>
                                <input
                                    type="text"
                                    value={config.kiosk_pin || ''}
                                    onChange={e => handleChange('kiosk_pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="4 dígitos (ej. 1234)"
                                    maxLength={4}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-2xl font-black text-gray-900 tracking-[0.5em] focus:outline-none focus:ring-4 focus:ring-black/5 transition-all placeholder:text-gray-200 placeholder:tracking-normal placeholder:font-normal placeholder:text-sm"
                                />
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-3 leading-relaxed">
                                    Código personal para fichar en la pantalla compartida. Debe ser único para cada empleado.
                                </p>
                            </div>

                            {(config.kiosk_pin || '') !== (userData?.array_options?.options_kiosk_pin || '') && (
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="w-full bg-black text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-black/10 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    <span>Guardar PIN</span>
                                </button>
                            )}
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
                    </>
                )}
            </div>
        </div>
    );
}
