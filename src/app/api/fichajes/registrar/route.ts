import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const apiKey = request.headers.get('DOLAPIKEY');
        if (!apiKey) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        /* 
           Support 'usuario' (standard) or 'username' (fallback).
           The client (ManualFichajeModal / useFichajes) should send 'usuario'.
        */
        const usuario = body.usuario || body.username;
        const { tipo, observaciones, latitud, longitud } = body;

        const apiUrl = process.env.NEXT_PUBLIC_DOLIBARR_API_URL;
        if (!apiUrl) throw new Error('Dolibarr API URL not configured');

        let endpoint = '';

        // Build request body - Note: Dolibarr expects latitud/longitud at TOP level,
        // NOT inside request_data. Only usuario and observaciones go inside request_data.
        const requestData: any = {
            request_data: {
                usuario: usuario,
                observaciones: observaciones || ''
            }
        };

        // Add coordinates at TOP LEVEL (Dolibarr ignores them if nested in request_data)
        if (latitud && longitud) {
            requestData.latitud = latitud;
            requestData.longitud = longitud;
        }

        // Add justification and location_warning at TOP LEVEL
        if (body.justification) {
            requestData.justification = body.justification;
        }
        if (body.location_warning !== undefined) {
            requestData.location_warning = body.location_warning ? 1 : 0;
        }

        switch (tipo) {
            case 'entrar': endpoint = '/fichajestrabajadoresapi/registrarEntrada'; break;
            case 'salir': endpoint = '/fichajestrabajadoresapi/registrarSalida'; break;
            case 'iniciar_pausa': endpoint = '/fichajestrabajadoresapi/iniciarPausa'; break;
            case 'terminar_pausa': endpoint = '/fichajestrabajadoresapi/terminarPausa'; break;
            default: return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
        }

        const response = await fetch(`${apiUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'DOLAPIKEY': apiKey
            },
            body: JSON.stringify(requestData)
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('API Registrar Fichaje Error:', error);
        return NextResponse.json(
            { error: 'Error interno', details: error.message },
            { status: 500 }
        );
    }
}
