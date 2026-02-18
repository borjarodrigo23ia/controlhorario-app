import webPush from 'web-push';
import { getSubscriptionsForUser, getAllSubscriptions, PushSubscription } from '@/lib/push-db';

try {
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        console.warn('VAPID keys not configured');
    } else {
        webPush.setVapidDetails(
            process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
    }
} catch (error: any) {
    console.warn('VAPID configuration error. Push notifications will be disabled:', error.message);
}

export interface NotificationPayload {
    title: string;
    body: string;
    url?: string;
    icon?: string;
}

export async function sendPushNotification(userId: string, payload: NotificationPayload) {
    const subscriptions = await getSubscriptionsForUser(userId);

    if (subscriptions.length === 0) return { success: false, sent: 0 };

    let sentCount = 0;
    const errors = [];

    for (const sub of subscriptions) {
        try {
            await webPush.sendNotification(
                sub as any, // web-push types might differ slightly but structure matches
                JSON.stringify(payload)
            );
            sentCount++;
        } catch (error: any) {
            console.error('Error sending push:', error);
            if (error.statusCode === 410 || error.statusCode === 404) {
                // Subscription expired/gone - ideally remove from DB here
            }
            errors.push(error);
        }
    }

    return { success: true, sent: sentCount, total: subscriptions.length };
}

export async function sendPushNotificationToAdmin(payload: NotificationPayload) {
    const allSubs = await getAllSubscriptions();
    const adminSubs = allSubs.filter(s => s.isAdmin);

    if (adminSubs.length === 0) {
        console.warn("No admin subscriptions found to notify");
        return { success: false, sent: 0 };
    }

    let sentCount = 0;
    const errors = [];

    for (const record of adminSubs) {
        try {
            await webPush.sendNotification(
                record.subscription as any,
                JSON.stringify({
                    ...payload,
                    // Add distinctive icon or marker for admin notifications if desired
                })
            );
            sentCount++;
        } catch (error: any) {
            console.error(`Error sending push to admin ${record.userId}:`, error.message);
            errors.push(error);
        }
    }

    return { success: true, sent: sentCount, total: adminSubs.length };
}
