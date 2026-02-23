import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/fichajes/pending — Fichajes pending admin approval
export async function GET(request: NextRequest) {
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
            return NextResponse.json({ error: 'Acceso restringido a administradores' }, { status: 403 });
        }

        const { data: rows, error } = await supabaseAdmin
            .from('fichajes')
            .select(`
                id, tipo, observaciones, latitud, longitud, estado_aceptacion,
                location_warning, early_entry_warning, justification,
                fecha_original, created_at, user_id,
                profiles!inner(username, firstname, lastname)
            `)
            .eq('company_id', profile.company_id)
            .eq('estado_aceptacion', 'pendiente')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const fichajes = (rows || []).map((f: any) => ({
            id: String(f.id),
            usuario: f.profiles?.username ?? f.user_id,
            usuario_nombre: f.profiles ? `${f.profiles.firstname ?? ''} ${f.profiles.lastname ?? ''}`.trim() : '',
            fk_user: f.user_id,
            tipo: f.tipo,
            observaciones: f.observaciones ?? '',
            latitud: f.latitud ? String(f.latitud) : null,
            longitud: f.longitud ? String(f.longitud) : null,
            estado_aceptacion: f.estado_aceptacion,
            location_warning: f.location_warning ?? 0,
            early_entry_warning: f.early_entry_warning ?? 0,
            justification: f.justification ?? '',
            fecha_original: f.fecha_original,
            fecha_creacion: f.created_at,
        }));

        return NextResponse.json({ success: true, fichajes });

    } catch (error: any) {
        console.error('[api/fichajes/pending] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
