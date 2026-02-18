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

        if (!apiKey || !userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const subscription = await request.json();

        // Validate subscription object
        if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
            return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
        }

        // --- Verify Admin Status ---
        // We fetch user info to avoid trusting the client for the "isAdmin" flag
        let isAdmin = false;
        try {
            const apiUrl = process.env.NEXT_PUBLIC_DOLIBARR_API_URL;
            const infoRes = await fetch(`${apiUrl}/fichajestrabajadoresapi/info`, {
                headers: { 'DOLAPIKEY': apiKey }
            });
            if (infoRes.ok) {
                const userData = await infoRes.json();
                isAdmin = userData.admin === '1' || userData.admin === true;
            }
        } catch (infoErr) {
            console.error('Error verifying admin status for push subscription:', infoErr);
            // Default to false if check fails
        }

        saveSubscription(userId, subscription, isAdmin, request.headers.get('user-agent') || 'unknown');

        return NextResponse.json({ success: true, isAdmin });
    } catch (error) {
        console.error('Error saving subscription:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
