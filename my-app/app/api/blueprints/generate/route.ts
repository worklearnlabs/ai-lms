import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createStandardServerClient } from '@/utils/supabase';
import { SkillLevelType } from '@/types/schema';

// Set the runtime to edge for streaming
export const runtime = 'edge';

// Allow longer timeout since this is a complex generation
export const maxDuration = 120;

// Define the request schema
const ResearchRequestSchema = z.object({
  // Required fields
  blueprintId: z.string().uuid(),
  
  // Optional fields
  searchQuery: z.string().optional(),
  regenerateStep: z.number().optional(),
  skill_level: z.enum(['beginner', 'intermediate', 'advanced'] as const).optional(),
  learning_objective: z.string().optional(),
});

// Research Agent System Prompt
const getSystemPrompt = (searchQuery: string, skillLevel?: SkillLevelType, learningObjective?: string) => `
You are a step-by-step implementation planner.
Create a detailed implementation plan for: "${searchQuery}"

For each step:
1. Provide a clear title
2. Estimate completion time
3. List specific tools/technologies needed
4. Break down into bullet-point instructions
5. Include any code snippets or examples

Return a structured JSON array of steps:
[
  {
    "number": 1,
    "title": "Step title",
    "estimatedTime": "Time estimate",
    "toolTags": ["Tool1", "Tool2"],
    "instructions": ["Instruction 1", "Instruction 2"],
    "subtasks": [
      {"number": 1, "description": "Subtask description"}
    ],
    "codeSnippets": [{"language": "js", "code": "// Code here"}]
  }
]

Adapt content to skill level: ${skillLevel || 'intermediate'}
Focus on learning objective: ${learningObjective || 'implementing the solution effectively'}

For beginner users: Include more explanations, use simpler tools, and provide more detailed steps.
For intermediate users: Balance between explanations and efficiency, introduce more powerful tools.
For advanced users: Focus on optimization, advanced tools, and efficient workflows.
`;

// Call the Perplexity API
async function callPerplexityAPI(prompt: string): Promise<Response> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY environment variable is not set');
  }
  
  // Create a readable stream for the encoder
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Call Perplexity API
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'sonar-medium-online', // Using Sonar model as specified
            messages: [
              { role: 'system', content: prompt }
            ],
            temperature: 0.7,
            stream: true, // Enable streaming
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Perplexity API error: ${response.status} ${errorText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Failed to get response reader');
        }

        let fullResponse = '';
        
        // Read and process the streaming response
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = new TextDecoder().decode(value);
          
          // Parse the event stream format (data: {...}\n\n)
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              // Check for the [DONE] indicator
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content || '';
                
                if (content) {
                  // Send the content to the client
                  controller.enqueue(encoder.encode(content));
                  fullResponse += content;
                }
              } catch (e) {
                // Skip if we can't parse this chunk
                console.error('Error parsing chunk:', e);
              }
            }
          }
        }
        
        // Return the full response for processing
        return fullResponse;
      } catch (error) {
        console.error('Perplexity API error:', error);
        controller.enqueue(encoder.encode(`Error: ${error instanceof Error ? error.message : String(error)}`));
        controller.close();
      }
    }
  });

  // Return the streaming response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

