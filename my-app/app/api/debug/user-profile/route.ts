import { NextResponse } from 'next/server';
import { createRouteHandler } from '@/utils/route-handlers';
import { NextRequest } from 'next/server';

// Define the response types
interface DebugProfileResponse {
  debug_info: {
    auth_user_id: string;
    auth_user_email?: string;
    available_columns: string[];
    contains_skill_level: boolean;
    contains_user_skill_level: boolean;
    queried_table: string;
    query_method: string;
  };
  raw_user_data: Record<string, unknown>;
}

interface ErrorResponse {
  error: string;
  errorDetails?: unknown;
  details?: string;
}

type ApiResponse = DebugProfileResponse | ErrorResponse;

/**
 * GET /api/debug/user-profile
 * Debug endpoint to check the raw user profile data in the database
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

      console.log('DEBUG: Fetching raw user profile data for user:', user.id);
      
      // First get all columns to see what's available
      const { data: allColumnsData } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      // Then get the specific user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (userError) {
        console.error('DEBUG: Error fetching user data:', userError);
        return NextResponse.json(
          { 
            error: 'Failed to fetch user data',
            errorDetails: userError 
          },
          { status: 500 }
        );
      }
      
      // Get the list of all available columns from the first query
      const availableColumns = allColumnsData && allColumnsData.length > 0 
        ? Object.keys(allColumnsData[0] || {})
        : [];
      
      // Return the debug information
      return NextResponse.json({
        debug_info: {
          auth_user_id: user.id,
          auth_user_email: user.email,
          available_columns: availableColumns,
          contains_skill_level: userData && 'skill_level' in userData,
          contains_user_skill_level: userData && 'user_skill_level' in userData,
          queried_table: 'users',
          query_method: 'select *'
        },
        raw_user_data: userData || {}
      });
    } catch (error) {
      console.error('DEBUG: Error in user profile debug handler:', error);
      return NextResponse.json(
        { 
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error' 
        },
        { status: 500 }
      );
    }
  },
  { requireAuth: true }
); 