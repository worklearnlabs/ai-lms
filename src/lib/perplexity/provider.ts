import { z } from 'zod';
import { createProvider } from 'ai';

const perplexityModels = ['sonar-small-online', 'sonar-medium-online', 'sonar-large-online'] as const;
type PerplexityModel = (typeof perplexityModels)[number];

export const perplexity = createProvider({
  modelType: 'chat',
  models: perplexityModels,
  defaultParams: {
    model: 'sonar-medium-online' as PerplexityModel,
  },
  validateParams: z.object({
    model: z.enum(perplexityModels),
  }),
  async callApi({ messages, model }) {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new Error('PERPLEXITY_API_KEY environment variable is not set');
    }

    // Convert messages to Perplexity format
    const perplexityMessages = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: perplexityMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Perplexity API error: ${JSON.stringify(error)}`);
    }

    return response;
  },
}); 