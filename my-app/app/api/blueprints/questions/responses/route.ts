import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createRouteHandler } from '@/utils/route-handlers';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Define schema for POST request
const SaveResponsesSchema = z.object({
  blueprint_id: z.string().uuid(),
  responses: z.record(z.string(), z.string()), // Map of question id to response
});

// Create a service role client for admin operations
function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseServiceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set. Cannot create service role client.');
    return null;
  }
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

/**
 * GET /api/blueprints/questions/responses?blueprint_id={id}
 * Retrieves stored questions and responses for a blueprint
 */
export const GET = createRouteHandler(
  ['GET'],
  async (req, { supabase, user }) => {
    try {
      // Get blueprint_id from query string
      const url = new URL(req.url);
      const blueprint_id = url.searchParams.get('blueprint_id');
      
      if (!blueprint_id) {
        return NextResponse.json(
          { error: 'Missing blueprint_id parameter' },
          { status: 400 }
        );
      }
      
      // Get the questions and responses
      const { data, error } = await supabase
        .from('blueprint_questions')
        .select('*')
        .eq('blueprint_id', blueprint_id)
        .single();
      
      if (error) {
        console.error('Error fetching blueprint questions and responses:', error);
        
        if (error.code === 'PGRST116') { // Not found
          return NextResponse.json(
            { error: 'No questions found for this blueprint' },
            { status: 404 }
          );
        }
        
        return NextResponse.json(
          { error: 'Failed to fetch questions and responses' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(data);
    } catch (error) {
      console.error('Error in GET responses:', error);
      return NextResponse.json(
        { error: 'Failed to process request' },
        { status: 500 }
      );
    }
  },
  { requireAuth: false } // Allow unauthenticated access for temporary blueprints
);

/**
 * POST /api/blueprints/questions/responses
 * Saves user responses to blueprint questions
 */
export const POST = createRouteHandler(
  ['POST'],
  async (req, { supabase, user }) => {
    try {
      // Get and validate request body
      const json = await req.json();
      console.log('Received response data:', JSON.stringify({
        blueprint_id: json.blueprint_id,
        response_count: json.responses ? Object.keys(json.responses).length : 0
      }));
      
      const validationResult = SaveResponsesSchema.safeParse(json);
      if (!validationResult.success) {
        console.error('Invalid input:', validationResult.error.format());
        return NextResponse.json(
          { 
            error: 'Invalid input', 
            details: validationResult.error.format() 
          },
          { status: 400 }
        );
      }
      
      const { blueprint_id, responses } = validationResult.data;
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(blueprint_id)) {
        console.error(`Invalid UUID format for blueprint ID: ${blueprint_id}`);
        return NextResponse.json(
          { error: 'Invalid blueprint ID format' },
          { status: 400 }
        );
      }
      
      // Check if the blueprint exists but don't treat it as a critical error if not found
      console.log(`Checking blueprint existence: ${blueprint_id}`);
      
      const { data: blueprintData, error: blueprintError } = await supabase
        .from('blueprints')
        .select('id, user_id, is_temporary, created_at, title')
        .eq('id', blueprint_id)
        .maybeSingle();
      
      if (blueprintError && blueprintError.code !== 'PGRST116') {
        console.warn('Error checking blueprint, but continuing:', blueprintError);
      }
      
      // Check for temporary blueprint status
      const isTemporaryBlueprint = blueprintData?.is_temporary === true;
      
      // If this is NOT a temporary blueprint, we require authentication
      if (!isTemporaryBlueprint && !user) {
        console.error('Authentication required for non-temporary blueprint');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // For non-temporary blueprints with data, verify the user has access
      if (!isTemporaryBlueprint && blueprintData && user && blueprintData.user_id !== user.id) {
        console.error(`User ${user.id} does not have access to blueprint ${blueprint_id}`);
        return NextResponse.json(
          { error: 'Access denied to this blueprint' },
          { status: 403 }
        );
      }
      
      // Determine if we need to use the service role client (for temporary blueprints or if RLS might block)
      const shouldUseServiceRole = isTemporaryBlueprint || !user;
      const dbClient = shouldUseServiceRole ? getServiceRoleClient() || supabase : supabase;
      
      if (shouldUseServiceRole) {
        console.log(`Using service role client for ${isTemporaryBlueprint ? 'temporary' : 'anonymous'} blueprint`);
      }
      
      // Now handle the actual storage operation
      
      // Check if the record exists
      const { data: existingData, error: fetchError } = await dbClient
        .from('blueprint_questions')
        .select('id, responses, questions')
        .eq('blueprint_id', blueprint_id)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') { // If error other than "not found"
        console.error('Error fetching blueprint questions record:', fetchError);
        return NextResponse.json(
          { error: 'Failed to fetch existing record', details: fetchError.message },
          { status: 500 }
        );
      }
      
      if (existingData) {
        // Update existing record
        const updatedResponses = { ...existingData.responses, ...responses };
        
        const { data: updatedData, error: updateError } = await dbClient
          .from('blueprint_questions')
          .update({
            responses: updatedResponses,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('Error updating responses:', updateError);
          return NextResponse.json(
            { error: 'Failed to update responses', details: updateError.message },
            { status: 500 }
          );
        }
        
        console.log(`Successfully updated responses for blueprint ${blueprint_id}`);
        return NextResponse.json({
          success: true,
          message: 'Responses updated successfully',
          responses: updatedData.responses
        });
      } else {
        // No record found - create one
        console.log(`No questions record found for blueprint ${blueprint_id}, creating new record`);
        
        const insertData = {
          blueprint_id: blueprint_id,
          questions: [], // Empty questions array initially
          responses: responses, // Save the current responses
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // If we have a user and this isn't temporary, add the user_id
        if (user && !isTemporaryBlueprint) {
          // @ts-ignore - We're adding this dynamically if the schema supports it
          insertData.user_id = user.id;
        }
        
        const { data: newRecord, error: createError } = await dbClient
          .from('blueprint_questions')
          .insert(insertData)
          .select()
          .single();
          
        if (createError) {
          console.error('Error creating questions record:', createError);
          
          // If we're still getting RLS errors even with the service role, try direct DB access
          if (createError.code === '42501' && shouldUseServiceRole) {
            console.error('Still hitting RLS issues even with service role - check Supabase setup');
          }
          
          return NextResponse.json(
            { error: 'Failed to create questions record', details: createError.message },
            { status: 500 }
          );
        }
        
        console.log(`Created new questions record for blueprint ${blueprint_id}`);
        return NextResponse.json({
          success: true,
          message: 'New questions record created with responses',
          responses: newRecord.responses
        });
      }
    } catch (error) {
      console.error('Error in POST responses:', error);
      return NextResponse.json(
        { 
          error: 'Failed to process request', 
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  },
  { requireAuth: false } // Allow unauthenticated access for temporary blueprints
); 