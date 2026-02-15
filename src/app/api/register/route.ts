import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { firstname, lastname, email, login, password, dni, user_mobile } = body;

        // Validation
        if (!firstname || !lastname || !login || !password || !dni || !user_mobile) {
            return NextResponse.json(
                { success: false, message: 'Faltan campos obligatorios' },
                { status: 400 }
            );
        }

        const apiUrl = process.env.NEXT_PUBLIC_DOLIBARR_API_URL;
        const apiKey = process.env.DOLAPIKEY;

        if (!apiUrl || !apiKey) {
            console.error("Configuration error: Missing API URL or Key");
            return NextResponse.json(
                { success: false, message: 'Error de configuración del servidor' },
                { status: 500 }
            );
        }

        // Construct Dolibarr API URL
        // Endpoint identified: POST /setupusuarios/crearUsuario
        const endpoint = `${apiUrl}/setupusuariosapi/crearUsuario`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'DOLAPIKEY': apiKey
            },
            body: JSON.stringify({
                firstname,
                lastname,
                login,
                email,
                password,
                employee: 1, // Default to employee
                admin: 0,     // Default to non-admin
                note_private: dni ? `DNI: ${dni}` : '',
                mobile: user_mobile
            })
        });

        // Handle potential non-JSON responses (HTML errors)
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const textText = await response.text();
            console.error("Dolibarr returned non-JSON:", textText);
            return NextResponse.json(
                { success: false, message: `Error del servidor Dolibarr (${response.status})` },
                { status: response.status === 200 ? 500 : response.status }
            );
        }

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { success: false, message: data.error?.message || data.message || 'Error al crear usuario' },
                { status: response.status }
            );
        }

        // Check if there are centers to assign
        if (body.center_ids && Array.isArray(body.center_ids) && body.center_ids.length > 0) {
            try {
                // The API usually returns the ID of the created object as a number or string
                // If it returns an object { id: ... }, we handle that too.
                const newUserId = typeof data === 'object' && data.id ? data.id : data;

                if (newUserId) {
                    const centerIdsString = body.center_ids.join(',');
                    console.log(`Assigning centers [${centerIdsString}] to new user ${newUserId}`);

                    // Create the user config for work centers
                    await fetch(`${apiUrl}/fichajestrabajadoresapi/users/${newUserId}/config`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'DOLAPIKEY': apiKey // Using the admin API key from env
                        },
                        body: JSON.stringify({
                            param_name: 'work_centers_ids',
                            value: centerIdsString
                        })
                    });
                }
            } catch (configError) {
                console.error("Error assigning centers to new user:", configError);
                // We don't fail the whole request since the user was created, 
                // but we might want to log it or warn.
            }
        }

        return NextResponse.json({
            success: true,
            data
        });

    } catch (error: any) {
        console.error("Register API Error:", error);
        return NextResponse.json(
            { success: false, message: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
