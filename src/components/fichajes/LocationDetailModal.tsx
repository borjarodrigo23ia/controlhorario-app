import React, { useEffect, useState } from 'react';
import { X, MapPin, MessageCircle, AlertTriangle } from 'lucide-react';
import { TimelineEvent } from '@/lib/fichajes-utils';
import dynamic from 'next/dynamic';

// Dynamic import for Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });

// We need a wrapper to handle the L.Icon fix on the client side
let L: any;
if (typeof window !== 'undefined') {
    L = require('leaflet');

    // Fix Leaflet icon issue in Next.js
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
}

interface LocationDetailModalProps {
    event: TimelineEvent | null;
    onClose: () => void;
}

export const LocationDetailModal: React.FC<LocationDetailModalProps> = ({ event, onClose }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!event) return null;

    const lat = event.lat ? parseFloat(event.lat) : null;
    const lng = event.lng ? parseFloat(event.lng) : null;
    const hasCoords = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-red-50 text-red-500 rounded-xl">
                            <MapPin size={24} />
                        </div>
                        <div className="flex flex-col justify-center">
                            <h3 className="text-base font-bold text-gray-900 leading-tight">Detalle de Ubicación</h3>
                            <div className="flex mt-0.5">
                                <span
                                    className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-900 shadow-sm border border-gray-100/50 leading-none"
                                    style={{ backgroundColor: event.color }}
                                >
                                    {event.label}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                    {/* Map Section */}
                    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm h-[250px] relative bg-gray-50">
                        {mounted && hasCoords ? (
                            <MapContainer
                                center={[lat!, lng!]}
                                zoom={15}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                />
                                <Marker position={[lat!, lng!]} />
                            </MapContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                                <MapPin size={32} className="opacity-20" />
                                <span className="text-sm font-medium">Ubicación no disponible en mapa</span>
                                {event.location && (
                                    <span className="text-xs text-gray-400 px-4 text-center">{event.location}</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Information Section */}
                    <div className="space-y-4 px-1">
                        {event.justification && (
                            <div className="py-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle size={16} className="text-amber-500" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Justificación</span>
                                </div>
                                <p className="text-sm text-gray-900 font-roboto font-bold leading-relaxed">
                                    {event.justification}
                                </p>
                            </div>
                        )}

                        {event.observaciones && (
                            <div className="py-2 border-t border-gray-50 pt-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <MessageCircle size={16} className="text-blue-500" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Observaciones</span>
                                </div>
                                <p className="text-sm text-gray-900 font-roboto font-bold leading-relaxed">
                                    {event.observaciones}
                                </p>
                            </div>
                        )}

                        {(!event.justification && !event.observaciones) && (
                            <div className="text-center py-4">
                                <p className="text-sm text-gray-400 italic">No hay comentarios adicionales para este fichaje.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50/50 border-t border-gray-50">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-200"
                    >
                        Entendido
                    </button>
                    {hasCoords && (
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center mt-3 text-xs font-bold text-blue-600 hover:underline"
                        >
                            Abrir en Google Maps
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};
