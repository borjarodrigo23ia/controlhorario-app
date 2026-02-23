import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// POST /api/auth/lookup — Find email by username (for username-based login)
export async function POST(request: NextRequest) {
    try {
        const { username } = await request.json();

        if (!username) {
            return NextResponse.json(
                { error: 'Username is required' },
                { status: 400 }
            );
        }

        // Look up the profile by username (using admin client to bypass RLS)
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('email')
            .eq('username', username)
            .eq('is_active', true)
            .single();

        if (error || !profile?.email) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ email: profile.email });
    } catch (error: any) {
        console.error('[auth/lookup] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
