/**
 * Supabase Auth System Test
 * 
 * This file contains tests to verify the correctness of the new Supabase auth implementation.
 * Run these tests to ensure authentication is working properly after migration.
 */

import { supabaseClient } from '../supabase/client';
import { get } from '../fetch-wrapper';

/**
 * Test authentication workflow
 * 
 * This function tests a complete authentication workflow:
 * 1. Sign in
 * 2. Make authenticated API requests
 * 3. Check user data
 * 4. Sign out
 */
export async function testAuthWorkflow(email: string, password: string) {
  const results = {
    signIn: false,
    getUserData: false,
    apiRequest: false,
    signOut: false
  };
  
  try {
    // Step 1: Sign in
    console.log('Testing sign in...');
    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    
    if (signInError) {
      throw new Error(`Sign in failed: ${signInError.message}`);
    }
    
    if (signInData.user) {
      console.log('✅ Sign in successful');
      results.signIn = true;
    }
    
    // Step 2: Get user data
    console.log('Testing user data retrieval...');
    const { data: { user }, error: getUserError } = await supabaseClient.auth.getUser();
    
    if (getUserError) {
      throw new Error(`Get user failed: ${getUserError.message}`);
    }
    
    if (user) {
      console.log('✅ User data retrieval successful');
      results.getUserData = true;
    }
    
    // Step 3: Make an authenticated API request
    console.log('Testing authenticated API request...');
    try {
      const apiData = await get('/api/auth/test');
      if (apiData.authenticated) {
        console.log('✅ Authenticated API request successful');
        results.apiRequest = true;
      } else {
        throw new Error('API authentication check failed');
      }
    } catch (error) {
      throw new Error(`API request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Step 4: Sign out
    console.log('Testing sign out...');
    const { error: signOutError } = await supabaseClient.auth.signOut();
    
    if (signOutError) {
      throw new Error(`Sign out failed: ${signOutError.message}`);
    } else {
      console.log('✅ Sign out successful');
      results.signOut = true;
    }
    
    // Final verification
    if (Object.values(results).every(result => result === true)) {
      console.log('✅ ALL TESTS PASSED - Auth system is working correctly');
      return { success: true, results };
    } else {
      console.log('❌ SOME TESTS FAILED - Check individual test results');
      return { success: false, results };
    }
    
  } catch (error) {
    console.error('❌ AUTH TEST FAILED:', error instanceof Error ? error.message : error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      results
    };
  }
}

/**
 * Run this test from the browser console
 */
export async function runAuthTest(email: string, password: string) {
  console.log('🧪 Running Supabase Auth System Test...');
  return await testAuthWorkflow(email, password);
}

// Export default for easy importing
export default {
  testAuthWorkflow,
  runAuthTest
}; 