import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createStandardServerClient } from '@/utils/supabase';

// Define schema for POST request
const SaveResponsesSchema = z.object({
  blueprint_id: z.string().uuid(),
  responses: z.record(z.string(), z.string()), // Map of question id to response
});

/**
 * GET /api/blueprints/questions/responses?blueprint_id={id}
 * Retrieves stored questions and responses for a blueprint
 */
export async function GET(req: Request) {
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
    
    // Initialize Supabase client
    const supabase = createStandardServerClient();
    
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
}

/**
 * POST /api/blueprints/questions/responses
 * Saves user responses to blueprint questions
 */
export async function POST(req: Request) {
  try {
    // Get and validate request body
    const json = await req.json();
    console.log('Received response data:', json);
    
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
    
    // Initialize Supabase client
    const supabase = createStandardServerClient();
    
    // Check if the record exists
    const { data: existingData, error: fetchError } = await supabase
      .from('blueprint_questions')
      .select('id, responses, questions')
      .eq('blueprint_id', blueprint_id)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // If error other than "not found"
      console.error('Error fetching blueprint questions record:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch existing record' },
        { status: 500 }
      );
    }
    
    if (existingData) {
      // Update existing record
      const updatedResponses = { ...existingData.responses, ...responses };
      
      const { error: updateError } = await supabase
        .from('blueprint_questions')
        .update({
          responses: updatedResponses,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingData.id);
      
      if (updateError) {
        console.error('Error updating responses:', updateError);
        return NextResponse.json(
          { error: 'Failed to update responses' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        responses: updatedResponses
      });
    } else {
      // No record found - try to create one if we can
      console.log('No questions record found, attempting to create one');
      
      // First check if blueprint exists
      const { error: blueprintError } = await supabase
        .from('blueprints')
        .select('id')
        .eq('id', blueprint_id)
        .single();
        
      if (blueprintError) {
        console.error('Error checking blueprint existence:', blueprintError);
        return NextResponse.json(
          { 
            error: 'No questions found for this blueprint', 
            details: 'Questions must be generated before storing responses' 
          },
          { status: 404 }
        );
      }
      
      // Blueprint exists, create a placeholder questions record
      const { error: createError } = await supabase
        .from('blueprint_questions')
        .insert({
          blueprint_id: blueprint_id,
          questions: [], // Empty questions array
          responses: responses, // Save the current responses
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (createError) {
        console.error('Error creating placeholder questions record:', createError);
        return NextResponse.json(
          { error: 'Failed to create questions record' },
          { status: 500 }
        );
      }
      
      console.log('Created placeholder questions record with responses');
      return NextResponse.json({
        success: true,
        responses: responses,
        warning: 'Created a new record without questions'
      });
    }
  } catch (error) {
    console.error('Error in POST responses:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 