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

    // Get API key from environment
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new Error('PERPLEXITY_API_KEY environment variable is not set');
    }
    
    // Select model based on complexity of query - use valid model names as per Perplexity docs
    // https://sdk.vercel.ai/providers/ai-sdk-providers/perplexity
    const model = detailed ? 'sonar-pro' : 'sonar';
    
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

    // Prepare messages for the API call
    const messages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: prompt }
    ];

    // Call Perplexity API directly
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Perplexity API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

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