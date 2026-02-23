import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/corrections
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const estado = searchParams.get('estado') || '';

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin, company_id')
            .eq('id', user.id)
            .single();

        if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });

        let query = supabaseAdmin
            .from('corrections')
            .select(`
                id, fecha_jornada, hora_entrada, hora_salida, pausas,
                observaciones, estado, admin_note, created_at, updated_at,
                user_id, approver_id,
                profiles!user_id(username, firstname, lastname)
            `)
            .eq('company_id', profile.company_id)
            .order('created_at', { ascending: false });

        if (!profile.is_admin) {
            query = query.eq('user_id', user.id);
        }
        if (estado) query = query.eq('estado', estado);

        const { data: rows, error } = await query;
        if (error) throw error;

        const corrections = (rows || []).map((c: any) => ({
            id: String(c.id),
            usuario: c.profiles?.username ?? c.user_id,
            usuario_nombre: c.profiles ? `${c.profiles.firstname ?? ''} ${c.profiles.lastname ?? ''}`.trim() : '',
            fk_user: c.user_id,
            fecha_jornada: c.fecha_jornada,
            hora_entrada: c.hora_entrada,
            hora_salida: c.hora_salida,
            pausas: c.pausas,
            observaciones: c.observaciones,
            estado: c.estado,
            admin_note: c.admin_note,
            created_at: c.created_at,
        }));

        return NextResponse.json(corrections);

    } catch (error: any) {
        console.error('[api/corrections GET] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/corrections
export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const body = await request.json();
        const { fecha_jornada, hora_entrada, hora_salida, pausas, observaciones } = body;

        if (!fecha_jornada) {
            return NextResponse.json({ error: 'fecha_jornada es obligatoria' }, { status: 400 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single();

        if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });

        const { data: correction, error } = await supabase
            .from('corrections')
            .insert({
                company_id: profile.company_id,
                user_id: user.id,
                fecha_jornada,
                hora_entrada: hora_entrada || null,
                hora_salida: hora_salida || null,
                pausas: pausas || null,
                observaciones: observaciones || null,
                estado: 'pendiente',
            })
            .select()
            .single();

        if (error) throw error;

        // Notify admin
        (async () => {
            try {
                const { sendPushNotificationToAdmin } = await import('@/lib/push-sender');
                await sendPushNotificationToAdmin({
                    title: 'Nueva solicitud de corrección',
                    body: 'Un usuario ha solicitado corregir un fichaje.',
                    url: '/admin/corrections',
                });
            } catch (err) {
                console.error('[api/corrections POST] Push error:', err);
            }
        })();

        return NextResponse.json({ success: true, id: String(correction.id) });

    } catch (error: any) {
        console.error('[api/corrections POST] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
