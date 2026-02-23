import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/users/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin, company_id')
            .eq('id', user.id)
            .single();

        if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // Admin can view any user in company, employee can view own
        if (!profile.is_admin && user.id !== id) {
            return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
        }

        const { data: targetProfile, error } = await supabaseAdmin
            .from('profiles')
            .select('id, username, firstname, lastname, email, user_mobile, is_admin, is_active, dni, naf')
            .eq('id', id)
            .eq('company_id', profile.company_id)
            .single();

        if (error || !targetProfile) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        return NextResponse.json({
            id: targetProfile.id,
            login: targetProfile.username,
            firstname: targetProfile.firstname,
            lastname: targetProfile.lastname,
            email: targetProfile.email,
            user_mobile: targetProfile.user_mobile,
            admin: String(targetProfile.is_admin ? '1' : '0'),
            statut: targetProfile.is_active ? '1' : '0',
            array_options: {
                options_dni: targetProfile.dni,
                options_naf: targetProfile.naf,
            },
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/users/[id] — Update user profile (admin or self)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin, company_id')
            .eq('id', user.id)
            .single();

        if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // Admin can update any user, employee can only update self
        if (!profile.is_admin && user.id !== id) {
            return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
        }

        const body = await request.json();
        const { firstname, lastname, email, user_mobile, dni, naf, password, is_admin, is_active } = body;

        // Build update object (only allowed fields)
        const updateData: any = {};
        if (firstname !== undefined) updateData.firstname = firstname;
        if (lastname !== undefined) updateData.lastname = lastname;
        if (user_mobile !== undefined) updateData.user_mobile = user_mobile;
        if (dni !== undefined) updateData.dni = dni;
        if (naf !== undefined) updateData.naf = naf;

        // Only admin can change these fields
        if (profile.is_admin) {
            if (email !== undefined) updateData.email = email;
            if (is_admin !== undefined) updateData.is_admin = is_admin;
            if (is_active !== undefined) updateData.is_active = is_active;
        }

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('id', id)
            .eq('company_id', profile.company_id);

        if (profileError) throw profileError;

        // Update email in auth if changed (admin only)
        if (profile.is_admin && email) {
            await supabaseAdmin.auth.admin.updateUserById(id, { email });
        }

        // Update password if provided (admin or self)
        if (password) {
            await supabaseAdmin.auth.admin.updateUserById(id, { password });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[api/users/[id] PUT] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/users/[id] — Deactivate (soft delete) user
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin, company_id')
            .eq('id', user.id)
            .single();

        if (!profile?.is_admin) {
            return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
        }

        // Soft-delete: mark as inactive rather than deleting from auth
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ is_active: false })
            .eq('id', id)
            .eq('company_id', profile.company_id);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
