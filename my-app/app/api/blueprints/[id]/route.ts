import { NextResponse } from "next/server";
import { z } from 'zod';
import { createStandardServerClient } from '@/utils/supabase';
import { updateBlueprint, regenerateBlueprint } from "@/utils/models";
import { withRouteAuth } from '@/utils/route-handlers';
import { NextRequest } from 'next/server';

// Define validation schema for PATCH requests
const BlueprintUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  details: z.string().optional(),
  search_query: z.string().optional(),
  is_verified: z.boolean().optional(),
  is_temporary: z.boolean().optional(),
  visibility: z.enum(['private', 'public', 'team', 'workspace'] as const).optional(),
  team_id: z.string().uuid().optional().nullable(),
  workspace_id: z.string().uuid().optional().nullable(),
  skill_level: z.enum(['beginner', 'intermediate', 'advanced'] as const).optional(),
  user_skill_level: z.enum(['beginner', 'intermediate', 'advanced'] as const).optional(),
  learning_objective: z.string().optional().nullable(),
  blueprint_learning_focus: z.string().optional().nullable(),
  complexity: z.enum(['low', 'medium', 'high'] as const).optional(),
  estimated_time: z.string().optional(),
  status: z.enum(['draft', 'in_progress', 'completed', 'failed'] as const).optional(),
});

// GET endpoint to fetch a specific blueprint by ID
export async function GET(
  req: NextRequest, 
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
    
    // Get the Supabase client
    const supabase = auth.isAuthenticated && auth.supabase 
      ? auth.supabase
      : createStandardServerClient();
    
    // Try the RPC function first
    console.log(`Using RPC function to bypass RLS for fetching blueprint ${id}`);
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'get_blueprint_by_id',
      {
        p_blueprint_id: id,
        p_user_id: auth.user?.id || '00000000-0000-0000-0000-000000000000' // Anonymous ID
      }
    );
    
    // If RPC succeeded, return the results
    if (!rpcError && rpcResult?.success) {
      console.log(`Successfully retrieved blueprint ${id} via RPC`);
      return NextResponse.json(rpcResult.data);
    }
    
    // If RPC failed but reported specific error (like not found or unauthorized)
    if (!rpcError && rpcResult && !rpcResult.success) {
      console.log(`RPC function reported controlled error: ${rpcResult.error}`);
      return NextResponse.json(
        { error: rpcResult.error || 'Error fetching blueprint' },
        { status: rpcResult.status || 500 }
      );
    }
    
    // If RPC call itself failed, log the error and try direct query as fallback
    if (rpcError) {
      console.error(`RPC function error for blueprint ${id}:`, rpcError);
    }
    
    // Fallback to direct query as a last resort
    console.log(`Falling back to direct query for blueprint ${id}`);
    const directClient = createStandardServerClient();
    
    // Try direct query to get the blueprint
    const { data: blueprint, error } = await directClient
      .from('blueprints')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Direct query could not find blueprint ${id}, error:`, error);
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
    console.error(`Error fetching blueprint:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch blueprint', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Handler for PUT /api/blueprints/[id]
