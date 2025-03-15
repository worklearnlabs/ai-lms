# AI Orchestrator

The AI Orchestrator is a critical component in the AI LMS system that manages AI service requests, fallbacks, and error handling across multiple providers.

## Overview

The orchestrator provides:

1. **Centralized AI Request Handling**: A unified interface for making AI requests
2. **Service Fallback Logic**: Automatic failover between AI providers if a service is unavailable
3. **Service Health Monitoring**: Tracking of service availability status
4. **Error Handling**: Graceful degradation when services are unavailable

## Architecture

### Key Components

- **Service Initialization**: Setup of API clients for multiple AI providers (OpenAI, Anthropic, Perplexity)
- **Service Status Tracking**: Monitoring which AI providers are available or experiencing issues
- **Fallback Mechanism**: Logic for switching between providers when one fails
- **Error Recovery**: Automatic retry and service restoration after timeouts

## Service Providers

The orchestrator manages the following AI providers:

1. **OpenAI (Primary)**: Used as the default provider
2. **Anthropic (Secondary)**: Used as the first fallback
3. **Perplexity (Tertiary)**: Used as the second fallback

## Fallback Mechanism

The fallback process follows this sequence:

1. Try primary service (OpenAI)
2. If it fails, mark as unavailable and try secondary service (Anthropic)
3. If secondary fails, mark as unavailable and try tertiary service (Perplexity)
4. If all services fail, throw an error

```typescript
// Simplified pseudocode for fallback mechanism
async function generateWithFallback(prompt, options) {
  // Try OpenAI first
  if (serviceStatus.openai.available) {
    try {
      return await openaiClient.chat.completions.create({...});
    } catch (error) {
      markServiceAsUnavailable('openai');
      // Continue to fallback
    }
  }

  // Try Anthropic as first fallback
  if (serviceStatus.anthropic.available) {
    try {
      return await anthropicClient.messages.create({...});
    } catch (error) {
      markServiceAsUnavailable('anthropic');
      // Continue to fallback
    }
  }

  // Try Perplexity as second fallback
  if (serviceStatus.perplexity.available) {
    try {
      return await perplexityClient.generateCompletion({...});
    } catch (error) {
      markServiceAsUnavailable('perplexity');
      // No more fallbacks
    }
  }

  // If we get here, all services are unavailable
  throw new Error("All AI services are currently unavailable");
}
```

## Service Recovery

Each service has an automatic recovery mechanism:

1. When a service fails, it's marked as unavailable
2. After a timeout period (default: 5 minutes), the service is automatically reset to available
3. The next request will then attempt to use the service again
4. If it succeeds, the service continues to be used; if it fails, the cycle repeats

```typescript
function markServiceAsUnavailable(serviceName) {
  serviceStatus[serviceName].available = false;

  // Set a timeout to reset the service status after 5 minutes
  setTimeout(() => {
    serviceStatus[serviceName].available = true;
    console.log(`${serviceName} has been reset to available status`);
  }, 5 * 60 * 1000); // 5 minutes
}
```

## Error Handling

The orchestrator provides several layers of error handling:

1. **Service-Specific Error Handling**: Different error handling for each provider's API
2. **Retry Logic**: Multiple attempts for transient errors like rate limits
3. **Fallback Triggers**: Specific errors that trigger fallback to another service
4. **Graceful Degradation**: Informative error messages when all services fail

## Integration with Debug System

The orchestrator integrates with the debugging system:

1. Each request is logged with detailed parameters
2. Responses are captured for inspection
3. Errors are recorded with context and provider information
4. Service status changes are tracked and timestamped

## Usage Example

```typescript
import { generateWithFallback } from "@/utils/ai-orchestrator";

async function generateContent() {
  try {
    const completion = await generateWithFallback({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Explain quantum computing in simple terms." },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return completion;
  } catch (error) {
    console.error("AI generation failed:", error);
    // Handle the error appropriately
  }
}
```

## Logging

The orchestrator includes extensive logging to help with troubleshooting:

```
[DEBUG] Attempting OpenAI request with model gpt-4
[DEBUG] OpenAI request failed with error: Error: 429 Too Many Requests
[DEBUG] Marking OpenAI as unavailable
[DEBUG] Falling back to Anthropic
[DEBUG] Anthropic request successful
```

## Configuration

The orchestrator can be configured with environment variables:

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
PERPLEXITY_API_KEY=pplx-...
AI_FALLBACK_TIMEOUT_MINUTES=5
```

## Future Enhancements

1. Add support for more AI providers (e.g., Cohere, Google PaLM)
2. Implement smart routing based on request type and provider strengths
3. Add metrics collection for performance monitoring
4. Implement cost optimization strategies
5. Add circuit breaker pattern for more robust error handling

## References

- [AI Orchestrator Implementation](../utils/ai-orchestrator.ts)
- [Blueprint Debugging System](./blueprint_debugging.md)
