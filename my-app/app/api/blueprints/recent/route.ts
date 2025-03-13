import { NextResponse } from 'next/server';
import { withRouteAuth } from '@/utils/route-handlers';

/**
 * GET /api/blueprints/recent
 * Returns the most recently created blueprints for the current user
 * Optional query param: limit (number of records to return)
 */
export async function GET(req: Request) {
  try {
    // Parse URL to get query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    
    // Validate limit is a reasonable number
    const validLimit = Math.min(Math.max(1, limit), 50); // Between 1 and 50
    
    // Use the withRouteAuth utility to get authentication status and Supabase client
    const { isAuthenticated, user, supabase } = await withRouteAuth(req);
    
    // If supabase client is not available, return an error
    if (!supabase) {
      console.error('Failed to initialize Supabase client');
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }
    
    // If user is not authenticated, return limited recent public blueprints only
    if (!isAuthenticated || !user) {
      console.log('User not authenticated, returning public blueprints only');
      
      // We still use the supabase client from withRouteAuth
      const { data, error } = await supabase
        .from('blueprints')
        .select('id, title, prompt, is_temporary, created_at')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(validLimit);
      
      if (error) {
        console.error('Error fetching public blueprints:', error);
        return NextResponse.json(
          { error: 'Failed to fetch blueprints' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(data || []);
    }
    
    // User is authenticated, return their recent blueprints
    const { data, error } = await supabase
      .from('blueprints')
      .select('id, title, prompt, is_temporary, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(validLimit);
    
    if (error) {
      console.error('Error fetching user blueprints:', error);
      return NextResponse.json(
        { error: 'Failed to fetch blueprints' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Unhandled error in GET /api/blueprints/recent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
