// IMPORTANT: This is for DEVELOPMENT ONLY and should NEVER be used in production
// This file creates a Supabase client with admin privileges that bypasses RLS

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Create a Supabase client with admin privileges for development only
export function createDevAdminClient() {
  // Only allowed in development environment
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Admin client can only be used in development environment');
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or service role key');
    throw new Error('Missing required environment variables for admin client');
  }

  return createClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
} 