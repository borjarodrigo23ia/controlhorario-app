import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const apiKey = request.headers.get('DOLAPIKEY');
    if (!apiKey) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    console.log('[Approve] Approving correction ID:', params.id);

    const apiUrl = process.env.NEXT_PUBLIC_DOLIBARR_API_URL;

    // 1. Fetch correction details to get the user ID
    let userId = '';
    try {
        const detailsRes = await fetch(`${apiUrl}/fichajestrabajadoresapi/corrections?id=${params.id}`, {
            headers: { 'DOLAPIKEY': apiKey }
        });
        if (detailsRes.ok) {
            const details = await detailsRes.json();
            // Assuming details handles array or single object. API usually returns array for list/search
            if (Array.isArray(details) && details.length > 0) userId = details[0].fk_user;
            else if (details.fk_user) userId = details.fk_user;
        }
    } catch (e) {
        console.error('Error fetching correction details for notification:', e);
    }

    // 2. Read admin note from request body
    const body = await request.json().catch(() => ({}));
    const adminNote = body.note || '';

    // 3. Perform Approval (with admin_note)
    const res = await fetch(`${apiUrl}/fichajestrabajadoresapi/corrections/${params.id}/approve`, {
        method: 'POST',
        headers: { 'DOLAPIKEY': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_note: adminNote })
    });

    const data = await res.json().catch(() => ({ error: 'Invalid JSON response' }));
    console.log('[Approve] Dolibarr response:', res.status, data);

    if (!res.ok) return NextResponse.json(data, { status: res.status });

    // 4. Send Notification if we have userId (non-blocking, don't crash on failure)
    if (userId) {
        try {
            const { sendPushNotification } = await import('@/lib/push-sender');
            const { getUserPreferences } = await import('@/lib/push-db');

            const prefs = getUserPreferences(userId);
            if (prefs.cambios) {
                await sendPushNotification(userId, {
                    title: 'Solicitud Aprobada',
                    body: 'Tu solicitud de corrección de fichaje ha sido aprobada.',
                    url: '/gestion/solicitudes'
                });
            }
        } catch (e) {
            console.warn('[Approve] Push notification failed (non-blocking):', e);
        }
    }

    return NextResponse.json(data);
}
