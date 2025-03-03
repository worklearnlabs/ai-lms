"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClientSupabase } from "../supabase/client";
import { User } from "../../types/user";
import { useRouter } from "next/navigation";
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ 
    success: boolean; 
    error?: string;
    requiresEmailConfirmation?: boolean;
    message?: string;
  }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientSupabase();

  // Fetch user data from Supabase
  const fetchUserData = async (userId: string): Promise<User | null> => {
    try {
      // First, get the user's email from Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error("Error fetching auth user:", authError);
        return null;
      }
      
      if (!authData.user?.email) {
        console.error("No email found for user");
        return null;
      }
      
      // Then, get the user's data from the users table using the email
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", authData.user.email)
        .single();
      
      if (userError) {
        console.error("Error fetching user data:", userError);
        
        // Check if the error is because the user doesn't exist
        if (userError.code === 'PGRST116') {
          console.log("User exists in Auth but not in database yet");
          return null;
        }
        
        return null;
      }
      
      if (!userData) {
        console.error("No user data found for email:", authData.user.email);
        return null;
      }
      
      // Map the database fields to the User interface fields
      return {
        ...userData,
        name: userData.full_name,
        id: userId,
      } as User;
    } catch (error) {
      console.error("Unexpected error in fetchUserData:", error);
      return null;
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setUser(null);
        return;
      }
      
      const userData = await fetchUserData(session.user.id);
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      
      try {
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const userData = await fetchUserData(session.user.id);
          if (userData) {
            setUser(userData);
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeAuth();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        if (event === "SIGNED_IN" && session) {
          const userData = await fetchUserData(session.user.id);
          if (userData) {
            setUser(userData);
            router.refresh();
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          router.refresh();
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      if (data.user) {
        // Try to fetch user data
        const userData = await fetchUserData(data.user.id);
        
        if (userData) {
          // User exists in the database
          setUser(userData);
          return { success: true };
        } else {
          // User exists in Supabase Auth but not in the database yet
          // This can happen after email confirmation
          // Create the user profile in the database
          const { error: profileError } = await supabase
            .from("users")
            .insert([
              {
                // Don't include id, let the database generate it automatically
                email: data.user.email,
                full_name: data.user.email?.split('@')[0] || 'User', // Use part of email as name if not provided
                role: "user",
              },
            ]);
            
          if (profileError) {
            return { success: false, error: `Failed to create user profile: ${profileError.message}` };
          }
          
          // Fetch the newly created user
          const { data: newUserData, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("email", data.user.email)
            .single();
            
          if (userError || !newUserData) {
            return { success: false, error: "Failed to fetch newly created user profile" };
          }
          
          // Set the user
          setUser({
            ...newUserData,
            name: newUserData.full_name,
            id: data.user.id,
          } as User);
          
          return { success: true };
        }
      }
      
      return { success: false, error: "Failed to fetch user data" };
    } catch (error) {
      console.error("Error signing in:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "An unknown error occurred" 
      };
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, name: string) => {
    try {
      // Create auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      if (data.user) {
        // Create user profile in the database
        const { error: profileError } = await supabase
          .from("users")
          .insert([
            {
              // Don't include id, let the database generate it automatically
              email,
              full_name: name,
              role: "user",
            },
          ]);
          
        if (profileError) {
          return { success: false, error: profileError.message };
        }
        
        // Fetch the newly created user by email since we don't know the auto-generated id
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .single();
          
        if (userError) {
          return { success: false, error: userError.message };
        }
        
        // Check if email confirmation is required
        if (data.session) {
          // User is automatically signed in (email confirmation not required)
          // Map database fields to User interface fields
          if (userData) {
            setUser({
              ...userData,
              name: userData.full_name, // Map full_name to name for the User interface
              id: data.user.id, // Use the Supabase Auth ID for the user interface
            } as User);
            return { success: true };
          }
        } else {
          // Email confirmation is required
          // We don't set the user, but we return success so the UI can show a confirmation message
          return { 
            success: true, 
            requiresEmailConfirmation: true,
            message: "Please check your email to confirm your account before logging in."
          };
        }
      }
      
      return { success: false, error: "Failed to create user profile" };
    } catch (error) {
      console.error("Error signing up:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "An unknown error occurred" 
      };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      console.log("Signing out...");
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Error during sign out:", error.message);
        return;
      }
      
      console.log("Sign out successful, clearing user state");
      setUser(null);
      
      console.log("Redirecting to login page");
      router.push("/login");
    } catch (error) {
      console.error("Unexpected error during sign out:", error);
    }
  };

  const value = {
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} 