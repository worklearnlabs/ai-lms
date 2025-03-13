import { createServerClient } from '@supabase/ssr';
import { NextApiRequest, NextApiResponse } from 'next';
import { Database } from '@/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';

// Define extended request type that includes supabase client and user
export interface AuthenticatedRequest extends NextApiRequest {
  supabase: SupabaseClient<Database>;
  user: User;
}

// Define the handler function type
type ApiHandler<T = any> = (
  req: AuthenticatedRequest,
  res: NextApiResponse<T>
) => Promise<void | NextApiResponse<T>>;

/**
 * A wrapper for API routes that ensures authentication is properly maintained
 * This function wraps API handlers to provide authenticated Supabase client and user data
 */
export function withSupabaseAuth<T = any>(handler: ApiHandler<T>) {
  return async (req: NextApiRequest, res: NextApiResponse<T>) => {
    // Create a Supabase client with the request cookies
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => {
            // Parse cookies from the request headers
            const cookies = req.headers.cookie?.split(';')
              .map(cookie => cookie.trim().split('='))
              .reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
              }, {} as Record<string, string>) || {};
            
            return cookies[name];
          },
        },
      }
    );
    
    // Get the user - this validates the session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' } as T);
    }
    
    // Attach the supabase client and user to the request
    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.supabase = supabase;
    authenticatedReq.user = user;
    
    // Call the original handler
    return handler(authenticatedReq, res);
  };
} 