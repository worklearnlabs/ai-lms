/**
 * Utility functions for synchronizing Supabase Auth users with our application users table
 */
import { createServiceRoleClient } from './supabase-admin';
import { createClientSupabase } from './supabase';

/**
 * Ensures that a Supabase Auth user has a corresponding record in the users table
 * Returns the application user ID (which may be the same as the auth ID)
 */
export async function ensureUserInDatabase(authUserId: string): Promise<{
  success: boolean;
  userId?: string;
  error?: string;
}> {
  try {
    console.log('Ensuring user exists in database:', authUserId);
    
    // Create a service client to bypass RLS for user operations
    const serviceClient = createServiceRoleClient();
    
    // First, check if user already exists with this ID
    const { data: existingUser, error: lookupError } = await serviceClient
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', authUserId)
      .single();
    
    if (lookupError && lookupError.code !== 'PGRST116') {
      // Log database error other than "not found"
      console.error('Error looking up user by ID:', lookupError);
    }
    
    if (existingUser) {
      console.log('User exists in database with matching ID');
      return { success: true, userId: existingUser.id };
    }
    
    // User doesn't exist with auth ID, get auth user details
    const { data: authData, error: authError } = await serviceClient.auth.admin.getUserById(authUserId);
    
    if (authError || !authData?.user) {
      console.error('Error fetching auth user details:', authError || 'No user found');
      return { success: false, error: 'Auth user not found' };
    }
    
    const authUser = authData.user;
    const userEmail = authUser.email;
    
    if (!userEmail) {
      console.error('Auth user has no email address');
      return { success: false, error: 'Auth user has no email address' };
    }
    
    // Check if user exists with this email
    const { data: userByEmail, error: emailLookupError } = await serviceClient
      .from('users')
      .select('id, email')
      .eq('email', userEmail)
      .single();
    
    if (emailLookupError && emailLookupError.code !== 'PGRST116') {
      // Log database error other than "not found"
      console.error('Error looking up user by email:', emailLookupError);
    }
    
    if (userByEmail) {
      console.log('Found user with matching email but different ID:', userByEmail.id);
      
      // We have two options here:
      // 1. Update the existing user record with the new auth ID (risky if there are foreign key constraints)
      // 2. Create a new user record with the auth ID (potentially orphaning user data)
      
      // For now, we'll just return the existing user ID
      // In a production system, you might want to update the ID or implement a more complex migration
      return { success: true, userId: userByEmail.id };
    }
    
    // Need to create a new user record
    console.log('Creating new user record for auth user');
    
    // Extract name from user metadata
    const fullNameFromMeta = authUser.user_metadata?.full_name || 'User';
    const nameParts = fullNameFromMeta.split(' ');
    const firstName = nameParts[0] && nameParts[0].trim() ? nameParts[0].trim() : 'User';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const { data: newUser, error: insertError } = await serviceClient
      .from('users')
      .insert({
        id: authUserId,
        email: userEmail,
        first_name: firstName,
        last_name: lastName,
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (insertError || !newUser) {
      console.error('Error creating user:', insertError || 'No user returned');
      return { success: false, error: insertError?.message || 'Failed to create user' };
    }
    
    console.log('Created new user record:', newUser.id);
    return { success: true, userId: newUser.id };
  } catch (error) {
    console.error('Exception in ensureUserInDatabase:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get the current user ID from the session and ensure they exist in the database
 * Returns null if no session exists or user cannot be created
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = createClientSupabase();
    const { data } = await supabase.auth.getSession();
    
    if (!data.session) {
      console.log('No active session');
      return null;
    }
    
    const authUserId = data.session.user.id;
    const { success, userId } = await ensureUserInDatabase(authUserId);
    
    if (!success || !userId) {
      console.error('Failed to ensure user exists in database');
      return null;
    }
    
    return userId;
  } catch (error) {
    console.error('Error in getCurrentUserId:', error);
    return null;
  }
} 