import { buildResearchPrompt, buildSimplifiedResearchPrompt, UserProfile, BlueprintRequest } from './promptBuilder';

/**
 * Interface for research results returned from Perplexity
 */
export interface ResearchResult {
  content: string;
  sources?: string[];
  timestamp: string;
  query: string;
}

/**
 * Service for conducting blueprint research using Perplexity
 */
export class BlueprintResearchService {
  /**
   * Conduct research for a blueprint based on user profile and blueprint request
   * 
   * @param profile - User profile data
   * @param blueprintRequest - Blueprint request data
   * @returns Promise with research results
   */
  static async conductResearch(
    profile: UserProfile,
    blueprintRequest: BlueprintRequest
  ): Promise<ResearchResult> {
    try {
      const prompt = buildResearchPrompt(profile, blueprintRequest);
      return await this.executePerplexityQuery(prompt, true);
    } catch (error) {
      console.error("Error conducting full research:", error);
      // Fallback to simplified prompt if there's an error
      const simplifiedPrompt = buildSimplifiedResearchPrompt(
        profile.skillLevel,
        blueprintRequest.description
      );
      return await this.executePerplexityQuery(simplifiedPrompt, false);
    }
  }

  /**
   * Conduct quick research with minimal information
   * 
   * @param description - Brief description of what to research
   * @param skillLevel - Optional user skill level
   * @returns Promise with research results
   */
  static async quickResearch(
    description: string,
    skillLevel: string = 'intermediate'
  ): Promise<ResearchResult> {
    const prompt = buildSimplifiedResearchPrompt(skillLevel, description);
    return await this.executePerplexityQuery(prompt, false);
  }

  /**
   * Execute a research query using the Perplexity API
   * 
   * @param prompt - The research prompt to send to Perplexity
   * @param isDetailedQuery - Whether this is a detailed query (affects timeout and processing)
   * @returns Promise with research results
   */
  private static async executePerplexityQuery(
    prompt: string,
    isDetailedQuery: boolean = false
  ): Promise<ResearchResult> {
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          detailed: isDetailedQuery,
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        content: result.content,
        sources: result.sources,
        timestamp: new Date().toISOString(),
        query: prompt,
      };
    } catch (error) {
      console.error("Error executing Perplexity query:", error);
      throw error;
    }
  }
} 