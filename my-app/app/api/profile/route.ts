import { NextResponse } from 'next/server';
import { createRouteHandler } from '@/utils/route-handlers';
import { NextRequest } from 'next/server';

// Define our response types
interface ProfileResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  skill_level?: string;
  learning_objectives?: string;
}

interface ErrorResponse {
  error: string;
}

type ApiResponse = ProfileResponse | ErrorResponse;

/**
 * GET /api/profile
 * Returns the profile information for the current authenticated user
 */
export const GET = createRouteHandler<ApiResponse>(
  ['GET'],
  async (req: NextRequest, { supabase, user }) => {
    try {
      if (!user) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        );
      }

      console.log('Fetching profile data for user:', user.id);
      
      // Fetch the user data from the database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, user_skill_level, learning_objectives')
        .eq('id', user.id)
        .single();
      
      if (userError) {
        console.error('Error fetching user data:', userError);
        return NextResponse.json(
          { error: 'Failed to fetch user data' },
          { status: 500 }
        );
      }
      
      // Return the user data in a consistent format
      return NextResponse.json({
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        skill_level: userData.user_skill_level,
        learning_objectives: userData.learning_objectives
      });
    } catch (error) {
      console.error('Error in profile GET handler:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  { requireAuth: true }
); 