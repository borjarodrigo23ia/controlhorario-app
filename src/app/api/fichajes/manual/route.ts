import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// POST /api/fichajes/manual — Admin inserts a full work day manually
export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin, company_id')
            .eq('id', user.id)
            .single();

        if (!profile?.is_admin) {
            return NextResponse.json({ error: 'Solo los administradores pueden insertar jornadas manuales' }, { status: 403 });
        }

        const body = await request.json();
        const { target_user_id, hora_entrada, hora_salida, pausas, observaciones } = body;

        if (!target_user_id || !hora_entrada || !hora_salida) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        // Insert entrada
        const toInsert = [
            { company_id: profile.company_id, user_id: target_user_id, tipo: 'entrar', created_at: hora_entrada, observaciones: observaciones || null, estado_aceptacion: 'aceptado' },
            ...(pausas || []).flatMap((p: { inicio: string; fin: string }) => [
                { company_id: profile.company_id, user_id: target_user_id, tipo: 'iniciar_pausa', created_at: p.inicio, estado_aceptacion: 'aceptado' },
                { company_id: profile.company_id, user_id: target_user_id, tipo: 'terminar_pausa', created_at: p.fin, estado_aceptacion: 'aceptado' },
            ]),
            { company_id: profile.company_id, user_id: target_user_id, tipo: 'salir', created_at: hora_salida, estado_aceptacion: 'aceptado' },
        ];

        const { data: inserted, error } = await supabaseAdmin
            .from('fichajes')
            .insert(toInsert)
            .select('id, tipo, created_at');

        if (error) throw error;

        return NextResponse.json({ success: true, data: inserted });

    } catch (error: any) {
        console.error('[api/fichajes/manual] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
