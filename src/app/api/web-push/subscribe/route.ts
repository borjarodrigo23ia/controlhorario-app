import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { saveSubscription, getSubscriptionsForUser } from '@/lib/push-db';

export const dynamic = 'force-dynamic';

// GET /api/web-push/subscribe?userId=xxx — List user subscriptions
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const targetUserId = request.nextUrl.searchParams.get('userId') || user.id;

        // Only admins can see other users' subscriptions
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

        const subs = await getSubscriptionsForUser(targetUserId);
        return NextResponse.json(subs);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/web-push/subscribe — Register a push subscription
export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const subscription = await request.json();

        if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
            return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
        }

        // Check admin status from profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();
        const isAdmin = profile?.is_admin ?? false;

        await saveSubscription(
            user.id,
            subscription,
            isAdmin,
            request.headers.get('user-agent') || 'unknown'
        );

        return NextResponse.json({ success: true, isAdmin });
    } catch (error: any) {
        console.error('[web-push/subscribe] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
