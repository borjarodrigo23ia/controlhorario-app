import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Do not write any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake can lead to very
    // difficult-to-debug auth issues.

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Public paths that don't require authentication
    const publicPaths = ['/login', '/register', '/verify-connection']
    const isPublicPath = publicPaths.some(path =>
        request.nextUrl.pathname.startsWith(path)
    )

    // API routes that should remain accessible (cron, webhooks)
    const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

    if (!user && !isPublicPath && !isApiRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
