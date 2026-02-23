import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '1000');
        const fkUser = searchParams.get('fk_user') || '';
        const dateStart = searchParams.get('date_start') || '';
        const dateEnd = searchParams.get('date_end') || '';
        const sortorder = searchParams.get('sortorder') || 'DESC';

        // Get user's profile to check if admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin, company_id')
            .eq('id', user.id)
            .single();

        if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });

        // Use admin client so we can join profiles freely
        let query = supabaseAdmin
            .from('fichajes')
            .select(`
                id, tipo, observaciones, latitud, longitud, hash_integridad,
                estado_aceptacion, location_warning, early_entry_warning,
                justification, fecha_original, created_at, user_id, company_id,
                profiles!inner(username, firstname, lastname)
            `)
            .eq('company_id', profile.company_id)
            .order('created_at', { ascending: sortorder === 'ASC' })
            .limit(limit);

        // Filter by user (admins can see all, employees see own)
        if (fkUser) {
            query = query.eq('user_id', fkUser);
        } else if (!profile.is_admin) {
            query = query.eq('user_id', user.id);
        }

        if (dateStart) query = query.gte('created_at', dateStart);
        if (dateEnd) query = query.lte('created_at', dateEnd);

        const { data: rows, error } = await query;
        if (error) throw error;

        // Map to frontend-compatible shape (matches Dolibarr response format)
        const fichajes = (rows || []).map((f: any) => ({
            id: String(f.id),
            usuario: f.profiles?.username ?? f.user_id,
            usuario_nombre: f.profiles ? `${f.profiles.firstname ?? ''} ${f.profiles.lastname ?? ''}`.trim() : '',
            fk_user: f.user_id,
            tipo: f.tipo,
            observaciones: f.observaciones ?? '',
            comentario: f.observaciones ?? '',
            latitud: f.latitud ? String(f.latitud) : null,
            longitud: f.longitud ? String(f.longitud) : null,
            tiene_ubicacion: !!(f.latitud && f.longitud),
            hash_integridad: f.hash_integridad,
            estado_aceptacion: f.estado_aceptacion ?? 'aceptado',
            location_warning: f.location_warning ?? 0,
            early_entry_warning: f.early_entry_warning ?? 0,
            justification: f.justification ?? '',
            fecha_original: f.fecha_original,
            fecha_creacion: f.created_at,
        }));

        return NextResponse.json({ success: true, fichajes });

    } catch (error: any) {
        console.error('[api/fichajes GET] Error:', error);
        return NextResponse.json({ error: 'Error interno', details: error.message }, { status: 500 });
    }
}
