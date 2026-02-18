import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Props = {
    params: Promise<{ slug: string[] }>
};

export async function GET(request: NextRequest, props: Props) {
    const params = await props.params;
    return handleRequest(request, params, 'GET');
}

export async function POST(request: NextRequest, props: Props) {
    const params = await props.params;
    return handleRequest(request, params, 'POST');
}

export async function DELETE(request: NextRequest, props: Props) {
    const params = await props.params;
    return handleRequest(request, params, 'DELETE');
}

async function handleRequest(request: NextRequest, params: { slug: string[] }, method: string) {
    try {
        const apiKey = request.headers.get('DOLAPIKEY');
        if (!apiKey) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const apiUrl = process.env.NEXT_PUBLIC_DOLIBARR_API_URL;
        if (!apiUrl) throw new Error('Dolibarr API URL not configured');

        // Reconstruct path: /api/vacations/[...slug] -> /fichajestrabajadoresapi/vacaciones/[...slug]
        const subPath = params.slug.join('/');
        let backendUrl = `${apiUrl}/fichajestrabajadoresapi/vacaciones/${subPath}`;

        // Append query params if any (e.g. for ?anio=2025 in /dias)
        const { searchParams } = new URL(request.url);
        if (searchParams.toString()) {
            backendUrl += `?${searchParams.toString()}`;
        }

        console.log(`Proxying ${method} to:`, backendUrl);

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'DOLAPIKEY': apiKey
        };

        const fetchOptions: RequestInit = {
            method,
            headers,
        };

        if (method !== 'GET' && method !== 'HEAD') {
            const body = await request.text();
            if (body) {
                fetchOptions.body = body;
            }
        }

        const response = await fetch(backendUrl, fetchOptions);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Backend Proxy Error:', response.status, errorText);
            let errorMessage = 'Error en la petición a Dolibarr';
            try {
                const errorJson = JSON.parse(errorText);
                // Dolibarr's RestException can return error in different formats
                if (errorJson.error) {
                    if (typeof errorJson.error === 'string') {
                        errorMessage = errorJson.error;
                    } else if (errorJson.error.message) {
                        errorMessage = errorJson.error.message;
                    }
                } else if (errorJson.message) {
                    errorMessage = errorJson.message;
                }
            } catch (e) {
                // If not JSON, use the text as-is if it's not too long
                if (errorText.length < 200) {
                    errorMessage = errorText;
                }
            }

            return NextResponse.json(
                { error: errorMessage },
                { status: response.status }
            );
        }

        // Return JSON if content-type is json, else text or success
        const contentType = response.headers.get('content-type');
        let responseData: any = { success: true, message: 'Operación completada' };

        if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
        }

        // --- Post-Success Notification Logic ---
        if (response.ok && method === 'POST') {
            const lastSegment = params.slug[params.slug.length - 1];

            // CASE 1: Creation (crear) -> Notify Admin
            if (lastSegment === 'crear') {
                try {
                    const { sendPushNotificationToAdmin } = await import('@/lib/push-sender');
                    const debugResult = await sendPushNotificationToAdmin({
                        title: 'Nueva solicitud de vacaciones',
                        body: `Un usuario ha solicitado vacaciones.`,
                        url: '/admin/vacaciones'
                    });
                    responseData.notificationDebug = debugResult;
                } catch (err: any) {
                    console.error('Error sending admin notification for vacation:', err);
                    responseData.notificationDebug = { error: err.message };
                }
            }
            // CASE 2: Approval/Rejection -> Notify User
            else if (lastSegment === 'approve' || lastSegment === 'reject') {
                const vacationId = params.slug[params.slug.length - 2];
                // Run async without blocking response
                try {
                    const { sendPushNotification } = await import('@/lib/push-sender');
                    const { getUserPreferences } = await import('@/lib/push-db');

                    // Fetch details to find user
                    const detailsUrl = `${apiUrl}/fichajestrabajadoresapi/vacaciones/${vacationId}`;
                    const detailsRes = await fetch(detailsUrl, { headers: { 'DOLAPIKEY': apiKey } });
                    if (detailsRes.ok) {
                        const details = await detailsRes.json();
                        const userId = details.fk_user;

                        if (userId) {
                            const prefs = await getUserPreferences(userId);
                            if (prefs.vacaciones) {
                                const action = lastSegment === 'approve' ? 'Aprobada' : 'Rechazada';
                                const debugResult = await sendPushNotification(userId, {
                                    title: `Vacaciones ${action}`,
                                    body: `Tu solicitud de vacaciones ha sido ${action.toLowerCase()}.`,
                                    url: '/vacaciones' // Or history
                                });
                                responseData.debug_notification = debugResult;
                            } else {
                                responseData.debug_notification = { skipped: true, reason: 'User disabled vacation notifications' };
                            }
                        } else {
                            responseData.debug_notification = { error: 'User ID not found in vacation details' };
                        }
                    } else {
                        responseData.debug_notification = { error: 'Failed to fetch vacation details', status: detailsRes.status };
                    }
                } catch (bgError: any) {
                    console.error('Background notification error:', bgError);
                    responseData.debug_notification = { error: bgError.message };
                }

            }
        }

        return NextResponse.json(responseData);

    } catch (error: any) {
        console.error('API Vacations Proxy Error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor', details: error.message },
            { status: 500 }
        );
    }
}
