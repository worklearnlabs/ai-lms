import { generateText } from "ai";
import { perplexity } from "@ai-sdk/perplexity";

// Define source structure based on Perplexity's response format
export interface PerplexitySource {
  title: string;
  url: string;
  snippet?: string;
}

// Define usage metrics structure
export interface UsageMetrics {
  citation_tokens: number;
  search_queries: number;
}

export interface PerplexityResearchRequest {
  query: string;
  context?: string;
  options?: {
    max_steps?: number;
    complexity?: "low" | "medium" | "high";
    depth?: "basic" | "detailed" | "comprehensive";
  };
}

// Define step structure
export interface BlueprintStep {
  number: number;
  title: string;
  estimated_time: number; // Integer in minutes
  instructions: string[];
  tools: string[];
  subtasks?: Array<{
    task_number: number;
    description: string;
    estimated_time: number; // Integer in minutes
  }>;
}

// Research response structure
export interface PerplexityResearchResponse {
  complexity: "low" | "medium" | "high";
  steps: BlueprintStep[];
  sources: PerplexitySource[];
  usage_metrics: UsageMetrics;
}

// Define a more specific type for Perplexity sources
interface PerplexityApiSource {
  title?: string;
  url?: string;
  snippet?: string;
}

// Define types for the AI SDK response metadata
interface PerplexityMetadata {
  perplexity?: {
    usage?: {
      citationTokens?: number;
      numSearchQueries?: number;
    }
  };
  sources?: PerplexityApiSource[];
}

interface GenerateTextResponse {
  text: string;
  metadata?: PerplexityMetadata;
}

export async function generateResearch(
  request: PerplexityResearchRequest
): Promise<PerplexityResearchResponse> {
  try {
    // Create prompt
    const prompt = createPrompt(request);

    // Use the Vercel AI SDK to generate text with Perplexity
    const result = await generateText({
      model: perplexity("sonar-pro-online"),
      prompt,
      maxTokens: 4000,
      temperature: 0.7,
    }) as GenerateTextResponse;

    // Parse the JSON response from the generated text
    const researchData = JSON.parse(result.text) as Omit<
      PerplexityResearchResponse,
      "sources" | "usage_metrics"
    >;

    // Create default usage metrics since toolUsage might not be available
    const usageMetrics: UsageMetrics = {
      citation_tokens: 0,
      search_queries: 0
    };
    
    // Try to extract usage metrics from the response if available
    try {
      // Access the metadata object differently depending on the SDK version
      const metadata = result.metadata || {};
      if (metadata.perplexity?.usage) {
        usageMetrics.citation_tokens = metadata.perplexity.usage.citationTokens || 0;
        usageMetrics.search_queries = metadata.perplexity.usage.numSearchQueries || 0;
      }
    } catch (metadataError) {
      console.warn("Could not extract usage metrics", metadataError);
    }

    // Format sources from Perplexity response or use empty array if not present
    const formattedSources: PerplexitySource[] = (result.metadata?.sources || []).map(
      (source: PerplexityApiSource) => ({
        title: source.title || "Unknown Source",
        url: source.url || "",
        snippet: source.snippet || "",
      })
    );

    // Combine everything into our final response format
    return {
      ...researchData,
      sources: formattedSources,
      usage_metrics: usageMetrics,
    } as PerplexityResearchResponse;
  } catch (error) {
    console.error("Error calling Perplexity API:", error);
    throw new Error(`Failed to generate research: ${error}`);
  }
}

// Helper to create the prompt
function createPrompt(request: PerplexityResearchRequest): string {
  return `
    You are a step-by-step implementation planner.
    Create a detailed implementation plan for: "${request.query}"
    
    ${request.context ? `Context: ${request.context}` : ''}
    
    For each step:
    1. Provide a clear title
    2. Estimate completion time (in minutes as an integer)
    3. List specific tools/technologies needed
    4. Break down into bullet-point instructions
    5. Include any code snippets or examples if needed
    
    Return a structured JSON with sequential steps:
    {
      "complexity": "${request.options?.complexity || "medium"}",
      "steps": [
        {
          "number": 1,
          "title": "Step title",
          "estimated_time": 30, 
          "instructions": ["Instruction 1", "Instruction 2"],
          "tools": ["Tool1", "Tool2"],
          "subtasks": [
            {"task_number": 1, "description": "Subtask description", "estimated_time": 10}
          ]
        }
      ]
    }
    
    Note:
    - DO NOT include a title for the overall project; we already have the blueprint title
    - estimated_time should be an integer representing minutes
    - The step's estimated_time should include the time for all subtasks plus any additional work
    - Steps should be in logical sequence from first to last
    - DO NOT include sources in your JSON - they will be added separately
  `;
} 