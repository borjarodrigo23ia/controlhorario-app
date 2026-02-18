import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const apiKey = request.headers.get('DOLAPIKEY');
        if (!apiKey) {
            return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { firstname, lastname, email, login, password, dni, isAdmin, user_mobile, office_phone, naf } = body;

        // Validation
        if (!firstname || !login || !password) {
            return NextResponse.json(
                { success: false, message: 'Faltan campos obligatorios' },
                { status: 400 }
            );
        }

        const apiUrl = process.env.NEXT_PUBLIC_DOLIBARR_API_URL;

        // We use the same endpoint as registration but authenticated with the admin's key
        // and passing the specific admin flag
        const endpoint = `${apiUrl}/setupusuariosapi/crearUsuario`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'DOLAPIKEY': apiKey // Use the requesting admin's key
            },
            body: JSON.stringify({
                firstname,
                lastname: lastname || '',
                login,
                email: email || '',
                password,
                employee: 1, // Default to employee
                admin: isAdmin ? 1 : 0,
                note_private: dni ? `DNI: ${dni}` : '',
                mobile: user_mobile,
                user_mobile: user_mobile,
                phone: office_phone,
                array_options: body.array_options || {
                    options_dni: dni,
                    options_naf: naf || body.naf
                }
            })
        });

        // Handle potential non-JSON responses (HTML errors)
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const textText = await response.text();
            console.error("Dolibarr returned non-JSON:", textText);

            // Try to extract useful error info if it's HTML
            return NextResponse.json(
                { success: false, message: `Error del servidor Dolibarr (${response.status})` },
                { status: response.status === 200 ? 500 : response.status }
            );
        }

        const data = await response.json();

        if (!response.ok) {
            const rawError = data.error?.message || data.message || 'Error desconocido';
            console.error("Dolibarr API Error:", rawError);

            return NextResponse.json(
                {
                    success: false,
                    message: 'Error al crear el usuario en el sistema. Revise los datos técnicos.',
                    details: rawError
                },
                { status: response.status }
            );
        }

        return NextResponse.json({
            success: true,
            data
        });

    } catch (error: any) {
        console.error("Create User API Error:", error);
        return NextResponse.json(
            {
                success: false,
                message: 'No se pudo procesar la solicitud de creación.',
                details: error.message
            },
            { status: 500 }
        );
    }
}
