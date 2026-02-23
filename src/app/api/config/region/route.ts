import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PARAM_NAME = 'region_ccaa';

async function dolibarrFetch(path: string, apiKey: string, options: RequestInit = {}) {
    const apiUrl = process.env.NEXT_PUBLIC_DOLIBARR_API_URL;
    if (!apiUrl) throw new Error('Dolibarr API URL not configured');
    return fetch(`${apiUrl}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'DOLAPIKEY': apiKey,
            ...(options.headers || {})
        }
    });
}

export async function GET(request: NextRequest) {
    try {
        const apiKey = request.headers.get('DOLAPIKEY') || '';
        if (!apiKey) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const res = await dolibarrFetch(
            `/fichajestrabajadoresapi/config?param_name=${PARAM_NAME}`,
            apiKey
        );

        if (!res.ok) {
            // If not found, return default
            return NextResponse.json({ region: 'ES' });
        }

        const data = await res.json();
        return NextResponse.json({ region: data.param_value || 'ES' });
    } catch (error: any) {
        return NextResponse.json({ region: 'ES' });
    }
}

export async function POST(request: NextRequest) {
    try {
        const apiKey = request.headers.get('DOLAPIKEY') || '';
        if (!apiKey) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { region } = await request.json();
        if (!region) return NextResponse.json({ error: 'Region required' }, { status: 400 });

        const res = await dolibarrFetch(
            `/fichajestrabajadoresapi/config`,
            apiKey,
            {
                method: 'POST',
                body: JSON.stringify({ param_name: PARAM_NAME, param_value: region })
            }
        );

        const data = await res.json();
        return NextResponse.json({ success: true, region, data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
