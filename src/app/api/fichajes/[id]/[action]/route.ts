import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// POST /api/fichajes/[id]/[action] — Approve or reject a fichaje
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; action: string }> }
) {
    try {
        const { id, action } = await params;
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin, company_id')
            .eq('id', user.id)
            .single();

        if (!profile?.is_admin) {
            return NextResponse.json({ error: 'Solo administradores pueden aprobar/rechazar fichajes' }, { status: 403 });
        }

        let newEstado: string;
        if (action === 'approve') {
            newEstado = 'aceptado';
        } else if (action === 'reject') {
            newEstado = 'rechazado';
        } else {
            return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
        }

        const body = await request.json().catch(() => ({}));

        const { data: updated, error } = await supabaseAdmin
            .from('fichajes')
            .update({
                estado_aceptacion: newEstado,
                ...(body.observaciones ? { observaciones: body.observaciones } : {}),
            })
            .eq('id', id)
            .eq('company_id', profile.company_id)
            .select()
            .single();

        if (error) throw error;

        // Log the change
        await supabaseAdmin.from('fichajes_log').insert({
            company_id: profile.company_id,
            fichaje_id: parseInt(id),
            editor_id: user.id,
            campo_modificado: 'estado_aceptacion',
            valor_anterior: 'pendiente',
            valor_nuevo: newEstado,
            comentario: body.comentario || `Fichaje ${action === 'approve' ? 'aprobado' : 'rechazado'} por administrador`,
        });

        return NextResponse.json({ success: true, data: updated });

    } catch (error: any) {
        console.error('[api/fichajes/[id]/[action]] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
