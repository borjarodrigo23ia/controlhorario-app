import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    const clientSlug = process.env.NEXT_PUBLIC_CLIENT_SLUG;
    const basePath = clientSlug ? `/clients/${clientSlug}` : '';

    return {
        name: 'Control Horario - Fichajes',
        short_name: 'Fichajes',
        description: 'Sistema profesional de control horario y gestión de jornadas',
        start_url: '/',
        display: 'standalone',
        background_color: '#FAFBFC',
        theme_color: '#6366F1',
        orientation: 'portrait-primary',
        scope: '/',
        lang: 'es',
        icons: [
            {
                src: `${basePath}/icon-192.png`,
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any'
            },
            {
                src: `${basePath}/icon-512.png`,
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any'
            },
            {
                src: `${basePath}/apple-touch-icon.png`,
                sizes: '180x180',
                type: 'image/png',
            }
        ],
    }
}
