import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const PARAM_NAME = 'region_ccaa';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ region: 'ES' });

        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
        if (!profile) return NextResponse.json({ region: 'ES' });

        const { data: config } = await supabaseAdmin
            .from('config')
            .select('param_value')
            .eq('company_id', profile.company_id)
            .eq('param_name', PARAM_NAME)
            .single();

        return NextResponse.json({ region: config?.param_value || 'ES' });
    } catch {
        return NextResponse.json({ region: 'ES' });
    }
}

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

        const { region } = await request.json();
        if (!region) return NextResponse.json({ error: 'Region required' }, { status: 400 });

        const { error } = await supabaseAdmin
            .from('config')
            .upsert(
                { company_id: profile.company_id, param_name: PARAM_NAME, param_value: region },
                { onConflict: 'company_id,param_name' }
            );

        if (error) throw error;

        return NextResponse.json({ success: true, region });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
