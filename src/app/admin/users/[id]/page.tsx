'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import Link from 'next/link';
import { Save, ArrowLeft, Settings, User as UserIcon, MapPinned, MapPinCheck, Clock as ClockIcon, AlertCircle, ExternalLink, Check, CircleCheck, Loader2, HousePlus, Palmtree, Trash2, Briefcase, MapPinHouse } from 'lucide-react';
import { isProject, getCleanLabel } from '@/lib/center-utils';
import ShiftConfigurator from '@/components/admin/ShiftConfigurator';
import { toast } from 'react-hot-toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { CustomToggle } from '@/components/ui/CustomToggle';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import VacationDaysIndividualAssign from '@/components/admin/VacationDaysIndividualAssign';
import UserDetailsCard from '@/components/admin/UserDetailsCard';

interface UserData {
    id: number;
    login: string;
    firstname: string;
    lastname: string;
    email: string;
    user_mobile?: string;
    office_phone?: string;
    address?: string;
    zip?: string;
    town?: string;
    job?: string;
    gender?: string;
    birth?: string;
    admin?: string;
    note_private?: string;
}

interface Center {
    rowid: number;
    label: string;
    latitude: number;
    longitude: number;
    radius: number;
}

export default function UserConfigPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [config, setConfig] = useState<Record<string, string>>({});
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [availableCenters, setAvailableCenters] = useState<Center[]>([]);
    const [initialCenters, setInitialCenters] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('dolibarr_token');

                // Fetch User Data
                const userRes = await fetch(`/api/users/${id}`, {
                    headers: { 'DOLAPIKEY': token || '' }
                });
                if (userRes.ok) setUserData(await userRes.json());

                // Fetch Config
                const configRes = await fetch(`/api/users/${id}/config`, {
                    headers: { 'DOLAPIKEY': token || '' }
                });
                if (configRes.ok) {
                    const data = await configRes.json();
                    // Flatten config
                    const flatConfig: Record<string, string> = {};
                    Object.keys(data).forEach(key => {
                        flatConfig[key] = data[key] || '';
                    });
                    // Force update state with new object to ensure re-render
                    setConfig({ ...flatConfig });
                    setInitialCenters(flatConfig.work_centers_ids || '');
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
        fetchData();
    }, [id]);

    const handleChange = (key: string, value: string) => {
        setConfig((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const token = localStorage.getItem('dolibarr_token');
        const promisess = Object.keys(config).map(key =>
            fetch(`/api/users/${id}/config`, {
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
        <div className="flex min-h-screen bg-[#FAFBFC] items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-[#FAFBFC]">
            <div className="hidden md:block"><Sidebar /></div>
            <main className="flex-1 ml-0 md:ml-64 p-6 md:p-12 pb-32">
                <PageHeader
                    title="Ajustes de Empleado"
                    subtitle={userData ? `${userData.firstname || userData.login} ${userData.lastname || ''}` : `ID: ${id}`}
                    icon={Settings}
                    showBack
                    badge="Administración"
                />

                <div className="max-w-2xl space-y-8">

                    {userData && <UserDetailsCard user={userData} />}

                    {/* Geolocation Toggle (Compact) */}
                    <div className="group relative bg-white p-6 rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center justify-between overflow-hidden transition-all hover:shadow-md">
                        {/* Decorative Glow */}
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
                                    await fetch(`/api/users/${id}/config`, {
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
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <HousePlus size={20} className="text-primary" />
                                <span>Centros de Trabajo</span>
                            </h3>
                            <Link href="/admin/centers" className="text-xs font-bold text-blue-600 hover:underline bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
                                Gestionar Centros
                            </Link>
                        </div>

                        <div className="grid gap-8">
                            {/* Assigned Centers */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Centros Asignados</h4>
                                <div className="grid gap-3">
                                    {/* Assigned Work Centers */}
                                    {availableCenters
                                        .filter(center => config.work_centers_ids?.split(',').includes(center.rowid.toString()))
                                        .filter(center => !isProject(center.label))
                                        .map(center => {
                                            const globalIndex = availableCenters.findIndex(c => c.rowid === center.rowid);
                                            const centerColors = [
                                                { gradient: 'from-emerald-500/40', text: 'text-emerald-700', iconBg: 'bg-emerald-50' },
                                                { gradient: 'from-blue-500/40', text: 'text-blue-700', iconBg: 'bg-blue-50' },
                                                { gradient: 'from-amber-500/40', text: 'text-amber-700', iconBg: 'bg-amber-50' },
                                                { gradient: 'from-rose-500/40', text: 'text-rose-700', iconBg: 'bg-rose-50' },
                                                { gradient: 'from-violet-500/40', text: 'text-violet-700', iconBg: 'bg-violet-50' },
                                                { gradient: 'from-indigo-500/40', text: 'text-indigo-700', iconBg: 'bg-indigo-50' },
                                            ];
                                            const color = centerColors[globalIndex % centerColors.length];

                                            return (
                                                <div
                                                    key={center.rowid}
                                                    onClick={() => {
                                                        const currentIds = config.work_centers_ids ? config.work_centers_ids.split(',').filter(Boolean) : [];
                                                        const newIds = currentIds.filter(id => id !== center.rowid.toString());
                                                        handleChange('work_centers_ids', newIds.join(','));
                                                    }}
                                                    className="relative overflow-hidden p-4 rounded-xl border bg-white border-gray-100 shadow-sm flex items-center justify-between cursor-pointer transition-all hover:border-red-200 group"
                                                >
                                                    {/* Decorative Glow */}
                                                    <div className={`absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl ${color.gradient} to-transparent blur-2xl rounded-tl-full opacity-100 pointer-events-none group-hover:scale-125 transition-transform duration-700`} />

                                                    <div className="relative z-10 flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-black transition-colors group-hover:bg-red-50">
                                                            <MapPinCheck size={20} />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-gray-900 leading-tight">{getCleanLabel(center.label)}</div>
                                                            <div className="text-[10px] font-medium text-gray-400">Centro de Trabajo</div>
                                                        </div>
                                                    </div>
                                                    <div className="relative z-10 flex items-center">
                                                        <div className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all hover:scale-110 active:scale-95">
                                                            <Trash2 size={18} strokeWidth={2.5} />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                    {/* Assigned Projects */}
                                    {availableCenters
                                        .filter(center => config.work_centers_ids?.split(',').includes(center.rowid.toString()))
                                        .filter(center => isProject(center.label))
                                        .map(center => (
                                            <div
                                                key={center.rowid}
                                                onClick={() => {
                                                    const currentIds = config.work_centers_ids ? config.work_centers_ids.split(',').filter(Boolean) : [];
                                                    const newIds = currentIds.filter(id => id !== center.rowid.toString());
                                                    handleChange('work_centers_ids', newIds.join(','));
                                                }}
                                                className="relative overflow-hidden p-4 rounded-xl border bg-white border-gray-100 shadow-sm flex items-center justify-between cursor-pointer transition-all hover:border-red-200 group"
                                            >
                                                <div className="relative z-10 flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-black transition-colors group-hover:bg-red-50">
                                                        <MapPinned size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900 leading-tight">{getCleanLabel(center.label)}</div>
                                                        <div className="text-[10px] font-medium text-gray-400">Proyecto</div>
                                                    </div>
                                                </div>
                                                <div className="relative z-10 flex items-center">
                                                    <div className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all hover:scale-110 active:scale-95">
                                                        <Trash2 size={18} strokeWidth={2.5} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                    {/* Conditional Save Button for Centers */}
                                    {initialCenters !== null && (config.work_centers_ids || '') !== initialCenters && (
                                        <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <button
                                                onClick={handleSave}
                                                disabled={isSaving}
                                                className="w-full bg-black text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-black/10 hover:bg-gray-900 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {isSaving ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Save size={16} />
                                                )}
                                                <span>Guardar Cambios en Centros</span>
                                            </button>
                                        </div>
                                    )}

                                    {(!config.work_centers_ids || config.work_centers_ids.split(',').filter(Boolean).length === 0) && (
                                        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            <p className="text-sm text-gray-400">No hay ubicaciones asignadas</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Available Centers */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Centros Disponibles</h4>
                                <div className="space-y-6">

                                    {/* Work Centers Section */}
                                    {availableCenters.filter(c => !config.work_centers_ids?.split(',').includes(c.rowid.toString()) && !isProject(c.label)).length > 0 && (
                                        <div className="space-y-2">
                                            <h5 className="text-[10px] font-bold text-gray-400 uppercase ml-1">Centros de Trabajo</h5>
                                            <div className="grid gap-2">
                                                {availableCenters
                                                    .filter(center => !config.work_centers_ids?.split(',').includes(center.rowid.toString()) && !isProject(center.label))
                                                    .map(center => (
                                                        <div
                                                            key={center.rowid}
                                                            onClick={() => {
                                                                const currentIds = config.work_centers_ids ? config.work_centers_ids.split(',').filter(Boolean) : [];
                                                                const newIds = [...currentIds, center.rowid.toString()];
                                                                handleChange('work_centers_ids', newIds.join(','));
                                                            }}
                                                            className="p-3 rounded-xl border bg-white border-gray-100 flex items-center justify-between cursor-pointer transition-all hover:border-blue-300 hover:shadow-md group"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-black group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                                    <MapPinHouse size={16} />
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{getCleanLabel(center.label)}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                Asignar
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Projects Section */}
                                    {availableCenters.filter(c => !config.work_centers_ids?.split(',').includes(c.rowid.toString()) && isProject(c.label)).length > 0 && (
                                        <div className="space-y-2">
                                            <h5 className="text-[10px] font-bold text-gray-400 uppercase ml-1">Proyectos</h5>
                                            <div className="grid gap-2">
                                                {availableCenters
                                                    .filter(center => !config.work_centers_ids?.split(',').includes(center.rowid.toString()) && isProject(center.label))
                                                    .map(center => (
                                                        <div
                                                            key={center.rowid}
                                                            onClick={() => {
                                                                const currentIds = config.work_centers_ids ? config.work_centers_ids.split(',').filter(Boolean) : [];
                                                                const newIds = [...currentIds, center.rowid.toString()];
                                                                handleChange('work_centers_ids', newIds.join(','));
                                                            }}
                                                            className="p-3 rounded-xl border bg-white border-gray-100 flex items-center justify-between cursor-pointer transition-all hover:border-purple-300 hover:shadow-md group"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-black group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                                                                    <MapPinned size={16} />
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-bold text-gray-900 group-hover:text-purple-700 transition-colors">{getCleanLabel(center.label)}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-xs font-bold text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                Asignar
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}

                                    {availableCenters.filter(center => !config.work_centers_ids?.split(',').includes(center.rowid.toString())).length === 0 && (
                                        <div className="text-center py-6 text-gray-400 text-sm">
                                            Todos los centros han sido asignados.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <p className="text-xs text-gray-500 font-medium flex items-start gap-2">
                                <AlertCircle size={14} className="mt-0.5 text-blue-500 shrink-0" />
                                <span>El empleado podrá fichar si está dentro del radio de CUALQUIERA de los centros seleccionados. Si no selecciona ninguno, no habrá restricciones de ubicación.</span>
                            </p>
                        </div>

                    </div>

                    {/* Shift Management Section */}
                    {/* We separate this because logic is complex and decoupled from simple key-value config */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                        <ShiftConfigurator userId={id} />
                    </div>

                    {/* Vacation Days Assignment (Individual) */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Palmtree size={20} className="text-primary" />
                                <span>Vacaciones</span>
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 font-medium">Configuración del cupo anual de días para el empleado</p>
                        </div>
                        <VacationDaysIndividualAssign userId={id} />
                    </div>
                </div>
            </main >
            <MobileNav />
        </div >
    );
}
