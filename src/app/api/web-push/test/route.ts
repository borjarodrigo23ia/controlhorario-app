import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/push-sender';

export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('X-User-Id');

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await sendPushNotification(userId, {
            title: '¡Funciona! 🎉',
            body: 'Esta es una notificación de prueba de tu sistema de fichajes.',
            url: '/usuario'
        });

        if (result.sent > 0) {
            return NextResponse.json({ success: true, sent: result.sent });
        } else {
            return NextResponse.json({
                error: 'No se enviaron notificaciones. Asegúrate de estar suscrito en este dispositivo.',
                details: result
            }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Error in test push API:', error);
        return NextResponse.json({
            error: 'Error interno en el servidor al enviar la prueba',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
