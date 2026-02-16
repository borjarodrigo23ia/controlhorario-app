'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LucideIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import NotificationBell from '@/components/NotificationBell';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface PageHeaderProps {
    title: string | React.ReactNode;
    subtitle?: string;
    badge?: string;
    showBack?: boolean;
    backUrl?: string; // Optional custom back URL
    icon?: LucideIcon;
    children?: React.ReactNode;
    className?: string;
    isLive?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    badge,
    showBack = false,
    backUrl,
    icon: Icon,
    children,
    className,
    isLive = false
}) => {
    const router = useRouter();

    const handleBack = () => {
        if (backUrl) {
            router.push(backUrl);
        } else {
            router.back();
        }
    };

    return (
        <header className={cn("relative z-30 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 animate-fade-in py-2", className)}>
            {/* Background Decorative Icon Wrapper - Isolated from children overflow */}
            {Icon && (
                <div className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-[2.5rem]">
                    <div className="absolute -top-10 -right-10 md:right-20 opacity-[0.02] -rotate-12">
                        <Icon size={240} strokeWidth={1} />
                    </div>
                </div>
            )}

            <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                {showBack ? (
                    <button
                        onClick={handleBack}
                        className="relative shrink-0 group focus:outline-none"
                        title="Volver"
                    >
                        <div className="absolute inset-0 bg-primary/10 rounded-[1.25rem] blur-xl group-hover:bg-primary/20 transition-all duration-500" />
                        <div className="relative w-14 h-14 bg-white rounded-[1.4rem] border border-gray-100 shadow-sm flex items-center justify-center text-gray-500 group-hover:text-primary group-hover:border-primary/20 transition-all duration-300">
                            <ArrowLeft size={24} strokeWidth={2.5} />
                        </div>
                    </button>
                ) : (Icon && (
                    <div className="relative shrink-0 group">
                        <div className="absolute inset-0 bg-primary/10 rounded-[1.5rem] blur-2xl group-hover:bg-primary/20 transition-all duration-700" />
                        <div className="relative w-16 h-16 bg-white rounded-[1.75rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-center text-primary transition-transform duration-500 group-hover:scale-105">
                            <Icon size={32} strokeWidth={2} />
                        </div>
                    </div>
                ))}

                <div>
                    {(badge || isLive) && (
                        <div className="flex items-center gap-3 mb-2">
                            {badge && (
                                <span className="px-3 py-1 rounded-full bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-[0.25em] border border-primary/10">
                                    {badge}
                                </span>
                            )}
                            {isLive && (
                                <div className="flex items-center gap-1.5 ml-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">En Vivo</span>
                                </div>
                            )}
                        </div>
                    )}
                    <h1 className="text-2xl md:text-4xl font-bold text-[#121726] tracking-tighter leading-none mb-1.5">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-gray-500 font-semibold text-base tracking-tight opacity-70">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {children && (
                <div className="relative z-50 flex items-center gap-3">
                    {children}
                </div>
            )}

            {/* Global Notification Bell - Absolutely positioned to match icon center */}
            <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 z-40">
                <NotificationBell />
            </div>

            {/* Mobile Notification Bell - Integrated in flow if no children handle it */}
            <div className="lg:hidden absolute top-2 right-0 z-40">
                <NotificationBell />
            </div>
        </header>
    );
};
