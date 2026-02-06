import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Props = {
    params: Promise<{ slug: string[] }>
};

export async function GET(request: NextRequest, props: Props) {
    const params = await props.params;
    return handleRequest(request, params, 'GET');
}

export async function POST(request: NextRequest, props: Props) {
    const params = await props.params;
    return handleRequest(request, params, 'POST');
}

export async function DELETE(request: NextRequest, props: Props) {
    const params = await props.params;
    return handleRequest(request, params, 'DELETE');
}

async function handleRequest(request: NextRequest, params: { slug: string[] }, method: string) {
    try {
        const apiKey = request.headers.get('DOLAPIKEY');
        if (!apiKey) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const apiUrl = process.env.NEXT_PUBLIC_DOLIBARR_API_URL;
        if (!apiUrl) throw new Error('Dolibarr API URL not configured');

        // Reconstruct path: /api/vacations/[...slug] -> /fichajestrabajadoresapi/vacaciones/[...slug]
        const subPath = params.slug.join('/');
        let backendUrl = `${apiUrl}/fichajestrabajadoresapi/vacaciones/${subPath}`;

        // Append query params if any (e.g. for ?anio=2025 in /dias)
        const { searchParams } = new URL(request.url);
        if (searchParams.toString()) {
            backendUrl += `?${searchParams.toString()}`;
        }

        console.log(`Proxying ${method} to:`, backendUrl);

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'DOLAPIKEY': apiKey
        };

        const fetchOptions: RequestInit = {
            method,
            headers,
        };

        if (method !== 'GET' && method !== 'HEAD') {
            const body = await request.text();
            if (body) {
                fetchOptions.body = body;
            }
        }

        const response = await fetch(backendUrl, fetchOptions);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Backend Proxy Error:', response.status, errorText);
            let errorMessage = 'Error en la petición a Dolibarr';
            try {
                const errorJson = JSON.parse(errorText);
                // Dolibarr's RestException can return error in different formats
                if (errorJson.error) {
                    if (typeof errorJson.error === 'string') {
                        errorMessage = errorJson.error;
                    } else if (errorJson.error.message) {
                        errorMessage = errorJson.error.message;
                    }
                } else if (errorJson.message) {
                    errorMessage = errorJson.message;
                }
            } catch (e) {
                // If not JSON, use the text as-is if it's not too long
                if (errorText.length < 200) {
                    errorMessage = errorText;
                }
            }

            return NextResponse.json(
                { error: errorMessage },
                { status: response.status }
            );
        }

        // Return JSON if content-type is json, else text or success
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            return NextResponse.json(data);
        } else {
            return NextResponse.json({ success: true, message: 'Operación completada' });
        }

    } catch (error: any) {
        console.error('API Vacations Proxy Error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor', details: error.message },
            { status: 500 }
        );
    }
}
