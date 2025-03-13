import { NextResponse } from "next/server";
import { z } from 'zod';
import { createStandardServerClient } from '@/utils/supabase';
import { updateBlueprint, regenerateBlueprint } from "@/utils/models";

// Define validation schema for PATCH requests
const BlueprintUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  search_query: z.string().optional(),
  is_verified: z.boolean().optional(),
  is_temporary: z.boolean().optional(),
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
  context: { params: { id: string } }
) {
  try {
    // Properly await the params object
    const params = await context.params;
    const { id } = params;
    console.log(`GET /api/blueprints/${id} - Fetching blueprint`);
    
    // Validate the ID
    if (!id) {
      console.log('Blueprint ID is missing');
      return NextResponse.json(
        { error: 'Blueprint ID is required' },
        { status: 400 }
      );
    }
    
    // Format validation for UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.error(`Invalid UUID format for blueprint ID: ${id}`);
      return NextResponse.json(
        { error: 'Invalid blueprint ID format' },
        { status: 400 }
      );
    }
    
    // Get the blueprint from Supabase - simple approach
    const supabase = createStandardServerClient();
    console.log(`Querying Supabase for blueprint with ID: ${id}`);
    
    // First check if this is a temporary blueprint - it might have been deleted
    const { data: tempCheck, error: tempCheckError } = await supabase
      .from('blueprints')
      .select('id, is_temporary')
      .eq('id', id)
      .maybeSingle();
      
    if (tempCheckError) {
      console.error(`Error checking blueprint ${id}:`, tempCheckError);
    } else if (!tempCheck) {
      console.log(`Blueprint with ID ${id} not found in database`);
      return NextResponse.json(
        { error: 'Blueprint not found', details: 'No blueprint with this ID exists in the database' },
        { status: 404 }
      );
    } else if (tempCheck.is_temporary) {
      console.log(`Blueprint ${id} is marked as temporary`);
    }
    
    // Try to fetch with details directly
    const { data: blueprint, error } = await supabase
      .from('blueprints')
      .select(`
        *,
        steps:blueprint_steps(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching blueprint ${id}:`, error);
      
      // Provide more specific error messages based on the error code
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Blueprint not found', details: 'Blueprint exists but may not be accessible due to permissions' },
          { status: 404 }
        );
      }
      
      if (error.code === 'PGRST104') {
        return NextResponse.json(
          { error: 'Blueprint not found', details: 'No blueprint with this ID exists in the database' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Error fetching blueprint', details: error.message, code: error.code },
        { status: 500 }
      );
    }
    
    if (!blueprint) {
      console.log(`Blueprint with ID ${id} not found in query result`);
      return NextResponse.json(
        { error: 'Blueprint not found', details: 'No blueprint with this ID exists in the database' },
        { status: 404 }
      );
    }
    
    console.log(`Successfully retrieved blueprint ${id}`);
    
    // Return the blueprint directly instead of wrapping it
    return NextResponse.json(blueprint);
  } catch (error) {
    console.error('Error fetching blueprint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blueprint', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Handler for PUT /api/blueprints/[id]
export async function PUT(request: Request, context: { params: { id: string } }) {
  try {
    // Properly await the params object
    const params = await context.params;
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
    console.error(`Error updating blueprint:`, error);
    return NextResponse.json(
      { error: "Failed to update blueprint" },
      { status: 500 }
    );
  }
}

// Handler for POST /api/blueprints/[id]/regenerate
export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    // Properly await the params object
    const params = await context.params;
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
    console.error(`Error regenerating blueprint:`, error);
    return NextResponse.json(
      { error: "Failed to regenerate blueprint" },
      { status: 500 }
    );
  }
}

