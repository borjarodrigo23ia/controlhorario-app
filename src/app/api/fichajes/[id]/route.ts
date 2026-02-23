import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/fichajes/[id] — Get a single fichaje
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { data: fichaje, error } = await supabase
            .from('fichajes')
            .select(`
                id, tipo, observaciones, latitud, longitud, estado_aceptacion,
                location_warning, early_entry_warning, justification,
                fecha_original, created_at, user_id,
                profiles!inner(username, firstname, lastname)
            `)
            .eq('id', id)
            .single();

        if (error || !fichaje) {
            return NextResponse.json({ error: 'Fichaje no encontrado' }, { status: 404 });
        }

        const f = fichaje as any;
        return NextResponse.json({
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
            justification: f.justification ?? '',
            fecha_original: f.fecha_original,
            fecha_creacion: f.created_at,
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/fichajes/[id] — Update a fichaje (admin)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

        if (!profile?.is_admin) {
            return NextResponse.json({ error: 'Solo administradores pueden editar fichajes' }, { status: 403 });
        }

        const body = await request.json();
        const { estado_aceptacion, observaciones, fecha_original } = body;

        const updateData: any = {};
        if (estado_aceptacion !== undefined) updateData.estado_aceptacion = estado_aceptacion;
        if (observaciones !== undefined) updateData.observaciones = observaciones;
        if (fecha_original !== undefined) updateData.fecha_original = fecha_original;

        const { data: updated, error } = await supabaseAdmin
            .from('fichajes')
            .update(updateData)
            .eq('id', id)
            .eq('company_id', profile.company_id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data: updated });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/fichajes/[id] — Delete a fichaje (admin)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

        if (!profile?.is_admin) {
            return NextResponse.json({ error: 'Solo administradores pueden eliminar fichajes' }, { status: 403 });
        }

        const { error } = await supabaseAdmin
            .from('fichajes')
            .delete()
            .eq('id', id)
            .eq('company_id', profile.company_id);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
