import { z } from "zod";

/**
 * Validation schemas for API requests
 */

/**
 * Schema for AI research requests
 */
export const ResearchRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  detailed: z.boolean().optional().default(false),
});

export type ResearchRequest = z.infer<typeof ResearchRequestSchema>;

/**
 * Schema for blueprint creation requests
 */
export const BlueprintCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  prompt: z.string().min(1, "Prompt is required"),
  userId: z.string().optional(),
});

export type BlueprintCreateRequest = z.infer<typeof BlueprintCreateSchema>;

/**
 * Schema for blueprint update requests
 */
export const BlueprintUpdateSchema = z.object({
  title: z.string().optional(),
  prompt: z.string().optional(),
  content: z.array(
    z.object({
      type: z.enum(['heading', 'paragraph', 'list']),
      content: z.string().optional(),
      items: z.array(z.string()).optional(),
    })
  ).optional(),
  isVerified: z.boolean().optional(),
});

export type BlueprintUpdateRequest = z.infer<typeof BlueprintUpdateSchema>;

/**
 * Schema for user profile update requests
 */
export const ProfileUpdateSchema = z.object({
  fullName: z.string().optional(),
  phone: z.string().optional(),
  skillLevel: z.string().optional(),
  experience: z.string().optional(),
  learningObjectives: z.string().optional(),
  preferredLearningStyle: z.string().optional(),
});

export type ProfileUpdateRequest = z.infer<typeof ProfileUpdateSchema>;

/**
 * Schema for user registration requests
 */
export const RegisterUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1, "Full name is required"),
});

export type RegisterUserRequest = z.infer<typeof RegisterUserSchema>;

/**
 * Schema for user login requests
 */
export const LoginUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginUserRequest = z.infer<typeof LoginUserSchema>; 