// PATCH endpoint to update a blueprint
export async function PATCH(
  req: Request,
  context: { params: { id: string } }
) {
  try {
    // Properly await the params object
    const params = await context.params;
    const { id } = params;
    
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
      .maybeSingle();
    
    if (fetchError) {
      return NextResponse.json(
        { error: 'Error verifying blueprint existence', details: fetchError.message },
        { status: 500 }
      );
    }
    
    if (!existingBlueprint) {
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
  context: { params: { id: string } }
) {
  try {
    // Properly await the params object
    const params = await context.params;
    const { id } = params;
    
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
      .maybeSingle();
    
    if (fetchError) {
      return NextResponse.json(
        { error: 'Error verifying blueprint existence', details: fetchError.message },
        { status: 500 }
      );
    }
    
    if (!existingBlueprint) {
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

// Handler for HEAD /api/blueprints/[id]
export async function HEAD(request: Request, context: { params: { id: string } }) {
  try {
    // Properly await the params object
    const params = await context.params;
    const { id } = params;
    
    console.log(`HEAD /api/blueprints/${id} - Checking if blueprint exists`);
    
    // Validate the ID
    if (!id) {
      console.log('Blueprint ID is missing in HEAD request');
      return new Response(null, { 
        status: 400,
        headers: {
          'X-Error': 'Missing blueprint ID',
          'X-Debug-Info': 'Blueprint ID not provided in request'
        }
      });
    }
    
    // Format validation for UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.error(`Invalid UUID format for blueprint ID in HEAD request: ${id}`);
      return new Response(null, { 
        status: 400,
        headers: {
          'X-Error': 'Invalid blueprint ID format',
          'X-Debug-Info': `ID "${id}" does not match UUID format`
        }
      });
    }
    
    // Get the blueprint from Supabase - simple approach
    const supabase = createStandardServerClient();
    
    // Check if the blueprint exists - also get is_temporary field to log it
    const { data, error } = await supabase
      .from('blueprints')
      .select('id, is_temporary, created_at')
      .eq('id', id)
      .maybeSingle(); // Use maybeSingle to avoid errors for non-existent IDs
    
    if (error) {
      console.error(`Database error in HEAD request for blueprint ${id}:`, error);
      return new Response(null, { 
        status: 500,
        headers: {
          'X-Error': 'Database error',
          'X-Debug-Info': `${error.code}: ${error.message}`
        }
      });
    }
    
    if (!data) {
      console.log(`Blueprint with ID ${id} does not exist (HEAD request)`);
      
      // Log the result from a more direct query to help debug
      try {
        const { count, error: countError } = await supabase
          .from('blueprints')
          .select('id', { count: 'exact', head: true })
          .eq('id', id);
          
        if (countError) {
          console.error(`Error in count query for ID ${id}:`, countError);
        } else {
          console.log(`Count query result for ID ${id}: ${count}`);
        }
      } catch (debugError) {
        console.error(`Error in debug count query:`, debugError);
      }
      
      // Check recent blueprints to help debug
      try {
        const { data: recentBlueprints, error: recentError } = await supabase
          .from('blueprints')
          .select('id, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (recentError) {
          console.error('Error fetching recent blueprints:', recentError);
        } else if (recentBlueprints) {
          console.log('Most recent blueprints:', recentBlueprints.map(bp => 
            `${bp.id} (created: ${bp.created_at})`).join(', '));
        }
      } catch (debugError) {
        console.error(`Error in recent blueprints query:`, debugError);
      }
      
      return new Response(null, { 
        status: 404,
        headers: {
          'X-Error': 'Blueprint not found',
          'X-Debug-Info': `Blueprint ${id} does not exist in database`
        }
      });
    }
    
    // If the blueprint is temporary, log it
    if (data.is_temporary) {
      console.log(`Blueprint with ID ${id} exists and is temporary (HEAD request)`);
    } else {
      console.log(`Blueprint with ID ${id} exists (HEAD request)`);
    }
    
    // Return success with some useful headers
    return new Response(null, { 
      status: 200,
      headers: {
        'X-Blueprint-Found': 'true',
        'X-Blueprint-Type': data.is_temporary ? 'temporary' : 'permanent',
        'X-Blueprint-Created': data.created_at || 'unknown'
      }
    });
  } catch (error) {
    console.error('Error in HEAD request for blueprint:', error);
    return new Response(null, { 
      status: 500,
      headers: {
        'X-Error': 'Server error',
        'X-Debug-Info': error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
} 