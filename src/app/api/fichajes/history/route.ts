import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/fichajes/history — Audit log for a fichaje
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const fichajeId = searchParams.get('id_fichaje') || '';
        const targetUserId = searchParams.get('id_user') || '';

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin, company_id')
            .eq('id', user.id)
            .single();

        if (!profile?.is_admin) {
            return NextResponse.json({ error: 'Acceso restringido a administradores' }, { status: 403 });
        }

        let query = supabaseAdmin
            .from('fichajes_log')
            .select(`
                id, campo_modificado, valor_anterior, valor_nuevo,
                comentario, ip_address, created_at, fichaje_id, jornada_id,
                profiles!editor_id(username, firstname, lastname)
            `)
            .eq('company_id', profile.company_id)
            .order('created_at', { ascending: false });

        if (fichajeId) query = query.eq('fichaje_id', fichajeId);

        const { data: logs, error } = await query;
        if (error) throw error;

        return NextResponse.json(logs || []);

    } catch (error: any) {
        console.error('[api/fichajes/history] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
