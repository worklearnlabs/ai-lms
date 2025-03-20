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
    
    console.log('==== PERPLEXITY API REQUEST ====');
    console.log('Query:', request.query);
    console.log('Prompt:', prompt);
    
    // Use the Vercel AI SDK to generate text with Perplexity
    console.log('Calling Perplexity API with model: sonar-pro-online');

    // For Perplexity, we rely on the enhanced prompt to instruct the model to include sources
    // We've updated the prompt to specifically request sources for tools and technologies
    const result = await generateText({
      model: perplexity("sonar-pro-online"),
      prompt,
      maxTokens: 4000,
      temperature: 0.7,
    }) as GenerateTextResponse;
    
    console.log('==== PERPLEXITY API RESPONSE ====');
    console.log('Raw text response:', result.text.substring(0, 500) + '...');
    console.log('Metadata:', JSON.stringify(result.metadata, null, 2));

    // Parse the JSON response from the generated text
    // Enhanced parsing to handle text responses with preamble before JSON
    let researchData;
    try {
      // First try direct parsing in case it's clean JSON
      researchData = JSON.parse(result.text);
    } catch (parseError) {
      console.log('Direct JSON parsing failed, attempting to extract JSON from text response');
      console.log('Parse error details:', parseError instanceof Error ? parseError.message : String(parseError));
      
      // Try to find the start of a JSON object in the text
      const jsonStart = result.text.indexOf('{');
      if (jsonStart !== -1) {
        try {
          // Extract text from the first '{' to the end and try to parse it
          const jsonText = result.text.substring(jsonStart);
          researchData = JSON.parse(jsonText);
          console.log('Successfully extracted JSON from text response');
        } catch (extractError) {
          console.error('Failed to extract JSON from response text:', extractError);
          throw new Error('Response contained invalid JSON format');
        }
      } else {
        console.error('No JSON object found in response text');
        throw new Error('No JSON object found in API response');
      }
    }

    // Validate that we have the expected structure
    if (!researchData || !researchData.complexity || !researchData.steps || !Array.isArray(researchData.steps)) {
      console.error('Invalid research data structure:', researchData);
      throw new Error('API returned invalid research data structure');
    }
    
    console.log('Parsed research data (first 2 steps):', 
      JSON.stringify({
        complexity: researchData.complexity,
        steps: researchData.steps.slice(0, 2)
      }, null, 2)
    );

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
        console.log('Usage metrics found:', usageMetrics);
      } else {
        console.log('No usage metrics in response metadata');
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
    
    console.log('Sources found:', formattedSources.length);
    if (formattedSources.length > 0) {
      console.log('First source:', JSON.stringify(formattedSources[0], null, 2));
    } else {
      // Log full metadata for debugging when no sources found
      console.log('No sources found in metadata. Full metadata:', JSON.stringify(result.metadata, null, 2));
      console.log('Checking for sources in API response format...');
      
      // Some API responses might include sources data differently - check alternatives
      try {
        // Try to extract sources from other locations in the response
        const responseObj = JSON.parse(result.text);
        
        // Option 1: Sources might be directly in the response object
        if (responseObj.sources && Array.isArray(responseObj.sources) && responseObj.sources.length > 0) {
          console.log('Found sources in response object, using these instead.');
          const altSources = responseObj.sources.map((src: {
            title?: string;
            name?: string;
            url?: string;
            snippet?: string;
            description?: string;
          }) => ({
            title: src.title || src.name || "Source",
            url: src.url || "",
            snippet: src.snippet || src.description || ""
          }));
          
          if (altSources.length > 0) {
            console.log(`Found ${altSources.length} alternative sources`);
            return {
              ...researchData,
              sources: altSources,
              usage_metrics: usageMetrics,
            } as PerplexityResearchResponse;
          }
        }
      } catch (parseError) {
        console.log('No alternative sources found in response:', parseError instanceof Error ? parseError.message : 'Unknown error');
      }
    }

    // Combine everything into our final response format
    const finalResponse = {
      ...researchData,
      sources: formattedSources,
      usage_metrics: usageMetrics,
    } as PerplexityResearchResponse;
    
    console.log('==== PERPLEXITY PROCESSING COMPLETE ====');
    
    return finalResponse;
  } catch (error) {
    console.error("Error calling Perplexity API:", error);
    throw new Error(`Failed to generate research: ${error}`);
  }
}

// Helper to create the prompt
function createPrompt(request: PerplexityResearchRequest): string {
  return `
    You are a step-by-step implementation planner.
    
    IMPORTANT: You MUST respond with ONLY a JSON object. Do not include any introduction, explanation, or concluding text before or after the JSON.
    
    Create a detailed implementation plan for: "${request.query}"
    
    ${request.context ? `Context: ${request.context}` : ''}
    
    For each step:
    1. Provide a clear title
    2. Estimate completion time (in minutes as an integer)
    3. List specific tools/technologies needed
    4. Break down into bullet-point instructions
    5. Include any code snippets or examples if needed
    
    IMPORTANT: For each tool or technology you mention in the steps, you MUST search for and include relevant sources such as:
    - Official documentation pages
    - Tutorial websites
    - GitHub repositories
    - API reference pages
    
    Your search should find authoritative sources for each technology. For example, if you mention "React", include a source for React's official documentation.
    
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
    - You MUST perform web searches to find relevant sources for tools and technologies
    
    FINAL REMINDER: Your entire response must be ONLY valid JSON - no text before or after the JSON object. The first character should be '{' and the last should be '}'.
  `;
} 