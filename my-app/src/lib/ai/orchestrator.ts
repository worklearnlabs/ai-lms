import { OpenAI } from "openai";
import { Anthropic } from "@anthropic-ai/sdk";
import { PerplexityAI } from "./perplexity"; // Custom client

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const perplexity = new PerplexityAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
});

// Service status tracking
const serviceStatus = {
  openai: { operational: true, lastFailure: null },
  anthropic: { operational: true, lastFailure: null },
  perplexity: { operational: true, lastFailure: null },
};

// Orchestrator function with fallback
export async function generateWithFallback(prompt: string, options = {}) {
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
      console.error("OpenAI Error:", error);
      serviceStatus.openai.operational = false;
      serviceStatus.openai.lastFailure = new Date();
      
      // Schedule status reset after 5 minutes
      setTimeout(() => {
        serviceStatus.openai.operational = true;
      }, 5 * 60 * 1000);
    }
  }
  
  // Try first fallback (Anthropic)
  if (serviceStatus.anthropic.operational) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
      });
      return {
        content: response.content[0]?.text,
        provider: "anthropic",
      };
    } catch (error) {
      console.error("Anthropic Error:", error);
      serviceStatus.anthropic.operational = false;
      serviceStatus.anthropic.lastFailure = new Date();
      
      setTimeout(() => {
        serviceStatus.anthropic.operational = true;
      }, 5 * 60 * 1000);
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
      console.error("Perplexity Error:", error);
      serviceStatus.perplexity.operational = false;
      serviceStatus.perplexity.lastFailure = new Date();
      
      setTimeout(() => {
        serviceStatus.perplexity.operational = true;
      }, 5 * 60 * 1000);
    }
  }
  
  // All services failed
  throw new Error("All AI services are currently unavailable. Please try again later.");
} 