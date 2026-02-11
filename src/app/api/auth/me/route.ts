
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const apiKey = request.headers.get('DOLAPIKEY');

        if (!apiKey) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const apiUrl = process.env.NEXT_PUBLIC_DOLIBARR_API_URL;

        // Use custom endpoint that doesn't require special permissions
        const url = `${apiUrl}/fichajestrabajadoresapi/info`;

        console.log(`[API/ME] Fetching: ${url}`);

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'DOLAPIKEY': apiKey
        };

        const response = await fetch(url, {
            method: 'GET',
            headers
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`[API/ME] Error ${response.status}: ${text}`);
            return NextResponse.json({ error: 'Error fetching user info', details: text, status: response.status }, { status: response.status });
        }

        const data = await response.json();

        console.log('[API/ME] User Data received:', JSON.stringify(data, null, 2));

        // The custom endpoint returns the object directly
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('[API/ME] Exception:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
