import { NextResponse } from "next/server";
import { z } from 'zod';
import { createStandardServerClient } from '@/utils/supabase';
import { updateBlueprint, regenerateBlueprint } from "@/utils/models";
import { withRouteAuth } from '@/utils/route-handlers';

// Define validation schema for PATCH requests
const BlueprintUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  details: z.string().optional(),
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
    
    // Get authenticated Supabase client using our withRouteAuth utility
    const auth = await withRouteAuth(req);
    console.log(`GET /api/blueprints/${id} - Auth status: ${auth.isAuthenticated ? 'Authenticated' : 'Not authenticated'}`);
    
    // Always use a Supabase client - either authenticated or standard
    const supabase = auth.isAuthenticated && auth.supabase 
      ? auth.supabase
      : createStandardServerClient();
      
    console.log(`Querying Supabase for blueprint with ID: ${id}`);
    
    // Direct query using createStandardServerClient to bypass auth issues
    const directClient = createStandardServerClient();
    console.log(`Also trying direct client query as fallback for ID: ${id}`);
    
    // First try direct query to verify record exists
    const { data: directCheckData, error: directCheckError } = await directClient
      .from('blueprints')
      .select('id, is_temporary, created_at')
      .eq('id', id)
      .maybeSingle();
      
    if (directCheckData) {
      console.log(`Direct query found blueprint ${id}, created_at: ${directCheckData.created_at}, is_temporary: ${directCheckData.is_temporary}`);
    } else {
      console.log(`Direct query could not find blueprint ${id}, error:`, directCheckError);
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
      
      // Try again with direct client if original query failed but direct check worked
      if (directCheckData) {
        console.log(`Trying alternative fetch for ${id} using direct client`);
        
        const { data: altBlueprint, error: altError } = await directClient
          .from('blueprints')
          .select(`
            *,
            steps:blueprint_steps(*)
          `)
          .eq('id', id)
          .single();
          
        if (!altError && altBlueprint) {
          console.log(`Successfully retrieved blueprint ${id} using direct client`);
          return NextResponse.json(altBlueprint);
        } else {
          console.error(`Alternative fetch for ${id} also failed:`, altError);
        }
      }
      
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
    
    // Get authenticated Supabase client using our withRouteAuth utility
    const auth = await withRouteAuth(request);
    console.log(`HEAD request for blueprint ${id} - Auth status: ${auth.isAuthenticated ? 'Authenticated' : 'Not authenticated'}`);
    
    // Try multiple clients to find the blueprint
    const directClient = createStandardServerClient();
    console.log(`Using direct client to ensure we can find blueprint ${id}`);
    
    // Check if the blueprint exists - also get is_temporary field to log it
    let data = null;
    let error = null;
    
    // First try authenticated client if available
    if (auth.isAuthenticated && auth.supabase) {
      const result = await auth.supabase
        .from('blueprints')
        .select('id, is_temporary, created_at, user_id')
        .eq('id', id)
        .maybeSingle();
        
      data = result.data;
      error = result.error;
      
      console.log(`Auth client query for ${id}: ${data ? 'Found' : 'Not found'}`);
    }
    
    // If not found with auth client, try direct client
    if (!data) {
      console.log(`Trying direct client for blueprint ${id}`);
      const result = await directClient
        .from('blueprints')
        .select('id, is_temporary, created_at, user_id')
        .eq('id', id)
        .maybeSingle();
        
      data = result.data;
      error = result.error;
      
      console.log(`Direct client query for ${id}: ${data ? 'Found' : 'Not found'}`);
    }
    
    if (error && error.code !== 'PGRST116') {
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
        // Try with a count query first
        const { count, error: countError } = await directClient
          .from('blueprints')
          .select('id', { count: 'exact', head: true })
          .eq('id', id);
          
        if (countError) {
          console.error(`Error in count query for ID ${id}:`, countError);
        } else {
          console.log(`Count query result for ID ${id}: ${count}`);
        }
        
        // Also try raw SQL query if possible
        try {
          const { data: rawData, error: rawError } = await directClient.rpc('check_blueprint_exists', { 
            blueprint_id: id 
          });
          
          if (rawError) {
            console.error('Error in raw check:', rawError);
          } else {
            console.log(`Raw blueprint check result:`, rawData);
          }
        } catch (rpcError) {
          console.log('RPC check not available:', rpcError);
        }
      } catch (debugError) {
        console.error(`Error in debug count query:`, debugError);
      }
      
      // Check recent blueprints to help debug
      try {
        const { data: recentBlueprints, error: recentError } = await directClient
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
    
    // For non-temporary blueprints, verify user has access if authenticated
    if (!data.is_temporary && auth.isAuthenticated && auth.user && data.user_id && data.user_id !== auth.user.id) {
      console.error(`User ${auth.user.id} does not have access to blueprint ${id} owned by ${data.user_id}`);
      return new Response(null, { 
        status: 403,
        headers: {
          'X-Error': 'Access denied',
          'X-Debug-Info': `User does not have access to this blueprint`
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
        'X-Blueprint-Created': data.created_at || 'unknown',
        'X-Blueprint-User': data.user_id || 'none'
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