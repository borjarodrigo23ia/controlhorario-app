import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const PIN_PARAM = 'kiosk_admin_pin';
const ENABLED_PARAM = 'kiosk_enabled';

async function getCompanyId(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string): Promise<string | null> {
    const { data } = await supabase.from('profiles').select('company_id').eq('id', userId).single();
    return data?.company_id ?? null;
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const companyId = await getCompanyId(supabase, user.id);
        if (!companyId) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });

        const { data: configs } = await supabaseAdmin
            .from('config')
            .select('param_name, param_value')
            .eq('company_id', companyId)
            .in('param_name', [PIN_PARAM, ENABLED_PARAM]);

        const result: Record<string, string> = {};
        for (const c of configs || []) result[c.param_name] = c.param_value;

        return NextResponse.json({
            enabled: result[ENABLED_PARAM] === 'true',
            pin: result[PIN_PARAM] || '',
        });
    } catch (error: any) {
        return NextResponse.json({ enabled: false, pin: '' });
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

        const { enabled, pin } = await request.json();

        const toUpsert: any[] = [
            { company_id: profile.company_id, param_name: ENABLED_PARAM, param_value: String(enabled) },
        ];
        if (pin !== undefined) {
            toUpsert.push({ company_id: profile.company_id, param_name: PIN_PARAM, param_value: pin });
        }

        const { error } = await supabaseAdmin
            .from('config')
            .upsert(toUpsert, { onConflict: 'company_id,param_name' });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
