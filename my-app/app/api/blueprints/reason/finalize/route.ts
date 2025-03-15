import { NextResponse } from "next/server";
import { z } from 'zod';
import { generateWithFallback } from '@/utils/ai-orchestrator';
import { createRouteHandler } from '@/utils/route-handlers';
import { NextRequest } from 'next/server';
import type { ChatCompletionMessageParam } from 'openai/resources';

// Define the finalize request schema
const FinalizeRequestSchema = z.object({
  blueprint_id: z.string().uuid(),
  prompt: z.string(),
  responses: z.record(z.string(), z.string()),
  description: z.string().optional(), // Allow description to be passed in
  user_skill_level: z.string().optional(), // Add user skill level
  learning_objective: z.string().optional(), // Add learning objective
  custom_prompt: z.string().optional() // Add support for custom prompt
});

// Define the question type
interface BlueprintQuestion {
  id: number;
  title: string;
  content: string;
}

// Allow longer timeout for AI generation
export const maxDuration = 60;

// Define the response types to fix the type error in route handler
interface FinalizeSuccessResponse {
  title: string;
  search_query: string;
  description?: string;
  skill_level?: string;
  estimated_time?: string;
  prerequisites?: string[];
}

interface FinalizeErrorResponse {
  error: string;
  details?: string | Record<string, unknown>;
}

type FinalizeResponse = FinalizeSuccessResponse | FinalizeErrorResponse;

/**
 * System prompt for generating the final blueprint
 */
const getFinalizeSystemPrompt = () => `
You are an AI assistant helping to create a detailed search query for an AI blueprint.
Based on the user's initial prompt and their answers to clarifying questions, 
create a comprehensive search query that will help generate an implementation plan.

Your task is to analyze the initial prompt and the responses to questions, then generate:
1. A final blueprint title (clear and descriptive)
2. A search_query - a detailed, specific query that captures all the requirements for implementation
3. A concise description of the AI system
4. A complexity level (beginner, intermediate, or advanced)
5. An estimated time to implement
6. A list of prerequisites or required knowledge

Return your response as a structured JSON object:
{
  "title": "Clear descriptive title for the blueprint",
  "search_query": "Detailed search terms and instructions for implementation (be specific and comprehensive)",
  "description": "A concise description of what this AI system does and its purpose",
  "skill_level": "beginner|intermediate|advanced",
  "estimated_time": "Estimated time to implement (e.g., '2-3 hours')",
  "prerequisites": ["Prerequisite 1", "Prerequisite 2", ...]
}

IMPORTANT: The search_query should be detailed and comprehensive, as it will be used to generate a step-by-step implementation plan. It should capture all the specific requirements mentioned in both the initial prompt and the answers to clarifying questions.
`;

/**
 * POST /api/blueprints/reason/finalize
 * Processes all user responses and generates a refined search query and blueprint details
 */
