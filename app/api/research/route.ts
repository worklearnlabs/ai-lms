import { streamText } from 'ai';
import { perplexity } from '../../../src/lib/perplexity/provider';
import { NextResponse } from 'next/server';

// Allow longer timeout for research queries (60 seconds)
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // Parse request body
    const { prompt, detailed = false } = await req.json();

    // Validate input
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing prompt' },
        { status: 400 }
      );
    }

    // Select model based on complexity of query
    const model = detailed ? 'sonar-large-online' : 'sonar-medium-online';
    
    // Set temperature - lower for detailed research, higher for general
    const temperature = detailed ? 0.3 : 0.7;

    // Create system message based on detail level
    const systemMessage = detailed
      ? `You are a specialized research assistant that provides comprehensive, detailed information. 
         Focus on depth and accuracy. Include specific technical details, methodologies, and nuanced explanations.
         Cite any notable sources of information when relevant.`
      : `You are a helpful research assistant that provides clear, concise information.
         Focus on the most important points and explain them in an accessible way.
         Avoid unnecessary technical jargon unless specifically requested.`;

    // Process the research request
    const response = await streamText({
      model: perplexity({ model }),
      temperature,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ]
    });

    // Collect the streamed response
    const chunks: string[] = [];
    for await (const chunk of response) {
      chunks.push(chunk);
    }

    // Combine chunks to form the complete response
    const content = chunks.join('');

    // Return the research results
    return NextResponse.json({
      content,
      model,
      timestamp: new Date().toISOString(),
      query: prompt
    });
  } catch (error) {
    console.error('Research API error:', error);
    return NextResponse.json(
      { error: 'Failed to complete research', details: (error as Error).message },
      { status: 500 }
    );
  }
} 