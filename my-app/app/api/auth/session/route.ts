import { NextResponse } from 'next/server';
import { withRouteAuth } from '@/utils/route-handlers';

/**
 * GET /api/auth/session
 * Checks if the user has a valid session and returns session information
 */
export async function GET(request: Request) {
  try {
    // Use our withRouteAuth utility to check authentication status
    const { isAuthenticated, user, supabase } = await withRouteAuth(request);

    // If not authenticated, return basic info that user is not authenticated
    if (!isAuthenticated || !user) {
      return NextResponse.json({
        authenticated: false,
        session: null
      });
    }

    // For authenticated users, get the full session details
    const { data, error } = await supabase?.auth.getSession() || { data: {}, error: null };
    
    if (error) {
      console.error('Error fetching detailed session:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      authenticated: true,
      session: data.session ? {
        userId: data.session.user.id,
        userEmail: data.session.user.email,
        expires: data.session.expires_at,
        // Include additional user information that might be useful
        user: {
          id: data.session.user.id,
          email: data.session.user.email,
          emailVerified: data.session.user.email_confirmed_at ? true : false
        }
      } : null
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ 
      error: 'Failed to check authentication',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 