// Process the full response and update Supabase
async function processCompletedResponse(
  fullResponse: string,
  blueprintId: string,
  regenerateStep?: number,
  supabase?: ReturnType<typeof createStandardServerClient>
): Promise<void> {
  try {
    // Try to parse the JSON in the completion
    const stepsMatch = fullResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (stepsMatch && supabase) {
      const stepsJson = stepsMatch[0];
      const steps = JSON.parse(stepsJson);
      
      // Store steps in the database if not regenerating a specific step
      if (regenerateStep === undefined) {
        // Delete existing steps first
        await supabase
          .from('blueprint_steps')
          .delete()
          .eq('blueprint_id', blueprintId);
        
        // Insert new steps
        for (const step of steps) {
          await supabase
            .from('blueprint_steps')
            .insert({
              blueprint_id: blueprintId,
              number: step.number,
              title: step.title,
              estimated_time: step.estimatedTime,
              instructions: step.instructions,
              tools: step.toolTags,
              status: 'not_started',
            });
          
          // Insert subtasks if any
          if (step.subtasks && Array.isArray(step.subtasks)) {
            // Get the step ID we just created
            const { data: newStep } = await supabase
              .from('blueprint_steps')
              .select('id')
              .eq('blueprint_id', blueprintId)
              .eq('number', step.number)
              .single();
            
            if (newStep) {
              for (const subtask of step.subtasks) {
                await supabase
                  .from('blueprint_subtasks')
                  .insert({
                    step_id: newStep.id,
                    task_number: subtask.number,
                    description: subtask.description,
                    status: 'not_started',
                  });
              }
            }
          }
        }
        
        // Update blueprint with the new step count
        await supabase
          .from('blueprints')
          .update({ 
            status: 'completed',
            steps_count: steps.length,
          })
          .eq('id', blueprintId);
      } else {
        // If regenerating a specific step, just update that step
        const stepToUpdate = steps.find((s: { number: number }) => s.number === regenerateStep);
        if (stepToUpdate) {
          // Find the existing step to update
          const { data: existingStep } = await supabase
            .from('blueprint_steps')
            .select('id')
            .eq('blueprint_id', blueprintId)
            .eq('number', regenerateStep)
            .single();
          
          if (existingStep) {
            // Update the step
            await supabase
              .from('blueprint_steps')
              .update({
                title: stepToUpdate.title,
                estimated_time: stepToUpdate.estimatedTime,
                instructions: stepToUpdate.instructions,
                tools: stepToUpdate.toolTags,
              })
              .eq('id', existingStep.id);
            
            // Delete existing subtasks
            await supabase
              .from('blueprint_subtasks')
              .delete()
              .eq('step_id', existingStep.id);
            
            // Insert new subtasks
            if (stepToUpdate.subtasks && Array.isArray(stepToUpdate.subtasks)) {
              for (const subtask of stepToUpdate.subtasks) {
                await supabase
                  .from('blueprint_subtasks')
                  .insert({
                    step_id: existingStep.id,
                    task_number: subtask.number,
                    description: subtask.description,
                    status: 'not_started',
                  });
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error storing steps:', error);
    // Update blueprint status to failed
    if (supabase) {
      await supabase
        .from('blueprints')
        .update({ status: 'failed' })
        .eq('id', blueprintId);
    }
  }
}

export async function POST(req: Request) {
  try {
    // Parse request body
    const json = await req.json();
    
    // Validate input using Zod schema
    const validateResult = ResearchRequestSchema.safeParse(json);
    if (!validateResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input', 
          details: validateResult.error.format() 
        },
        { status: 400 }
      );
    }
    
    const { blueprintId, searchQuery, regenerateStep, skill_level, learning_objective } = validateResult.data;
    
    // Initialize Supabase client
    const supabase = createStandardServerClient();
    
    // Get the blueprint
    const { data: blueprint, error: blueprintError } = await supabase
      .from('blueprints')
      .select('*')
      .eq('id', blueprintId)
      .single();
    
    if (blueprintError || !blueprint) {
      return NextResponse.json(
        { error: 'Blueprint not found' },
        { status: 404 }
      );
    }
    
    // Use the search query from the request, or fall back to the one from the blueprint
    const query = searchQuery || blueprint.search_query;
    
    if (!query) {
      return NextResponse.json(
        { error: 'No search query provided for research' },
        { status: 400 }
      );
    }
    
    // Get existing steps if we're regenerating a specific step
    let existingSteps = null;
    if (regenerateStep !== undefined) {
      const { data: steps } = await supabase
        .from('blueprint_steps')
        .select('*')
        .eq('blueprint_id', blueprintId)
        .order('number', { ascending: true });
      
      existingSteps = steps;
    }
    
    // Update blueprint status to in_progress
    await supabase
      .from('blueprints')
      .update({ status: 'in_progress' })
      .eq('id', blueprintId);
    
    // Prepare system prompt
    let systemPrompt = getSystemPrompt(
      query, 
      skill_level || blueprint.skill_level as SkillLevelType, 
      learning_objective || blueprint.learning_objective
    );
    
    // If regenerating a specific step, add context
    if (regenerateStep !== undefined && existingSteps) {
      const stepToRegenerate = existingSteps.find(step => step.number === regenerateStep);
      if (stepToRegenerate) {
        systemPrompt += `\n\nYou are regenerating Step ${regenerateStep} which previously had the title: "${stepToRegenerate.title}". Please generate an improved version of this step only.`;
      } else {
        return NextResponse.json(
          { error: `Step ${regenerateStep} not found` },
          { status: 404 }
        );
      }
    }
    
    // Create a background task to process the full response once complete
    const backgroundProcessing = async (fullResponse: string) => {
      await processCompletedResponse(fullResponse, blueprintId, regenerateStep, supabase);
    };
    
    // Call Perplexity API with streaming
    const response = await callPerplexityAPI(systemPrompt);
    
    // Listen for the 'end' event on the response to trigger background processing
    const reader = response.body?.getReader();
    if (reader) {
      let fullResponse = '';
      
      // This will run in the background without blocking the response
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = new TextDecoder().decode(value);
            fullResponse += chunk;
          }
          
          // After reading the entire response, process it
          await backgroundProcessing(fullResponse);
        } catch (error) {
          console.error('Error reading response:', error);
        }
      })();
    }
    
    // Return the streaming response immediately
    return response;
    
  } catch (error) {
    console.error('Research API error:', error);
    return NextResponse.json(
      { error: 'Failed to process research', details: (error as Error).message },
      { status: 500 }
    );
  }
} 