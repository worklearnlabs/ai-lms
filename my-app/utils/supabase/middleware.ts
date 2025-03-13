import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

/**
 * Updates the Supabase session in the middleware
 * This should be called in the main middleware.ts file
 */
export async function updateSession(request: NextRequest) {
  // Create a response object that we'll modify and then return
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create a Supabase client with the request and response cookies
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => {
          return request.cookies.get(name)?.value;
        },
        set: (name, value, options) => {
          // Update both the request and response cookies
          request.cookies.set({
            name,
            value,
            ...options,
          });
          
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove: (name, options) => {
          // Update both the request and response cookies
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // This will refresh the session if it's expired
  await supabase.auth.getUser();

  return response;
} 