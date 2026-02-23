import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// POST /api/register — Create a new user with Supabase Auth + profile
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { firstname, lastname, email, login: username, password, dni, user_mobile, naf, center_ids } = body;

        // Validation
        if (!firstname || !lastname || !username || !password || !dni || !user_mobile || !email) {
            return NextResponse.json(
                { success: false, message: 'Faltan campos obligatorios (nombre, apellidos, usuario, email, contraseña, DNI, móvil)' },
                { status: 400 }
            );
        }

        // Check if username already exists
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('username', username)
            .single();

        if (existingProfile) {
            return NextResponse.json(
                { success: false, message: 'Este nombre de usuario ya está en uso' },
                { status: 409 }
            );
        }

        // Step 1: Create auth user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email for admin-created users
            user_metadata: {
                firstname,
                lastname,
                username,
            }
        });

        if (authError) {
            console.error('[register] Auth error:', authError);

            let message = 'No se pudo crear el usuario.';
            if (authError.message.includes('already been registered')) {
                message = 'Este email ya está registrado.';
            }

            return NextResponse.json(
                { success: false, message, details: authError.message },
                { status: 400 }
            );
        }

        const newUserId = authData.user.id;

        // Step 2: Get or create a default company
        // For now, get the first company or create a default one
        let companyId: string;

        const { data: companies } = await supabaseAdmin
            .from('companies')
            .select('id')
            .limit(1)
            .single();

        if (companies) {
            companyId = companies.id;
        } else {
            // Create default company if none exists
            const { data: newCompany, error: companyError } = await supabaseAdmin
                .from('companies')
                .insert({
                    name: 'Mi Empresa',
                    slug: 'default',
                })
                .select('id')
                .single();

            if (companyError || !newCompany) {
                console.error('[register] Company creation error:', companyError);
                // Clean up the auth user since we can't complete registration
                await supabaseAdmin.auth.admin.deleteUser(newUserId);
                return NextResponse.json(
                    { success: false, message: 'Error al configurar la empresa' },
                    { status: 500 }
                );
            }
            companyId = newCompany.id;
        }

        // Step 3: Create profile in our profiles table
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: newUserId,
                company_id: companyId,
                username,
                firstname,
                lastname,
                email,
                user_mobile,
                dni,
                naf: naf || null,
                is_admin: false,
                is_active: true,
            });

        if (profileError) {
            console.error('[register] Profile creation error:', profileError);
            await supabaseAdmin.auth.admin.deleteUser(newUserId);
            return NextResponse.json(
                { success: false, message: 'Error al crear el perfil', details: profileError.message },
                { status: 500 }
            );
        }

        // Step 4: Assign work centers if provided
        if (center_ids && Array.isArray(center_ids) && center_ids.length > 0) {
            try {
                await supabaseAdmin
                    .from('user_config')
                    .upsert({
                        company_id: companyId,
                        user_id: newUserId,
                        param_name: 'work_centers_ids',
                        param_value: center_ids.join(','),
                    });
            } catch (configError) {
                console.error('[register] Error assigning centers:', configError);
                // Non-fatal — user was still created
            }
        }

        return NextResponse.json({
            success: true,
            data: { id: newUserId }
        });

    } catch (error: any) {
        console.error('[register] Error:', error);
        return NextResponse.json(
            {
                success: false,
                message: 'Error temporal en el sistema. Inténtelo más tarde.',
                details: error.message
            },
            { status: 500 }
        );
    }
}
