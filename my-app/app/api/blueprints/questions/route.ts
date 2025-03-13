import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { extractSupabaseTokenFromCookies, getUserIdFromToken } from '@/utils/supabase-auth';
import { ensureUserInDatabase } from '@/utils/user-sync';
import { createServiceRoleClient } from "@/utils/supabase-admin";
import { createStandardServerClient } from '@/utils/supabase';
import { OpenAI } from 'openai';

// Allow longer timeout for the AI to generate questions
export const maxDuration = 30;

// Define the Question schema
// Note: Currently unused but retained for future type validation
// const QuestionSchema = z.object({
//   id: z.number(),
//   title: z.string(),
//   content: z.string()
// });

// Commented out for now, but keeping for future validation if needed
// const QuestionsSchema = z.array(QuestionSchema);

// Define the schema for the request body
const QuestionsRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  skill_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  learning_objective: z.string().optional(),
  blueprint_id: z.string().uuid().optional(), // Optional blueprint_id param
});

// Define the Question type for TypeScript
export type Question = {
  id: number;
  title: string;
  content: string;
}

const openaiSDK = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * GET /api/blueprints/questions?blueprint_id={id}
 * Retrieves the questions for a specific blueprint
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
    
    // Get the questions for the specified blueprint
    const { data, error } = await supabase
      .from('blueprint_questions')
      .select('*')
      .eq('blueprint_id', blueprint_id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return NextResponse.json({ error: 'No questions found for this blueprint' }, { status: 404 });
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch questions', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET questions:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/blueprints/questions
 * Generates questions for a blueprint based on the provided prompt
 */
export async function POST(req: Request) {
  try {
    // Verify the request schema
    const json = await req.json();
    console.log('Received request:', json);
    
    const validationResult = QuestionsRequestSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { prompt, skill_level, learning_objective, blueprint_id } = validationResult.data;
    
    // Process the prompt and generate questions
    console.log('Processing prompt:', prompt);
    console.log('Processing questions for blueprint ID:', blueprint_id);
    
    // Generate questions using OpenAI
    try {
      console.log('Calling Vercel AI SDK with gpt-4-turbo and JSON response format...');
      
      const response = await openaiSDK.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates questions to help users refine their blueprint plans. You will be given a blueprint prompt, and your task is to generate meaningful questions to help the user clarify their requirements.'
          },
          {
            role: 'user',
            content: `Generate 4-5 focused questions to help refine this blueprint: "${prompt}". The questions should help clarify the user's needs and expectations. Include a descriptive title for the blueprint and a short paragraph description that captures the essence of what they're building.

Format your response as a JSON object with the following structure:
{
  "blueprint_title": "A concise and descriptive title for the blueprint",
  "blueprint_description": "A paragraph summarizing what the blueprint aims to create",
  "questions": [
    {
      "id": 1,
      "title": "Short question title",
      "content": "The full question content"
    },
    // More questions...
  ]
}`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });
      
      console.log('AI SDK response received');
      const jsonResponse = response.choices[0].message.content;
      console.log('Raw response:', jsonResponse);
      
      if (!jsonResponse) {
        throw new Error('No response content received from AI');
      }
      
      const parsedResponse = JSON.parse(jsonResponse);
      
      // Extract the title, description, and questions
      const title = parsedResponse.blueprint_title || 'Untitled Blueprint';
      const description = parsedResponse.blueprint_description || '';
      console.log('Extracted blueprint title:', title);
      console.log('Extracted blueprint description:', description);
      
      // Update the blueprint with the title and description
      const serviceClient = createServiceRoleClient();
      
      // Try to get auth token and user ID from cookies
      try {
        const cookieHeader = req.headers.get('cookie') || '';
        console.log('=== EXTRACTING TOKEN FROM COOKIES ===');
        const token = extractSupabaseTokenFromCookies(cookieHeader);
        console.log('=== GETTING USER ID FROM TOKEN ===');
        const authUserId = token ? getUserIdFromToken(token) : null;
        
        if (authUserId) {
          // Map auth user ID to application user ID using ensureUserInDatabase
          const { success, userId: applicationUserId, error } = await ensureUserInDatabase(authUserId);
          
          if (!success || !applicationUserId) {
            console.error('Failed to ensure user exists in database:', error);
          } else {
            console.log('Application user ID from database:', applicationUserId, '(this is the ID that should match the users table)');
            
            // Now use the correct application user ID
            if (applicationUserId && blueprint_id) {
              try {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
                
                if (!supabaseUrl || !supabaseKey) {
                  throw new Error('Missing Supabase configuration');
                }
                
                // First, get the current blueprint data
                const { data: currentBlueprintData, error: getBlueprintError } = await serviceClient
                  .from('blueprints')
                  .select('id, title, prompt, search_query, user_id')
                  .eq('id', blueprint_id)
                  .limit(1);
                
                if (getBlueprintError) {
                  console.error('Error fetching current blueprint data:', getBlueprintError);
                  throw getBlueprintError;
                }
                
                console.log('Current blueprint data before update:', currentBlueprintData);
                
                // Determine what fields to update
                const promptToUse = currentBlueprintData?.[0]?.prompt || prompt;
                console.log('Using prompt value for update:', promptToUse);
                
                // Check if we need to update the user_id
                const shouldUpdateUserId = !currentBlueprintData?.[0]?.user_id;
                console.log('Need to update user_id?', shouldUpdateUserId);
                
                // Update the blueprint with new title and description
                const { data: updatedBlueprint, error: updateError } = await serviceClient
                  .from('blueprints')
                  .update({
                    title: title,
                    prompt: promptToUse,
                    details: description,
                    ...(shouldUpdateUserId ? { user_id: applicationUserId } : {})
                  })
                  .eq('id', blueprint_id)
                  .select();
                
                if (updateError) {
                  console.error('Error updating blueprint:', updateError);
                  throw updateError;
                }
                
                console.log('Blueprint updated successfully (title, prompt' + (shouldUpdateUserId ? ', user_id' : '') + ')');
                console.log('Blueprint after update:', updatedBlueprint);
                
                // Note for clarity
                console.log('Note: user_id will not be associated with blueprint_questions due to schema limitations');
              } catch (updateError) {
                console.error('Error updating blueprint details:', updateError);
              }
            }
          }
        }
      } catch (userIdError) {
        console.error('Error processing user ID:', userIdError);
      }
      
      // Store the questions in the database
      try {
        // Parse the questions array
        const questions = parsedResponse.questions || [];
        console.log('Parsed questions array:', questions);
        
        console.log('Storing questions for blueprint', blueprint_id);
        
        // Create or update the questions in the database
        const { data: questionRecord, error: questionsError } = await serviceClient
          .from('blueprint_questions')
          .upsert({
            blueprint_id,
            questions,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Note: Do not include user_id as it doesn't exist in the blueprint_questions table
          })
          .select()
          .single();
          
        if (questionsError) {
          console.error('Error storing questions:', questionsError);
          throw questionsError;
        }
        
        console.log('Questions stored successfully');
        console.log('Verified questions record:', questionRecord.id);
        console.log('Questions count:', questions.length);
        
        return NextResponse.json({
          blueprint_id,
          title,
          description,
          questions,
          stored: true,
          record_id: questionRecord.id
        });
      } catch (questionsError) {
        console.error('Error processing questions:', questionsError);
        throw questionsError;
      }
    } catch (aiError) {
      console.error('Error calling AI service:', aiError);
      return NextResponse.json(
        { error: 'Failed to generate questions', details: aiError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unhandled error in questions API:', error);
    return NextResponse.json(
      { 
        error: 'Server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 