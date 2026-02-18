import { NextRequest, NextResponse } from 'next/server';
import { getUserPreferences, saveUserPreferences } from '@/lib/push-db';

export async function GET(request: NextRequest) {
    const userId = request.nextUrl.searchParams.get('userId');
    const apiKey = request.headers.get('DOLAPIKEY');

    if (!apiKey || !userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prefs = await getUserPreferences(userId);
    return NextResponse.json(prefs);
}

export async function POST(request: NextRequest) {
    const apiKey = request.headers.get('DOLAPIKEY');

    // Simplification: We expect userId in body or header. 
    // To match GET, let's look for it in searchParams or Body.
    // Ideally auth middleware does this.

    const body = await request.json();
    const userId = body.userId;

    if (!apiKey || !userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Filter valid keys
    const { fichajes, vacaciones, cambios } = body;
    const update = {
        ...(typeof fichajes === 'boolean' ? { fichajes } : {}),
        ...(typeof vacaciones === 'boolean' ? { vacaciones } : {}),
        ...(typeof cambios === 'boolean' ? { cambios } : {})
    };

    await saveUserPreferences(userId, update);

    return NextResponse.json({ success: true });
}
