# Blueprint Debugging System

This document outlines the debugging functionality implemented for the AI LMS blueprint system.

## Overview

The blueprint debugging system provides developers with tools to:

1. Inspect blueprint data structures
2. View API request/response flows for debugging AI interactions
3. Visualize the complete lifecycle of blueprint creation and execution

## Components

### BlueprintDebugWindow

A reusable component that provides a tabbed interface for viewing blueprint debugging information.

#### Location

`my-app/components/BlueprintDebugWindow.tsx`

#### Features

- Tabbed interface with two primary views:
  - **Blueprint Data**: Shows the parsed JSON structure of the blueprint
  - **API Flow Debug**: Displays the API requests and responses for OpenAI/other AI services
- Refresh button to reload debug data
- Clean JSON formatting with syntax highlighting
- Error handling for malformed JSON data

#### Integration

The component is integrated into:

- Create Blueprint Modal (`my-app/app/blueprints/components/create-blueprint-modal.tsx`)
- Blueprint viewer page (planned)

#### Props

```typescript
interface BlueprintDebugWindowProps {
  blueprintData: any; // The blueprint data object
  apiDebugData: {
    openaiRequest?: any;
    openaiResponse?: any;
    perplexityRequest?: any;
    perplexityResponse?: any;
    errors?: any[];
  };
  onRefresh?: () => void; // Callback when refresh button is clicked
  isLoading?: boolean; // Whether data is currently loading
}
```

## API Flow Debugging

The system captures request and response data from AI service interactions to aid in debugging.

### Data Capture Points

1. **Blueprint Creation**

   - Question generation
   - Final blueprint generation (`/api/blueprints/reason/finalize`)
   - Saving responses to database

2. **Blueprint Execution**
   - Step generation and streaming
   - Research agent interactions

### Debug Data Structure

The API debug data uses a consistent format:

```typescript
{
  openaiRequest: {
    endpoint: string;
    method: string;
    data: any; // Request body
    timestamp: string;
  },
  openaiResponse: {
    status: number;
    data: any; // Response body
    timestamp: string;
  },
  // Similar structure for other AI services
  perplexityRequest: { ... },
  perplexityResponse: { ... },
  errors: [
    {
      message: string;
      timestamp: string;
      context: string;
    }
  ]
}
```

## Activating Debug Mode

The debug panel is available in development mode and can be toggled by clicking the "Debug" button in the blueprint creation modal.

In development mode, the following capabilities are available:

1. View and refresh blueprint data
2. See the complete API request/response flow
3. View validation errors and warnings
4. Delete blueprints for testing purposes

## Accessing Debug Data

### Frontend

In React components that interact with AI services, debug data is stored in state:

```typescript
const [apiDebugData, setApiDebugData] = useState({});

// When making an API call:
setApiDebugData((prev) => ({
  ...prev,
  openaiRequest: {
    endpoint: "/api/blueprints/reason/finalize",
    method: "POST",
    data: requestData,
    timestamp: new Date().toISOString(),
  },
}));

// When receiving a response:
setApiDebugData((prev) => ({
  ...prev,
  openaiResponse: {
    status: response.status,
    data: responseData,
    timestamp: new Date().toISOString(),
  },
}));
```

### Backend

In API routes that connect to AI services, debug information is logged for traceability:

```typescript
// Example in /api/blueprints/reason/finalize
console.log(
  "%c[DEBUG] Sending request to OpenAI",
  "background: #3498db; color: white; padding: 2px 4px; border-radius: 2px;",
  requestData
);
```

## Future Enhancements

1. Add network timing measurements for AI service calls
2. Implement token usage tracking for API calls
3. Add ability to export debug data as JSON file
4. Create a dedicated admin debugging dashboard
5. Add step-by-step AI thought process visualization

## References

- [BlueprintDebugWindow Component](../components/BlueprintDebugWindow.tsx)
- [Create Blueprint Modal](../app/blueprints/components/create-blueprint-modal.tsx)
- [AI Orchestrator](../utils/ai-orchestrator.ts)
