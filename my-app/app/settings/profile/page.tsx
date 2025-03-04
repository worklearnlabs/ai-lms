"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/src/lib/auth/auth-provider"
import { createClient } from "@/src/lib/supabase/client"

// Define a type for the database user format
interface DbUser {
  first_name?: string;
  last_name?: string;
  skill_level?: string;
  learning_objectives?: string;
  email?: string;
}

const profileFormSchema = z.object({
  firstName: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }),
  lastName: z.string().min(2, {
    message: "Last name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  skillLevel: z.enum(["basic", "intermediate", "advanced", "specialist"], {
    required_error: "Please select a skill level.",
  }),
  learningObjectives: z.string().max(1000, {
    message: "Learning objectives must not be longer than 1000 characters.",
  }).optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export default function ProfilePage() {
  const { user, updateUserProfile } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [dbUser, setDbUser] = useState<DbUser | null>(null)

  console.log("Profile page - User data:", user);
  console.log("Profile page - User properties:", user ? Object.keys(user) : "No user");
  console.log("Profile page - DB User:", dbUser);
  
  // Fetch user data directly from Supabase if auth context user is null
  useEffect(() => {
    async function fetchUserData() {
      if (!user) {
        try {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user?.email) {
            const { data, error } = await supabase
              .from("users")
              .select("*")
              .eq("email", session.user.email)
              .single();
            
            if (data && !error) {
              console.log("Fetched user data directly:", data);
              setDbUser(data);
            } else {
              console.error("Error fetching user data:", error);
            }
          }
        } catch (error) {
          console.error("Error in fetchUserData:", error);
        }
      }
    }
    
    fetchUserData();
  }, [user]);
  
  // Create default values with required fields
  const getDefaultValues = (): ProfileFormValues => {
    console.log("Getting default values with user:", user);
    console.log("Getting default values with dbUser:", dbUser);
    
    const skillLevel = user?.skillLevel || dbUser?.skill_level || "basic";
    console.log("Determined skill level:", skillLevel);
    
    return {
      firstName: user?.firstName || dbUser?.first_name || "John",
      lastName: user?.lastName || dbUser?.last_name || "Doe",
      email: user?.email || dbUser?.email || "user@example.com",
      skillLevel: skillLevel as "basic" | "intermediate" | "advanced" | "specialist",
      learningObjectives: user?.learningObjectives || dbUser?.learning_objectives || "",
    };
  };
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: getDefaultValues(),
  });
  
  // Reset form when user or dbUser changes
  useEffect(() => {
    console.log("useEffect triggered for form reset with user:", user);
    console.log("useEffect triggered for form reset with dbUser:", dbUser);
    
    if (user || dbUser) {
      const defaultValues = getDefaultValues();
      console.log("Resetting form with values:", defaultValues);
      form.reset(defaultValues);
    }
  }, [user, dbUser, form]);

  async function onSubmit(data: ProfileFormValues) {
    setIsLoading(true);
    
    try {
      console.log("Submitting profile update with data:", data);
      
      if (user) {
        console.log("Updating profile using auth provider");
        // Use auth provider's updateUserProfile if user is available
        const result = await updateUserProfile({
          firstName: data.firstName,
          lastName: data.lastName,
          skillLevel: data.skillLevel,
          learningObjectives: data.learningObjectives,
        });
        
        if (!result.success) {
          console.error("Error updating profile via auth provider:", result.error);
          throw new Error(result.error);
        }
        
        console.log("Profile updated successfully via auth provider");
      } else {
        console.log("Updating profile directly using Supabase client");
        // Update directly using Supabase client if user is not in auth context
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user?.email) {
          throw new Error("No active session found");
        }
        
        console.log("Found active session, updating user data");
        const { error } = await supabase
          .from("users")
          .update({
            first_name: data.firstName,
            last_name: data.lastName,
            skill_level: data.skillLevel,
            learning_objectives: data.learningObjectives,
          })
          .eq("email", session.user.email);
        
        if (error) {
          console.error("Error updating user data:", error);
          throw new Error(error.message);
        }
        
        console.log("User data updated, refreshing local state");
        // Refresh the local dbUser state
        const { data: updatedUser, error: fetchError } = await supabase
          .from("users")
          .select("*")
          .eq("email", session.user.email)
          .single();
        
        if (fetchError) {
          console.error("Error fetching updated user data:", fetchError);
        } else if (updatedUser) {
          console.log("Updated user data:", updatedUser);
          setDbUser(updatedUser);
        }
      }
      
      toast.success("Profile updated successfully");
      router.refresh();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Update your personal information and how others see you on the platform.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="john.doe@example.com" 
                    {...field} 
                    disabled 
                  />
                </FormControl>
                <FormDescription>
                  Your email address is used for login and cannot be changed.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="skillLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>AI Skill Level</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your AI skill level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="specialist">Specialist</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  This helps us personalize your learning experience.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="learningObjectives"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Learning Objectives</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="What do you want to achieve with AI? What are your learning goals?"
                    className="resize-none"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormDescription>
                  Describe your learning objectives to help us tailor content to your needs.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
            {isLoading ? (
              <>
                <span className="mr-2">Saving...</span>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </>
            ) : "Save changes"}
          </Button>
        </form>
      </Form>
    </div>
  )
} 