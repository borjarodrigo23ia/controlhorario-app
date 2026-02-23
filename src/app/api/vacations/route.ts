import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/vacations — List vacations
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const estado = searchParams.get('estado') || '';
        const targetUserId = searchParams.get('usuario') || '';

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin, company_id')
            .eq('id', user.id)
            .single();

        if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });

        let query = supabaseAdmin
            .from('vacaciones')
            .select(`
                id, fecha_inicio, fecha_fin, estado, comentarios,
                created_at, fecha_aprobacion, user_id, aprobado_por,
                profiles!user_id(username, firstname, lastname)
            `)
            .eq('company_id', profile.company_id)
            .order('created_at', { ascending: false });

        // If not admin, only see own vacations
        if (!profile.is_admin) {
            query = query.eq('user_id', user.id);
        } else if (targetUserId) {
            query = query.eq('user_id', targetUserId);
        }

        if (estado) query = query.eq('estado', estado);

        const { data: rows, error } = await query;
        if (error) throw error;

        const vacaciones = (rows || []).map((v: any) => ({
            id: String(v.id),
            usuario: v.profiles?.username ?? v.user_id,
            usuario_nombre: v.profiles ? `${v.profiles.firstname ?? ''} ${v.profiles.lastname ?? ''}`.trim() : '',
            fk_user: v.user_id,
            fecha_inicio: v.fecha_inicio,
            fecha_fin: v.fecha_fin,
            estado: v.estado,
            comentarios: v.comentarios,
            aprobado_por: v.aprobado_por,
            fecha_aprobacion: v.fecha_aprobacion,
            fecha_creacion: v.created_at,
        }));

        return NextResponse.json(vacaciones);

    } catch (error: any) {
        console.error('[api/vacations GET] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/vacations — Create a vacation request
export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const body = await request.json();
        const { fecha_inicio, fecha_fin, comentarios } = body;

        if (!fecha_inicio || !fecha_fin) {
            return NextResponse.json({ error: 'Fecha inicio y fin son obligatorias' }, { status: 400 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single();

        if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });

        const { data: vacacion, error } = await supabase
            .from('vacaciones')
            .insert({
                company_id: profile.company_id,
                user_id: user.id,
                fecha_inicio,
                fecha_fin,
                estado: 'pendiente',
                comentarios: comentarios || null,
            })
            .select()
            .single();

        if (error) throw error;

        // Notify admin via push
        try {
            const { sendPushNotificationToAdmin } = await import('@/lib/push-sender');
            await sendPushNotificationToAdmin({
                title: 'Nueva solicitud de vacaciones',
                body: 'Un usuario ha solicitado vacaciones.',
                url: '/admin/vacaciones',
            });
        } catch (pushErr) {
            console.error('[api/vacations POST] Push notification error:', pushErr);
        }

        return NextResponse.json({ success: true, id: String(vacacion.id) });

    } catch (error: any) {
        console.error('[api/vacations POST] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
