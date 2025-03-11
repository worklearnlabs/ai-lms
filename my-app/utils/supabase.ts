import { createBrowserClient } from '@supabase/ssr';
import { createClient, SupabaseClientOptions } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { extractSupabaseTokenFromCookies } from './supabase-auth';

// --------------------------
// Client-side Supabase Client
// --------------------------
export const createClientSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'undefined' || supabaseAnonKey === 'undefined') {
    console.error('Missing or invalid Supabase environment variables');
    // Return a non-functional client that won't throw errors but won't work
    return createClient<Database>(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        },
      }
    ) as ReturnType<typeof createBrowserClient<Database>>;
  }
  
  // For browser client, we don't need to specify cookies
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  );
};

// For backward compatibility
export const supabase = createClientSupabase();

// Legacy server client using standard supabase-js
export function createStandardServerClient(headers?: Headers) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables');
  }

  const options: SupabaseClientOptions<'public'> = {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {}
    }
  };

  // If we have headers, try to get the auth cookie
  if (headers) {
    console.log('=== CREATING STANDARD SERVER CLIENT WITH HEADERS ===');
    const cookieHeader = headers.get('cookie') || '';
    
    if (cookieHeader) {
      console.log('Cookie header found, length:', cookieHeader.length);
      
      // Log all available cookies for debugging
      const cookies = parseCookies(cookieHeader);
      console.log('Available cookies:', Object.keys(cookies).join(', '));

      try {
        // Extract the token from cookies
        const accessToken = extractSupabaseTokenFromCookies(cookieHeader);
        
        if (accessToken) {
          console.log('Successfully extracted access token, length:', accessToken.length);
          
          // Set the Authorization header with the Bearer token
          options.global = {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          };
        } else {
          console.log('No access token extracted from cookies');
          
          // Fall back to using the cookie header directly if we can't extract the token
          options.global = {
            headers: {
              cookie: cookieHeader,
            },
          };
        }
      } catch (error) {
        console.error('Error extracting token from cookies:', error);
        
        // Fall back to using the cookie header directly
        options.global = {
          headers: {
            cookie: cookieHeader,
          },
        };
      }
    } else {
      console.log('No cookie header found');
    }
  } else {
    console.log('No headers provided to createStandardServerClient');
  }

  // Create the Supabase client with the prepared options
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    options
  );
}

// Helper function to parse cookies
function parseCookies(cookieHeader: string) {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.split('=').map(c => c.trim());
    if (name && value) cookies[name] = value;
  });
  return cookies;
} 