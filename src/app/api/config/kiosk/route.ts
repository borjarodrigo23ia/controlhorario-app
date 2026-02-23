import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PIN_PARAM = 'kiosk_admin_pin';
const ENABLED_PARAM = 'kiosk_enabled';

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
        const apiKey = request.headers.get('DOLAPIKEY');
        if (!apiKey) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const resEnabled = await dolibarrFetch(`/fichajestrabajadoresapi/config?param_name=${ENABLED_PARAM}`, apiKey);
        const resPin = await dolibarrFetch(`/fichajestrabajadoresapi/config?param_name=${PIN_PARAM}`, apiKey);

        let enabled = false;
        let pin = '';

        if (resEnabled.ok) {
            const data = await resEnabled.json();
            enabled = data.param_value === 'true';
        }

        if (resPin.ok) {
            const data = await resPin.json();
            pin = data.param_value || '';
        }

        return NextResponse.json({ enabled, pin });
    } catch (error: any) {
        return NextResponse.json({ enabled: false, pin: '' });
    }
}

export async function POST(request: NextRequest) {
    try {
        const apiKey = request.headers.get('DOLAPIKEY');
        if (!apiKey) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { enabled, pin } = await request.json();

        await dolibarrFetch(`/fichajestrabajadoresapi/config`, apiKey, {
            method: 'POST',
            body: JSON.stringify({ param_name: ENABLED_PARAM, param_value: String(enabled) })
        });

        if (pin !== undefined) {
            await dolibarrFetch(`/fichajestrabajadoresapi/config`, apiKey, {
                method: 'POST',
                body: JSON.stringify({ param_name: PIN_PARAM, param_value: pin })
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
