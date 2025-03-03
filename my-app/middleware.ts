import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simplified middleware that uses cookies directly
export async function middleware(request: NextRequest) {
  // Create a response object
  const response = NextResponse.next()
  
  // Check for session cookie (simplified)
  const hasSession = request.cookies.has('supabase-auth-token')
  
  // Check authentication for protected routes
  const isAuthRoute = request.nextUrl.pathname.startsWith('/(auth)')
  const isProtectedRoute = 
    request.nextUrl.pathname.startsWith('/dashboard') || 
    request.nextUrl.pathname.startsWith('/blueprints') || 
    request.nextUrl.pathname.startsWith('/courses') || 
    request.nextUrl.pathname.startsWith('/community')
  
  // If user is on auth page but is already logged in, redirect to dashboard
  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  // If user is not logged in and trying to access a protected route, redirect to login
  if (isProtectedRoute && !hasSession) {
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