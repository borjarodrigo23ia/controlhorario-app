import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/users — List all active users in company
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin, company_id')
            .eq('id', user.id)
            .single();

        if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });

        // Any member can see the user list (for selecting employees, etc.)
        const { data: users, error } = await supabaseAdmin
            .from('profiles')
            .select('id, username, firstname, lastname, email, user_mobile, is_admin, is_active, dni, naf')
            .eq('company_id', profile.company_id)
            .eq('is_active', true)
            .order('firstname', { ascending: true });

        if (error) throw error;

        // Map to frontend-compatible shape (matches old Dolibarr user shape)
        const mapped = (users || []).map((u: any) => ({
            id: u.id,
            login: u.username,
            firstname: u.firstname,
            lastname: u.lastname,
            email: u.email,
            user_mobile: u.user_mobile,
            admin: String(u.is_admin ? '1' : '0'),
            statut: u.is_active ? '1' : '0',
            array_options: {
                options_dni: u.dni,
                options_naf: u.naf,
            },
        }));

        return NextResponse.json(mapped);

    } catch (error: any) {
        console.error('[api/users GET] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
