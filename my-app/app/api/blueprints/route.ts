import { NextResponse } from "next/server";
import { createBlueprint, getBlueprints } from "@/utils/models";
import { z } from 'zod';
import { createStandardServerClient } from '@/utils/supabase';
import { blueprintApi } from '@/utils/blueprints-api';
import { ComplexityType } from "@/types/schema";

// Handler for GET /api/blueprints
export async function GET() {
  try {
    // Use mock user ID for now
    const userId = "user-1";
    
    // Get blueprints using the utility function
    const userBlueprints = await getBlueprints(userId);
    
    return NextResponse.json({ blueprints: userBlueprints });
  } catch (error) {
    console.error("Error fetching blueprints:", error);
    return NextResponse.json(
      { error: "Failed to fetch blueprints" },
      { status: 500 }
    );
  }
}

// Validation schema for POST request
const BlueprintCreateSchema = z.object({
  // Required fields
  title: z.string().min(1, "Title is required"),
  searchQuery: z.string().min(1, "Search query is required"),
  
  // Optional fields from reasoning agent
  complexity: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  estimatedTime: z.string().optional(),
  prerequisites: z.array(z.string()).optional(),
  
  // Original fields
  prompt: z.string().optional(),
  sessionId: z.string().uuid().optional(),
  skill_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  learning_objective: z.string().optional(),
  visibility: z.enum(['private', 'public', 'team']).optional(),
  team_id: z.string().uuid().optional(),
});

// Handler for POST /api/blueprints
export async function POST(request: Request) {
  try {
    // Get request data
    const data = await request.json();
    
    // Validate using Zod schema
    const result = BlueprintCreateSchema.safeParse(data);
    if (!result.success) {
      return NextResponse.json(
        { 
          error: "Invalid input", 
          details: result.error.format() 
        },
        { status: 400 }
      );
    }
    
    const validatedData = result.data;
    
    // Initialize Supabase client
    const supabase = createStandardServerClient();
    
    // Get the user ID from the session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // If a sessionId is provided, make sure to update the reasoning session with the blueprint ID
    if (validatedData.sessionId) {
      try {
        // Map the complexity to the correct type
        const complexityValue: ComplexityType | undefined = 
          validatedData.complexity as ComplexityType | undefined;
        
        // Create the blueprint using the API utility
        const { data: newBlueprint, error } = await blueprintApi.createBlueprint({
          title: validatedData.title,
          search_query: validatedData.searchQuery,
          prompt: validatedData.prompt || "",
          content: {},
          skill_level: validatedData.skill_level || validatedData.complexity,
          complexity: complexityValue,
          estimated_time: validatedData.estimatedTime,
          learning_objective: validatedData.learning_objective,
          visibility: validatedData.visibility || 'private',
          team_id: validatedData.team_id
        });
        
        if (error || !newBlueprint) {
          console.error("Error creating blueprint:", error);
          return NextResponse.json(
            { error: "Failed to create blueprint" },
            { status: 500 }
          );
        }
        
        // Update the reasoning session with the blueprint_id
        const { error: updateError } = await supabase
          .from('reasoning_sessions')
          .update({ 
            blueprint_id: newBlueprint.id,
            status: 'completed'
          })
          .eq('id', validatedData.sessionId);
        
        if (updateError) {
          console.error("Error updating reasoning session:", updateError);
          // Not a critical error, continue despite this
        }
        
        return NextResponse.json({ 
          blueprint: newBlueprint,
          id: newBlueprint.id
        }, { status: 201 });
      } catch (error) {
        console.error("Error in blueprint creation process:", error);
        return NextResponse.json(
          { error: "Failed to create blueprint" },
          { status: 500 }
        );
      }
    } else {
      // Legacy fallback path if no sessionId is provided
      try {
        // Use search query for prompt if not provided
        const promptToUse = validatedData.prompt || validatedData.searchQuery || "";
        
        // Create the blueprint using the legacy utility function
        const blueprint = await createBlueprint({
          title: validatedData.title,
          prompt: promptToUse,
          userId,
        });
        
        return NextResponse.json({ 
          blueprint, 
          id: blueprint.id 
        }, { status: 201 });
      } catch (error) {
        console.error("Error in legacy blueprint creation:", error);
        return NextResponse.json(
          { error: "Failed to create blueprint" },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error("Error in request processing:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
} 