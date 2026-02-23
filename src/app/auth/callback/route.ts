import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /auth/callback — Handle OAuth redirects (Google Auth)
export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const origin = requestUrl.origin;

    if (code) {
        const supabase = await createServerSupabaseClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Check if user has a profile, if not create one (for new Google users)
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', user.id)
                    .single();

                if (!profile) {
                    // New Google user — redirect to complete profile setup
                    return NextResponse.redirect(`${origin}/setup-profile`);
                }
            }

            return NextResponse.redirect(`${origin}/verify-connection`);
        }
    }

    // Something went wrong, redirect to login
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
