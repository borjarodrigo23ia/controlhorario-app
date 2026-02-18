import { PushSubscription, getAllSubscriptions, UserPreferences } from '@/lib/push-db';

const DOLAPIURL = process.env.NEXT_PUBLIC_DOLIBARR_API_URL;
const DOLAPIKEY = process.env.DOLAPIKEY;

export interface CronUser {
    id: string;
    name: string;
    subscriptions: PushSubscription[];
    preferences?: UserPreferences;
    todayShift?: {
        start: string; // "09:00"
        end: string;   // "18:00"
    };
    currentStatus?: {
        isClockedIn: boolean;
        lastEntry?: string;
    };
}

async function dolibarrFetch(endpoint: string) {
    const url = `${DOLAPIURL}${endpoint}`;
    const res = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            'DOLAPIKEY': DOLAPIKEY || ''
        },
        cache: 'no-store'
    });
    if (!res.ok) throw new Error(`Dolibarr Error ${res.status}`);
    return res.json();
}

export async function getUsersForCron(): Promise<CronUser[]> {
    try {
        // 1. Get all subscriptions (this gives us users who CAN receive notifications)
        // We only care about users with subscriptions for this feature
        const allSubs = await getAllSubscriptions();

        // Group by user ID
        const usersMap = new Map<string, CronUser>();

        for (const record of allSubs) {
            if (!usersMap.has(record.userId)) {
                usersMap.set(record.userId, {
                    id: record.userId,
                    name: 'Usuario', // Placeholder, fetching name might be too heavy for all
                    subscriptions: [],
                    preferences: undefined
                });
            }
            const user = usersMap.get(record.userId)!;
            user.subscriptions.push(record.subscription);
        }

        const cronUsers = Array.from(usersMap.values());

        // 2. Enrich with Shift Data & Current Status (Parallelized but limited concurrency ideally)
        // For simplicity now, we loop. specific-user calls are fast enough for small teams.
        const todayDow = new Date().getDay(); // 0 = Sun, 1 = Mon...

        // We need to fetch:
        // A. Assigned Shift (Jornada)
        // B. Current Fichaje Status (Open/Closed)

        const enrichedUsers = await Promise.all(cronUsers.map(async (user) => {
            try {
                // A. Fetch Shift Config
                // We use the existing endpoint structure: /fichajestrabajadoresapi/jornadas?user_id=X
                const shifts = await dolibarrFetch(`/fichajestrabajadoresapi/jornadas?user_id=${user.id}`);

                // Find shift valid for today
                // Logic mimics ShiftConfigurator: check if today is in active_days
                const todayShift = Array.isArray(shifts) ? shifts.find((s: any) => {
                    const activeDays = s.active_days || [1, 2, 3, 4, 5];
                    return activeDays.includes(todayDow);
                }) : null;

                if (todayShift) {
                    user.todayShift = {
                        start: todayShift.hora_inicio_jornada,
                        end: todayShift.hora_fin_jornada
                    };
                }

                // B. Fetch Current Status
                // /fichajestrabajadoresapi/fichajes/status?user_id=X
                const status = await dolibarrFetch(`/fichajestrabajadoresapi/fichajes/status?user_id=${user.id}`);
                if (status) {
                    user.currentStatus = {
                        isClockedIn: status.status === 'open',
                        lastEntry: status.last_entry
                    };
                }

                return user;
            } catch (e) {
                console.error(`Error enriching user ${user.id} for cron:`, e);
                return user; // Return incomplete user rather than failing all
            }
        }));

        return enrichedUsers;

    } catch (error) {
        console.error('Error in getUsersForCron:', error);
        return [];
    }
}
