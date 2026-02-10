'use client';

import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';

export default function FichajesLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-[#FAFBFC]">
            <div className="hidden md:block">
                <Sidebar />
            </div>

            <main className="flex-1 ml-0 md:ml-64 p-6 md:p-12 pb-24">
                {children}
            </main>
            <MobileNav />
        </div>
    );
}
