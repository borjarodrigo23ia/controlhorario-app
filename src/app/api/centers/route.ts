import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/centers — List all centers for the company (accessible during registration too)
export async function GET(request: NextRequest) {
    try {
        // During registration, user may not be logged in yet
        // So we check for auth but don't require it — we use admin client
        let companyId: string | null = null;

        try {
            const supabase = await createServerSupabaseClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('company_id')
                    .eq('id', user.id)
                    .single();
                companyId = profile?.company_id ?? null;
            }
        } catch { /* unauthenticated — OK for registration */ }

        // If no company from user, get first company (single-tenant for now)
        if (!companyId) {
            const { data: company } = await supabaseAdmin
                .from('companies')
                .select('id')
                .limit(1)
                .single();
            companyId = company?.id ?? null;
        }

        if (!companyId) return NextResponse.json([]);

        const { data: centers, error } = await supabaseAdmin
            .from('centers')
            .select('id, label, latitude, longitude, radius')
            .eq('company_id', companyId)
            .order('label', { ascending: true });

        if (error) throw error;

        // Map to frontend-compatible shape (old Dolibarr used rowid)
        const mapped = (centers || []).map((c: any) => ({
            rowid: c.id,
            id: c.id,
            label: c.label,
            latitude: c.latitude,
            longitude: c.longitude,
            radius: c.radius,
        }));

        return NextResponse.json(mapped);

    } catch (error: any) {
        console.error('[api/centers GET] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/centers — Create a new center (admin only)
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
        const { label, latitude, longitude, radius } = body;

        if (!label || latitude === undefined || longitude === undefined) {
            return NextResponse.json({ error: 'Faltan campos: label, latitude, longitude' }, { status: 400 });
        }

        const { data: center, error } = await supabaseAdmin
            .from('centers')
            .insert({
                company_id: profile.company_id,
                label,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                radius: radius ? parseInt(radius) : 100,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data: { ...center, rowid: center.id } });

    } catch (error: any) {
        console.error('[api/centers POST] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
