/**
 * AI Provider Utilities
 * This file contains utilities for interacting with various AI providers (OpenAI, Perplexity)
 * and implements the sequential chaining of these providers.
 */

/**
 * Call OpenAI to refine a user's prompt into a more effective search query
 */
export async function refinePromptWithOpenAI(userPrompt: string): Promise<string> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at converting user queries into efficient, targeted search queries. Rephrase the user\'s request into a concise, effective search query that will yield the most relevant results. Do not add any explanations, just provide the refined query.'
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const refinedQuery = data.choices[0].message.content.trim();
    
    return refinedQuery;
  } catch (error) {
    console.error('Error refining prompt with OpenAI:', error);
    // Fall back to the original prompt if there's an error
    return userPrompt;
  }
}

/**
 * Call Perplexity to get research results based on a query
 */
export async function getResearchFromPerplexity(query: string, detailed: boolean = false): Promise<string> {
  try {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new Error('PERPLEXITY_API_KEY environment variable is not set');
    }
    
    // Select model based on complexity of query
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
      { role: 'user', content: query }
    ];

    // Call Perplexity API
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

    return content;
  } catch (error) {
    console.error('Error getting research from Perplexity:', error);
    throw error;
  }
}

/**
 * Process a user prompt through the sequential AI workflow:
 * 1. Refine the prompt with OpenAI
 * 2. Get research results from Perplexity using the refined prompt
 */
export async function processUserPrompt(
  userPrompt: string,
  options = { detailed: false, skipRefinement: false }
): Promise<{ refinedQuery: string; answer: string }> {
  try {
    // Step 1: Use OpenAI to refine the prompt (unless skipped)
    let refinedQuery = userPrompt;
    if (!options.skipRefinement) {
      refinedQuery = await refinePromptWithOpenAI(userPrompt);
      console.log(`Original prompt: "${userPrompt}"`);
      console.log(`Refined query: "${refinedQuery}"`);
    }

    // Step 2: Use Perplexity for research based on refined query
    const answer = await getResearchFromPerplexity(refinedQuery, options.detailed);

    return {
      refinedQuery,
      answer
    };
  } catch (error) {
    console.error('Error in AI processing chain:', error);
    throw error;
  }
} 