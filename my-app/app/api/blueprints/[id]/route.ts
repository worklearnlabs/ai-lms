import { NextResponse } from "next/server";
import { z } from 'zod';
import { createStandardServerClient } from '@/utils/supabase';
import { updateBlueprint, regenerateBlueprint } from "@/utils/models";

interface RouteParams {
  params: {
    id: string;
  };
}

// Define validation schema for PATCH requests
const BlueprintUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  search_query: z.string().optional(),
  is_verified: z.boolean().optional(),
  visibility: z.enum(['private', 'public', 'team'] as const).optional(),
  team_id: z.string().uuid().optional().nullable(),
  skill_level: z.enum(['beginner', 'intermediate', 'advanced'] as const).optional(),
  learning_objective: z.string().optional().nullable(),
  complexity: z.enum(['low', 'medium', 'high'] as const).optional(),
  estimated_time: z.string().optional(),
  status: z.enum(['draft', 'in_progress', 'completed', 'failed'] as const).optional(),
});

// GET endpoint to fetch a specific blueprint by ID
export async function GET(
  req: Request, 
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Validate the ID
    if (!id) {
      return NextResponse.json(
        { error: 'Blueprint ID is required' },
        { status: 400 }
      );
    }
    
    // Get the blueprint from Supabase
    const supabase = createStandardServerClient();
    const { data: blueprint, error } = await supabase
      .from('blueprints')
      .select(`
        *,
        steps:blueprint_steps(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: 'Blueprint not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ blueprint });
  } catch (error) {
    console.error('Error fetching blueprint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blueprint' },
      { status: 500 }
    );
  }
}

// Handler for PUT /api/blueprints/[id]
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const data = await request.json();
    
    const blueprint = await updateBlueprint(id, data);
    
    if (!blueprint) {
      return NextResponse.json(
        { error: "Blueprint not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ blueprint });
  } catch (error) {
    console.error(`Error updating blueprint ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to update blueprint" },
      { status: 500 }
    );
  }
}

// Handler for POST /api/blueprints/[id]/regenerate
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }
    
    const blueprint = await regenerateBlueprint(id, prompt);
    
    if (!blueprint) {
      return NextResponse.json(
        { error: "Blueprint not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ blueprint });
  } catch (error) {
    console.error(`Error regenerating blueprint ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to regenerate blueprint" },
      { status: 500 }
    );
  }
}

// PATCH endpoint to update a blueprint
export async function PATCH(
  req: Request,
  { params }: RouteParams
) {
  try {
    const id = params.id;
    
    // Validate the ID
    if (!id) {
      return NextResponse.json(
        { error: 'Blueprint ID is required' },
        { status: 400 }
      );
    }
    
    // Get the request body
    const body = await req.json();
    
    // Validate the input
    const result = BlueprintUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input', 
          details: result.error.format() 
        },
        { status: 400 }
      );
    }
    
    const updateData = result.data;
    
    // Initialize Supabase client
    const supabase = createStandardServerClient();
    
    // Verify the blueprint exists
    const { data: existingBlueprint, error: fetchError } = await supabase
      .from('blueprints')
      .select('id, is_verified')
      .eq('id', id)
      .single();
    
    if (fetchError || !existingBlueprint) {
      return NextResponse.json(
        { error: 'Blueprint not found' },
        { status: 404 }
      );
    }
    
    // If updating verification status, check if all steps are completed
    if (updateData.is_verified === true && !existingBlueprint.is_verified) {
      // Get all steps for this blueprint
      const { data: steps, error: stepsError } = await supabase
        .from('blueprint_steps')
        .select('status')
        .eq('blueprint_id', id);
      
      if (stepsError) {
        return NextResponse.json(
          { error: 'Failed to verify steps' },
          { status: 500 }
        );
      }
      
      // Check if all steps are completed
      const allCompleted = steps && steps.every(step => step.status === 'completed');
      
      if (!allCompleted) {
        return NextResponse.json(
          { error: 'Cannot verify blueprint: not all steps are completed' },
          { status: 400 }
        );
      }
    }
    
    // Update the blueprint
    const { data: updatedBlueprint, error: updateError } = await supabase
      .from('blueprints')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update blueprint' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ blueprint: updatedBlueprint });
  } catch (error) {
    console.error('Error updating blueprint:', error);
    return NextResponse.json(
      { error: 'Failed to update blueprint' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a blueprint
export async function DELETE(
  req: Request,
  { params }: RouteParams
) {
  try {
    const id = params.id;
    
    // Validate the ID
    if (!id) {
      return NextResponse.json(
        { error: 'Blueprint ID is required' },
        { status: 400 }
      );
    }
    
    // Initialize Supabase client
    const supabase = createStandardServerClient();
    
    // Verify the blueprint exists
    const { data: existingBlueprint, error: fetchError } = await supabase
      .from('blueprints')
      .select('id')
      .eq('id', id)
      .single();
    
    if (fetchError || !existingBlueprint) {
      return NextResponse.json(
        { error: 'Blueprint not found' },
        { status: 404 }
      );
    }
    
    // Delete the blueprint's steps first (cascade will handle subtasks)
    await supabase
      .from('blueprint_steps')
      .delete()
      .eq('blueprint_id', id);
    
    // Delete the blueprint
    const { error: deleteError } = await supabase
      .from('blueprints')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete blueprint' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting blueprint:', error);
    return NextResponse.json(
      { error: 'Failed to delete blueprint' },
      { status: 500 }
    );
  }
} 