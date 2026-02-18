import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/push-sender';
import { getUsersForCron } from '@/lib/cron-helper';

// Cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret-key';

export const dynamic = 'force-dynamic'; // Ensure not cached

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    // Allow Bearer token OR ?key= query param for easier testing
    const queryKey = request.nextUrl.searchParams.get('key');

    const isAuthorized = (authHeader === `Bearer ${CRON_SECRET}`) || (queryKey === CRON_SECRET);

    if (!isAuthorized) {
        // Allow in dev without secret for testing if needed, but best to enforce
        if (process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const users = await getUsersForCron();
        const now = new Date();
        // Spain time (UTC+1/+2) handling - ideally use a library like date-fns-tz but for now simple offset
        // Vercel runs in UTC. We need to match user's shift time (likely local).
        // Let's assume shifts are stored in "HH:MM" local time.
        // We need current time in Spain.
        const spainTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
        const currentHH = spainTime.getHours().toString().padStart(2, '0');
        const currentMM = spainTime.getMinutes().toString().padStart(2, '0');
        const currentTimeString = `${currentHH}:${currentMM}`;

        // For testing/debugging, allow overriding time in URL ?mock_time=17:01
        const mockTime = request.nextUrl.searchParams.get('mock_time');
        const checkTime = mockTime || currentTimeString;

        const results = [];
        let notificationsSent = 0;

        console.log(`[Cron] Running reminder check at ${checkTime} (Spain Time)`);

        for (const user of users) {
            // Skip if no shift today or shift info missing
            if (!user.todayShift || !user.todayShift.end) continue;

            const shiftEnd = user.todayShift.end.substring(0, 5);

            // Check logic:
            // If checking time > shift end AND user is clocked in -> REMIND

            const [endH, endM] = shiftEnd.split(':').map(Number);
            const [nowH, nowM] = checkTime.split(':').map(Number);

            const endTotal = endH * 60 + endM;
            const nowTotal = nowH * 60 + nowM;

            const minutesPast = nowTotal - endTotal;

            // Trigger 1: 1-5 minutes after shift end (Immediate reminder)
            const isImmediate = minutesPast >= 1 && minutesPast <= 5;

            // Trigger 2: 10-15 minutes after shift end (Stronger reminder)
            const isLate = minutesPast >= 10 && minutesPast <= 15;

            // Debug log
            // console.log(`User ${user.name}: Shift End ${shiftEnd}, Now ${checkTime}, Diff ${minutesPast}m, ClockedIn: ${user.currentStatus?.isClockedIn}`);

            if ((isImmediate || isLate) && user.currentStatus?.isClockedIn) {
                // Send Notification
                const title = isLate ? '¡⚠️ Recordatorio Importante!' : '🕒 Fin de Jornada';
                const body = isLate
                    ? `Hace ${minutesPast} minutos que terminaste tu turno (${shiftEnd}) y sigues fichado. ¡Acuérdate de salir!`
                    : `Parece que tu jornada ha terminado (${shiftEnd}) pero no has fichado tu salida.`;

                try {
                    await sendPushNotification(user.id, {
                        title,
                        body,
                        url: '/fichajes'
                    });
                    notificationsSent++;
                    results.push({ user: user.name, status: 'Notified', reason: isLate ? 'Late' : 'Immediate' });
                } catch (e) {
                    console.error(`Failed to notify user ${user.id}`, e);
                    results.push({ user: user.name, status: 'Error', error: String(e) });
                }
            } else {
                if (user.currentStatus?.isClockedIn && minutesPast > 0) {
                    // Log skipped late users (outside triggers)
                    results.push({ user: user.name, status: 'Skipped', reason: 'Outside trigger window', minutesPast });
                }
            }
        }

        return NextResponse.json({
            success: true,
            checkTime,
            processed: users.length,
            notificationsSent,
            details: results
        });

    } catch (error: any) {
        console.error('Cron job error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
