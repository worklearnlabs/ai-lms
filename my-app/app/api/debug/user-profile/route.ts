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
    contains_learning_objectives: boolean;
    contains_user_learning_goals: boolean;
    queried_table: string;
    query_method: string;
    all_user_fields: Record<string, unknown>;
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
      console.log('DEBUG: User email:', user.email);
      
      // First get all columns to see what's available
      const { data: allColumnsData } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      // Then get the specific user data
      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      // If no user found by ID and we have an email, try to find by email instead
      if (userError && userError.code === 'PGRST116' && user.email) {
        console.log('DEBUG: User not found by ID, trying to find by email:', user.email);
        
        const { data: userByEmail, error: emailError } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .single();
          
        if (!emailError && userByEmail) {
          console.log('DEBUG: Found user by email instead of ID');
          console.log('DEBUG: Auth ID:', user.id, 'Database ID:', userByEmail.id);
          userData = userByEmail;
          userError = null;
        } else if (emailError) {
          console.log('DEBUG: Error finding user by email:', emailError);
        }
      }
      
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
      
      // Create a field map to show what fields the user has and their values
      const userFieldMap: Record<string, unknown> = {};
      if (userData) {
        Object.keys(userData).forEach(key => {
          userFieldMap[key] = {
            exists: true,
            value: userData[key],
            value_type: typeof userData[key],
            is_empty: userData[key] === null || userData[key] === undefined || userData[key] === '',
          };
        });
      }
      
      // Add columns that might be missing but we're interested in
      const interestingColumns = [
        'skill_level', 'user_skill_level', 
        'learning_objectives', 'learning_objective', 'user_learning_goals'
      ];
      
      interestingColumns.forEach(col => {
        if (!userFieldMap[col]) {
          userFieldMap[col] = {
            exists: false,
            reason: availableColumns.includes(col) ? 'column exists but no data for user' : 'column does not exist in table'
          };
        }
      });
      
      // Return the debug information
      return NextResponse.json({
        debug_info: {
          auth_user_id: user.id,
          auth_user_email: user.email,
          available_columns: availableColumns,
          contains_skill_level: userData && 'skill_level' in userData,
          contains_user_skill_level: userData && 'user_skill_level' in userData,
          contains_learning_objectives: userData && 'learning_objectives' in userData,
          contains_user_learning_goals: userData && 'user_learning_goals' in userData,
          queried_table: 'users',
          query_method: 'select *',
          all_user_fields: userFieldMap
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