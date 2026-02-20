'use client';

import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard } from 'lucide-react';
import { useFichajes } from '@/hooks/useFichajes';
import { toast } from 'react-hot-toast';
import { useState, useEffect } from 'react';

export default function WelcomeCard() {
    const { user } = useAuth();
    const { currentState, registrarEntrada, registrarSalida, iniciarPausa, terminarPausa, loading } = useFichajes();
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const timeStr = time.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const dateStr = time.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    const greeting = time.getHours() < 12 ? 'Buenos días' : time.getHours() < 20 ? 'Buenas tardes' : 'Buenas noches';

    // State logic for buttons
    const canEntrada = currentState === 'sin_iniciar';
    const canPausa = currentState === 'trabajando';
    const canRegreso = currentState === 'en_pausa';
    const canSalida = currentState === 'trabajando' || currentState === 'en_pausa';

    const handleAction = async (action: () => Promise<any>, label: string) => {
        try {
            await action();
        } catch (e: any) {
            console.error(`Error en ${label}:`, e);
            if (e.code !== 'LOCATION_OUT_OF_RANGE') {
                toast.error(`Error al registrar ${label}`);
            }
        }
    };

    const colors = {
        entrada: '#AFF0BA',
        pausa: '#FFEEA3',
        regreso: '#ACE4F2',
        salida: '#FF7A7A'
    };

    return (
        <div className="relative overflow-hidden rounded-[2rem] bg-white border border-gray-100 p-7 text-[#121726] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            {/* Decorative background icon */}
            <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
                <div className="absolute -top-8 -right-8 opacity-[0.04] rotate-12 text-black">
                    <LayoutDashboard size={200} strokeWidth={1} />
                </div>
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-[0.2em] mb-3 border border-primary/10">
                        Administrador
                    </span>
                    <h2 className="text-3xl font-bold tracking-tight mb-1 text-[#121726]">
                        {greeting}, {user?.firstname || user?.login || 'Admin'}!
                    </h2>
                    <p className="text-gray-400 font-semibold text-sm tracking-tight">
                        {formattedDate}
                    </p>
                </div>

                <div className="flex items-center gap-6">
                    {/* Digital Clock - Matching /fichajes style */}
                    <div className="hidden xl:flex flex-col items-end border-r border-gray-100 pr-6">
                        <span className="text-3xl font-bold font-mono tracking-tighter text-[#121726]">
                            {timeStr}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hora Actual</span>
                    </div>

                    {/* Attendance Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => handleAction(registrarEntrada, 'entrada')}
                            disabled={!canEntrada || loading}
                            style={{ backgroundColor: !canEntrada ? colors.entrada : undefined }}
                            className={`px-7 py-3 rounded-xl font-bold text-base transition-all shadow-sm ${canEntrada
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(5,150,105,0.4)]'
                                : 'text-slate-800 opacity-40 grayscale cursor-not-allowed'
                                }`}
                        >
                            Entrada
                        </button>

                        <button
                            onClick={() => handleAction(iniciarPausa, 'pausa')}
                            disabled={!canPausa || loading}
                            style={{ backgroundColor: colors.pausa }}
                            className={`px-7 py-3 rounded-xl font-bold text-base transition-all shadow-sm text-slate-800 ${canPausa
                                ? 'hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(255,238,163,0.4)]'
                                : 'opacity-40 grayscale cursor-not-allowed'
                                }`}
                        >
                            Pausa
                        </button>

                        <button
                            onClick={() => handleAction(terminarPausa, 'regreso')}
                            disabled={!canRegreso || loading}
                            style={{ backgroundColor: colors.regreso }}
                            className={`px-7 py-3 rounded-xl font-bold text-base transition-all shadow-sm text-slate-800 ${canRegreso
                                ? 'hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(172,228,242,0.4)]'
                                : 'opacity-40 grayscale cursor-not-allowed'
                                }`}
                        >
                            Regreso
                        </button>

                        <button
                            onClick={() => handleAction(registrarSalida, 'salida')}
                            disabled={!canSalida || loading}
                            style={{ backgroundColor: colors.salida }}
                            className={`px-7 py-3 rounded-xl font-bold text-base transition-all shadow-sm text-white ${canSalida
                                ? 'hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(255,122,122,0.4)]'
                                : 'opacity-100 cursor-not-allowed saturate-[1.2]'
                                }`}
                        >
                            Salida
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
