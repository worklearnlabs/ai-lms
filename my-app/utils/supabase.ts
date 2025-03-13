/**
 * Legacy Supabase utilities
 * 
 * This file is maintained for backward compatibility.
 * New code should import from '@/utils/supabase/index' instead.
 */

// Re-export the new utilities for backward compatibility
export * from './supabase/index';

// For backward compatibility, re-export the default client
import { supabaseClient, createBrowserSupabaseClient } from './supabase/client';
export { supabaseClient as supabase };

// Add a re-export of createBrowserSupabaseClient as createClientSupabase for backward compatibility
export { createBrowserSupabaseClient as createClientSupabase };

// Import required types for exported functions
import { Database } from '@/types/supabase';
import { SupabaseClientOptions } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

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

// Import the token extraction function
import { extractSupabaseTokenFromCookies } from './supabase-auth';

// Export a default client for backward compatibility
export default supabaseClient; 