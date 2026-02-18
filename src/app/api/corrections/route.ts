import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const apiKey = request.headers.get('DOLAPIKEY');
        if (!apiKey) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const fkUser = searchParams.get('fk_user') || '';
        const estado = searchParams.get('estado') || '';

        const apiUrl = process.env.NEXT_PUBLIC_DOLIBARR_API_URL;
        let url = `/fichajestrabajadoresapi/corrections`;
        const params = [];
        if (fkUser) params.push(`fk_user=${fkUser}`);
        if (estado) params.push(`estado=${estado}`);
        if (params.length) url += `?${params.join('&')}`;

        const response = await fetch(`${apiUrl}${url}`, {
            headers: { 'DOLAPIKEY': apiKey }
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Error fetching corrections' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const apiKey = request.headers.get('DOLAPIKEY');
        if (!apiKey) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const body = await request.json();
        console.log('[API Corrections POST] Request body:', JSON.stringify(body, null, 2));

        const apiUrl = process.env.NEXT_PUBLIC_DOLIBARR_API_URL;

        const response = await fetch(`${apiUrl}/fichajestrabajadoresapi/corrections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'DOLAPIKEY': apiKey
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        console.log('[API Corrections POST] Dolibarr response:', response.status, JSON.stringify(data, null, 2));

        if (!response.ok) {
            console.error('[API Corrections POST] Dolibarr error:', data);
        } else {
            // --- Notify Admin ---
            (async () => {
                try {
                    const { sendPushNotificationToAdmin } = await import('@/lib/push-sender');
                    await sendPushNotificationToAdmin({
                        title: 'Nueva solicitud de corrección',
                        body: `Un usuario ha solicitado corregir un fichaje.`,
                        url: '/admin/corrections'
                    });
                } catch (err) {
                    console.error('Error sending admin notification for correction:', err);
                }
            })();
        }

        return NextResponse.json(data, { status: response.status });

    } catch (error: any) {
        console.error('[API Corrections POST] Exception:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
