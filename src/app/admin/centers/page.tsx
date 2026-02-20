'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { MapPinHouse, Plus, Trash2, X, Search, Loader2, MapPinned, ChevronRight, Settings, PencilLine } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { isProject, getCleanLabel } from '@/lib/center-utils';
import { cn } from '@/lib/utils';
import CenterDetailView from '@/components/admin/centers/CenterDetailView';
import CenterDetailViewLegacy from '@/components/admin/centers/CenterDetailViewLegacy';

interface Center {
    rowid: number;
    label: string;
    latitude: number;
    longitude: number;
    radius: number;
}

export default function CentersPage() {
    const [centers, setCenters] = useState<Center[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Selection State
    const [selectedCenterId, setSelectedCenterId] = useState<number | null>(null);
    const [showDetailPanel, setShowDetailPanel] = useState(false);

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

    useEffect(() => {
        fetchCenters();
    }, []);

    // Scroll to top when panel opens
    useEffect(() => {
        if (showDetailPanel) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [showDetailPanel]);

    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!confirm('┬┐Est├ís seguro de eliminar este registro?')) return;
        try {
            const token = localStorage.getItem('dolibarr_token');
            const res = await fetch(`/api/centers/${id}`, {
                method: 'DELETE',
                headers: { 'DOLAPIKEY': token || '' }
            });
            if (res.ok) {
                toast.success('Eliminado correctamente');
                if (selectedCenterId === id) {
                    setSelectedCenterId(null);
                    setShowDetailPanel(false);
                }
                fetchCenters();
            } else {
                toast.error('Error al eliminar');
            }
        } catch (error) {
            toast.error('Error de conexi├│n');
        }
    };

    const filteredCenters = centers.filter(c =>
        getCleanLabel(c.label).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const workCenters = filteredCenters.filter(c => !isProject(c.label));
    const projects = filteredCenters.filter(c => isProject(c.label));

    return (
        <main className="min-h-screen bg-[#fafafa] p-4 md:p-8 lg:p-12">
            <div className="max-w-[1600px] mx-auto">
                <PageHeader
                    title="Centros y Proyectos"
                    subtitle="Gestiona las ubicaciones y proyectos para los fichajes"
                    icon={MapPinHouse}
                    badge="Configuración"
                    showBack={true}
                    backUrl="/admin"
                />

                <div className="flex flex-col lg:flex-row gap-8 items-start relative mt-8">
                    {/* LIST COLUMN */}
                    <div className={cn(
                        "transition-all duration-700 ease-in-out shrink-0",
                        showDetailPanel ? "lg:w-[35%] xl:w-[33%]" : "w-full"
                    )}>
                        {/* MOBILE HEADER (Old Layout) */}
                        <div className="lg:hidden">
                            <div className="mb-6 flex justify-start">
                                <button
                                    onClick={() => {
                                        setSelectedCenterId(null);
                                        setShowDetailPanel(true);
                                    }}
                                    className="bg-black text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-black/5 hover:shadow-black/10 hover:-translate-y-0.5 transition-all"
                                >
                                    <Plus size={20} />
                                    <span>Nuevo Registro</span>
                                </button>
                            </div>

                            <div className="mb-8 relative group w-full md:max-w-md">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="Buscar ubicación..."
                                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm focus:outline-none focus:ring-4 focus:ring-black/5 focus:border-black/10 transition-all font-semibold text-gray-700 placeholder:text-gray-300 placeholder:font-medium"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* DESKTOP HEADER (New Layout) */}
                        <div className="hidden lg:flex mb-8 flex-row items-center justify-start gap-4">
                            <div className="relative group w-full md:max-w-md">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="Buscar ubicación..."
                                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm focus:outline-none focus:ring-4 focus:ring-black/5 focus:border-black/10 transition-all font-semibold text-gray-700 placeholder:text-gray-300 placeholder:font-medium"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <button
                                onClick={() => {
                                    setSelectedCenterId(null);
                                    setShowDetailPanel(true);
                                }}
                                className="flex items-center gap-2 bg-black text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/20 active:scale-95 transition-all shrink-0"
                            >
                                <Plus size={18} strokeWidth={3} />
                                Nueva Ubicación
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="animate-spin text-black" size={32} />
                            </div>
                        ) : (
                            <div className="space-y-10">
                                {/* Work Centers Section */}
                                {workCenters.length > 0 && (
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Centros de Trabajo</h4>
                                        <div className={cn(
                                            "grid gap-4",
                                            showDetailPanel ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                                        )}>
                                            {workCenters.map((center, index) => (
                                                <CenterCard
                                                    key={center.rowid}
                                                    center={center}
                                                    index={index}
                                                    isSelected={selectedCenterId === center.rowid}
                                                    onClick={() => {
                                                        setSelectedCenterId(center.rowid);
                                                        setShowDetailPanel(true);
                                                    }}
                                                    onDelete={handleDelete}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Projects Section */}
                                {projects.length > 0 && (
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Proyectos / Obras</h4>
                                        <div className={cn(
                                            "grid gap-4",
                                            showDetailPanel ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                                        )}>
                                            {projects.map((center, index) => (
                                                <CenterCard
                                                    key={center.rowid}
                                                    center={center}
                                                    index={index}
                                                    isSelected={selectedCenterId === center.rowid}
                                                    onClick={() => {
                                                        setSelectedCenterId(center.rowid);
                                                        setShowDetailPanel(true);
                                                    }}
                                                    onDelete={handleDelete}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {filteredCenters.length === 0 && (
                                    <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-gray-200">
                                        <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">No se detectaron ubicaciones</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* DETAIL PANEL (Desktop) */}
                    {showDetailPanel && (
                        <div className="hidden lg:block lg:w-[65%] xl:w-[67%] lg:sticky lg:top-24 lg:h-[calc(100vh-10rem)] animate-in slide-in-from-right-8 fade-in duration-500 z-30">
                            <CenterDetailView
                                centerId={selectedCenterId}
                                onClose={() => setShowDetailPanel(false)}
                                onSaveSuccess={() => {
                                    fetchCenters();
                                    setShowDetailPanel(false);
                                }}
                                centersList={centers}
                            />
                        </div>
                    )}

                    {/* DETAIL MODAL (Mobile - Restored Old Style) */}
                    {showDetailPanel && (
                        <div className="lg:hidden fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                            <div className="w-full max-w-lg max-h-[85vh] h-full animate-in zoom-in duration-300">
                                <CenterDetailViewLegacy
                                    centerId={selectedCenterId}
                                    onClose={() => setShowDetailPanel(false)}
                                    onSaveSuccess={() => {
                                        fetchCenters();
                                        setShowDetailPanel(false);
                                    }}
                                    centersList={centers}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

function CenterCard({ center, index, isSelected, onClick, onDelete }: { center: Center, index: number, isSelected: boolean, onClick: () => void, onDelete: (e: React.MouseEvent, id: number) => void }) {
    const isProj = isProject(center.label);
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
        <div key={center.rowid}>
            {/* MOBILE CARD (Old Gradient Design) */}
            <div className="lg:hidden">
                <div
                    onClick={onClick}
                    className={cn(
                        "group relative flex items-center gap-5 p-5 rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-500 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 overflow-hidden cursor-pointer",
                        "bg-gradient-to-br from-white from-60% transition-all",
                        color.hover
                    )}
                    style={{ '--tw-gradient-to': `${color.color}33` } as any}
                >
                    {/* Icon Container */}
                    <div className={`relative shrink-0 flex h-16 w-16 items-center justify-center rounded-[1.2rem] bg-gray-50 border border-gray-100 text-black transition-all duration-500 group-hover:scale-110 group-hover:bg-white group-hover:shadow-md z-10`}>
                        {isProj ? <MapPinned size={28} strokeWidth={1.5} /> : <MapPinHouse size={28} strokeWidth={1.5} />}
                    </div>

                    {/* Content */}
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

                            {/* Action Buttons (Mobile Only) */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onClick(); }}
                                    className={`p-2 rounded-xl transition-all ${color.btn} hover:scale-110 active:scale-95`}
                                >
                                    <PencilLine size={18} strokeWidth={2} />
                                </button>
                                <button
                                    onClick={(e) => onDelete(e, center.rowid)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all hover:scale-110 active:scale-95"
                                >
                                    <Trash2 size={18} strokeWidth={2} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* DESKTOP CARD (New Split-View Design) */}
            <div className="hidden lg:block h-full">
                <div
                    onClick={onClick}
                    className={cn(
                        "group relative rounded-[2rem] border transition-all duration-700 cursor-pointer overflow-hidden p-6 h-full",
                        isSelected
                            ? "border-2 border-black bg-white shadow-sm"
                            : "bg-white border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-xl hover:-translate-y-1",
                        !isSelected && color.hover
                    )}
                    style={{
                        '--glow-color': isSelected ? 'transparent' : `${color.color}15`
                    } as any}
                >
                    <div className="relative flex items-center justify-between z-10">
                        <div className="flex items-center gap-4 overflow-hidden">
                            <div
                                className={cn(
                                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-500 border group-hover:rotate-3 shadow-sm",
                                    "bg-gray-50 text-gray-400 border-gray-100 group-hover:bg-white group-hover:text-black",
                                    isSelected && "bg-gray-200 text-black border-gray-300 group-hover:bg-gray-200 group-hover:text-black !text-black"
                                )}
                                style={{ color: isSelected ? undefined : color.color } as any}
                            >
                                {isProj ? <MapPinned size={22} strokeWidth={1.5} /> : <MapPinHouse size={22} strokeWidth={1.5} />}
                            </div>

                            <div className="overflow-hidden">
                                <h3 className="text-sm font-black text-gray-900 tracking-tight truncate group-hover:text-black transition-colors">
                                    {getCleanLabel(center.label)}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                        Radio: {center.radius}m
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-500",
                            isSelected ? "bg-black text-white scale-110" : "bg-gray-50 text-gray-300 group-hover:bg-black group-hover:text-white group-hover:rotate-45"
                        )}>
                            <ChevronRight size={14} strokeWidth={3} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
