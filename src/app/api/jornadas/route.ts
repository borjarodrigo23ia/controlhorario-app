import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/jornadas — Get work shifts for a user
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
        if (!profile) return NextResponse.json([], { status: 200 });

        const userId = request.nextUrl.searchParams.get('user_id') || user.id;

        // Admin can fetch any user's shifts; employees only their own
        if (!profile.is_admin && userId !== user.id) {
            return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
        }

        const { data: jornadas, error } = await supabaseAdmin
            .from('jornadas_laborales')
            .select(`
                id, tipo_jornada, tipo_turno, hora_inicio_jornada, hora_fin_jornada,
                observaciones, active, user_id,
                jornadas_pausas(id, hora_inicio, hora_fin, descripcion, orden)
            `)
            .eq('user_id', userId)
            .eq('company_id', profile.company_id)
            .eq('active', true)
            .order('id', { ascending: true });

        if (error) throw error;

        // Map to frontend Shift shape
        const mapped = (jornadas || []).map((j: any) => ({
            id: j.id,
            fk_user: j.user_id,
            tipo_jornada: j.tipo_jornada,
            tipo_turno: j.tipo_turno,
            hora_inicio_jornada: j.hora_inicio_jornada,
            hora_fin_jornada: j.hora_fin_jornada,
            observaciones: j.observaciones,
            active: j.active ? 1 : 0,
            pausas: (j.jornadas_pausas || []).sort((a: any, b: any) => a.orden - b.orden).map((p: any) => ({
                id: p.id,
                hora_inicio: p.hora_inicio,
                hora_fin: p.hora_fin,
                descripcion: p.descripcion,
                orden: p.orden,
            })),
        }));

        return NextResponse.json(mapped);

    } catch (error: any) {
        console.error('[api/jornadas GET] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/jornadas — Create a new work shift (admin only)
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
        if (!profile?.is_admin) return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });

        const body = await request.json();
        const { fk_user, tipo_jornada, tipo_turno, hora_inicio_jornada, hora_fin_jornada, observaciones, pausas } = body;

        const { data: jornada, error: jornadaError } = await supabaseAdmin
            .from('jornadas_laborales')
            .insert({
                company_id: profile.company_id,
                user_id: fk_user,
                tipo_jornada,
                tipo_turno,
                hora_inicio_jornada,
                hora_fin_jornada,
                observaciones: observaciones || null,
                active: true,
            })
            .select()
            .single();

        if (jornadaError) throw jornadaError;

        // Insert pausas if provided
        if (pausas && Array.isArray(pausas) && pausas.length > 0) {
            await supabaseAdmin.from('jornadas_pausas').insert(
                pausas.map((p: any, idx: number) => ({
                    jornada_id: jornada.id,
                    hora_inicio: p.hora_inicio,
                    hora_fin: p.hora_fin,
                    descripcion: p.descripcion || null,
                    orden: p.orden ?? idx,
                }))
            );
        }

        return NextResponse.json({ success: true, data: { ...jornada, pausas: pausas || [] } });

    } catch (error: any) {
        console.error('[api/jornadas POST] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