export const POST = createRouteHandler(
  ['POST'],
  async (req: NextRequest, { supabase, user }) => {
    try {
      // Parse request body
      const json = await req.json();
      
      // Validate input using Zod schema
      const validateResult = FinalizeRequestSchema.safeParse(json);
      if (!validateResult.success) {
        return NextResponse.json(
          { 
            error: 'Invalid input', 
            details: validateResult.error.format() 
          },
          { status: 400 }
        );
      }
      
      const { blueprint_id, prompt, responses, description, custom_prompt, user_skill_level, learning_objective } = validateResult.data;
      
      // Log authentication status for debugging
      console.log('Blueprint finalization auth status:', {
        authenticated: !!user,
        userId: user?.id || 'Not authenticated',
        blueprint_id
      });
      
      // Verify the blueprint exists
      const { data: blueprint, error: blueprintError } = await supabase
        .from('blueprints')
        .select('*')
        .eq('id', blueprint_id)
        .single();
      
      if (blueprintError || !blueprint) {
        console.error('Blueprint not found:', blueprintError);
        return NextResponse.json(
          { error: 'Blueprint not found' },
          { status: 404 }
        );
      }
      
      console.log(`Processing blueprint ${blueprint_id} finalization with ${Object.keys(responses).length} responses`);
      
      // Get the questions for this blueprint
      const { data: questionsData, error: questionsError } = await supabase
        .from('blueprint_questions')
        .select('questions')
        .eq('blueprint_id', blueprint_id)
        .single();
      
      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
        // Continue anyway - we'll use responses without question context if needed
      }
      
      // Construct the AI prompt
      const questions = questionsData?.questions as BlueprintQuestion[] || [];
      
      // Use custom prompt if provided, otherwise build from components
      const userPrompt = custom_prompt || `Initial prompt: "${prompt}"\n\n${
        questions.length > 0 
          ? 'Questions and responses:\n' + 
            questions.map((q: BlueprintQuestion) => {
              const questionId = q.id.toString();
              const response = responses[questionId] || 'No response provided';
              return `Question: ${q.title} - ${q.content}\nResponse: ${response}`;
            }).join('\n\n')
          : 'Additional responses:\n' + 
            Object.entries(responses).map(([id, response]) => 
              `Response ${id}: ${response}`
            ).join('\n\n')
      }${user_skill_level ? `\n\nUser Skill Level: ${user_skill_level}` : ''}${learning_objective ? `\n\nLearning Objective: ${learning_objective}` : ''}`;
      
      const conversationMessages = [
        {
          role: 'system',
          content: getFinalizeSystemPrompt()
        },
        {
          role: 'user',
          content: userPrompt
        }
      ];
      
      console.log('Generating final blueprint data using AI...');
      
      // Try OpenAI directly first with a simple model
      try {
        // Import OpenAI directly to ensure we're using the correct configuration
        const { OpenAI } = await import("openai");
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo-0125", // Start with a simpler model that's more likely to be available
          messages: [
            { role: "system", content: getFinalizeSystemPrompt() },
            { role: "user", content: userPrompt }
          ] as ChatCompletionMessageParam[], // Use proper OpenAI types
          temperature: 0.5,
          response_format: { type: "json_object" } // Force JSON format
        });
        
        const content = response.choices[0]?.message?.content;
        
        if (!content) {
          throw new Error("Empty response from OpenAI");
        }
        
        // Parse the JSON response
        try {
          const parsedData = JSON.parse(content);
          
          // Validate the required fields
          if (!parsedData.title || !parsedData.search_query) {
            console.error('AI response missing required fields:', parsedData);
            throw new Error('AI generated data is missing required fields');
          }
          
          console.log('Finalized blueprint data from OpenAI:', {
            title: parsedData.title,
            search_query_length: parsedData.search_query?.length || 0
          });
          
          // Return the finalized data
          return NextResponse.json({
            title: parsedData.title,
            search_query: parsedData.search_query,
            description: parsedData.description || description,
            skill_level: parsedData.skill_level,
            estimated_time: parsedData.estimated_time,
            prerequisites: parsedData.prerequisites || []
          });
        } catch (parseError) {
          console.error('Error parsing OpenAI response:', parseError, 'Response:', content);
          throw new Error('Failed to parse OpenAI response');
        }
      } catch (openaiError) {
        console.error('OpenAI error, falling back to generateWithFallback:', openaiError);
        
        // Fall back to the existing fallback mechanism
        try {
          const aiResponse = await generateWithFallback(
            userPrompt,
            {
              model: "gpt-4-turbo", // Prefer a different model than the one we just tried
              messages: conversationMessages,
              temperature: 0.5,
            }
          );
          
          if (!aiResponse || !aiResponse.content) {
            return NextResponse.json(
              { error: 'Failed to generate finalized blueprint data' },
              { status: 500 }
            );
          }
          
          console.log('AI generated response for finalize using fallback');
          
          // Try to parse JSON from the response
          try {
            // Look for JSON structure in the content
            const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
            
            if (!jsonMatch) {
              console.error('No JSON found in AI response:', aiResponse.content);
              return NextResponse.json(
                { error: 'AI response did not contain valid JSON data' },
                { status: 500 }
              );
            }
            
            const parsedData = JSON.parse(jsonMatch[0]);
            
            // Validate the required fields
            if (!parsedData.title || !parsedData.search_query) {
              console.error('AI response missing required fields:', parsedData);
              return NextResponse.json(
                { error: 'AI generated data is missing required fields' },
                { status: 500 }
              );
            }
            
            console.log('Finalized blueprint data from fallback:', {
              title: parsedData.title,
              search_query_length: parsedData.search_query?.length || 0
            });
            
            // Return the finalized data
            return NextResponse.json({
              title: parsedData.title,
              search_query: parsedData.search_query,
              description: parsedData.description || description,
              skill_level: parsedData.skill_level,
              estimated_time: parsedData.estimated_time,
              prerequisites: parsedData.prerequisites || []
            });
          } catch (parseError) {
            console.error('Error parsing AI response:', parseError, 'Response:', aiResponse.content);
            return NextResponse.json(
              { error: 'Failed to parse AI response' },
              { status: 500 }
            );
          }
        } catch (fallbackError) {
          console.error('Fallback mechanism also failed:', fallbackError);
          return NextResponse.json(
            { error: 'All AI services are currently unavailable', details: 'Please try again later' },
            { status: 500 }
          );
        }
      }
    } catch (error) {
      console.error('Error in finalize endpoint:', error);
      return NextResponse.json(
        { 
          error: 'Internal server error', 
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  },
  { requireAuth: false } as const
); 