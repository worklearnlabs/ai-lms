import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createStandardServerClient } from '@/utils/supabase';
import OpenAI from 'openai';

// Define validation schema for step updates
const StepUpdateSchema = z.object({
  title: z.string().optional(),
  estimated_time: z.string().optional(),
  instructions: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed']).optional(),
  regenerate: z.boolean().optional(),
});

// Handler for GET /api/blueprints/[id]/steps/[step_id]
export async function GET(
  req: Request,
  { params }: { params: { id: string, step_id: string } }
) {
  try {
    const { id, step_id } = params;

    // Validate the IDs
    if (!id || !step_id) {
      return NextResponse.json(
        { error: 'Blueprint ID and Step ID are required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createStandardServerClient();

    // Get the step from the database
    const { data: step, error } = await supabase
      .from('blueprint_steps')
      .select(`
        *,
        subtasks:blueprint_subtasks(*)
      `)
      .eq('id', step_id)
      .eq('blueprint_id', id)
      .single();

    if (error || !step) {
      return NextResponse.json(
        { error: 'Step not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ step });
  } catch (error) {
    console.error('Error fetching step:', error);
    return NextResponse.json(
      { error: 'Failed to fetch step' },
      { status: 500 }
    );
  }
}

// Handler for PATCH /api/blueprints/[id]/steps/[step_id]
export async function PATCH(
  req: Request,
  { params }: { params: { id: string, step_id: string } }
) {
  try {
    const { id, step_id } = params;

    // Validate the IDs
    if (!id || !step_id) {
      return NextResponse.json(
        { error: 'Blueprint ID and Step ID are required' },
        { status: 400 }
      );
    }

    // Get the request body
    const body = await req.json();

    // Validate the input
    const result = StepUpdateSchema.safeParse(body);
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
    const shouldRegenerate = updateData.regenerate === true;
    
    // Remove the regenerate flag if it exists
    if ('regenerate' in updateData) {
      delete updateData.regenerate;
    }

    // Initialize Supabase client
    const supabase = createStandardServerClient();

    // First, make sure the step exists and belongs to the given blueprint
    const { data: existingStep, error: fetchError } = await supabase
      .from('blueprint_steps')
      .select('*')
      .eq('id', step_id)
      .eq('blueprint_id', id)
      .single();

    if (fetchError || !existingStep) {
      return NextResponse.json(
        { error: 'Step not found' },
        { status: 404 }
      );
    }

    // Get the blueprint data for regeneration if needed
    let blueprint = null;
    if (shouldRegenerate) {
      const { data: blueprintData, error: blueprintError } = await supabase
        .from('blueprints')
        .select('search_query, skill_level, learning_objective')
        .eq('id', id)
        .single();

      if (blueprintError || !blueprintData) {
        return NextResponse.json(
          { error: 'Failed to fetch blueprint data for regeneration' },
          { status: 500 }
        );
      }

      blueprint = blueprintData;
    }

    // If regeneration is requested, call the AI model to regenerate the step
    if (shouldRegenerate && blueprint) {
      // Configure OpenAI client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Prepare system prompt for step regeneration
      const systemPrompt = `
You are a step-by-step implementation planner. The user wants to regenerate a specific step in a blueprint.

Original step details:
- Step Number: ${existingStep.number}
- Title: ${existingStep.title}
- Instructions: ${JSON.stringify(existingStep.instructions)}
- Tools: ${JSON.stringify(existingStep.tools)}

Blueprint context:
- Main Topic: "${blueprint.search_query}"
- Skill Level: ${blueprint.skill_level || 'intermediate'}
- Learning Objective: ${blueprint.learning_objective || 'implementing the solution effectively'}

Please generate an improved version of just this step.
Return it as a JSON object with the following structure:
{
  "title": "Improved Step Title",
  "estimatedTime": "Updated time estimate",
  "toolTags": ["Tool1", "Tool2"],
  "instructions": ["Instruction 1", "Instruction 2"],
  "subtasks": [
    {"number": 1, "description": "Subtask description"}
  ]
}
`;

      // Call the AI model
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          }
        ],
        temperature: 0.7,
      });

      // Extract the JSON response
      const content = response.choices[0]?.message?.content || '';
      try {
        // Try to parse the JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          const regeneratedStep = JSON.parse(jsonStr);

          // Update the existing step with regenerated content
          updateData.title = regeneratedStep.title || existingStep.title;
          updateData.estimated_time = regeneratedStep.estimatedTime || existingStep.estimated_time;
          updateData.instructions = regeneratedStep.instructions || existingStep.instructions;
          updateData.tools = regeneratedStep.toolTags || existingStep.tools;

          // Delete existing subtasks
          await supabase
            .from('blueprint_subtasks')
            .delete()
            .eq('step_id', step_id);

          // Insert new subtasks if available
          if (regeneratedStep.subtasks && Array.isArray(regeneratedStep.subtasks)) {
            for (const subtask of regeneratedStep.subtasks) {
              await supabase
                .from('blueprint_subtasks')
                .insert({
                  step_id: step_id,
                  task_number: subtask.number,
                  description: subtask.description,
                  status: 'not_started',
                });
            }
          }
        }
      } catch (error) {
        console.error('Error parsing regenerated step:', error);
        return NextResponse.json(
          { error: 'Failed to regenerate step' },
          { status: 500 }
        );
      }
    }

    // If no data to update (only regenerate flag was present), return success
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        success: true,
        step: existingStep 
      });
    }

    // Update the step
    const { data: updatedStep, error: updateError } = await supabase
      .from('blueprint_steps')
      .update(updateData)
      .eq('id', step_id)
      .select(`
        *,
        subtasks:blueprint_subtasks(*)
      `)
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update step' },
        { status: 500 }
      );
    }

    // If marking as complete, check if all steps are complete to update blueprint
    if (updateData.status === 'completed') {
      // Check if all steps for this blueprint are complete
      const { data: steps, error: stepsError } = await supabase
        .from('blueprint_steps')
        .select('status')
        .eq('blueprint_id', id);

      if (!stepsError && steps) {
        const allCompleted = steps.every(step => step.status === 'completed');
        
        if (allCompleted) {
          // Update the blueprint verification status
          await supabase
            .from('blueprints')
            .update({ is_verified: true })
            .eq('id', id);
        }
      }
    }

    return NextResponse.json({ step: updatedStep });
  } catch (error) {
    console.error('Error updating step:', error);
    return NextResponse.json(
      { error: 'Failed to update step' },
      { status: 500 }
    );
  }
} 