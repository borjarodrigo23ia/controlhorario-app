import fs from 'fs';
import path from 'path';

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

// --- Dolibarr API Helpers (Server Side) ---
const DOLAPIURL = process.env.NEXT_PUBLIC_DOLIBARR_API_URL;
const DOLAPIKEY = process.env.DOLAPIKEY;

async function dolibarrFetch(endpoint: string, options: RequestInit = {}) {
    const url = `${DOLAPIURL}${endpoint}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'DOLAPIKEY': DOLAPIKEY || '',
            ...options.headers,
        },
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Dolibarr Error ${res.status}: ${text}`);
    }

    return res.json();
}

// --- Helper to manage extrafields ---
function parseExtrafield(jsonStr: string | null | undefined, defaultValue: any) {
    if (!jsonStr) return defaultValue;
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('Error parsing extrafield JSON:', e);
        return defaultValue;
    }
}

// --- Storage Layout in Dolibarr ---
interface ConsolidatedStorage {
    subscriptions: SubscriptionRecord[];
    preferences?: UserPreferences;
}

// --- Subscriptions ---

export async function saveSubscription(userId: string, subscription: PushSubscription, isAdmin: boolean, userAgent?: string) {
    try {
        // 1. Fetch current user data
        const userData = await dolibarrFetch(`/users/${userId}`);
        const currentDataStr = userData.array_options?.options_push_subscriptions;
        const storage: ConsolidatedStorage = parseExtrafield(currentDataStr, { subscriptions: [] });

        // 2. Update subscriptions list
        const subs = storage.subscriptions || [];
        const existingIndex = subs.findIndex(s => s.subscription.endpoint === subscription.endpoint);

        const record: SubscriptionRecord = {
            userId,
            subscription,
            userAgent,
            isAdmin,
            updatedAt: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            subs[existingIndex] = record;
        } else {
            subs.push(record);
        }

        storage.subscriptions = subs;

        // 3. Save back to Dolibarr
        await dolibarrFetch(`/setupusuariosapi/updateUsuario/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({
                array_options: {
                    options_push_subscriptions: JSON.stringify(storage)
                }
            })
        });

        console.log(`[PushDB] Saved subscription for user ${userId} to Dolibarr`);
    } catch (error) {
        console.error('[PushDB] Error saving subscription to Dolibarr:', error);
        throw error;
    }
}

export async function getSubscriptionsForUser(userId: string): Promise<PushSubscription[]> {
    try {
        const userData = await dolibarrFetch(`/users/${userId}`);
        const dataStr = userData.array_options?.options_push_subscriptions;
        const storage: ConsolidatedStorage = parseExtrafield(dataStr, { subscriptions: [] });
        return (storage.subscriptions || []).map(s => s.subscription);
    } catch (error) {
        console.error('[PushDB] Error getting subscriptions from Dolibarr:', error);
        return [];
    }
}

export async function getAllSubscriptions(): Promise<SubscriptionRecord[]> {
    try {
        const users = await dolibarrFetch('/users?limit=1000');
        let allSubs: SubscriptionRecord[] = [];

        for (const user of users) {
            const dataStr = user.array_options?.options_push_subscriptions;
            const storage: ConsolidatedStorage = parseExtrafield(dataStr, { subscriptions: [] });
            allSubs = [...allSubs, ...(storage.subscriptions || [])];
        }

        return allSubs;
    } catch (error) {
        console.error('[PushDB] Error getting all subscriptions from Dolibarr:', error);
        return [];
    }
}

// --- Preferences ---

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
    const defaultPrefs: UserPreferences = {
        fichajes: true,
        vacaciones: true,
        cambios: true
    };

    try {
        const userData = await dolibarrFetch(`/users/${userId}`);
        const dataStr = userData.array_options?.options_push_subscriptions;
        const storage: ConsolidatedStorage = parseExtrafield(dataStr, { subscriptions: [] });
        return { ...defaultPrefs, ...(storage.preferences || {}) };
    } catch (error) {
        console.error('[PushDB] Error getting preferences from Dolibarr:', error);
        return defaultPrefs;
    }
}

export async function saveUserPreferences(userId: string, prefs: Partial<UserPreferences>) {
    try {
        const userData = await dolibarrFetch(`/users/${userId}`);
        const dataStr = userData.array_options?.options_push_subscriptions;
        const storage: ConsolidatedStorage = parseExtrafield(dataStr, { subscriptions: [] });

        const currentPrefs = storage.preferences || { fichajes: true, vacaciones: true, cambios: true };
        storage.preferences = { ...currentPrefs, ...prefs };

        await dolibarrFetch(`/setupusuariosapi/updateUsuario/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({
                array_options: {
                    options_push_subscriptions: JSON.stringify(storage)
                }
            })
        });
        console.log(`[PushDB] Saved preferences for user ${userId} to Dolibarr`);
    } catch (error) {
        console.error('[PushDB] Error saving preferences to Dolibarr:', error);
        throw error;
    }
}


