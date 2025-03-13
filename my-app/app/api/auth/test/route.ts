import { NextResponse } from 'next/server';
import { createRouteHandler } from '@/utils/route-handlers';

/**
 * GET /api/auth/test
 * A simple endpoint that returns user information if authenticated
 */
export const GET = createRouteHandler(
  ['GET'],
  async (req, { user }) => {
    try {
      // If authenticated, return user info
      if (user) {
        return NextResponse.json({
          authenticated: true,
          user: {
            id: user.id,
            email: user.email,
            role: user.user_metadata?.role // User role may be in metadata
          },
          message: 'Authentication successful'
        });
      }
      
      // This shouldn't happen since requireAuth is true by default
      // but we'll handle it just in case
      return NextResponse.json(
        { authenticated: false, message: 'Not authenticated' },
        { status: 401 }
      );
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
  // No need to specify requireAuth: true since it's the default
); 