import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const NAGER_API = 'https://date.nager.at/api/v3';

// Spanish regions map for Nager.Date county codes
export const SPAIN_REGIONS: Record<string, string> = {
    'ES': 'Nacional',
    'ES-AN': 'Andalucía',
    'ES-AR': 'Aragón',
    'ES-AS': 'Asturias',
    'ES-IB': 'Islas Baleares',
    'ES-CN': 'Canarias',
    'ES-CB': 'Cantabria',
    'ES-CL': 'Castilla y León',
    'ES-CM': 'Castilla-La Mancha',
    'ES-CT': 'Cataluña',
    'ES-EX': 'Extremadura',
    'ES-GA': 'Galicia',
    'ES-MD': 'Comunidad de Madrid',
    'ES-MC': 'Región de Murcia',
    'ES-NC': 'Navarra',
    'ES-PV': 'País Vasco',
    'ES-RI': 'La Rioja',
    'ES-VC': 'Comunitat Valenciana',
};

/**
 * GET /api/holidays?year=2025&region=ES-VC
 * Returns public holidays for Spain filtered by region, using Nager.Date API.
 * Also merges custom local holidays from localStorage-based config (passed via query).
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const year = searchParams.get('year') || new Date().getFullYear().toString();
        const region = searchParams.get('region') || 'ES';

        // Fetch from Nager.Date
        const res = await fetch(`${NAGER_API}/PublicHolidays/${year}/ES`, {
            next: { revalidate: 86400 } // Cache for 24h
        });

        if (!res.ok) {
            return NextResponse.json(
                { error: 'Error fetching holidays from Nager.Date' },
                { status: 502 }
            );
        }

        const allHolidays: any[] = await res.json();

        // Filter: include global holidays + holidays that apply to the selected region
        const filtered = allHolidays.filter(h => {
            if (h.global) return true;
            if (!h.counties) return false;
            if (region === 'ES') return h.global; // National only
            return h.counties.includes(region);
        });

        // Normalize
        const normalized = filtered.map(h => ({
            date: h.date,
            name: h.localName || h.name,
            type: 'national' as const,
            global: h.global,
            counties: h.counties,
        }));

        return NextResponse.json({
            year: parseInt(year),
            region,
            regionName: SPAIN_REGIONS[region] || region,
            holidays: normalized,
        });

    } catch (error: any) {
        console.error('Holidays API Error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor', details: error.message },
            { status: 500 }
        );
    }
}
