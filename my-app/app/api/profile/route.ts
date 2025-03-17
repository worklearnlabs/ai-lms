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
  user_skill_level?: string;
  user_learning_goals?: string;
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
      console.log('User email:', user.email);
      
      // Use the correct column names based on actual database schema
      try {
        // First try to get user by ID
        let { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name, user_skill_level, user_learning_goals')
          .eq('id', user.id)
          .single();
        
        // If no user found by ID and we have an email, try to find by email instead
        if (userError && userError.code === 'PGRST116' && user.email) {
          console.log('User not found by ID, trying to find by email:', user.email);
          
          const { data: userByEmail, error: emailError } = await supabase
            .from('users')
            .select('id, email, first_name, last_name, user_skill_level, user_learning_goals')
            .eq('email', user.email)
            .single();
            
          if (!emailError && userByEmail) {
            console.log('Found user by email instead of ID');
            console.log('Auth ID:', user.id, 'Database ID:', userByEmail.id);
            userData = userByEmail;
            userError = null;
          } else if (emailError) {
            console.log('Error finding user by email:', emailError);
          }
        }
        
        if (userError) {
          console.error('Error fetching user data:', userError);
          
          // If error is about invalid column, try a more basic query
          if (userError.code === '42703') {
            console.log('Falling back to basic user data query');
            
            // Try first by ID
            let { data: basicUserData, error: basicError } = await supabase
              .from('users')
              .select('id, email, first_name, last_name')
              .eq('id', user.id)
              .single();
              
            // If no user found by ID, try by email  
            if (basicError && basicError.code === 'PGRST116' && user.email) {
              console.log('User not found by ID in basic query, trying email:', user.email);
              
              const { data: basicUserByEmail, error: basicEmailError } = await supabase
                .from('users')
                .select('id, email, first_name, last_name')
                .eq('email', user.email)
                .single();
                
              if (!basicEmailError && basicUserByEmail) {
                console.log('Found user by email in basic query');
                basicUserData = basicUserByEmail;
                basicError = null;
              }
            }
            
            if (basicError) {
              // If no rows returned, the user doesn't exist in DB yet
              if (basicError.code === 'PGRST116') {
                console.log('User not found in database, returning default values');
                return NextResponse.json({
                  id: user.id,
                  email: user.email || '',
                  firstName: '',
                  lastName: '',
                  skill_level: 'beginner',
                  learning_objectives: 'Not specified',
                  user_learning_goals: 'Not specified',
                  user_skill_level: 'beginner'
                });
              }
              
              return NextResponse.json(
                { error: 'Failed to fetch user data' },
                { status: 500 }
              );
            }
            
            // Make sure basicUserData is not null before using it
            if (!basicUserData) {
              console.log('basicUserData is null, using default values');
              return NextResponse.json({
                id: user.id,
                email: user.email || '',
                firstName: '',
                lastName: '',
                skill_level: 'beginner',
                learning_objectives: 'Not specified',
                user_learning_goals: 'Not specified',
                user_skill_level: 'beginner'
              });
            }
            
            // Return basic user data with default values for missing fields
            return NextResponse.json({
              id: basicUserData.id,
              email: basicUserData.email,
              firstName: basicUserData.first_name,
              lastName: basicUserData.last_name,
              skill_level: 'beginner',
              learning_objectives: 'Not specified',
              user_learning_goals: 'Not specified',
              user_skill_level: 'beginner'
            });
          }
          
          // If no rows returned, the user doesn't exist in DB yet
          if (userError.code === 'PGRST116') {
            console.log('User not found in database, returning default values');
            return NextResponse.json({
              id: user.id,
              email: user.email || '',
              firstName: '',
              lastName: '',
              skill_level: 'beginner',
              learning_objectives: 'Not specified',
              user_learning_goals: 'Not specified',
              user_skill_level: 'beginner'
            });
          }
          
          return NextResponse.json(
            { error: 'Failed to fetch user data' },
            { status: 500 }
          );
        }
        
        // Make sure userData is not null before using it
        if (!userData) {
          console.log('userData is null, using default values');
          return NextResponse.json({
            id: user.id,
            email: user.email || '',
            firstName: '',
            lastName: '',
            skill_level: 'beginner',
            learning_objectives: 'Not specified',
            user_learning_goals: 'Not specified',
            user_skill_level: 'beginner'
          });
        }
        
        // We have the user data, return it in a consistent format
        console.log('Successfully fetched user data:', {
          id: userData.id,
          email: userData.email,
          skill_level: userData.user_skill_level,
          learning_goals: userData.user_learning_goals
        });
        
        return NextResponse.json({
          id: userData.id,
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          skill_level: userData.user_skill_level || 'beginner',
          learning_objectives: userData.user_learning_goals || 'Not specified',
          user_learning_goals: userData.user_learning_goals || 'Not specified',
          user_skill_level: userData.user_skill_level || 'beginner'
        });
        
      } catch (specificError) {
        console.error('Specific error in profile data fetch:', specificError);
        return NextResponse.json(
          { error: 'Error processing user data' },
          { status: 500 }
        );
      }
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