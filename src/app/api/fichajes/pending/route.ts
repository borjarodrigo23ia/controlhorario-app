import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const apiKey = request.headers.get('DOLAPIKEY');
        if (!apiKey) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const apiUrl = process.env.NEXT_PUBLIC_DOLIBARR_API_URL;

        // Fetch fichajes with estado_aceptacion = 'pendiente' for the current user.
        // These are ADMIN-made changes that need employee validation.
        // NOT correction requests (those live in the corrections table).
        const response = await fetch(`${apiUrl}/fichajestrabajadoresapi/fichajes/pending`, {
            headers: { 'DOLAPIKEY': apiKey },
            cache: 'no-store'
        });

        if (!response.ok) {
            // If 404 or similar, just return empty array (no pending changes)
            if (response.status === 404) {
                return NextResponse.json([]);
            }
            return NextResponse.json({ error: 'Error al obtener cambios pendientes' }, { status: response.status });
        }

        const data = await response.json();

        // Map to the format expected by AdminChangeRequestModal
        // Each item is a fichaje record from fichajestrabajadores table
        const pending = Array.isArray(data) ? data.map((item: any) => ({
            id: item.rowid,
            tipo: item.tipo === 'entrar' ? 'entrada' : item.tipo === 'salir' ? 'salida' : item.tipo,
            // fecha_creacion is the actual timestamp of the fichaje (the proposed time by admin)
            fecha_creacion_iso: item.fecha_creacion,
            // We don't have the "previous" time easily — the soft-deleted record has it
            // but for now show what was set
            fecha_anterior_iso: null,
            observaciones: item.observaciones || 'Modificación por administrador',
            usuario_nombre: item.usuario
        })) : [];

        return NextResponse.json(pending);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
