import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

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
        const { label, latitude, longitude, radius } = body;

        const updateData: any = {};
        if (label !== undefined) updateData.label = label;
        if (latitude !== undefined) updateData.latitude = parseFloat(latitude);
        if (longitude !== undefined) updateData.longitude = parseFloat(longitude);
        if (radius !== undefined) updateData.radius = parseInt(radius);

        const { data, error } = await supabaseAdmin
            .from('centers')
            .update(updateData)
            .eq('id', id)
            .eq('company_id', profile.company_id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

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

        const { error } = await supabaseAdmin
            .from('centers')
            .delete()
            .eq('id', id)
            .eq('company_id', profile.company_id);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
