import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// This middleware is a simplified version for demo purposes
// In a real app, you would verify JWT tokens or session cookies
export async function middleware(request: NextRequest) {
  // Create a response object
  let response = NextResponse.next()
  
  // Create a Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => {
          response.cookies.set({ name, value, ...options })
        },
        remove: (name, options) => {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )
  
  // Refresh session if expired
  const { data: { session } } = await supabase.auth.getSession()
  
  // Check authentication for protected routes
  const isAuthRoute = request.nextUrl.pathname.startsWith('/(auth)')
  const isProtectedRoute = 
    request.nextUrl.pathname.startsWith('/dashboard') || 
    request.nextUrl.pathname.startsWith('/blueprints') || 
    request.nextUrl.pathname.startsWith('/courses') || 
    request.nextUrl.pathname.startsWith('/community')
  
  // If user is on auth page but is already logged in, redirect to dashboard
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  // If user is not logged in and trying to access a protected route, redirect to login
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return response
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 