// Push notification database helper — migrated from Dolibarr extrafields to Supabase tables:
// - push_subscriptions: stores VAPID subscriptions per device
// - user_preferences: stores notification preferences per user
// - profiles: is_admin flag used to identify admin users

import { supabaseAdmin } from '@/lib/supabase/admin';

// --- Types ---
export interface PushSubscription {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

export interface UserPreferences {
    fichajes: boolean;   // Schedule reminders
    vacaciones: boolean; // Vacation updates
    cambios: boolean;    // Shift changes/correction requests
}

export interface SubscriptionRecord {
    userId: string;
    subscription: PushSubscription;
    userAgent?: string;
    isAdmin: boolean;
    updatedAt: string;
}

// --- Subscriptions ---

export async function saveSubscription(
    userId: string,
    subscription: PushSubscription,
    isAdmin: boolean,
    userAgent?: string
) {
    try {
        // Get company_id for this user
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('company_id')
            .eq('id', userId)
            .single();

        const companyId = profile?.company_id;

        const { error } = await supabaseAdmin
            .from('push_subscriptions')
            .upsert({
                user_id: userId,
                company_id: companyId,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                user_agent: userAgent || null,
                is_admin: isAdmin,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'endpoint' });

        if (error) throw error;

        console.log(`[PushDB] Saved subscription for user ${userId}`);
    } catch (error) {
        console.error('[PushDB] Error saving subscription:', error);
        throw error;
    }
}

export async function getSubscriptionsForUser(userId: string): Promise<PushSubscription[]> {
    try {
        const { data, error } = await supabaseAdmin
            .from('push_subscriptions')
            .select('endpoint, p256dh, auth')
            .eq('user_id', userId);

        if (error) throw error;

        return (data || []).map((r: any) => ({
            endpoint: r.endpoint,
            keys: { p256dh: r.p256dh, auth: r.auth },
        }));
    } catch (error) {
        console.error('[PushDB] Error getting subscriptions:', error);
        return [];
    }
}

export async function getAllSubscriptions(): Promise<SubscriptionRecord[]> {
    try {
        const { data, error } = await supabaseAdmin
            .from('push_subscriptions')
            .select('user_id, endpoint, p256dh, auth, user_agent, is_admin, updated_at');

        if (error) throw error;

        return (data || []).map((r: any) => ({
            userId: r.user_id,
            subscription: { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
            userAgent: r.user_agent,
            isAdmin: r.is_admin,
            updatedAt: r.updated_at,
        }));
    } catch (error) {
        console.error('[PushDB] Error getting all subscriptions:', error);
        return [];
    }
}

export async function deleteSubscription(endpoint: string) {
    const { error } = await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint);

    if (error) console.error('[PushDB] Error deleting subscription:', error);
}

// --- Preferences ---

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
    const defaultPrefs: UserPreferences = { fichajes: true, vacaciones: true, cambios: true };

    try {
        const { data, error } = await supabaseAdmin
            .from('notification_preferences')
            .select('fichajes, vacaciones, cambios')
            .eq('user_id', userId)
            .single();

        if (error || !data) return defaultPrefs;

        return {
            fichajes: data.fichajes ?? true,
            vacaciones: data.vacaciones ?? true,
            cambios: data.cambios ?? true,
        };
    } catch (error) {
        console.error('[PushDB] Error getting preferences:', error);
        return defaultPrefs;
    }
}

export async function saveUserPreferences(userId: string, prefs: Partial<UserPreferences>) {
    try {
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('company_id')
            .eq('id', userId)
            .single();

        const { error } = await supabaseAdmin
            .from('notification_preferences')
            .upsert({
                user_id: userId,
                company_id: profile?.company_id,
                ...prefs,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

        if (error) throw error;

        console.log(`[PushDB] Saved preferences for user ${userId}`);
    } catch (error) {
        console.error('[PushDB] Error saving preferences:', error);
        throw error;
    }
}
