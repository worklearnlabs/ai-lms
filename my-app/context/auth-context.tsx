"use client"

import { useState, useEffect, useContext, createContext } from "react"
import { User } from "@/types/user"
import { useRouter } from "next/navigation"
import { createClientSupabase } from "@/utils/supabase"
import { toast } from "sonner"

interface AuthContextType {
  user: User | null
  isLoading: boolean
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
            const { data: userData, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()
            
            if (userData && !error) {
              setUser(userData as User)
              if (isDev) {
                console.log("User profile loaded successfully");
              }
            } else {
              // If user profile doesn't exist, create a minimal one
              if (isDev) {
                console.log("No user profile found, creating minimal profile...");
                if (error) {
                  console.warn("Database error:", error);
                }
              }
              
              const minimalUser: User = {
                id: session.user.id,
                email: session.user.email || '',
                role: 'user',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
              setUser(minimalUser)
              
              // Try to create the user profile
              try {
                const { error: insertError } = await supabase.from('users').insert({
                  id: session.user.id,
                  email: session.user.email,
                  role: 'user',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                
                if (insertError && isDev) {
                  console.warn("Error creating user profile:", insertError);
                }
              } catch (insertError) {
                if (isDev) {
                  console.warn("Exception creating user profile:", insertError);
                }
              }
            }
          } catch (error) {
            if (isDev) {
              console.error("Error fetching user data:", error);
            }
            // Use minimal user data from the session
            const minimalUser: User = {
              id: session.user.id,
              email: session.user.email || '',
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
              const minimalUser: User = {
                id: session.user.id,
                email: session.user.email || '',
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
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (userData && !error) {
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
            const minimalUser: User = {
              id: data.user.id,
              email: data.user.email || '',
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
          const minimalUser: User = {
            id: data.user.id,
            email: data.user.email || '',
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      if (data.user) {
        // Create user profile
        try {
          const { error: profileError } = await supabase.from('users').insert({
            id: data.user.id,
            email: data.user.email,
            full_name: fullName,
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
      updateUserProfile
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