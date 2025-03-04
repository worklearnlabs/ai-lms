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
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ 
    success: boolean; 
    error?: string;
    requiresEmailConfirmation?: boolean;
    message?: string;
  }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserProfile: (userData: Partial<User>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  console.log("useAuth hook called, returning context with user:", context.user);
  return context;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  // Initialize Supabase client
  const supabase = createClientSupabase();
  
  // Ensure Supabase client is properly initialized
  useEffect(() => {
    console.log("Supabase client initialized:", !!supabase);
  }, [supabase]);

  // Fetch user data from Supabase
  const fetchUserData = async (userId: string): Promise<User | null> => {
    try {
      console.log("Fetching user data for userId:", userId);
      
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
      
      console.log("Auth user email:", authData.user.email);
      
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
          console.log("User exists in Auth but not in database yet, creating user profile");
          
          // Create a basic user profile
          const newUser: Partial<User> = {
            id: userId,
            email: authData.user.email,
            firstName: authData.user.user_metadata?.firstName || '',
            lastName: authData.user.user_metadata?.lastName || '',
            role: 'user'
          };
          
          const { data: insertData, error: insertError } = await supabase
            .from("users")
            .insert([{
              id: userId,
              email: authData.user.email,
              first_name: newUser.firstName,
              last_name: newUser.lastName,
              role: 'user'
            }])
            .select()
            .single();
            
          if (insertError) {
            console.error("Error creating user profile:", insertError);
            return null;
          }
          
          console.log("Created new user profile:", insertData);
          
          // Map the newly created user data
          return {
            id: userId,
            email: authData.user.email,
            firstName: newUser.firstName || '',
            lastName: newUser.lastName || '',
            role: 'user'
          } as User;
        }
        
        return null;
      }
      
      if (!userData) {
        console.error("No user data found for email:", authData.user.email);
        return null;
      }
      
      console.log("Raw user data from database:", userData);
      console.log("Database field names:", Object.keys(userData));
      
      // Map the database fields to the User interface fields
      const mappedUser = {
        id: userId,
        email: userData.email,
        firstName: userData.first_name || '',
        lastName: userData.last_name || '',
        role: userData.role || 'user',
        skillLevel: userData.skill_level || '',
        learningObjectives: userData.learning_objectives || '',
        preferredLearningStyle: userData.preferred_learning_style || '',
        bio: userData.bio || '',
        title: userData.title || '',
        experience: userData.experience || '',
        created_at: userData.created_at,
        updated_at: userData.updated_at
      } as User;
      
      console.log("Mapped user with skill level:", mappedUser.skillLevel);
      console.log("Full mapped user:", mappedUser);
      
      return mappedUser;
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
      console.log("User data from fetchUserData in refreshUser:", userData);
      if (userData) {
        setUser(userData);
        console.log("User state set in refreshUser:", userData);
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
        console.log("Initializing auth state");
        
        // Check for existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error getting session:", sessionError);
          setIsLoading(false);
          return;
        }
        
        if (session) {
          console.log("Session found in initializeAuth:", session.user.id);
          const userData = await fetchUserData(session.user.id);
          console.log("User data from fetchUserData in initializeAuth:", userData);
          if (userData) {
            setUser(userData);
            console.log("User state set in initializeAuth:", userData);
          } else {
            console.error("Failed to fetch user data for existing session");
            // Sign out if we can't get the user data to avoid a broken state
            await supabase.auth.signOut();
          }
        } else {
          console.log("No session found in initializeAuth");
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
        console.log("Auth state changed:", event, session?.user.id);
        
        if (event === "SIGNED_IN" && session) {
          const userData = await fetchUserData(session.user.id);
          if (userData) {
            setUser(userData);
            console.log("User set after SIGNED_IN event:", userData);
            router.refresh();
          } else {
            console.error("Failed to fetch user data after SIGNED_IN event");
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          console.log("User set to null after SIGNED_OUT event");
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
      console.log("Attempting to sign in with email:", email);
      
      // Clear any existing session first to avoid conflicts
      await supabase.auth.signOut();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Error signing in:", error.message);
        return { success: false, error: error.message };
      }

      console.log("User signed in successfully:", data.user?.id);

      if (data.user) {
        // Fetch user data from the database
        const userData = await fetchUserData(data.user.id);
        console.log("User data from fetchUserData in signIn:", userData);

        if (userData) {
          setUser(userData);
          console.log("User state set in signIn:", userData);
          return { success: true };
        } else {
          console.error("Failed to fetch or create user data after successful authentication");
          return { 
            success: false, 
            error: "Failed to fetch or create user profile. Please try again." 
          };
        }
      }

      return { success: false, error: "No user data returned from sign in" };
    } catch (error) {
      console.error("Unexpected error in signIn:", error);
      return { 
        success: false, 
        error: "An unexpected error occurred during sign in" 
      };
    }
  };

  // Sign up a new user
  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      setIsLoading(true);
      
      // Create the user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            firstName,
            lastName,
          },
        },
      });
      
      if (error) {
        console.error("Error signing up:", error);
        return { success: false, error: error.message };
      }
      
      // Check if email confirmation is required
      if (data.user && !data.user.confirmed_at) {
        return { 
          success: true, 
          requiresEmailConfirmation: true,
          message: "Please check your email to confirm your account."
        };
      }
      
      // Create the user in the database
      if (data.user) {
        // Create user in the database
        const { error: userError } = await supabase
          .from("users")
          .insert([
            {
              id: data.user.id,
              email: email,
              first_name: firstName,
              last_name: lastName,
              role: "user",
            },
          ]);
        
        if (userError) {
          console.error("Error creating user in database:", userError);
          
          // If there was an error creating the user in the database,
          // we should delete the user from Auth to keep things consistent
          await supabase.auth.admin.deleteUser(data.user.id);
          
          return { success: false, error: userError.message };
        }
      }
      
      // Refresh the user data
      await refreshUser();
      
      return { success: true };
    } catch (error) {
      console.error("Unexpected error in signUp:", error);
      return { success: false, error: "An unexpected error occurred" };
    } finally {
      setIsLoading(false);
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

  // Update user profile
  const updateUserProfile = async (userData: Partial<User>) => {
    try {
      if (!user || !user.id) {
        return { success: false, error: "User not authenticated" };
      }

      // Get current session to ensure user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { success: false, error: "No active session" };
      }

      // Prepare data for update
      const updateData: Record<string, string | number | boolean | null | undefined> = {};
      
      // Map fields to database column names if needed
      if (userData.firstName !== undefined) updateData.first_name = userData.firstName;
      if (userData.lastName !== undefined) updateData.last_name = userData.lastName;
      if (userData.skillLevel !== undefined) updateData.skill_level = userData.skillLevel;
      if (userData.learningObjectives !== undefined) updateData.learning_objectives = userData.learningObjectives;
      if (userData.preferredLearningStyle !== undefined) updateData.preferred_learning_style = userData.preferredLearningStyle;
      if (userData.role !== undefined) updateData.role = userData.role;
      // Note: bio and title fields removed as they're no longer used

      console.log("Updating user profile with data:", updateData);

      // Update the user in the database
      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", user.id);

      if (error) {
        console.error("Error updating user profile:", error);
        return { success: false, error: error.message };
      }

      // Refresh user data
      try {
        await refreshUser();
        console.log("User profile updated successfully");
      } catch (refreshError) {
        console.error("Error refreshing user data after update:", refreshError);
        // Continue with success even if refresh fails
        // The update was successful, we just couldn't refresh the local state
      }
      
      return { success: true };
    } catch (error) {
      console.error("Error in updateUserProfile:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      };
    }
  };

  const value = {
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshUser,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} 