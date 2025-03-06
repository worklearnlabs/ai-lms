import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

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
export function createStandardServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'undefined' || supabaseAnonKey === 'undefined') {
    console.error('Missing or invalid Supabase environment variables');
    throw new Error("Missing or invalid Supabase environment variables");
  }
  
  // Create a standard client for server operations
  return createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
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
  );
} 