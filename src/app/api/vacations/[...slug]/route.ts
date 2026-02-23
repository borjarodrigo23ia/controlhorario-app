import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type Props = {
    params: Promise<{ slug: string[] }>;
};

// This catch-all route handles:
//   GET    /api/vacations/[id]              -> get single vacation
//   POST   /api/vacations/[id]/approve      -> approve vacation
//   POST   /api/vacations/[id]/reject       -> reject vacation
//   GET    /api/vacations/dias?anio=YYYY    -> get vacation quota
//   PUT    /api/vacations/[id]              -> update vacation request
//   DELETE /api/vacations/[id]              -> delete vacation request

export async function GET(request: NextRequest, props: Props) {
    const { slug } = await props.params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, company_id')
        .eq('id', user.id)
        .single();
    if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });

    // GET /api/vacations/dias — Vacation quota
    if (slug[0] === 'dias') {
        const anio = new URL(request.url).searchParams.get('anio') || new Date().getFullYear().toString();
        const targetUserId = new URL(request.url).searchParams.get('fk_user') || user.id;

        const { data, error } = await supabaseAdmin
            .from('vacaciones_dias')
            .select('dias, anio')
            .eq('user_id', targetUserId)
            .eq('anio', parseInt(anio))
            .single();

        if (error || !data) {
            return NextResponse.json({ dias: 0, anio: parseInt(anio) });
        }
        return NextResponse.json(data);
    }

    // GET /api/vacations/[id] — Single vacation
    const id = slug[0];
    let query = supabaseAdmin
        .from('vacaciones')
        .select(`id, fecha_inicio, fecha_fin, estado, comentarios, created_at,
            user_id, profiles!user_id(username, firstname, lastname)`)
        .eq('id', id)
        .eq('company_id', profile.company_id);

    if (!profile.is_admin) query = query.eq('user_id', user.id);

    const { data, error } = await query.single();
    if (error || !data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    const v = data as any;
    return NextResponse.json({
        id: String(v.id),
        fk_user: v.user_id,
        usuario: v.profiles?.username,
        usuario_nombre: v.profiles ? `${v.profiles.firstname ?? ''} ${v.profiles.lastname ?? ''}`.trim() : '',
        fecha_inicio: v.fecha_inicio,
        fecha_fin: v.fecha_fin,
        estado: v.estado,
        comentarios: v.comentarios,
        fecha_creacion: v.created_at,
    });
}

export async function POST(request: NextRequest, props: Props) {
    const { slug } = await props.params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, company_id')
        .eq('id', user.id)
        .single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });

    const id = slug[0];
    const action = slug[1]; // 'approve' or 'reject'
    const body = await request.json().catch(() => ({}));

    if (!['approve', 'reject', 'aprobar', 'rechazar'].includes(action)) {
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    const isApproval = ['approve', 'aprobar'].includes(action);
    const newEstado = isApproval ? 'aprobado' : 'rechazado';

    const { data: updated, error } = await supabaseAdmin
        .from('vacaciones')
        .update({
            estado: newEstado,
            aprobado_por: user.id,
            fecha_aprobacion: new Date().toISOString(),
            ...(body.comentarios ? { comentarios: body.comentarios } : {}),
        })
        .eq('id', id)
        .eq('company_id', profile.company_id)
        .select('user_id')
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notify the vacation requester
    try {
        const { sendPushNotification } = await import('@/lib/push-sender');
        const { getUserPreferences } = await import('@/lib/push-db');
        const prefs = await getUserPreferences(updated.user_id);
        if (prefs.vacaciones) {
            await sendPushNotification(updated.user_id, {
                title: `Vacaciones ${isApproval ? 'aprobadas' : 'rechazadas'}`,
                body: `Tu solicitud de vacaciones ha sido ${newEstado}.`,
                url: '/vacations',
            });
        }
    } catch (err) {
        console.error('[vacations/approve|reject] Push error:', err);
    }

    return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, props: Props) {
    const { slug } = await props.params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const id = slug[0];

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, company_id')
        .eq('id', user.id)
        .single();
    if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    let query = supabaseAdmin
        .from('vacaciones')
        .delete()
        .eq('id', id)
        .eq('company_id', profile.company_id);

    if (!profile.is_admin) query = query.eq('user_id', user.id);

    const { error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
