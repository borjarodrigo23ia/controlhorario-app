import { NextRequest, NextResponse } from 'next/server';
import { saveSubscription, getSubscriptionsForUser } from '@/lib/push-db';

export async function GET(request: NextRequest) {
    const apiKey = request.headers.get('DOLAPIKEY');
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!apiKey || !userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subs = getSubscriptionsForUser(userId);
    return NextResponse.json(subs);
}

export async function POST(request: NextRequest) {
    try {
        const apiKey = request.headers.get('DOLAPIKEY');
        const userId = request.headers.get('X-User-Id');

        console.log('[API/Subscribe] Registration request received for user:', userId);

        if (!apiKey || !userId) {
            console.error('[API/Subscribe] Missing credentials');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const subscription = await request.json();
        console.log('[API/Subscribe] Subscription payload:', JSON.stringify(subscription).substring(0, 100) + '...');

        // Validate subscription object
        if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
            console.error('[API/Subscribe] Invalid subscription object');
            return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
        }

        // --- Verify Admin Status ---
        let isAdmin = false;
        try {
            const apiUrl = process.env.NEXT_PUBLIC_DOLIBARR_API_URL;
            console.log('[API/Subscribe] Verifying admin status at:', apiUrl);
            const infoRes = await fetch(`${apiUrl}/fichajestrabajadoresapi/info`, {
                headers: { 'DOLAPIKEY': apiKey }
            });
            if (infoRes.ok) {
                const userData = await infoRes.json();
                isAdmin = userData.admin === '1' || userData.admin === true;
                console.log('[API/Subscribe] Admin verify success. isAdmin:', isAdmin);
            } else {
                console.warn('[API/Subscribe] Info check returned status:', infoRes.status);
            }
        } catch (infoErr: any) {
            console.error('[API/Subscribe] Error verifying admin status:', infoErr.message);
        }

        saveSubscription(userId, subscription, isAdmin, request.headers.get('user-agent') || 'unknown');
        console.log('[API/Subscribe] Subscription saved successfully');

        return NextResponse.json({ success: true, isAdmin });
    } catch (error: any) {
        console.error('[API/Subscribe] Exception in POST handler:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
