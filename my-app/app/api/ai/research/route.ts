import { NextResponse } from 'next/server';
import { processUserPrompt } from '@/utils/ai';
import { ResearchRequestSchema } from '@/utils/validation';

// Set the runtime to edge for better performance
export const runtime = 'edge';

// Allow longer timeout for research queries (60 seconds)
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // Parse request body
    const json = await req.json();
    
    // Validate input using Zod schema
    const result = ResearchRequestSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input', 
          details: result.error.format() 
        },
        { status: 400 }
      );
    }
    
    const { prompt, detailed } = result.data;
    
    // Process the prompt through the AI chain
    const response = await processUserPrompt(prompt, { 
      detailed,
      // Use prompt refinement for most queries, but can be disabled if needed
      skipRefinement: false 
    });
    
    // Return the research results
    return NextResponse.json({
      content: response.answer,
      refinedQuery: response.refinedQuery,
      timestamp: new Date().toISOString(),
      originalQuery: prompt
    });
  } catch (error) {
    console.error('Research API error:', error);
    return NextResponse.json(
      { error: 'Failed to complete research', details: (error as Error).message },
      { status: 500 }
    );
  }
} 