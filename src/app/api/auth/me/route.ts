import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/auth/me — Get current user profile
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        // Fetch profile from our profiles table
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            id: profile.id,
            login: profile.username,
            entity: profile.company_id,
            firstname: profile.firstname,
            lastname: profile.lastname,
            email: profile.email,
            user_mobile: profile.user_mobile,
            admin: profile.is_admin,
            array_options: {
                options_dni: profile.dni,
                options_naf: profile.naf,
            }
        });
    } catch (error: any) {
        console.error('[auth/me] Error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
