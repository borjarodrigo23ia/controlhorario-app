'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import Link from 'next/link';
import { Save, ArrowLeft, Settings, User as UserIcon, MapPinned, MapPinCheck, Clock as ClockIcon, AlertCircle, ExternalLink, Check, CircleCheck, Loader2 } from 'lucide-react';
import ShiftConfigurator from '@/components/admin/ShiftConfigurator';
import { toast } from 'react-hot-toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { CustomToggle } from '@/components/ui/CustomToggle';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

interface UserData {
    id: number;
    login: string;
    firstname: string;
    lastname: string;
    email: string;
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

                    {/* General Settings */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-8">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <MapPinned size={20} className="text-primary" />
                                <span>Geolocalización</span>
                            </h3>

                            <CustomToggle
                                label="Geolocalización Obligatoria"
                                icon={MapPinned}
                                value={config.require_geolocation == '1'}
                                onChange={(val) => handleChange('require_geolocation', val ? '1' : '0')}
                            />
                        </div>
                    </div>

                    {/* Work Centers Section */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <MapPinned size={20} className="text-primary" />
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
                                    {availableCenters
                                        .filter(center => config.work_centers_ids?.split(',').includes(center.rowid.toString()))
                                        .map(center => (
                                            <div
                                                key={center.rowid}
                                                onClick={() => {
                                                    const currentIds = config.work_centers_ids ? config.work_centers_ids.split(',').filter(Boolean) : [];
                                                    const newIds = currentIds.filter(id => id !== center.rowid.toString());
                                                    handleChange('work_centers_ids', newIds.join(','));
                                                }}
                                                className="p-4 rounded-xl border bg-white border-gray-300 shadow-sm flex items-center justify-between cursor-pointer transition-all hover:bg-red-50 hover:border-red-200 group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-black group-hover:bg-red-500 group-hover:text-black transition-colors">
                                                        <MapPinCheck size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900">{center.label}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <CircleCheck size={20} className="text-green-500 group-hover:hidden" />
                                                    <span className="text-xs font-bold text-red-500 hidden group-hover:block">Desasignar</span>
                                                </div>
                                            </div>
                                        ))}
                                    {(!config.work_centers_ids || config.work_centers_ids.split(',').filter(Boolean).length === 0) && (
                                        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            <p className="text-sm text-gray-400">No hay centros asignados</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Available Centers */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Centros Disponibles</h4>
                                <div className="grid gap-3">
                                    {availableCenters
                                        .filter(center => !config.work_centers_ids?.split(',').includes(center.rowid.toString()))
                                        .map(center => (
                                            <div
                                                key={center.rowid}
                                                onClick={() => {
                                                    const currentIds = config.work_centers_ids ? config.work_centers_ids.split(',').filter(Boolean) : [];
                                                    const newIds = [...currentIds, center.rowid.toString()];
                                                    handleChange('work_centers_ids', newIds.join(','));
                                                }}
                                                className="p-4 rounded-xl border bg-white border-gray-100 flex items-center justify-between cursor-pointer transition-all hover:border-blue-300 hover:shadow-md group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                        <MapPinned size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{center.label}</div>
                                                    </div>
                                                </div>
                                                <div className="text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Asignar
                                                </div>
                                            </div>
                                        ))}
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

                        {/* Save Button for General Config */}
                        <div className="pt-4">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full relative group overflow-hidden bg-black text-white p-5 rounded-[1.5rem] font-bold tracking-tight shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            >
                                <div className="relative z-10 flex items-center justify-center gap-3">
                                    {isSaving ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin text-white/70" />
                                            <span>Guardando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save size={20} strokeWidth={2.5} />
                                            <span>Guardar Configuración</span>
                                        </>
                                    )}
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Shift Management Section */}
                    {/* We separate this because logic is complex and decoupled from simple key-value config */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                        <ShiftConfigurator userId={id} />
                    </div>

                </div>
            </main>
            <MobileNav />
        </div>
    );
}
