import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/app/lib/supabase/middleware' // Import the updateSession function
import { createClient } from '@/app/lib/supabase/server' // Need regular server client for user/role check

export async function middleware(request: NextRequest) {
    
    // --- Step 1: Handle session update using the library function ---
    // This returns the NextResponse object needed to handle cookies.
    const response = await updateSession(request); 
    // -------------------------------------------------------------------

    // --- Step 2: Get User Info AFTER session update ---
    // Create a Supabase client callable within the middleware function
    const supabase = createClient(); // Initialize server client - relies on cookies()
    const { data: { user } } = await supabase.auth.getUser();
    // ----------------------------------------------------

    const pathname = request.nextUrl.pathname

    // --- Step 3: Handle Auth Routes (Redirect if logged in) ---
    const isAuthRoute = pathname.startsWith('/auth')
    if (isAuthRoute) {
        if (user) {
            // User is logged in, redirect away from auth pages
            return NextResponse.redirect(new URL('/admin', request.url)) // Redirect to admin home
        }
        // If not logged in, allow access (response from updateSession handles cookies)
        return response
    }
    // --------------------------------------------------------

    // --- Step 4: Handle Admin Route Role Check --- 
    const isAdminRoute = pathname.startsWith('/admin')
    if (isAdminRoute) {
        if (!user) {
            // Should have been handled by updateSession, but redirect just in case.
            return NextResponse.redirect(new URL('/auth/login', request.url));
        }

        // User is authenticated, check role using the client initialized above
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (error || !profile) {
            console.error('Middleware Error: Could not fetch profile or profile not found after auth', error);
            // Redirect to an unauthorized page if profile error occurs
            return NextResponse.redirect(new URL('/unauthorized?error=profile_fetch_failed', request.url)); 
        }

        const userRole = profile.role;
        const canAccessAdmin = userRole === 'admin' || userRole === 'owner';

        if (!canAccessAdmin) {
            console.warn(`Middleware: User ${user.id} with role ${userRole} attempted admin access to ${pathname}`);
            // Redirect non-admins away from /admin routes
            return NextResponse.redirect(new URL('/unauthorized?reason=role', request.url));
        }

        // User is authenticated AND has the correct role, allow access
        return response; 
    }
    // ------------------------------------------------------------

    // --- Step 5: Handle other route groups or default allow ---
    // Example: Protect a /dashboard route
    // if (pathname.startsWith('/dashboard') && !user) {
    //     return NextResponse.redirect(new URL('/auth/login', request.url));
    // }
    
    // Default: Allow access to public routes or routes handled above
    return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/ (API routes - if you want to protect them separately)
     * Feel free to modify this pattern to include more exceptions.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
} 