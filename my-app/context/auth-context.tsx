"use client"

import { useState, useEffect, useContext, createContext } from "react"
import { User } from "@/types/user"
import { useRouter } from "next/navigation"
import { createClientSupabase } from "@/utils/supabase"
import { toast } from "sonner"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  authError: string | null
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ 
    success: boolean; 
    error?: string;
    requiresEmailConfirmation?: boolean;
    message?: string;
  }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  updateUserProfile: (userData: Partial<User>) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientSupabase()

  useEffect(() => {
    // Check if the user is already signed in
    const checkUser = async () => {
      try {
        // Check if we're running in development mode
        const isDev = process.env.NODE_ENV === 'development';
        
        // In development, we can log helpful information
        if (isDev) {
          console.log("Checking authentication status...");
        }
        
        // Check the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          setAuthError(`Session error: ${sessionError.message}`);
          setIsLoading(false);
          return;
        }
        
        if (session) {
          if (isDev) {
            console.log("User is authenticated, fetching profile...");
          }
          
          // Get user data from Supabase
          try {
            // IMPORTANT: We first try to find the user by their Auth ID
            // This is the primary lookup method that should work in most cases
            let { data: userData, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            // FALLBACK: If we can't find the user by ID, try by email instead
            // This handles cases where the auth ID doesn't match the database ID
            // or when there are permission issues with ID-based lookup
            if (!userData && error && error.code === 'PGRST116') {
              if (isDev) {
                console.log("User not found by ID, trying email lookup...");
              }
              
              const { data: emailUserData, error: emailError } = await supabase
                .from('users')
                .select('*')
                .eq('email', session.user.email)
                .single();
              
              if (emailUserData && !emailError) {
                userData = emailUserData;
                error = null;
                if (isDev) {
                  console.log("User found by email instead of ID");
                }
              }
            }
            
            if (userData && !error) {
              setUser(userData as User);
              if (isDev) {
                console.log("User profile loaded successfully", userData);
              }
            } else {
              // User not found in database, we need to create or handle this case
              if (isDev) {
                console.log("No user profile found, creating minimal profile...");
                if (error) {
                  console.warn("Database error:", error);
                }
              }
              
              // Extract name from Supabase Auth metadata if available
              // We check both full_name and name fields for maximum compatibility
              const fullNameFromMeta = session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'User';
              const nameParts = fullNameFromMeta.split(' ');
              
              // IMPORTANT: first_name must never be null or empty due to database constraints
              const first_name = nameParts[0] && nameParts[0].trim() ? nameParts[0].trim() : 'User';
              const last_name = nameParts.slice(1).join(' ') || '';
              
              // Create a minimal user object to use while we attempt database operations
              // This ensures we have user data for the UI even if database operations fail
              const minimalUser: User = {
                id: session.user.id,
                email: session.user.email || '',
                first_name,
                last_name,
                role: 'user',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              
              // CRITICAL: Set the user state immediately to prevent null user objects
              // This ensures components have access to basic user data even if DB operations fail
              setUser(minimalUser);
              
              // Now try to persist this user to the database (might fail but UI will still work)
              try {
                // IMPORTANT: First check if user already exists with this email
                // This prevents the "duplicate key" error when emails already exist
                const { data: existingUser } = await supabase
                  .from('users')
                  .select('id')
                  .eq('email', session.user.email)
                  .single();
                
                if (existingUser) {
                  // Found existing user with same email - update it instead of creating new
                  if (isDev) console.log("User already exists with this email, updating instead of inserting");
                  
                  // Update the existing record with the current session ID and name information
                  // This resolves ID mismatches between auth and database records
                  const { error: updateError } = await supabase
                    .from('users')
                    .update({
                      id: session.user.id, // Sync the DB ID with Auth ID
                      first_name,
                      last_name,
                      updated_at: new Date().toISOString()
                    })
                    .eq('email', session.user.email);
                  
                  if (updateError && isDev) {
                    console.warn("Error updating existing user:", updateError);
                  }
                } else {
                  // No existing user found, proceed with normal creation flow
                  // First get schema information to understand the table structure
                  const { error: schemaError, data: schemaData } = await supabase
                    .from('users')
                    .select('*')
                    .limit(1);
                  
                  if (schemaError) {
                    console.warn("Error fetching schema:", schemaError);
                  }
                  
                  if (isDev && schemaData) {
                    console.log("User schema sample:", schemaData);
                  }
                  
                  // Create new user with all required fields
                  // IMPORTANT: Never use null values for required fields
                  const userData = {
                    id: session.user.id,
                    email: session.user.email,
                    first_name: first_name, // Always provide a value, never null
                    last_name: last_name || '', // Default to empty string if null
                    role: 'user',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  };
                  
                  const { error: insertError } = await supabase
                    .from('users')
                    .insert(userData);
                  
                  if (insertError && isDev) {
                    console.warn("Error creating user profile:", insertError);
                  }
                }
              } catch (insertError) {
                // Even if this fails, we already set the user state above,
                // so the UI will still have basic user data to work with
                if (isDev) {
                  console.warn("Exception in user profile creation/update:", insertError);
                }
              }
            }
          } catch (error) {
            if (isDev) {
              console.error("Error fetching user data:", error);
            }
            // Use minimal user data from the session
            const fullNameFromMeta = session.user.user_metadata?.full_name || 'User';
            const nameParts = fullNameFromMeta.split(' ');
            // Ensure first_name is never empty to satisfy NOT NULL constraint
            const first_name = nameParts[0] && nameParts[0].trim() ? nameParts[0].trim() : 'User';
            const last_name = nameParts.slice(1).join(' ') || '';
            
            const minimalUser: User = {
              id: session.user.id,
              email: session.user.email || '',
              first_name,
              last_name,
              role: 'user',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
            setUser(minimalUser)
          }
        } else if (isDev) {
          console.log("No active session found");
        }
      } catch (error) {
        console.error("Authentication error:", error);
        setAuthError("Authentication system unavailable");
      } finally {
        setIsLoading(false);
      }
    }
    
    checkUser()
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Get user data when signed in
          try {
            const { data: userData, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()
            
            if (userData && !error) {
              setUser(userData as User)
              toast.success("Signed in successfully")
            } else {
              // If user profile doesn't exist, use session data
              const fullNameFromMeta = session.user.user_metadata?.full_name || 'User';
              const nameParts = fullNameFromMeta.split(' ');
              // Ensure first_name is never empty to satisfy NOT NULL constraint
              const first_name = nameParts[0] && nameParts[0].trim() ? nameParts[0].trim() : 'User';
              const last_name = nameParts.slice(1).join(' ') || '';
              
              const minimalUser: User = {
                id: session.user.id,
                email: session.user.email || '',
                first_name,
                last_name,
                role: 'user',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
              setUser(minimalUser)
            }
          } catch (error) {
            console.error("Error fetching user data on auth change:", error)
            toast.error("Error loading user profile")
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          toast.info("Signed out")
        }
      }
    )
    
    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const refreshUser = async (): Promise<void> => {
    if (!user) return
    
    try {
      console.log("Refreshing user data for:", user.id);
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (userData && !error) {
        console.log("Refreshed user data:", userData);
        setUser(userData as User)
      } else {
        console.error("Error refreshing user data:", error)
      }
    } catch (error) {
      console.error("Exception refreshing user data:", error)
    }
  }

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      if (data.user) {
        // Get user data
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single()
          
          if (userData && !userError) {
            setUser(userData as User)
            return { success: true }
          } else {
            // Create a minimal user profile if none exists
            const fullNameFromMeta = data.user.user_metadata?.full_name || 'User';
            const nameParts = fullNameFromMeta.split(' ');
            // Ensure first_name is never empty to satisfy NOT NULL constraint
            const first_name = nameParts[0] && nameParts[0].trim() ? nameParts[0].trim() : 'User';
            const last_name = nameParts.slice(1).join(' ') || '';
            
            const minimalUser: User = {
              id: data.user.id,
              email: data.user.email || '',
              first_name,
              last_name,
              role: 'user',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
            setUser(minimalUser)
            
            // Try to create a profile
            try {
              await supabase.from('users').insert({
                id: data.user.id,
                email: data.user.email,
                first_name: first_name, // Ensure this is never null or empty
                last_name: last_name || '', // Ensure this is never null
                role: 'user',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
            } catch (insertError) {
              console.warn("Could not create user profile during sign in", insertError)
            }
            
            return { success: true }
          }
        } catch (fetchError) {
          console.error("Error fetching user data during sign in:", fetchError)
          // Still allow sign in using just the auth data
          const fullNameFromMeta = data.user.user_metadata?.full_name || 'User';
          const nameParts = fullNameFromMeta.split(' ');
          // Ensure first_name is never empty to satisfy NOT NULL constraint
          const first_name = nameParts[0] && nameParts[0].trim() ? nameParts[0].trim() : 'User';
          const last_name = nameParts.slice(1).join(' ') || '';
          
          const minimalUser: User = {
            id: data.user.id,
            email: data.user.email || '',
            first_name,
            last_name,
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          setUser(minimalUser)
          return { success: true }
        }
      }
      
      return { success: false, error: "Unknown error occurred" }
    } catch (error: unknown) {
      const authError = error as Error
      return { success: false, error: authError.message || "Failed to sign in" }
    }
  }

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut()
    setUser(null)
    router.push('/login')
  }

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<{ 
    success: boolean; 
    error?: string;
    requiresEmailConfirmation?: boolean;
    message?: string;
  }> => {
    try {
      // Split fullName into first_name and last_name
      const nameParts = fullName.split(' ');
      // Ensure firstName is never empty to satisfy NOT NULL constraint
      const firstName = nameParts[0] && nameParts[0].trim() ? nameParts[0].trim() : 'User';
      const lastName = nameParts.slice(1).join(' ') || '';

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName, // Keep for compatibility
            first_name: firstName,
            last_name: lastName,
          },
        },
      })
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      if (data.user) {
        // Create user profile
        try {
          console.log("Creating user profile with:", {
            id: data.user.id,
            email: data.user.email,
            firstName,
            lastName
          });
          
          const { error: profileError } = await supabase.from('users').insert({
            id: data.user.id,
            email: data.user.email,
            first_name: firstName, // This should never be null or empty
            last_name: lastName || '', // Ensure this is never null
          })
          
          if (profileError) {
            console.error('Failed to create user profile:', profileError)
            return { success: false, error: 'Failed to create user profile' }
          }
        } catch (profileErr: unknown) {
          const err = profileErr as Error
          console.error('Exception creating user profile:', err)
          return { success: false, error: 'Exception creating user profile' }
        }
        
        // Check if email confirmation is required
        if (data.session === null) {
          return { 
            success: true, 
            requiresEmailConfirmation: true,
            message: "Please check your email to confirm your account before logging in."
          }
        }
        
        // If session exists, user is already confirmed
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single()
        
        if (userData && !userError) {
          setUser(userData as User)
        }
        
        return { success: true }
      }
      
      return { success: false, error: "Unknown error occurred" }
    } catch (error: unknown) {
      const authError = error as Error
      return { success: false, error: authError.message || "Failed to sign up" }
    }
  }

  const updateUserProfile = async (userData: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }
    
    try {
      const { error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', user.id)
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      // Refresh user data
      await refreshUser()
      
      return { success: true }
    } catch (error: unknown) {
      const err = error as Error
      return { success: false, error: err.message || "Failed to update profile" }
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      signIn, 
      signOut, 
      signUp, 
      refreshUser,
      updateUserProfile,
      authError
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
} 