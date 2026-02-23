import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserPreferences, saveUserPreferences } from '@/lib/push-db';

export const dynamic = 'force-dynamic';

// GET /api/web-push/preferences — Get current user's push notification preferences
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // Allow querying another user's preferences (admin use case)
        const targetUserId = request.nextUrl.searchParams.get('userId') || user.id;

        if (targetUserId !== user.id) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single();
            if (!profile?.is_admin) {
                return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
            }
        }

        const prefs = await getUserPreferences(targetUserId);
        return NextResponse.json(prefs);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/web-push/preferences — Save push notification preferences
export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const body = await request.json();
        const targetUserId = body.userId || user.id;

        // Only allow setting own preferences (or admin)
        if (targetUserId !== user.id) {
            const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
            if (!profile?.is_admin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
        }

        const { fichajes, vacaciones, cambios } = body;
        const update = {
            ...(typeof fichajes === 'boolean' ? { fichajes } : {}),
            ...(typeof vacaciones === 'boolean' ? { vacaciones } : {}),
            ...(typeof cambios === 'boolean' ? { cambios } : {}),
        };

        await saveUserPreferences(targetUserId, update);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
