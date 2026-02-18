import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'subscriptions.json');
const PREFERENCES_FILE = path.join(DATA_DIR, 'preferences.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

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

export function saveSubscription(userId: string, subscription: PushSubscription, isAdmin: boolean, userAgent?: string) {
    let data: SubscriptionRecord[] = [];
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
        try {
            data = JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8'));
        } catch (e) {
            data = [];
        }
    }

    // Remove existing subscription if endpoint matches (update)
    const existingIndex = data.findIndex(s => s.subscription.endpoint === subscription.endpoint);

    const record: SubscriptionRecord = {
        userId,
        subscription,
        userAgent,
        isAdmin,
        updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
        data[existingIndex] = record;
    } else {
        data.push(record);
    }

    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(data, null, 2));
}

export function getSubscriptionsForUser(userId: string): PushSubscription[] {
    if (!fs.existsSync(SUBSCRIPTIONS_FILE)) return [];
    try {
        const data: SubscriptionRecord[] = JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8'));
        return data.filter(s => s.userId === userId).map(s => s.subscription);
    } catch (e) {
        return [];
    }
}

export function getAllSubscriptions(): SubscriptionRecord[] {
    if (!fs.existsSync(SUBSCRIPTIONS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8'));
    } catch (e) {
        return [];
    }
}

// --- Preferences ---

export function getUserPreferences(userId: string): UserPreferences {
    const defaultPrefs: UserPreferences = {
        fichajes: true,
        vacaciones: true,
        cambios: true
    };

    if (!fs.existsSync(PREFERENCES_FILE)) return defaultPrefs;

    try {
        const data = JSON.parse(fs.readFileSync(PREFERENCES_FILE, 'utf-8'));
        return { ...defaultPrefs, ...(data[userId] || {}) };
    } catch (e) {
        return defaultPrefs;
    }
}

export function saveUserPreferences(userId: string, prefs: Partial<UserPreferences>) {
    let data: Record<string, UserPreferences> = {};
    if (fs.existsSync(PREFERENCES_FILE)) {
        try {
            data = JSON.parse(fs.readFileSync(PREFERENCES_FILE, 'utf-8'));
        } catch (e) {
            data = {};
        }
    }

    const current = data[userId] || { fichajes: true, vacaciones: true, cambios: true };
    data[userId] = { ...current, ...prefs };

    fs.writeFileSync(PREFERENCES_FILE, JSON.stringify(data, null, 2));
}
