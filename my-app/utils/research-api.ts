import { SkillLevelType, StepStatusType } from '@/types/schema';

interface BlueprintStep {
  id: string;
  blueprint_id: string;
  number: number;
  title: string;
  estimated_time?: string;
  instructions?: string[];
  tools?: string[];
  status: StepStatusType;
  created_at: string;
  updated_at: string;
  subtasks?: {
    id: string;
    step_id: string;
    task_number: number;
    description: string;
    status: StepStatusType;
    estimated_time?: string;
    created_at: string;
    updated_at: string;
  }[];
}

interface Blueprint {
  id: string;
  title: string;
  description?: string;
  content?: Record<string, unknown>;
  search_query?: string;
  prompt?: string;
  is_verified: boolean;
  visibility: 'private' | 'public' | 'team';
  team_id?: string;
  skill_level?: SkillLevelType;
  learning_objective?: string;
  complexity?: 'low' | 'medium' | 'high';
  estimated_time?: string;
  steps_count?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get a stream of implementation steps for a blueprint
 * @param blueprintId The blueprint ID
 * @param options Optional search query, regeneration step, skill level and learning objective
 * @returns A response with a readable stream
 */
export async function streamResearchSteps(
  blueprintId: string,
  options?: {
    searchQuery?: string;
    regenerateStep?: number;
    skill_level?: SkillLevelType;
    learning_objective?: string;
  }
): Promise<Response> {
  try {
    const response = await fetch('/api/blueprints/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blueprintId,
        searchQuery: options?.searchQuery,
        regenerateStep: options?.regenerateStep,
        skill_level: options?.skill_level,
        learning_objective: options?.learning_objective,
      }),
    });

    if (!response.ok) {
      // Try to parse error as JSON
      let errorMessage = 'Failed to generate steps';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // If can't parse as JSON, use status text
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return response;
  } catch (error) {
    console.error('Error streaming research steps:', error);
    throw error;
  }
}

/**
 * Update a blueprint step
 * @param blueprintId The blueprint ID
 * @param stepId The step ID
 * @param data The data to update
 * @returns The updated step
 */
export async function updateBlueprintStep(
  blueprintId: string,
  stepId: string,
  data: {
    title?: string;
    estimated_time?: string;
    instructions?: string[];
    tools?: string[];
    status?: StepStatusType;
    regenerate?: boolean;
  }
): Promise<{ step: BlueprintStep }> {
  try {
    const response = await fetch(`/api/blueprints/${blueprintId}/steps/${stepId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating blueprint step:', error);
    throw error;
  }
}

/**
 * Update a blueprint's verification status
 * @param blueprintId The blueprint ID
 * @param isVerified Whether the blueprint is verified
 * @returns The updated blueprint
 */
export async function updateBlueprintVerification(
  blueprintId: string,
  isVerified: boolean
): Promise<{ blueprint: Blueprint }> {
  try {
    const response = await fetch(`/api/blueprints/${blueprintId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        is_verified: isVerified,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating blueprint verification:', error);
    throw error;
  }
} 