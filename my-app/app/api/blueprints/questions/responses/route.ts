import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createRouteHandler } from '@/utils/route-handlers';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Define schema for POST request
const SaveResponsesSchema = z.object({
  blueprint_id: z.string().uuid(),
  responses: z.record(z.string(), z.string()), // Map of question id to response
});

// Define more specific types
type Question = {
  id: number;
  title: string;
  content: string;
  [key: string]: unknown;
};

// Define response types with improved type safety
type SuccessResponse = {
  questions?: Question[];
  responses?: Record<string, string>;
  message?: string;
  blueprint_id?: string;
  created_at?: string;
  updated_at?: string;
  success?: boolean;
};

type ErrorResponse = { 
  error: string;
  details?: string;
};

type ApiResponse = SuccessResponse | ErrorResponse;

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
export const GET = createRouteHandler<ApiResponse>(
  ['GET'],
  async (req: NextRequest, { supabase, user }) => {
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
      
      console.log(`Fetching questions for blueprint: ${blueprint_id}`);
      
      // Check if this is a temporary blueprint
      const { data: blueprintData, error: blueprintError } = await supabase
        .from('blueprints')
        .select('is_temporary, user_id')
        .eq('id', blueprint_id)
        .maybeSingle();
        
      if (blueprintError && blueprintError.code !== 'PGRST116') {
        console.error('Error checking blueprint status:', blueprintError);
      }
      
      // Determine if we need to use service role client (for temporary blueprints or if RLS might block)
      const isTemporaryBlueprint = blueprintData?.is_temporary === true;
      const shouldUseServiceRole = isTemporaryBlueprint || !user;
      const dbClient = shouldUseServiceRole ? getServiceRoleClient() || supabase : supabase;
      
      // Get the questions from the blueprint_questions table
      const { data: questionsData, error: questionsError } = await dbClient
        .from('blueprint_questions')
        .select('*')
        .eq('blueprint_id', blueprint_id)
        .maybeSingle();
      
      if (questionsError) {
        console.error('Error fetching blueprint questions:', questionsError);
        
        if (questionsError.code === 'PGRST116') { // Not found
          return NextResponse.json(
            { 
              questions: [],
              responses: {},
              message: 'No questions found for this blueprint' 
            },
            { status: 200 } // Return empty arrays instead of 404 for better client handling
          );
        }
        
        return NextResponse.json(
          { error: 'Failed to fetch questions', details: questionsError.message },
          { status: 500 }
        );
      }
      
      // Structure the response data
      const responseData = {
        questions: questionsData?.questions || [],
        responses: questionsData?.responses || {},
        blueprint_id: blueprint_id,
        created_at: questionsData?.created_at,
        updated_at: questionsData?.updated_at
      };
      
      // Log what we found for debugging
      console.log(`Found ${responseData.questions.length} questions and ${Object.keys(responseData.responses).length} responses for blueprint ${blueprint_id}`);
      
      return NextResponse.json(responseData);
    } catch (error) {
      console.error('Error in GET responses:', error);
      return NextResponse.json(
        { error: 'Failed to process request', details: error instanceof Error ? error.message : String(error) },
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
export const POST = createRouteHandler<ApiResponse>(
  ['POST'],
  async (req: NextRequest, { supabase, user }) => {
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
      
      // Instead of checking permissions and making direct DB calls, use the RPC function
      // that bypasses RLS and handles all authorization checks internally
      console.log(`Using RPC function to update responses for blueprint ${blueprint_id}`);
      
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'update_blueprint_question_responses',
        {
          p_blueprint_id: blueprint_id,
          p_user_id: user?.id || '00000000-0000-0000-0000-000000000000', // Anonymous ID for temporary blueprints
          p_responses: responses
        }
      );
      
      if (rpcError) {
        console.error('Error in RPC function call:', rpcError);
        return NextResponse.json(
          { error: 'Failed to save responses', details: rpcError.message },
          { status: 500 }
        );
      }
      
      // Check if RPC function reported success
      if (!rpcResult.success) {
        console.error('RPC function reported failure:', rpcResult);
        return NextResponse.json(
          { error: rpcResult.error || 'Failed to save responses', details: rpcResult.status },
          { status: rpcResult.status || 500 }
        );
      }
      
      console.log(`Successfully saved responses for blueprint ${blueprint_id} via RPC`);
      return NextResponse.json({
        success: true,
        message: 'Responses saved successfully',
        responses: rpcResult.data?.responses || responses
      });
    } catch (error) {
      console.error('Error in POST responses:', error);
      return NextResponse.json(
        { error: 'Failed to process request', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  },
  { requireAuth: false } // Allow unauthenticated access for temporary blueprints
); 