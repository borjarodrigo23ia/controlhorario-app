import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const apiKey = request.headers.get('DOLAPIKEY');
        if (!apiKey) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const estado = searchParams.get('estado') || '';
        const usuario = searchParams.get('usuario') || '';

        // Build backend URL
        // Endpoint expected by Next.js proxy to Dolibarr: /fichajestrabajadoresapi/vacaciones
        const apiUrl = process.env.NEXT_PUBLIC_DOLIBARR_API_URL;
        if (!apiUrl) throw new Error('Dolibarr API URL not configured');

        let url = `${apiUrl}/fichajestrabajadoresapi/vacaciones?`;
        if (estado) url += `estado=${encodeURIComponent(estado)}&`;
        if (usuario) url += `usuario=${encodeURIComponent(usuario)}`;

        console.log('Fetching Vacations from:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'DOLAPIKEY': apiKey
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Backend Error:', response.status, errorText);

            let errorMessage = 'Error al obtener vacaciones de Dolibarr';
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error && errorJson.error.message) {
                    errorMessage = errorJson.error.message;
                }
            } catch (e) { }

            return NextResponse.json(
                { error: errorMessage },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('API Vacations Error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor', details: error.message },
            { status: 500 }
        );
    }
}
