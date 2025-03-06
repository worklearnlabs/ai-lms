import { OpenAI } from "openai";
import { Anthropic } from "@anthropic-ai/sdk";
import { createPerplexityProvider } from "./perplexity";

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const perplexity = createPerplexityProvider();

// Simple Perplexity API client
class PerplexityAI {
  private apiKey: string;

  constructor({ apiKey }: { apiKey: string }) {
    this.apiKey = apiKey;
  }

  async generateCompletion({ prompt, model = "sonar-medium-online", temperature = 0.7 }: { 
    prompt: string;
    model?: string;
    temperature?: number;
  }) {
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
      })
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      text: data.choices[0].message.content,
      model: data.model
    };
  }
}

// Initialize Perplexity client
const perplexityAI = new PerplexityAI({
  apiKey: process.env.PERPLEXITY_API_KEY || "",
});

// Service status tracking
const serviceStatus = {
  openai: { operational: true, lastFailure: null as Date | null },
  anthropic: { operational: true, lastFailure: null as Date | null },
  perplexity: { operational: true, lastFailure: null as Date | null },
};

// Reset a service after timeout
function resetServiceAfterTimeout(service: keyof typeof serviceStatus, timeoutMs = 5 * 60 * 1000) {
  setTimeout(() => {
    serviceStatus[service].operational = true;
  }, timeoutMs);
}

// Mark a service as unavailable
function markServiceUnavailable(service: keyof typeof serviceStatus, error: unknown) {
  console.error(`${service} Error:`, error);
  serviceStatus[service].operational = false;
  serviceStatus[service].lastFailure = new Date();
  resetServiceAfterTimeout(service);
}

// Orchestrator function with fallback
export async function generateWithFallback(prompt: string, options: Record<string, unknown> = {}) {
  // Try primary service first (OpenAI)
  if (serviceStatus.openai.operational) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
        ...options,
      });
      return {
        content: response.choices[0]?.message?.content,
        provider: "openai",
      };
    } catch (error) {
      markServiceUnavailable("openai", error);
    }
  }
  
  // Try first fallback (Anthropic)
  if (serviceStatus.anthropic.operational) {
    try {
      // Using Anthropic's Claude API
      const response = await anthropic.completions.create({
        model: "claude-3-sonnet-20240229",
        prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
        max_tokens_to_sample: 1000,
      });
      return {
        content: response.completion,
        provider: "anthropic",
      };
    } catch (error) {
      markServiceUnavailable("anthropic", error);
    }
  }
  
  // Try second fallback (Perplexity)
  if (serviceStatus.perplexity.operational) {
    try {
      const response = await perplexity.generateCompletion({
        prompt,
        ...options,
      });
      return {
        content: response.text,
        provider: "perplexity",
      };
    } catch (error) {
      markServiceUnavailable("perplexity", error);
    }
  }
  
  // All services failed
  throw new Error("All AI services are currently unavailable. Please try again later.");
} 