import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const VALID_TIPOS = ['entrar', 'salir', 'iniciar_pausa', 'terminar_pausa'] as const;

export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const body = await request.json();
        const { tipo, observaciones, latitud, longitud, justification, location_warning, early_entry_warning } = body;

        if (!tipo || !VALID_TIPOS.includes(tipo)) {
            return NextResponse.json({ error: 'Tipo de fichaje inválido' }, { status: 400 });
        }

        // Get company_id from profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single();

        if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });

        // Insert the fichaje
        const { data: fichaje, error } = await supabase
            .from('fichajes')
            .insert({
                company_id: profile.company_id,
                user_id: user.id,
                tipo,
                observaciones: observaciones || null,
                latitud: latitud ? parseFloat(latitud) : null,
                longitud: longitud ? parseFloat(longitud) : null,
                location_warning: location_warning ? 1 : 0,
                early_entry_warning: early_entry_warning ? 1 : 0,
                justification: justification || null,
                estado_aceptacion: 'aceptado',
            })
            .select()
            .single();

        if (error) {
            console.error('[api/fichajes/registrar] Insert error:', error);
            throw error;
        }

        return NextResponse.json({
            success: true,
            data: {
                id: String(fichaje.id),
                tipo: fichaje.tipo,
                fecha_creacion: fichaje.created_at,
            }
        });

    } catch (error: any) {
        console.error('[api/fichajes/registrar] Error:', error);
        return NextResponse.json({ error: 'Error interno', details: error.message }, { status: 500 });
    }
}
