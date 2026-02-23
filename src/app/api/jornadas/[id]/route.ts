import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin, company_id')
            .eq('id', user.id)
            .single();
        if (!profile?.is_admin) return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });

        // Also delete related pausas (cascade should handle this via DB, but just in case)
        await supabaseAdmin.from('jornadas_pausas').delete().eq('jornada_id', parseInt(id));

        const { error } = await supabaseAdmin
            .from('jornadas_laborales')
            .delete()
            .eq('id', id)
            .eq('company_id', profile.company_id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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
        const { tipo_jornada, tipo_turno, hora_inicio_jornada, hora_fin_jornada, observaciones, pausas } = body;

        const { data: updated, error } = await supabaseAdmin
            .from('jornadas_laborales')
            .update({
                tipo_jornada,
                tipo_turno,
                hora_inicio_jornada,
                hora_fin_jornada,
                observaciones: observaciones || null,
            })
            .eq('id', id)
            .eq('company_id', profile.company_id)
            .select()
            .single();

        if (error) throw error;

        // Replace pausas if provided
        if (pausas !== undefined) {
            await supabaseAdmin.from('jornadas_pausas').delete().eq('jornada_id', parseInt(id));
            if (Array.isArray(pausas) && pausas.length > 0) {
                await supabaseAdmin.from('jornadas_pausas').insert(
                    pausas.map((p: any, idx: number) => ({
                        jornada_id: parseInt(id),
                        hora_inicio: p.hora_inicio,
                        hora_fin: p.hora_fin,
                        descripcion: p.descripcion || null,
                        orden: p.orden ?? idx,
                    }))
                );
            }
        }

        return NextResponse.json({ success: true, data: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
