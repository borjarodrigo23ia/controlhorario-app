import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { pin } = body;

        if (!pin || pin.length !== 4) {
            return NextResponse.json({ error: 'PIN inválido' }, { status: 400 });
        }

        const apiUrl = process.env.NEXT_PUBLIC_DOLIBARR_API_URL;
        const masterApiKey = process.env.DOLIBARR_API_KEY; // We'll need a master key for kiosk actions

        if (!masterApiKey) {
            return NextResponse.json({ error: 'Configuración del servidor incompleta (Master API Key missing)' }, { status: 500 });
        }

        // 1. Find user by PIN in llx_fichajestrabajadores_user_config
        // This requires a custom endpoint in our Dolibarr API or a direct query if possible.
        // For now, we assume we have an endpoint /fichajestrabajadoresapi/userByPin
        const userRes = await fetch(`${apiUrl}/fichajestrabajadoresapi/userByPin?pin=${pin}`, {
            headers: { 'DOLAPIKEY': masterApiKey }
        });

        if (!userRes.ok) {
            return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 });
        }

        const userData = await userRes.json();
        const { rowid, login, api_key } = userData;

        // 2. Perform clock action
        // We reuse the logic from registrar/route.ts but with the discovered user
        const { tipo, latitud, longitud, observaciones } = body;

        let endpoint = '';
        switch (tipo) {
            case 'entrar': endpoint = '/fichajestrabajadoresapi/registrarEntrada'; break;
            case 'salir': endpoint = '/fichajestrabajadoresapi/registrarSalida'; break;
            case 'iniciar_pausa': endpoint = '/fichajestrabajadoresapi/iniciarPausa'; break;
            case 'terminar_pausa': endpoint = '/fichajestrabajadoresapi/terminarPausa'; break;
            default: endpoint = '/fichajestrabajadoresapi/autoClock'; // A generic endpoint that toggles state
        }

        const clockRes = await fetch(`${apiUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'DOLAPIKEY': api_key || masterApiKey
            },
            body: JSON.stringify({
                request_data: {
                    usuario: login,
                    observaciones: observaciones || 'Fichaje desde Quiosco'
                },
                latitud,
                longitud
            })
        });

        if (!clockRes.ok) {
            const errorData = await clockRes.json();
            return NextResponse.json(errorData, { status: clockRes.status });
        }

        const result = await clockRes.json();
        return NextResponse.json({
            success: true,
            message: `¡Hola ${userData.firstname || login}! Fichaje registrado.`,
            data: result
        });

    } catch (error: any) {
        console.error('Kiosk Clock Error:', error);
        return NextResponse.json({ error: 'Error del sistema' }, { status: 500 });
    }
}
