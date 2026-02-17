import type { Metadata, Viewport } from "next";
import { Toaster } from 'react-hot-toast';
import { Outfit, JetBrains_Mono, Roboto } from "next/font/google";
import { AuthProvider } from '@/context/AuthContext';
import { NetworkStatusBanner } from '@/components/ui/NetworkStatusBanner';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import SecurityGuard from '@/components/SecurityGuard';
import "./globals.css";
import 'leaflet/dist/leaflet.css';

const outfit = Outfit({
    subsets: ["latin"],
    variable: "--font-outfit",
});

const roboto = Roboto({
    weight: ['300', '400', '500', '700'],
    subsets: ["latin"],
    variable: "--font-roboto",
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-jetbrains-mono",
});


export async function generateMetadata(): Promise<Metadata> {
    const clientSlug = process.env.NEXT_PUBLIC_CLIENT_SLUG;
    const basePath = clientSlug ? `/clients/${clientSlug}` : '';

    return {
        title: "Control Horario | Fichajes",
        description: "Sistema de control horario y gestión de jornadas",
        manifest: "/manifest.webmanifest", // Next.js automatically handles .ts -> .webmanifest
        appleWebApp: {
            capable: true,
            statusBarStyle: "black-translucent",
            title: "Fichajes",
            startupImage: [
                `${basePath}/icon-512.png`,
            ],
        },
        icons: {
            icon: [
                { url: `${basePath}/icon-192.png`, sizes: "192x192", type: "image/png" },
                { url: `${basePath}/icon-512.png`, sizes: "512x512", type: "image/png" }
            ],
            shortcut: `${basePath}/favicon.png`,
            apple: `${basePath}/apple-touch-icon.png`,
        },
    };
}

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: "#6366F1",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es">
            <body
                className={`${outfit.variable} ${roboto.variable} ${jetbrainsMono.variable} font-sans antialiased bg-white text-[#121726] overflow-x-hidden`}
                suppressHydrationWarning={true}
            >
                <ServiceWorkerRegister />
                <SecurityGuard />
                <NetworkStatusBanner />
                <AuthProvider>
                    <Toaster position="top-center" />
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}
