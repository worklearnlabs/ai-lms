import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase-schema'

// Function to check and create user if needed
async function checkUserSync(userId: string, supabase: SupabaseClient<Database>) {
  try {
    // Check if user exists in users table
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
      
    // If no error, user exists
    if (!error && data) {
      return;
    }
    
    // If error is not "not found", something else is wrong
    if (error && error.code !== 'PGRST116') {
      console.error("Error checking user existence:", error);
      return;
    }
    
    // Get user details from auth
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.error("Error getting user data:", userError);
      return;
    }
    
    const user = userData.user;
    
    // Check if user with this email already exists
    if (user.email) {
      const { data: emailUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();
        
      if (emailUser) {
        // User exists with different ID, we could handle this case
        // but we'll skip for middleware (better handled in API routes)
        return;
      }
    }
    
    // Create user if not found
    // Extract name from user metadata
    const fullNameFromMeta = user.user_metadata?.full_name || 'User';
    const nameParts = fullNameFromMeta.split(' ');
    const firstName = nameParts[0] && nameParts[0].trim() ? nameParts[0].trim() : 'User';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Create user record with the correct type structure
    // The Insert type from the schema requires certain fields
    await supabase
      .from('users')
      .insert({
        id: userId,
        email: user.email || '', // Email is required
        first_name: firstName,   // first_name is required
        last_name: lastName,     // last_name is optional
        role: 'user',            // role is optional with default
        created_at: new Date().toISOString(),  // created_at is optional
        updated_at: new Date().toISOString(),  // updated_at is optional
      });
      
  } catch (error) {
    console.error("Error in user sync:", error);
  }
}

// Simplified middleware that uses cookies directly
export async function middleware(request: NextRequest) {
  // Create a response object
  const response = NextResponse.next()
  
  // Create a Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: { path?: string; maxAge?: number; domain?: string; secure?: boolean }) {
          // This is used for setting cookies in the response
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: { path?: string; domain?: string; secure?: boolean }) {
          // This is used for removing cookies in the response
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )
  
  // Check for session
  const { data: { session } } = await supabase.auth.getSession()
  
  // If user is authenticated, check and create user record if needed
  if (session?.user) {
    // We don't want to await this as it would slow down every request
    // Instead, we'll fire and forget
    checkUserSync(session.user.id, supabase)
      .catch(error => console.error("User sync error:", error));
  }
  
  // Check authentication for protected routes
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || 
                      request.nextUrl.pathname.startsWith('/register')
  const isProtectedRoute = 
    request.nextUrl.pathname.startsWith('/dashboard') || 
    request.nextUrl.pathname.startsWith('/blueprints') || 
    request.nextUrl.pathname.startsWith('/courses') || 
    request.nextUrl.pathname.startsWith('/community')
  
  // If user is on auth page but is already logged in, redirect to dashboard
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  // If user is trying to access protected route without being logged in, redirect to login
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return response
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Protected routes that require authentication
    '/dashboard/:path*',
    '/blueprints/:path*',
    '/courses/:path*',
    '/community/:path*',
    // Auth routes for login and signup
    '/login',
    '/register',
  ],
} 