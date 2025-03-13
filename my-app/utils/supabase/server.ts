'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import { CookieOptions } from '@supabase/ssr';

/**
 * Creates a Supabase client for server components
 * This is the recommended way to create a client for server-side environments
 */
export async function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  const cookieStore = await cookies();
  
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          try {
            return cookieStore.get(name)?.value;
          } catch (error) {
            console.error('Error getting cookie:', error);
            return undefined;
          }
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, options);
          } catch (error) {
            console.error('Error setting cookie:', error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          } catch (error) {
            console.error('Error removing cookie:', error);
          }
        },
      },
    }
  );
} 