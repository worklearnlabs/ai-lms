/**
 * A simple test file to verify that our authentication implementation works correctly
 * This can be run manually to debug authentication issues
 */

import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';

/**
 * This function tests if the client-side authentication is working properly
 */
export async function testClientAuth() {
  try {
    console.log('Initializing Supabase browser client...');
    
    // Create a browser client 
    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Check if we have a session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError.message);
      return { success: false, error: sessionError };
    }
    
    console.log(`Session check result: ${session ? 'Authenticated' : 'Not authenticated'}`);
    
    if (session) {
      console.log(`User ID: ${session.user.id}`);
      console.log(`User email: ${session.user.email}`);
      console.log(`Session expires at: ${new Date(session.expires_at! * 1000).toLocaleString()}`);
      
      // Test making an authenticated request
      console.log('Making a test authenticated request...');
      
      const testResponse = await fetch('/api/auth/test', { 
        method: 'GET',
        credentials: 'include'
      });
      
      const testResult = await testResponse.json();
      console.log('Test authenticated request result:', testResult);
      
      return { 
        success: true, 
        authenticated: true,
        userId: session.user.id,
        testResult 
      };
    }
    
    return { success: true, authenticated: false };
  } catch (error) {
    console.error('Unexpected error in testClientAuth:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// Export a function that can be called from the browser console
if (typeof window !== 'undefined') {
  (window as any).testAuth = testClientAuth;
}

/**
 * Instructions for testing:
 * 
 * 1. Add this file to your project
 * 2. Import it somewhere it will be included in your bundle
 * 3. Open browser console and run:
 *    > window.testAuth().then(console.log)
 * 
 * This will show whether authentication is working correctly
 */ 