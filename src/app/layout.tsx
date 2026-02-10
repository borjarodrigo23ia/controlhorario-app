import type { Metadata, Viewport } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from '@/context/AuthContext';
import { NetworkStatusBanner } from '@/components/ui/NetworkStatusBanner';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import "./globals.css";

const outfit = Outfit({
    subsets: ["latin"],
    variable: "--font-outfit",
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
    title: "Control Horario | Fichajes",
    description: "Sistema de control horario y gestión de jornadas",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "Fichajes",
        startupImage: [
            '/icon-512.png',
        ],
    },
    icons: {
        icon: [
            { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
            { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
        ],
        shortcut: "/favicon.png",
        apple: "/apple-touch-icon.png",
    },
};

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
                className={`${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased bg-white text-[#121726]`}
                suppressHydrationWarning={true}
            >
                <ServiceWorkerRegister />
                <NetworkStatusBanner />
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}
