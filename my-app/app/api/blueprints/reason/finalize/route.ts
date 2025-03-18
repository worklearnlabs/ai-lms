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
 * 
 * NOTE ABOUT SEARCH QUERY GENERATION:
 * The reasoning agent is instructed to create a natural language search query text
 * rather than a fully structured JSON for Perplexity. This approach:
 * 1. Reduces the risk of formatting errors when generating the search query
 * 2. Allows us to maintain consistent JSON structure when we pass it to Perplexity
 * 3. Gives us flexibility to modify the search query if needed before sending to Perplexity
 * 
 * The search_query field in the JSON response will contain this natural language query,
 * which will later be injected into a structured prompt for the Perplexity research agent.
 */
const getFinalizeSystemPrompt = () => `
You are a REASONING AGENT in a multi-agent system designed to create educational AI blueprints. Your specific role is to analyze user inputs and formulate a comprehensive search query for a RESEARCH AGENT.

## YOUR ROLE AND RESPONSIBILITIES:
1. Analyze the user's initial prompt, skill level, learning objective, and their responses to clarifying questions
2. Synthesize this information into a coherent understanding of what the user wants to build
3. Create a detailed search query that will help the RESEARCH AGENT find the most relevant implementation information
4. Your output will be used by a Perplexity-powered research system to find implementation details

## CONTEXT:
- You are part of a pipeline where a user has requested to build an AI system
- Clarifying questions have been asked to better understand their requirements
- Your output will be passed to a RESEARCH AGENT that will find implementation details
- The final result will be an educational blueprint teaching the user how to build their desired AI system

## OUTPUT INSTRUCTIONS:
Return your response with the following structure:

{
  "title": "Clear descriptive title for the blueprint",
  "search_query": "YOUR OPTIMIZED SEARCH QUERY TEXT HERE - make it detailed and comprehensive",
  "description": "A concise description of what this AI system does and its purpose",
  "skill_level": "beginner|intermediate|advanced",
  "estimated_time": "Estimated time to implement (e.g., '2-3 hours')",
  "prerequisites": ["Prerequisite 1", "Prerequisite 2", ...]
}

## IMPORTANT GUIDELINES FOR THE SEARCH QUERY:
- The search_query is THE MOST IMPORTANT field - it should be a natural language query, not a structured JSON
- Include all key requirements, technologies, and specific implementation details in the search_query
- Make the search query descriptive and specific enough to yield actionable implementation steps
- Consider the user's skill level when crafting the search query
- Focus on addressing the learning objective provided by the user
- Do not include raw Q&A pairs in your output - synthesize this information into the search_query

Your task is to bridge the gap between the user's high-level request and the technical implementation details needed by the research agent.
`;

/**
 * POST /api/blueprints/reason/finalize
 * Processes all user responses and generates a refined search query and blueprint details
 */
export const POST = createRouteHandler<FinalizeResponse>(
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
      
      // If the user is authenticated, try to get their skill level and learning objectives from the database
      let userSkillLevel = user_skill_level;
      let userLearningObjective = learning_objective;
      
      if (user && (!user_skill_level || !learning_objective)) {
        console.log('User is authenticated, retrieving skill level and learning objectives from database');
        
        try {
          // Fetch user data from the users table by ID first
          let { data: userData, error: userError } = await supabase
            .from('users')
            .select('user_skill_level, user_learning_goals')
            .eq('id', user.id)
            .single();
          
          // If no user found by ID and we have an email, try to find by email instead
          if (userError && userError.code === 'PGRST116' && user.email) {
            console.log('User not found by ID, trying to find by email:', user.email);
            
            const { data: userByEmail, error: emailError } = await supabase
              .from('users')
              .select('user_skill_level, user_learning_goals')
              .eq('email', user.email)
              .single();
              
            if (!emailError && userByEmail) {
              console.log('Found user by email instead of ID');
              console.log('Auth ID:', user.id);
              userData = userByEmail;
              userError = null;
            } else if (emailError) {
              console.log('Error finding user by email:', emailError);
            }
          }
          
          if (userError) {
            console.warn('Error fetching user data:', userError);
          } else if (userData) {
            // Use database values if provided fields are empty
            if (!user_skill_level && userData.user_skill_level) {
              console.log(`Using user_skill_level from database: ${userData.user_skill_level}`);
              userSkillLevel = userData.user_skill_level;
            }
            
            if (!learning_objective && userData.user_learning_goals) {
              console.log(`Using user_learning_goals from database: ${userData.user_learning_goals}`);
              userLearningObjective = userData.user_learning_goals;
            }
          }
        } catch (dbError) {
          console.error('Error retrieving user data from database:', dbError);
        }
      }
      
      // Prepare the final inputs for the reasoning agent
      // Add comprehensive logging about user skill level and learning objective
      console.log('Final user profile values used in prompt:');
      console.log('  Skill Level:', userSkillLevel || 'Not specified');
      console.log('  Learning Objective:', userLearningObjective || 'Not specified');
      console.log('  Source:', user ? 'Authenticated user' : 'Anonymous user');
      
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
      const userPrompt = custom_prompt || `
# Reasoning Agent Task: Blueprint Analysis and Search Query Formulation

## User Request
${prompt}

## User Context
${userSkillLevel ? `Skill Level: ${userSkillLevel}` : 'Skill Level: Not specified'}
${userLearningObjective ? `Learning Objective: ${userLearningObjective}` : 'Learning Objective: Not specified'}

## Requirements Analysis
Based on analyzing the user's initial request and their responses to clarifying questions, I've gathered the following key requirements:

${
  questions.length > 0 
    ? questions.map((q: BlueprintQuestion) => {
        const questionId = q.id.toString();
        const response = responses[questionId] || 'No response provided';
        
        // Extract key points from the response
        return `### ${q.title}
- Question: ${q.content}
- Insight: ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}
- Key Requirements: [Identify technical needs, constraints, preferences]`;
      }).join('\n\n')
    : `[No clarifying questions were asked. Base your analysis solely on the initial request.]`
}

## Your Task
As a REASONING AGENT, you need to:
1. Synthesize all the above information
2. Create a detailed, specific search query text that will be used to retrieve implementation details
3. Focus on including ALL implementation requirements, technologies, and specific implementation details
4. Consider the user's skill level when determining the complexity of your search query
5. Address the user's learning objective in your search query
6. Make the search query comprehensive yet focused - it should yield specific, actionable implementation steps
7. Do NOT structure your output as JSON - just provide the optimized search query text

Example of a good search query:
"Implement an automated LinkedIn post scheduler that uses an AI assistant to generate content. The system should connect to LinkedIn via API, support custom scheduling rules, and include a web interface for content approval. The implementation should be suitable for a beginner with minimal coding experience, focus on no-code tools where possible, and include detailed setup instructions for LinkedIn API authentication."

Remember that your search query will be used to find relevant implementation details through an AI research system, so be comprehensive and specific without adding unnecessary formatting.
`;
      
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