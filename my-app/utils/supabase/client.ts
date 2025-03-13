import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';

/**
 * Creates a Supabase client for client-side usage
 * This is the recommended way to create a client for browser environments
 */
export function createBrowserSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  );
}

// Export a singleton instance for convenience
export const supabaseClient = createBrowserSupabaseClient(); 