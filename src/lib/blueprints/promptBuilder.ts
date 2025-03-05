/**
 * Types for the promptBuilder utility
 */
export interface UserProfile {
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | string;
  learningObjectives: string;
  preferredLearningStyle?: string;
  industryExperience?: string;
}

export interface BlueprintRequest {
  title: string;
  description: string;
  tags?: string[];
  complexity?: 'simple' | 'moderate' | 'complex';
}

/**
 * Builds an optimized research prompt for Perplexity based on user profile and blueprint details
 * 
 * @param profile - The user's profile containing skill level and learning objectives
 * @param blueprintRequest - The details from the blueprint creation modal
 * @returns A tailored prompt string for Perplexity to use in its search
 */
export function buildResearchPrompt(
  profile: UserProfile,
  blueprintRequest: BlueprintRequest
): string {
  // Extract key information
  const { skillLevel, learningObjectives, preferredLearningStyle, industryExperience } = profile;
  const { title, description, tags, complexity } = blueprintRequest;
  
  // Build a context section that describes the user
  const userContext = `I am a ${skillLevel} AI developer ${
    industryExperience ? `with experience in ${industryExperience}` : ''
  }. My learning objectives are: ${learningObjectives}${
    preferredLearningStyle ? `. I prefer learning through ${preferredLearningStyle}` : ''
  }.`;
  
  // Build a blueprint context section
  const blueprintContext = `I need to create an AI blueprint titled "${title}" that ${description}${
    complexity ? `. The desired complexity level is ${complexity}` : ''
  }.`;
  
  // Include tags as keywords if available
  const tagsSection = tags && tags.length > 0 
    ? ` Key technologies/concepts include: ${tags.join(', ')}.`
    : '';
  
  // Build the research request
  const researchRequest = `Please research the latest information, best practices, frameworks, tools, and approaches for implementing this blueprint, tailored to my skill level and learning objectives. Focus on practical implementation steps, common pitfalls to avoid, and how to measure success.`;
  
  // Combine everything into a single, well-structured prompt
  const fullPrompt = `
${userContext}

${blueprintContext}${tagsSection}

${researchRequest}

Return your results in a structured format with sections for:
1. Overview of approach
2. Recommended technologies and tools
3. Implementation steps
4. Best practices and pitfalls
5. Resources for further learning
  `.trim();
  
  return fullPrompt;
}

/**
 * Simplified prompt builder function for cases where full profile data is not available
 * 
 * @param skillLevel - User's skill level (optional)
 * @param description - Blueprint description
 * @returns A simplified research prompt
 */
export function buildSimplifiedResearchPrompt(
  skillLevel: string = 'intermediate',
  description: string
): string {
  return `
As a ${skillLevel} AI developer, I need to research how to build: ${description}

Please provide the latest information, best practices, frameworks, tools and implementation approaches. Include practical implementation steps and common pitfalls to avoid.
  `.trim();
} 