import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { extractSupabaseTokenFromCookies, getUserIdFromToken } from '@/utils/supabase-auth';
import { ensureUserInDatabase } from '@/utils/user-sync';

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
  skill_level: z.enum(['beginner', 'intermediate', 'advanced'] as const).optional(),
  learning_objective: z.string().optional(),
  blueprint_id: z.string().uuid().optional(), // Add optional blueprint_id param
});

// Define the Question type for TypeScript
export type Question = {
  id: number;
  title: string;
  content: string;
}

export async function POST(req: Request) {
  try {
    // Parse request body
    const json = await req.json();
    console.log('Received request:', json);
    
    // Validate input using Zod schema
    const validationResult = QuestionsRequestSchema.safeParse(json);
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
    
    const { prompt, skill_level, learning_objective, blueprint_id } = validationResult.data;
    console.log('Processing prompt:', prompt);
    
    // Create system prompt for the AI
    const systemPrompt = `
You are an AI educator and consultant assistant.
Based on the user's request for: "${prompt}"

First, suggest a clear, descriptive title for the AI blueprint focusing on what the AI will do.

Then, generate up to 4 clarifying questions that would help you understand the user's requirements better.
${skill_level ? `- Consider the user's skill level: ${skill_level}` : ''}
${learning_objective ? `- Consider the user's learning objective: ${learning_objective}` : ''}

Be thoughtful and specific. Each question should help clarify an important aspect of the project that would be necessary for implementation.
Avoid generic questions. Make each question targeted to the specific AI project being requested.

Example good blueprint titles:
- "Daily LinkedIn Posts Summarizer" (not "I want an AI that summarizes LinkedIn posts")
- "Customer Support Email Classifier" (not "Email classifier for support")
- "Meeting Transcription & Action Item Extractor" (not "Transcription system")

You MUST respond in JSON format with a blueprint title and an array of question objects. Your response MUST follow this format:
{
  "blueprint_title": "A clear, descriptive title for the AI system (30-60 chars)",
  "questions": [
    {
      "id": 1,
      "title": "Short title for the question",
      "content": "Full text of the question"
    },
    ...
  ]
}
`;

    try {
      console.log('Calling Vercel AI SDK with gpt-4-turbo and JSON response format...');
      
      // Use the Vercel AI SDK to generate text with JSON formatting
      const { text: responseText } = await generateText({
        model: openai('gpt-4-turbo'),
        prompt: systemPrompt,
        temperature: 0.2,
        maxTokens: 800,
        providerOptions: {
          openai: {
            response_format: { type: 'json_object' }
          }
        }
      });
      
      console.log('AI SDK response received');
      console.log('Raw response:', responseText);
      
      try {
        // Remove markdown code blocks if present (like ```json ... ```)
        let cleanedResponse = responseText;
        if (responseText.includes('```')) {
          console.log('Markdown code blocks detected, removing them');
          cleanedResponse = responseText.replace(/```(?:json|javascript)?\n?([\s\S]*?)```/g, '$1');
        }
        
        // Parse the questions JSON
        const questionsData = JSON.parse(cleanedResponse);
        
        // Extract the blueprint title if available
        let blueprintTitle = null;
        if (questionsData.blueprint_title) {
          blueprintTitle = questionsData.blueprint_title;
          console.log('Extracted blueprint title:', blueprintTitle);
          
          // If we have a blueprint_id, update the title
          if (blueprint_id && blueprintTitle) {
            try {
              // Get user ID from auth token
              const cookieHeader = req.headers.get('cookie') || '';
              
              // Get Supabase credentials for API access
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
              const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
              
              if (!supabaseUrl || !supabaseKey) {
                throw new Error('Missing Supabase URL or service role key');
              }
              
              if (cookieHeader) {
                const token = extractSupabaseTokenFromCookies(cookieHeader);
                if (token) {
                  // Get auth user ID from token
                  const authUserId = await getUserIdFromToken(token);
                  console.log('Auth user ID from token:', authUserId);
                  
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
                          const blueprintUrl = `${supabaseUrl}/rest/v1/blueprints?id=eq.${blueprint_id}`;
                          const headers = {
                            'Content-Type': 'application/json',
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                            'Prefer': 'return=minimal'
                          };
                          
                          // First, get the current blueprint data
                          const getBlueprintResponse = await fetch(
                            `${supabaseUrl}/rest/v1/blueprints?id=eq.${blueprint_id}&select=id,title,prompt,search_query,user_id`,
                            {
                              headers: {
                                'Content-Type': 'application/json',
                                'apikey': supabaseKey,
                                'Authorization': `Bearer ${supabaseKey}`
                              }
                            }
                          );
                          
                          if (!getBlueprintResponse.ok) {
                            console.error('Error fetching blueprint data:', await getBlueprintResponse.text());
                            throw new Error('Failed to fetch blueprint data');
                          }
                          
                          const blueprintData = await getBlueprintResponse.json();
                          console.log('Current blueprint data before update:', blueprintData);
                          
                          if (!blueprintData || blueprintData.length === 0) {
                            throw new Error('Blueprint not found');
                          }
                          
                          const currentBlueprint = blueprintData[0];
                          
                          // Check if the blueprint already has a user_id
                          const needsUserUpdate = !currentBlueprint.user_id;
                          
                          // Use the current prompt from the request, or fall back to what's in the database
                          const originalPrompt = prompt || currentBlueprint.prompt || currentBlueprint.search_query || '';
                          
                          console.log('Using prompt value for update:', originalPrompt);
                          console.log('Need to update user_id?', needsUserUpdate);
                          
                          // Build update object
                          const updateData: Record<string, unknown> = {
                            title: blueprintTitle,
                            prompt: originalPrompt, 
                            search_query: originalPrompt
                          };
                          
                          // Only set user_id if it's not already set
                          if (needsUserUpdate) {
                            updateData.user_id = applicationUserId;
                          }
                          
                          // Update the blueprint with the title, prompt, and user_id
                          const blueprintResponse = await fetch(
                            blueprintUrl,
                            {
                              method: 'PATCH',
                              headers,
                              body: JSON.stringify(updateData)
                            }
                          );
                          
                          if (blueprintResponse.ok) {
                            console.log(`Blueprint updated successfully (title, prompt${needsUserUpdate ? ', user_id' : ''})`);
                            
                            // Now fetch the blueprint to verify the update
                            const verifyResponse = await fetch(
                              `${supabaseUrl}/rest/v1/blueprints?id=eq.${blueprint_id}&select=id,title,prompt,search_query,user_id`,
                              {
                                headers: {
                                  'Content-Type': 'application/json',
                                  'apikey': supabaseKey,
                                  'Authorization': `Bearer ${supabaseKey}`
                                }
                              }
                            );
                            
                            if (verifyResponse.ok) {
                              const updatedBlueprintData = await verifyResponse.json();
                              console.log('Blueprint after update:', updatedBlueprintData);
                            }
                          } else {
                            const error = await blueprintResponse.text();
                            console.error('Error updating blueprint:', error);
                          }
                        } catch (titleError) {
                          console.error('Error updating blueprint:', titleError);
                          // Continue despite error - we still want to return the questions
                        }
                      }
                      
                      console.log('Note: user_id will not be associated with blueprint_questions due to schema limitations');
                    }
                  }
                }
              }
            } catch (titleError) {
              console.error('Error updating blueprint title:', titleError);
              // Continue despite error - we still want to return the questions
            }
          }
        }
        
        // If we have an array in a "questions" property, use that
        const questionsArray = Array.isArray(questionsData) 
          ? questionsData 
          : (questionsData.questions && Array.isArray(questionsData.questions) 
            ? questionsData.questions 
            : []);
        
        console.log('Parsed questions array:', questionsArray);
        
        // Create a standardized questions array
        const formattedQuestions = questionsArray.map((q: { id?: number; title?: string; content?: string; text?: string }, index: number) => ({
          id: q.id || index + 1,
          title: q.title || `Question ${index + 1}`,
          content: q.content || q.text || "No content provided"
        }));
        
        // Ensure we have exactly 4 questions
        const finalQuestions = formattedQuestions.slice(0, 4);
        
        // If we have a blueprint_id, store the questions
        if (blueprint_id) {
          console.log(`Storing questions for blueprint ${blueprint_id}`);
          
          try {
            // Get user ID from auth token
            const cookieHeader = req.headers.get('cookie') || '';
            
            // Get Supabase credentials for API access
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            
            if (!supabaseUrl || !supabaseKey) {
              throw new Error('Missing Supabase URL or service role key');
            }
            
            if (cookieHeader) {
              const token = extractSupabaseTokenFromCookies(cookieHeader);
              if (token) {
                // Get auth user ID from token
                const authUserId = await getUserIdFromToken(token);
                console.log('Auth user ID from token:', authUserId);
                
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
                        const blueprintUrl = `${supabaseUrl}/rest/v1/blueprints?id=eq.${blueprint_id}`;
                        const headers = {
                          'Content-Type': 'application/json',
                          'apikey': supabaseKey,
                          'Authorization': `Bearer ${supabaseKey}`,
                          'Prefer': 'return=minimal'
                        };
                        
                        // First, get the current blueprint data
                        const getBlueprintResponse = await fetch(
                          `${supabaseUrl}/rest/v1/blueprints?id=eq.${blueprint_id}&select=id,title,prompt,search_query,user_id`,
                          {
                            headers: {
                              'Content-Type': 'application/json',
                              'apikey': supabaseKey,
                              'Authorization': `Bearer ${supabaseKey}`
                            }
                          }
                        );
                        
                        if (!getBlueprintResponse.ok) {
                          console.error('Error fetching blueprint data:', await getBlueprintResponse.text());
                          throw new Error('Failed to fetch blueprint data');
                        }
                        
                        const blueprintData = await getBlueprintResponse.json();
                        console.log('Current blueprint data before update:', blueprintData);
                        
                        if (!blueprintData || blueprintData.length === 0) {
                          throw new Error('Blueprint not found');
                        }
                        
                        const currentBlueprint = blueprintData[0];
                        
                        // Check if the blueprint already has a user_id
                        const needsUserUpdate = !currentBlueprint.user_id;
                        
                        // Use the current prompt from the request, or fall back to what's in the database
                        const originalPrompt = prompt || currentBlueprint.prompt || currentBlueprint.search_query || '';
                        
                        console.log('Using prompt value for update:', originalPrompt);
                        console.log('Need to update user_id?', needsUserUpdate);
                        
                        // Build update object
                        const updateData: Record<string, unknown> = {
                          title: blueprintTitle,
                          prompt: originalPrompt, 
                          search_query: originalPrompt
                        };
                        
                        // Only set user_id if it's not already set
                        if (needsUserUpdate) {
                          updateData.user_id = applicationUserId;
                        }
                        
                        // Update the blueprint with the title, prompt, and user_id
                        const blueprintResponse = await fetch(
                          blueprintUrl,
                          {
                            method: 'PATCH',
                            headers,
                            body: JSON.stringify(updateData)
                          }
                        );
                        
                        if (blueprintResponse.ok) {
                          console.log(`Blueprint updated successfully (title, prompt${needsUserUpdate ? ', user_id' : ''})`);
                          
                          // Now fetch the blueprint to verify the update
                          const verifyResponse = await fetch(
                            `${supabaseUrl}/rest/v1/blueprints?id=eq.${blueprint_id}&select=id,title,prompt,search_query,user_id`,
                            {
                              headers: {
                                'Content-Type': 'application/json',
                                'apikey': supabaseKey,
                                'Authorization': `Bearer ${supabaseKey}`
                              }
                            }
                          );
                          
                          if (verifyResponse.ok) {
                            const updatedBlueprintData = await verifyResponse.json();
                            console.log('Blueprint after update:', updatedBlueprintData);
                          }
                        } else {
                          const error = await blueprintResponse.text();
                          console.error('Error updating blueprint:', error);
                        }
                      } catch (titleError) {
                        console.error('Error updating blueprint:', titleError);
                        // Continue despite error - we still want to return the questions
                      }
                    }
                    
                    console.log('Note: user_id will not be associated with blueprint_questions due to schema limitations');
                  }
                }
              }
            }
            
            // Now store the questions
            // Create the request URL and headers for questions
            const questionsUrl = `${supabaseUrl}/rest/v1/blueprint_questions`;
            const headers = {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Prefer': 'resolution=merge-duplicates'
            };
            
            // First try to find if a record exists
            const checkResponse = await fetch(
              `${questionsUrl}?blueprint_id=eq.${blueprint_id}&select=id`, 
              { headers }
            );
            
            let existingId = null;
            if (checkResponse.ok) {
              const records = await checkResponse.json();
              if (records.length > 0) {
                existingId = records[0].id;
                console.log('Found existing record with ID:', existingId);
              }
            }
            
            let response;
            
            if (existingId) {
              // Update an existing record
              console.log('Updating existing record');
              response = await fetch(
                `${questionsUrl}?id=eq.${existingId}`,
                {
                  method: 'PATCH',
                  headers,
                  body: JSON.stringify({
                    questions: finalQuestions,
                    updated_at: new Date().toISOString()
                  })
                }
              );
            } else {
              // Insert a new record
              console.log('Creating new record');
              const body: Record<string, unknown> = {
                blueprint_id,
                questions: finalQuestions
              };
              
              response = await fetch(
                questionsUrl,
                {
                  method: 'POST',
                  headers,
                  body: JSON.stringify(body)
                }
              );
            }
            
            if (response.ok) {
              console.log('Questions stored successfully');
            } else {
              const error = await response.text();
              console.error('Error storing questions:', error);
            }
          } catch (dbError) {
            console.error('Error in question storage flow:', dbError);
            console.log('Bypassing database storage due to error');
            // Continue despite error - we can still return the questions to the client
          }
        }

        // Return the questions to the client
        return NextResponse.json({ questions: finalQuestions });
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        
        // Fallback to generic questions as a last resort
        const fallbackQuestions = [
          {
            id: 1,
            title: "Implementation Goals",
            content: "What are the primary objectives or outcomes you want to achieve with this AI tool?"
          },
          {
            id: 2,
            title: "Data collection frequency",
            content: "How frequently would you like to collect data? Daily, weekly, or on-demand?"
          },
          {
            id: 3,
            title: "Analysis focus",
            content: "What specific metrics and insights would be most valuable to you?"
          },
          {
            id: 4,
            title: "Output format",
            content: "How would you like the results presented? As a dashboard, PDF report, email summary, or in another format?"
          }
        ];
        
        // Return the fallback questions
        return NextResponse.json({ questions: fallbackQuestions });
      }
    } catch (aiError) {
      console.error('Error generating questions with AI:', aiError);
      return NextResponse.json(
        { error: 'Failed to generate questions' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in questions endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 