export async function PUT(request: NextRequest, context: { params: { id: string } }) {
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
export async function POST(request: NextRequest, context: { params: { id: string } }) {
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
  req: NextRequest,
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
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Properly await the params object
    const params = await context.params;
    const { id } = params;
    
    console.log(`DELETE /api/blueprints/${id} - Request to delete blueprint`);
    
    // Validate the ID
    if (!id) {
      console.log('Blueprint ID is missing in DELETE request');
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
    
    // Get authenticated client from the route handler
    const auth = await withRouteAuth(req);
    
    // If user is not authenticated, return an error
    if (!auth.isAuthenticated || !auth.supabase) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.log(`DELETE: Authenticated as user ${auth.user?.id} - Attempting to delete blueprint ${id}`);
    
    // Check if the client explicitly requested bypassing recursion
    const bypassRecursion = req.headers.get('X-Bypass-Recursion') === 'true';
    if (bypassRecursion) {
      console.log(`Client requested bypassing recursion for blueprint ${id}`);
    }
    
    // Use server client to completely bypass RLS
    const serverClient = createStandardServerClient();
    
    try {
      // First, check if this blueprint exists and verify ownership
      // Try to use regular API first
      let blueprint;
      try {
        const { data: blueprintData, error: checkError } = await serverClient
          .from('blueprints')
          .select('id, user_id, is_temporary')
          .eq('id', id)
          .maybeSingle();
        
        if (checkError) {
          console.error(`Error checking blueprint ${id}:`, checkError);
          
          // If there's recursion error, try direct SQL via RPC
          if (checkError.message.includes('recursion') || bypassRecursion) {
            console.log('Detected recursion error, using RPC function');
            try {
              const { data, error } = await serverClient.rpc('check_blueprint_access', {
                p_blueprint_id: id,
                p_user_id: auth.user?.id
              });
              
              if (error) {
                console.error('RPC check failed:', error);
              } else if (data) {
                blueprint = data;
              }
            } catch (rpcError) {
              console.error('RPC error:', rpcError);
            }
          }
        } else {
          blueprint = blueprintData;
        }
      } catch (fetchError) {
        console.error(`Error fetching blueprint ${id}:`, fetchError);
      }
      
      if (!blueprint) {
        console.log(`Blueprint ${id} not found`);
        return NextResponse.json(
          { error: 'Blueprint not found' },
          { status: 404 }
        );
      }
      
      // Security check: Verify this user can delete this blueprint
      const isOwner = blueprint.user_id === auth.user?.id;
      const isTemporary = blueprint.is_temporary === true;
      
      if (!isOwner && !isTemporary) {
        console.error(`User ${auth.user?.id} isn't authorized to delete blueprint ${id}`);
        return NextResponse.json(
          { error: 'Not authorized to delete this blueprint' },
          { status: 403 }
        );
      }
      
      // Security check passed - now use direct SQL queries to bypass all RLS
      
      // Step 1: Delete blueprint steps with proper method
      console.log(`DELETE: Deleting blueprint steps for blueprint ${id}`);
      try {
        const { error: stepsError } = await serverClient
          .from('blueprint_steps')
          .delete()
          .eq('blueprint_id', id);
        
        if (stepsError) {
          // If there's recursion error, try a more direct approach
          if (stepsError.message.includes('recursion') || bypassRecursion) {
            console.log('Detected recursion in step deletion, trying RPC');
            
            const { error: rpcError } = await serverClient.rpc('delete_blueprint_steps', {
              p_blueprint_id: id
            });
            
            if (rpcError) {
              console.error(`RPC error deleting steps for ${id}:`, rpcError);
            } else {
              console.log(`Successfully deleted steps for blueprint ${id} via RPC`);
            }
          } else {
            console.error(`Error deleting blueprint steps for ${id}:`, stepsError);
          }
        } else {
          console.log(`Successfully deleted steps for blueprint ${id}`);
        }
      } catch (stepsError) {
        console.error(`Exception deleting steps for ${id}:`, stepsError);
        // Continue with blueprint deletion anyway
      }
      
      // Step 2: Delete the blueprint with proper method
      console.log(`DELETE: Deleting blueprint ${id}`);
      try {
        const { data: deleteData, error: deleteError } = await serverClient
          .from('blueprints')
          .delete()
          .eq('id', id)
          .select('id, title, user_id, is_temporary')
          .maybeSingle();
        
        if (deleteError) {
          // If there's recursion error, try RPC function as a fallback
          if (deleteError.message.includes('recursion') || bypassRecursion) {
            console.log('Detected recursion in blueprint deletion, trying RPC');
            
            const { data: rpcData, error: rpcError } = await serverClient.rpc('delete_blueprint', {
              p_blueprint_id: id,
              p_user_id: auth.user?.id
            });
            
            if (rpcError) {
              console.error(`RPC error deleting blueprint ${id}:`, rpcError);
              return NextResponse.json({
                error: 'Failed to delete blueprint via RPC',
                details: rpcError.message
              }, { status: 500 });
            }
            
            console.log(`Successfully deleted blueprint ${id} via RPC`);
            return NextResponse.json({ 
              success: true, 
              data: rpcData || { id } 
            });
          }
          
          console.error(`Error deleting blueprint ${id}:`, deleteError);
          return NextResponse.json({
            error: 'Failed to delete blueprint',
            details: deleteError.message
          }, { status: 500 });
        }
        
        if (!deleteData) {
          console.log(`No blueprint with ID ${id} was found to delete`);
          return NextResponse.json({ 
            success: false, 
            message: 'No blueprint found to delete' 
          });
        }
        
        console.log(`Successfully deleted blueprint ${id}`);
        return NextResponse.json({ 
          success: true, 
          data: deleteData 
        });
      } catch (deleteError) {
        console.error(`Exception deleting blueprint ${id}:`, deleteError);
        return NextResponse.json({
          error: 'Exception during blueprint deletion',
          details: deleteError instanceof Error ? deleteError.message : 'Unknown error'
        }, { status: 500 });
      }
    } catch (error) {
      console.error(`Exception processing delete request for blueprint ${id}:`, error);
      return NextResponse.json({
        error: 'Exception during blueprint deletion process',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in DELETE blueprint endpoint:', error);
    return NextResponse.json({
      error: 'Failed to delete blueprint',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handler for HEAD /api/blueprints/[id]
export async function HEAD(request: NextRequest, context: { params: { id: string } }) {
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