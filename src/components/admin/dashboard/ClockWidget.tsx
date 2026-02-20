'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function ClockWidget() {
    const [time, setTime] = useState<string>('');

    useEffect(() => {
        const update = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative overflow-hidden rounded-[2rem] bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 flex flex-col items-center justify-center gap-4">
            {/* Decorative background icon */}
            <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
                <div className="absolute -top-6 -right-6 opacity-[0.03] rotate-12">
                    <Clock size={160} strokeWidth={1} />
                </div>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-3 w-full">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Hora actual</span>
                <div className="text-4xl font-bold text-[#121726] tracking-tight tabular-nums font-mono">
                    {time || '--:--:--'}
                </div>
                <div className="flex items-center gap-2 w-full mt-2">
                    <button className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0">
                        Entrada
                    </button>
                    <button className="flex-1 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm transition-all duration-300 shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 hover:-translate-y-0.5 active:translate-y-0">
                        Salida
                    </button>
                </div>
            </div>
        </div>
    );
}
