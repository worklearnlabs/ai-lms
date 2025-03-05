import { streamText } from 'ai';
import { perplexity } from '../../../src/lib/perplexity/provider';
import { tool } from 'ai';
import { z } from 'zod';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: perplexity('sonar-medium-online'),
    messages,
    // Adding research tool for Perplexity
    tools: {
      research: tool({
        description: 'Research up-to-date information from the web',
        parameters: z.object({
          query: z.string().describe('The search query to research'),
        }),
        execute: async ({ query }) => {
          // Perplexity already inherently does web searches
          // This tool is mostly for explicit research requests
          return {
            results: `Research results for: ${query}`,
            source: 'Perplexity AI web search',
          };
        },
      }),
    },
  });

  return result.toDataStreamResponse();
} 