import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function PUT(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const { id } = params;
        const apiKey = request.headers.get('DOLAPIKEY');

        if (!apiKey) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { observaciones, comentario } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID de fichaje requerido' }, { status: 400 });
        }

        const apiUrl = process.env.NEXT_PUBLIC_DOLIBARR_API_URL;
        if (!apiUrl) throw new Error('Dolibarr API URL not configured');

        // Path matches common pattern in other fichajes API files
        const url = `${apiUrl}/fichajestrabajadoresapi/fichajes/${id}`;

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'DOLAPIKEY': apiKey,
            },
            body: JSON.stringify({
                observaciones,
                comentario: comentario || observaciones || 'Actualización de observaciones',
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[API] Error updating fichaje in Dolibarr:', errorData);
            return NextResponse.json(
                { error: errorData?.error?.message || 'Error al actualizar fichaje en backend' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('[API] Error updating fichaje:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor', details: error.message },
            { status: 500 }
        );
    }
}
