/**
 * Blueprint utilities for generating prompts and research
 */

import { generateWithFallback } from './ai-orchestrator';

/**
 * Build a prompt for generating a blueprint
 */
export function buildBlueprintPrompt({
  title,
  description,
  objectives,
  userSkillLevel = 'beginner',
  userExperience = 'none'
}: {
  title: string;
  description?: string;
  objectives: string[];
  userSkillLevel?: string;
  userExperience?: string;
}): string {
  return `Generate a detailed step-by-step learning blueprint for: ${title}
Description: ${description || ''}
Objectives: ${objectives.join(', ')}
User skill level: ${userSkillLevel}
User experience: ${userExperience}

The blueprint should include:
1. A clear introduction to the topic
2. Learning objectives
3. Step-by-step instructions
4. Recommended resources
5. Assessment criteria

Format the response as a structured plan with clear headings and bullet points.`;
}

/**
 * Generate a research-based blueprint using AI
 */
export async function generateResearchBlueprint(params: {
  title: string;
  description?: string;
  objectives: string[];
  userSkillLevel?: string;
  userExperience?: string;
}): Promise<string | null> {
  try {
    const prompt = buildBlueprintPrompt(params);
    const response = await generateWithFallback(prompt, { detailed: true });
    
    if (!response || !response.content) {
      throw new Error('No content received from AI service');
    }
    
    return response.content;
  } catch (error) {
    console.error('Error generating research blueprint:', error);
    return null;
  }
} 