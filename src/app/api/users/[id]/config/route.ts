import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/users/[id]/config
export async function GET(
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

        if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!profile.is_admin && user.id !== id) {
            return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
        }

        const { data: configs, error } = await supabaseAdmin
            .from('user_config')
            .select('param_name, param_value')
            .eq('user_id', id);

        if (error) throw error;

        // Return as a key-value object
        const result: Record<string, string> = {};
        for (const c of configs || []) {
            result[c.param_name] = c.param_value;
        }

        return NextResponse.json(result);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/users/[id]/config — Upsert a config value
export async function POST(
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

        if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!profile.is_admin && user.id !== id) {
            return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
        }

        const body = await request.json();
        // Accept { param_name, value } or a key-value object to bulk upsert
        const entries: Array<{ param_name: string; param_value: string }> = [];

        if (body.param_name !== undefined) {
            entries.push({ param_name: body.param_name, param_value: String(body.value ?? '') });
        } else {
            // Bulk: { key1: value1, key2: value2, ... }
            for (const [key, val] of Object.entries(body)) {
                entries.push({ param_name: key, param_value: String(val) });
            }
        }

        const toUpsert = entries.map(e => ({
            company_id: profile.company_id,
            user_id: id,
            param_name: e.param_name,
            param_value: e.param_value,
        }));

        const { error } = await supabaseAdmin
            .from('user_config')
            .upsert(toUpsert, { onConflict: 'user_id,param_name' });

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
