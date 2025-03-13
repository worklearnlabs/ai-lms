import { NextResponse } from "next/server";
import { z } from 'zod';
import { createStandardServerClient } from '@/utils/supabase';
import { generateWithFallback } from '@/utils/ai-orchestrator';

// Define the finalize request schema
const FinalizeRequestSchema = z.object({
  blueprint_id: z.string().uuid(),
  prompt: z.string(),
  responses: z.record(z.string(), z.string())
});

// Define the question type
interface BlueprintQuestion {
  id: number;
  title: string;
  content: string;
}

// Allow longer timeout for AI generation
export const maxDuration = 60;

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
export async function POST(req: Request) {
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
    
    const { blueprint_id, prompt, responses } = validateResult.data;
    
    // Initialize Supabase client
    const supabase = createStandardServerClient();
    
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
    const conversationMessages = [
      {
        role: 'system',
        content: getFinalizeSystemPrompt()
      },
      {
        role: 'user',
        content: `Initial prompt: "${prompt}"\n\n${
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
        }`
      }
    ];
    
    console.log('Generating final blueprint data using AI...');
    
    // Call the AI model for the finalized data
    const aiResponse = await generateWithFallback(
      `Analyze this blueprint data and generate a final response:
      Initial prompt: ${prompt}
      Questions and responses: ${JSON.stringify(conversationMessages[1].content)}`,
      {
        model: "claude-3-opus-20240229", // Prefer Claude for reasoning
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
    
    console.log('AI generated response for finalize');
    
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
      
      console.log('Finalized blueprint data:', {
        title: parsedData.title,
        search_query_length: parsedData.search_query?.length || 0
      });
      
      // Return the finalized data without updating the blueprint yet
      // The actual update happens in handleCreateBlueprint in the UI
      return NextResponse.json({
        title: parsedData.title,
        search_query: parsedData.search_query,
        description: parsedData.description,
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
} 