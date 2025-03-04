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
import { createClientSupabase } from "@/src/lib/supabase/client"

// Define a type for the database user format
interface DbUser {
  first_name?: string;
  last_name?: string;
  email?: string;
  skill_level?: string;
  learning_objectives?: string;
  preferred_learning_style?: string;
}

const profileFormSchema = z.object({
  firstName: z
    .string()
    .min(2, {
      message: "First name must be at least 2 characters.",
    })
    .max(30, {
      message: "First name must not be longer than 30 characters.",
    }),
  lastName: z
    .string()
    .min(2, {
      message: "Last name must be at least 2 characters.",
    })
    .max(30, {
      message: "Last name must not be longer than 30 characters.",
    }),
  email: z
    .string()
    .email({
      message: "Please enter a valid email address.",
    })
    .optional(),
  skillLevel: z.string().optional(),
  learningObjectives: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export default function ProfilePage() {
  const { user, updateUserProfile } = useAuth()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dbUser, setDbUser] = useState<DbUser | null>(null)
  
  // Fetch user data directly from Supabase if auth context user is null
  useEffect(() => {
    async function fetchUserData() {
      try {
        setIsSubmitting(true);
        
        // Always try to fetch from Supabase directly for this page
        try {
          const supabase = createClientSupabase();
          
          const { data } = await supabase.auth.getSession();
          
          const session = data.session;
          
          if (!session) {
            return;
          }
          
          // Try to fetch user data by email
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("email", session.user.email)
            .single();
          
          if (userError) {
            // If that fails, try by ID
            const { data: userDataById } = await supabase
              .from("users")
              .select("*")
              .eq("id", session.user.id)
              .single();
            
            if (userDataById) {
              setDbUser({
                first_name: userDataById.first_name,
                last_name: userDataById.last_name,
                skill_level: userDataById.skill_level,
                learning_objectives: userDataById.learning_objectives,
                email: userDataById.email,
                preferred_learning_style: userDataById.preferred_learning_style
              });
            }
          } else if (userData) {
            setDbUser({
              first_name: userData.first_name,
              last_name: userData.last_name,
              skill_level: userData.skill_level,
              learning_objectives: userData.learning_objectives,
              email: userData.email,
              preferred_learning_style: userData.preferred_learning_style
            });
          }
        } catch {
          // Handle Supabase error silently
        }
      } catch {
        // Handle general error silently
      } finally {
        setIsSubmitting(false);
      }
    }
    
    fetchUserData();
  }, [user]);
  
  // Create default values with required fields
  const getDefaultValues = (): ProfileFormValues => {
    const skillLevel = user?.skillLevel || dbUser?.skill_level || "basic";
    
    if (user) {
      return {
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || dbUser?.email || "user@example.com",
        skillLevel: skillLevel as "basic" | "intermediate" | "advanced" | "specialist",
        learningObjectives: user.learningObjectives || dbUser?.learning_objectives || "",
      };
    }
    
    // When using dbUser, ensure we're properly handling the values
    return {
      firstName: dbUser?.first_name || "",
      lastName: dbUser?.last_name || "",
      email: dbUser?.email || "",
      skillLevel: skillLevel as "basic" | "intermediate" | "advanced" | "specialist",
      learningObjectives: dbUser?.learning_objectives || "",
    };
  };
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: getDefaultValues(),
  });
  
  // Reset form when user or dbUser changes
  useEffect(() => {
    if (user || (dbUser && (dbUser.first_name || dbUser.last_name))) {
      getDefaultValues();
      
      // Force reset with specific values to ensure they're applied
      form.reset({
        firstName: user?.firstName || dbUser?.first_name || "",
        lastName: user?.lastName || dbUser?.last_name || "",
        email: user?.email || dbUser?.email || "",
        skillLevel: (user?.skillLevel || dbUser?.skill_level || "basic") as "basic" | "intermediate" | "advanced" | "specialist",
        learningObjectives: user?.learningObjectives || dbUser?.learning_objectives || "",
      } as ProfileFormValues);
      
      // Manually set field values as a backup
      if (dbUser?.first_name) {
        form.setValue("firstName", dbUser.first_name);
      }
      if (dbUser?.last_name) {
        form.setValue("lastName", dbUser.last_name);
      }
    }
  }, [user, dbUser, form]);

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSubmitting(true);
    
    try {
      if (user) {
        const result = await updateUserProfile({
          firstName: data.firstName,
          lastName: data.lastName,
          skillLevel: data.skillLevel,
          learningObjectives: data.learningObjectives,
        });
        
        if (!result.success) {
          throw new Error(result.error);
        }
      } else {
        const supabase = createClientSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user?.email) {
          throw new Error("No active session found");
        }
        
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
          throw new Error(error.message);
        }
        
        // Refresh the local dbUser state
        const { data: updatedUser, error: fetchError } = await supabase
          .from("users")
          .select("*")
          .eq("email", session.user.email)
          .single();
        
        if (fetchError) {
          throw new Error(fetchError.message);
        } else if (updatedUser) {
          setDbUser(updatedUser);
        }
      }
      
      toast.success("Profile updated successfully");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Update your personal information.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} value={field.value || ""} />
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
                    <Input placeholder="Doe" {...field} value={field.value || ""} />
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
                    placeholder="example@domain.com" 
                    {...field} 
                    value={field.value || ""} 
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
                    className="resize-none min-h-[120px]"
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

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </Form>
    </div>
  )
} 