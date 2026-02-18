'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';

interface PushSubscription {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
    ]);
}

export default function PushNotificationManager() {
    const { user } = useAuth();
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');


    const checkSubscription = useCallback(async () => {
        if (!user) return;

        try {
            const registration = await withTimeout(
                navigator.serviceWorker.ready,
                10000,
                'Service Worker no se registró a tiempo'
            );
            const subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                setIsSubscribed(false);
                return;
            }

            // Verify if THIS user has this subscription in backend
            const res = await fetch(`/api/web-push/subscribe?userId=${user.id}`, {
                headers: { 'DOLAPIKEY': localStorage.getItem('dolibarr_token') || '' }
            });

            if (res.ok) {
                const userSubs: PushSubscription[] = await res.json();
                const currentEndpoint = subscription.endpoint;
                const isOwned = userSubs.some((s: any) => s.endpoint === currentEndpoint);

                setIsSubscribed(isOwned);
            } else {
                setIsSubscribed(false);
            }
        } catch (e) {
            console.error(e);
            setIsSubscribed(false);
        }
    }, [user]);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
            setPermission(Notification.permission);
            checkSubscription();
        }
    }, [user, checkSubscription]);

    const subscribeToPush = async () => {
        if (!user) return;

        if (!VAPID_PUBLIC_KEY) {
            console.error('Missing VAPID_PUBLIC_KEY');
            toast.error('Error: Falta configuración de notificaciones');
            return;
        }

        try {
            console.log('[Push] Starting subscription process...');

            // Explicitly request permission first
            const permissionResult = await Notification.requestPermission();
            console.log('[Push] Permission result:', permissionResult);
            setPermission(permissionResult);

            if (permissionResult === 'denied') {
                throw new Error('Permiso de notificaciones denegado. Por favor, actívalo en los ajustes de tu navegador.');
            }

            const registration = await withTimeout(
                navigator.serviceWorker.ready,
                10000,
                'Service Worker no disponible'
            );
            console.log('[Push] Service worker ready');

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
            console.log('[Push] Subscription object obtained:', subscription.endpoint);

            // Send subscription to backend
            const res = await fetch('/api/web-push/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'DOLAPIKEY': localStorage.getItem('dolibarr_token') || '',
                    'X-User-Id': user.id
                },
                body: JSON.stringify(subscription)
            });

            if (res.ok) {
                const data = await res.json();
                console.log('[Push] Backend response ok:', data);
                setIsSubscribed(true);
                setPermission(Notification.permission);
                if (data.isAdmin) {
                    toast.success('Notificaciones de administrador activadas');
                } else {
                    toast.success('Notificaciones activadas');
                }
            } else {
                const errorData = await res.json().catch(() => ({ error: 'Unknown terminal error' }));
                console.error('[Push] Backend error response:', res.status, errorData);
                throw new Error(errorData.error || 'Failed to save subscription in backend');
            }
        } catch (error: any) {
            console.error('[Push] Critical error subscribing to push:', error);
            toast.error(`Error: ${error.message || 'al activar notificaciones'}`);
        }
    };

    return {
        isSubscribed,
        permission,
        subscribeToPush,
        checkSubscription
    };
}
