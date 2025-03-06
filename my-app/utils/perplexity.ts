/**
 * Perplexity API Provider
 */

/**
 * A client for interacting with the Perplexity API
 */
export class PerplexityProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Generate a text completion from the Perplexity API
   */
  async generateCompletion({
    prompt,
    model = "sonar-medium-online",
    temperature = 0.7,
    maxTokens = 1000,
  }: {
    prompt: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }) {
    if (!this.apiKey) {
      throw new Error("Perplexity API key is required");
    }

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: maxTokens,
      })
    });

    if (!response.ok) {
      const message = `Perplexity API error: ${response.status} ${response.statusText}`;
      console.error(message);
      throw new Error(message);
    }

    const data = await response.json();
    
    return {
      text: data.choices[0].message.content,
      model: data.model,
      usage: data.usage,
    };
  }
}

/**
 * Create a Perplexity provider instance with the API key from environment variables
 */
export function createPerplexityProvider() {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.warn("PERPLEXITY_API_KEY environment variable is not set");
  }
  
  return new PerplexityProvider(apiKey || "");
} 