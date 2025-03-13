import { NextResponse } from 'next/server';
import { withRouteAuth } from '@/utils/route-handlers';

/**
 * GET /api/auth/test
 * A simple endpoint that returns user information if authenticated
 */
export async function GET(request: Request) {
  try {
    // Check authentication
    const auth = await withRouteAuth(request);
    
    // If authenticated, return user info
    if (auth.isAuthenticated && auth.user) {
      return NextResponse.json({
        authenticated: true,
        user: {
          id: auth.user.id,
          email: auth.user.email,
          role: auth.user.role
        },
        message: 'Authentication successful'
      });
    }
    
    // Return unauthorized response if not authenticated
    return auth.unauthorized();
  } catch (error) {
    console.error('Error in auth test endpoint:', error);
    return NextResponse.json(
      {
        authenticated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Authentication check failed due to an error'
      },
      { status: 500 }
    );
  }
} 