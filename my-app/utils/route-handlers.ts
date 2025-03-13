import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';
import { User } from '@supabase/supabase-js';

/**
 * A wrapper for App Router route handlers that ensures authentication
 * This function creates a Supabase client and validates the session
 * 
 * @param request The incoming request object
 * @returns An object with the authenticated user, Supabase client, and utility functions
 */
export async function withRouteAuth(request: Request) {
  // Function to return unauthorized response
  const unauthorized = () => {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  };

  // Get cookies from the request
  const cookies = request.headers.get('cookie') || '';
  
  // Create a Supabase client with the request cookies
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const match = cookies.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
          return match ? decodeURIComponent(match[3]) : undefined;
        },
      },
    }
  );
  
  // Get the user - this validates the session
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    console.error('Auth error in route handler:', error?.message || 'No user found');
    return { isAuthenticated: false, unauthorized };
  }
  
  return {
    isAuthenticated: true,
    user,
    supabase,
    unauthorized
  };
}

/**
 * Type for the return value of withRouteAuth
 */
export type RouteAuthResult = {
  isAuthenticated: boolean;
  user?: User;
  supabase?: ReturnType<typeof createServerClient<Database>>;
  unauthorized: () => NextResponse;
}; 