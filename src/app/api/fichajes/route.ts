import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const apiKey = request.headers.get('DOLAPIKEY');
        if (!apiKey) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const sortfield = searchParams.get('sortfield') || 'f.rowid';
        const sortorder = searchParams.get('sortorder') || 'DESC';
        const limit = searchParams.get('limit') || '1000';
        const page = searchParams.get('page') || '';
        const fkUser = searchParams.get('fk_user') || '';
        const dateStart = searchParams.get('date_start') || '';
        const dateEnd = searchParams.get('date_end') || '';

        // Construir la URL base
        let url = `/fichajestrabajadoresapi/fichajes?sortfield=${sortfield}&sortorder=${sortorder}&limit=${limit}`;
        if (page) url += `&page=${page}`;
        if (fkUser) url += `&fk_user=${fkUser}`;
        if (dateStart) url += `&date_start=${dateStart}`;
        if (dateEnd) url += `&date_end=${dateEnd}`;

        const apiUrl = process.env.NEXT_PUBLIC_DOLIBARR_API_URL;
        if (!apiUrl) throw new Error('Dolibarr API URL not configured');

        const response = await fetch(`${apiUrl}${url}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'DOLAPIKEY': apiKey
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Error al obtener fichajes de Dolibarr' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // El frontend espera { success: true, fichajes: [...] } pero Dolibarr devuelve array directo a veces
        // El hook de frontend ya maneja si devuelve array o objeto.
        // Sin embargo, el route original en frontend hacía mapping.
        // Vamos a replicar el mapping básico para ser compatibles.

        const fichajes = Array.isArray(data) ? data.map((fichaje: any) => ({
            ...fichaje,
            tiene_ubicacion: !!(fichaje.latitud && fichaje.longitud)
        })) : [];

        return NextResponse.json({ success: true, fichajes });

    } catch (error: any) {
        console.error('API Fichajes Error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor', details: error.message },
            { status: 500 }
        );
    }
}
