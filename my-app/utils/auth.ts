/**
 * Authentication utilities
 */
import { createClientSupabase } from './supabase';

// Export the auth provider and hook from context for backward compatibility
export { AuthProvider, useAuth } from '../context/auth-context';

// Initialize the Supabase client
const supabase = createClientSupabase();

/**
 * Function to check if a user is authenticated
 * This is a simplified version for use in API routes
 */
export async function getAuthenticatedUser() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return null;
    }
    
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (error || !userData) {
      console.error("Error fetching user data:", error);
      return null;
    }
    
    return userData;
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
} 