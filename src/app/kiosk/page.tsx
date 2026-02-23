'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScanFace, Delete, X, ArrowLeft, Loader2, CheckCircle2, Clock, LogOut } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function KioskPage() {
    const router = useRouter();
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [kioskConfig, setKioskConfig] = useState<{ enabled: boolean; pin?: string } | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        // Check kiosk configuration
        const enabled = localStorage.getItem('kiosk_enabled') === 'true';
        if (!enabled) {
            router.push('/fichajes');
            return;
        }
        setKioskConfig({ enabled });

        // Update clock every second
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [router]);

    const handleNumberClick = (num: string) => {
        if (pin.length < 4) {
            setPin(prev => prev + num);
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
    };

    const handleSubmit = async () => {
        if (pin.length !== 4) return;

        setLoading(true);
        try {
            // Get current position if possible
            let latitud = undefined;
            let longitud = undefined;
            if (navigator.geolocation) {
                try {
                    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                    });
                    latitud = pos.coords.latitude;
                    longitud = pos.coords.longitude;
                } catch (e) {
                    console.warn('Geolocation failed for kiosk fichaje', e);
                }
            }

            const res = await fetch('/api/kiosk/clock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin, tipo: 'auto', latitud, longitud })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || 'Fichaje registrado correctamente');
                setPin('');
            } else {
                toast.error(data.error || 'PIN incorrecto o error al fichar');
                setPin('');
            }
        } catch (error) {
            toast.error('Error de conexión con el servidor');
            setPin('');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (pin.length === 4) {
            handleSubmit();
        }
    }, [pin]);

    if (!kioskConfig) return null;

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden selection:bg-primary/30">
            {/* Background micro-blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10 opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/5 blur-[120px] rounded-full" />
            </div>

            {/* Header info */}
            <div className="absolute top-10 w-full flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-xl border border-white/5">
                        <ScanFace className="text-primary" size={20} strokeWidth={2.5} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">
                        Kiosk Mode
                    </span>
                </div>
                <h1 className="text-4xl sm:text-6xl font-black tracking-tighter mt-4 flex items-center gap-4">
                    {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </h1>
                <p className="text-white/40 font-bold text-xs uppercase tracking-widest mt-1">
                    {currentTime.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
            </div>

            {/* PIN Entry Area */}
            <div className="max-w-md w-full space-y-12">
                <div className="text-center space-y-4">
                    <p className="text-xl sm:text-2xl font-black text-white/90">Introduce tu PIN de 4 dígitos</p>
                    {/* Visual PIN Slots */}
                    <div className="flex justify-center gap-4 mt-8">
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={cn(
                                    "w-12 h-16 sm:w-16 sm:h-20 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center",
                                    pin.length > i
                                        ? "border-primary bg-primary/10 scale-105 shadow-[0_0_20px_rgba(242,1,102,0.2)]"
                                        : "border-white/10 bg-white/5"
                                )}
                            >
                                {pin.length > i && (
                                    <div className="w-3 h-3 bg-white rounded-full animate-in zoom-in duration-300" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-4 sm:gap-6 px-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num.toString())}
                            disabled={loading}
                            className="h-16 sm:h-20 rounded-3xl bg-white/5 hover:bg-white/10 active:bg-primary/30 active:scale-95 border border-white/5 font-black text-2xl sm:text-3xl transition-all disabled:opacity-50"
                        >
                            {num}
                        </button>
                    ))}
                    <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="h-16 sm:h-20 rounded-3xl bg-white/5 hover:bg-red-500/20 active:scale-95 flex items-center justify-center transition-all disabled:opacity-50"
                    >
                        <Delete size={28} />
                    </button>
                    <button
                        onClick={() => handleNumberClick('0')}
                        disabled={loading}
                        className="h-16 sm:h-20 rounded-3xl bg-white/5 hover:bg-white/10 active:bg-primary/30 active:scale-95 border border-white/5 font-black text-2xl sm:text-3xl transition-all disabled:opacity-50"
                    >
                        0
                    </button>
                    <button
                        onClick={() => setPin('')}
                        disabled={loading}
                        className="h-16 sm:h-20 rounded-3xl bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center transition-all disabled:opacity-50"
                    >
                        <X size={28} />
                    </button>
                </div>
            </div>

            {/* Exit/Admin Button */}
            <div className="absolute bottom-10 flex gap-4">
                <button
                    onClick={() => router.push('/admin/settings')}
                    className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                >
                    <ArrowLeft size={14} />
                    Salir Modo Quiosco
                </button>
            </div>

            {/* Loading Overlay */}
            {loading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-in fade-in duration-300">
                    <div className="relative">
                        <Loader2 className="animate-spin text-primary" size={60} strokeWidth={3} />
                        <div className="absolute inset-0 blur-xl opacity-40">
                            <Loader2 className="animate-spin text-primary" size={60} strokeWidth={3} />
                        </div>
                    </div>
                    <p className="mt-8 text-xl font-black tracking-widest uppercase animate-pulse">Procesando...</p>
                </div>
            )}
        </div>
    );
}
