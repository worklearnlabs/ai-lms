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

// Add a debug helper function that can be called from the browser console
export async function debugUserData(userId?: string) {
  try {
    const supabase = createClientSupabase();
    
    // Check session if no userId provided
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log("No active session found");
        return null;
      }
      userId = session.user.id;
    }
    
    console.log("Fetching user data for ID:", userId);
    
    // Fetch user data from database
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
    
    if (!userData) {
      console.log("No user data found for ID:", userId);
      return null;
    }
    
    console.log("User data from database:", userData);
    return userData;
  } catch (error) {
    console.error("Debug error:", error);
    return null;
  }
}

// Add a function to update user name fields directly
export async function updateUserName(firstName: string, lastName: string) {
  try {
    const supabase = createClientSupabase();
    
    // Check session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log("No active session found");
      return { success: false, error: "No active session" };
    }
    
    // Ensure we never send null values for first_name due to the NOT NULL constraint
    if (!firstName || firstName.trim() === '') {
      firstName = 'User'; // Default value to satisfy NOT NULL constraint
    }
    
    const userId = session.user.id;
    console.log(`Updating name for user ${userId} to: ${firstName} ${lastName}`);
    
    // Update the user profile
    const { error } = await supabase
      .from('users')
      .update({
        first_name: firstName,
        last_name: lastName || '', // Ensure we don't send null for last_name either
      })
      .eq('id', userId);
    
    if (error) {
      console.error("Error updating user name:", error);
      return { success: false, error: error.message };
    }
    
    console.log("Name updated successfully");
    return { success: true };
  } catch (error) {
    console.error("Update error:", error);
    return { success: false, error: (error as Error).message };
  }
}

// Add a function to refresh user data by creating a reload event
export async function refreshUserData() {
  try {
    // Create and dispatch a custom event that our components can listen for
    const event = new CustomEvent('force-refresh-user');
    window.dispatchEvent(event);
    
    console.log("Refresh event dispatched - check console for updated user data");
    
    // Also directly check the current user data
    await debugUserData();
    
    return { success: true, message: "Refresh event dispatched" };
  } catch (error) {
    console.error("Refresh error:", error);
    return { success: false, error: (error as Error).message };
  }
}

// Add a function to fix the user ID mismatch issue
export async function syncUserAccount() {
  try {
    const supabase = createClientSupabase();
    
    // Check session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log("No active session found");
      return { success: false, error: "No active session" };
    }
    
    const authId = session.user.id;
    const authEmail = session.user.email;
    
    if (!authEmail) {
      return { success: false, error: "No email in session" };
    }
    
    console.log(`Checking for user account with email: ${authEmail}`);
    
    // First, try to find the user by auth ID
    const { data: userById } = await supabase
      .from('users')
      .select('*')
      .eq('id', authId)
      .single();
    
    if (userById) {
      console.log("User found by ID, checking if names need to be updated");
      
      // Ensure first_name is not null
      if (!userById.first_name) {
        console.log("Updating missing first_name...");
        await updateUserName("User", userById.last_name || "");
      }
      
      return { success: true, user: userById, message: "User already synced" };
    }
    
    console.log("User not found by ID, looking up by email...");
    
    // If not found by ID, try to find by email
    const { data: userByEmail } = await supabase
      .from('users')
      .select('*')
      .eq('email', authEmail)
      .single();
    
    if (userByEmail) {
      console.log("Found user by email but with different ID. Current data:", userByEmail);
      
      // Create a new user with the correct auth ID and same data
      const userData = {
        id: authId,
        email: authEmail,
        first_name: userByEmail.first_name || "User",
        last_name: userByEmail.last_name || "",
        role: userByEmail.role || "user",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      console.log("Creating new user with correct ID:", userData);
      
      const { error: insertError } = await supabase
        .from('users')
        .insert(userData);
      
      if (insertError) {
        console.error("Error creating user with correct ID:", insertError);
        return { success: false, error: insertError.message };
      }
      
      console.log("User account synced successfully");
      return { success: true, message: "User account synced" };
    }
    
    // If user not found by either ID or email, create a new one
    console.log("User not found at all, creating new account");
    
    // Get name from user metadata if available
    const fullNameFromMeta = session.user.user_metadata?.full_name || 'User';
    const nameParts = fullNameFromMeta.split(' ');
    const firstName = nameParts[0] && nameParts[0].trim() ? nameParts[0].trim() : 'User';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const userData = {
      id: authId,
      email: authEmail,
      first_name: firstName,
      last_name: lastName,
      role: "user",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const { error: createError } = await supabase
      .from('users')
      .insert(userData);
    
    if (createError) {
      console.error("Error creating new user:", createError);
      return { success: false, error: createError.message };
    }
    
    console.log("New user account created successfully");
    return { success: true, message: "New user created" };
    
  } catch (error) {
    console.error("Sync error:", error);
    return { success: false, error: (error as Error).message };
  }
} 