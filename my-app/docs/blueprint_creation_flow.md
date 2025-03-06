# Blueprint Creation Flow Implementation Document

## Task Breakdown

### 1. Initial Setup (1-2 days)

- [ ] Create `markdown-parser.ts` utility for ContentItem parsing
- [ ] Update validation schemas in `validation.ts` for blueprint updates
- [ ] Create Spinner component if not already available

### 2. API Implementation (2-3 days)

- [ ] Create streaming generation API route at `/api/blueprints/generate`
- [ ] Implement OpenAI o1 reasoning agent for query transformation
- [ ] Implement Perplexity research agent for content generation
- [ ] Implement streaming functionality using Vercel AI SDK
- [ ] Implement or update PATCH API route at `/api/blueprints/[id]`
- [ ] Test API endpoints with Postman/Thunder Client

### 3. UI Components Development (3-4 days)

- [ ] Update `CreateBlueprintModal` to redirect after creation
- [ ] Update `BlueprintPage` to detect and handle streaming mode
- [ ] Create new `BlueprintStreaming` component for real-time rendering
- [ ] Implement dynamic markdown rendering with proper styling

### 4. Integration & Testing (2-3 days)

- [ ] Connect all components and test the complete flow
- [ ] Test with various prompt lengths and complexities
- [ ] Implement error handling and recovery mechanisms
- [ ] Ensure proper UI feedback during streaming process

### 5. Refinement & Optimization (1-2 days)

- [ ] Optimize streaming performance
- [ ] Address edge cases and error scenarios
- [ ] Add loading states and improve user feedback
- [ ] Document the implementation for team reference

## Data Flow

### Blueprint Creation Phase

1. **User Initiates Creation**

   - User clicks on "Create Blueprint" button in the UI
   - Client-side modal opens for input

2. **Data Collection**

   - User enters title and prompt details
   - User submits the form

3. **Initial Blueprint Creation**
   - Client sends POST request to `/api/blueprints` with title and prompt
   - Server creates a new blueprint record in the database (with `isVerified: false` meaning it's unverified/new)
   - Server returns the new blueprint ID to the client
   - Client redirects to `/blueprints/[id]?streaming=true`

### Streaming Content Generation Phase

4. **Streaming Setup**

   - Client loads the blueprint detail page with streaming parameter
   - Server returns the page with the `BlueprintStreaming` component initialized
   - Component automatically initiates the streaming request on mount

5. **Content Generation Request**

   - Client sends request to `/api/blueprints/generate` with the blueprint ID
   - Server calls the AI agent orchestration flow (see AI Agent Architecture)
   - AI agents begin processing and generating content

6. **Real-time Content Streaming**
   - Generated content streams back to the server in real-time
   - Server forwards these tokens to the client using Server-Sent Events (SSE)
   - Client receives and processes the incoming stream
   - UI renders content incrementally as it arrives, parsing markdown on-the-fly

### Completion and Persistence Phase

7. **Content Completion**

   - When the content stream completes, client has the full generated content
   - Client parses the complete markdown into ContentItem structure
   - Client sends PATCH request to `/api/blueprints/[id]` with the parsed content

8. **Blueprint Finalization**
   - Server updates the blueprint record with the complete content
   - Blueprint remains unverified (`isVerified: false`) until a human confirms the steps work
   - Client refreshes the page to show the finalized blueprint with standard UI
   - User can later mark the blueprint as verified once they've tested the solution

## AI Agent Architecture

Our blueprint generation uses a powerful multi-agent approach to create high-quality, detailed implementation plans:

### 1. Reasoning Agent (OpenAI o1)

The first step in our AI pipeline is to transform the user's raw prompt into an optimized search query:

- **Input**: User's original blueprint prompt
- **Process**: OpenAI's o1 model analyzes the prompt to identify key concepts, requirements, and technical details
- **Output**: A refined, focused search query optimized for technical research
- **Purpose**: This transformation ensures that the research phase has the most precise query possible

```typescript
// Example query transformation
const userPrompt =
  "Create a chatbot that can answer questions about my website";
const refinedQuery =
  "Implementation steps for creating a conversational AI chatbot with context awareness for website content, including: architecture, required APIs, training methodology, deployment steps";
```

### 2. Research Agent (Perplexity)

The second agent in our pipeline uses the refined query to gather comprehensive information:

- **Input**: Refined query from the reasoning agent
- **Process**: Perplexity research agent searches for relevant information, examples, best practices
- **Output**: Detailed structured content in markdown format
- **Purpose**: Gathers the actual blueprint content based on the optimized query

### 3. Streaming Implementation

The entire process is implemented with streaming capabilities using Vercel AI SDK's streaming functionality:

- As content is generated by the research agent, it's immediately streamed to the client
- The client receives and renders chunks of content as they arrive
- Progress indicators show the user that generation is ongoing
- The content is rendered in real-time, providing immediate value while the full blueprint is being generated

```typescript
// Simplified streaming implementation
const stream = await researchAgent.generateWithStream(refinedQuery);
return streamer(req, stream, { blueprintId });
```

This multi-agent architecture provides several benefits:

1. **Higher Quality Content**: By using specialized agents for reasoning and research
2. **Faster Perceived Response**: Users see content immediately via streaming
3. **Better User Experience**: Progressive rendering creates more engagement than waiting for a complete response
4. **Optimized Research**: The transformed query yields more relevant and comprehensive results

### Data Types

**Blueprint Creation Request**

```typescript
{
  title: string;
  prompt: string;
}
```

**Blueprint Response**

```typescript
{
  blueprint: {
    id: string;
    title: string;
    prompt: string;
    isVerified: boolean; // false = unverified/new, true = verified by human
    // Other properties
  }
}
```

**Content Update Request**

```typescript
{
  content: ContentItem[];
}
```

**Blueprint Model Structure**

```typescript
interface Blueprint {
  id: string;
  title: string;
  prompt: string;
  content: ContentItem[];
  isVerified: boolean; // false = unverified/new, true = verified by human
  stepsCount: number;
  details: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface BlueprintCreateInput {
  title: string;
  prompt: string;
  userId: string;
}

interface BlueprintUpdateInput {
  title?: string;
  prompt?: string;
  content?: ContentItem[];
  isVerified?: boolean;
}
```

**ContentItem Structure**

```typescript
interface ContentItem {
  type: "heading" | "paragraph" | "list" | "code";
  content?: string;
  items?: string[];
  language?: string;
}
```

## Overview

This document outlines the implementation plan for enhancing the blueprint creation process with streaming capability for the step-by-step plan generation. The flow will consist of:

1. User clicks on "Create Blueprint" button
2. User enters a title and prompt in a modal
3. User is redirected to the new blueprint page with a streaming step-by-step plan

## Current Implementation Analysis

The current codebase has:

- A `CreateBlueprintButton` component that opens a modal
- A `CreateBlueprintModal` component that collects title and prompt
- A blueprint detail page that displays the blueprint content
- API routes for creating blueprints and generating content
- Currently, blueprint creation is not streaming - it's a synchronous process

## Implementation Plan

### 1. Update Blueprint Creation API

We need to create a new streaming API route specifically for blueprint generation with multi-agent orchestration:

```typescript
// my-app/app/api/blueprints/generate/route.ts
import { streamer } from "@ai-sdk/react";
import { createBlueprint } from "@/utils/models";
import { refinePromptWithOpenAI, getResearchFromPerplexity } from "@/utils/ai";
import OpenAI from "openai";
import { StreamingTextResponse } from "ai";

export const runtime = "edge";
export const maxDuration = 60; // Allow longer timeout for research queries

export async function POST(req: Request) {
  try {
    const { title, prompt, userId } = await req.json();

    // Create a blueprint first to get an ID
    const blueprint = await createBlueprint({
      title,
      prompt,
      userId: userId || "user-1", // Use actual user ID in production
    });

    // Step 1: Use OpenAI o1 to refine the search query
    const refinedQuery = await refinePromptWithOpenAI(prompt);

    // Step 2: Use Perplexity to research and generate content with streaming
    const stream = await getResearchFromPerplexityWithStream(refinedQuery, {
      detailed: true,
      model: "sonar-pro", // Use advanced model for detailed responses
    });

    // Step 3: Return streaming response to the client
    return new StreamingTextResponse(stream, {
      headers: {
        "x-blueprint-id": blueprint.id,
      },
    });
  } catch (error) {
    console.error("Error generating blueprint:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate blueprint" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
```

### 2. Implement AI Utility Functions

Create utility functions for the reasoning agent and research agent:

```typescript
// my-app/utils/ai.ts

/**
 * Call OpenAI to refine a user's prompt into a more effective search query
 */
export async function refinePromptWithOpenAI(
  userPrompt: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: "o1",
    messages: [
      {
        role: "system",
        content:
          "You are an expert at converting user queries into efficient, targeted search queries. Rephrase the user's request into a concise, effective search query that will yield the most relevant results. Do not add any explanations, just provide the refined query.",
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    temperature: 0.3,
  });

  return response.choices[0].message.content.trim();
}

/**
 * Call Perplexity to get research results based on a query with streaming
 */
export async function getResearchFromPerplexityWithStream(
  query: string,
  options = { detailed: false, model: "sonar" }
) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY environment variable is not set");
  }

  // Select model based on complexity of query
  const model = options.detailed ? "sonar-pro" : "sonar";

  // Set temperature - lower for detailed research, higher for general
  const temperature = options.detailed ? 0.3 : 0.7;

  // Create system message based on detail level
  const systemMessage = options.detailed
    ? `You are a specialized research assistant that provides comprehensive, detailed information. 
       Focus on depth and accuracy. Include specific technical details, methodologies, and nuanced explanations.
       Cite any notable sources of information when relevant.
       Format your response as a properly structured markdown document with headings and subheadings.`
    : `You are a helpful research assistant that provides clear, concise information.
       Focus on the most important points and explain them in an accessible way.
       Avoid unnecessary technical jargon unless specifically requested.`;

  // Call Perplexity API with streaming enabled
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: query },
      ],
      temperature,
      stream: true,
    }),
  });

  // Parse the streaming response
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Perplexity API error: ${JSON.stringify(error)}`);
  }

  // Return the streaming response
  return response.body;
}
```

### 3. Update Blueprint Streaming Component

Update the StreamingContent component to handle the multi-agent streaming:

```typescript
// my-app/app/blueprints/[id]/components/blueprint-streaming.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { ContentItem } from "../types";
import { parseMarkdownToContentItems } from "@/utils/markdown-parser";

interface BlueprintStreamingProps {
  blueprintId: string;
  prompt: string;
}

export default function BlueprintStreaming({
  blueprintId,
  prompt,
}: BlueprintStreamingProps) {
  const router = useRouter();
  const [generatedMarkdown, setGeneratedMarkdown] = useState<string>("");
  const [parsedContent, setParsedContent] = useState<ContentItem[]>([]);

  // Use the AI SDK's useChat hook for streaming
  const { messages, isLoading, handleSubmit, error } = useChat({
    api: "/api/blueprints/generate",
    body: {
      blueprintId,
      title: prompt.substring(0, 50), // Use first 50 chars as a title summary
      prompt,
    },
    initialMessages: [{ role: "user", content: prompt }],
    onResponse: (response) => {
      // This is called when the API starts returning a response
      if (!response.ok) {
        toast.error("Error generating blueprint");
      }
    },
    onFinish: async (message) => {
      // When streaming is complete, save the full content to the database
      const markdown = message.content;
      setGeneratedMarkdown(markdown);

      try {
        // Parse the markdown to ContentItem[]
        const contentItems = parseMarkdownToContentItems(markdown);
        setParsedContent(contentItems);

        // Save the generated content to the database
        const response = await fetch(`/api/blueprints/${blueprintId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: contentItems,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save blueprint content");
        }

        // Refresh the page to show the fully saved blueprint
        router.refresh();
      } catch (error) {
        toast.error("Error saving blueprint", {
          description:
            (error as Error).message || "Please try regenerating the blueprint",
        });
      }
    },
  });

  // Automatically trigger the generation on component mount
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === "user") {
      // This will trigger the API call to start the streaming
      handleSubmit(new FormEvent("submit") as any);
    }
  }, [messages, handleSubmit]);

  // Get the latest AI message
  const lastMessage = messages[messages.length - 1];
  const streamingContent =
    lastMessage?.role === "assistant" ? lastMessage.content : "";

  // Render the streaming content
  return (
    <Card className="p-6">
      <div className="prose prose-sm max-w-none dark:prose-invert">
        {isLoading && (
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <Spinner size="sm" />
            <span>Generating your blueprint...</span>
          </div>
        )}

        {error && (
          <div className="text-destructive mb-4">
            Error: {error.message}
            <button className="ml-2 underline" onClick={() => router.refresh()}>
              Try again
            </button>
          </div>
        )}

        {/* Split the markdown by headers and paragraphs for a more dynamic display */}
        {streamingContent.split("\n").map((line, index) => {
          if (line.startsWith("# ")) {
            return (
              <h1
                key={index}
                className="text-2xl font-bold mt-6 mb-3 first:mt-0"
              >
                {line.substring(2)}
              </h1>
            );
          } else if (line.startsWith("## ")) {
            return (
              <h2 key={index} className="text-xl font-bold mt-6 mb-3">
                {line.substring(3)}
              </h2>
            );
          } else if (line.startsWith("### ")) {
            return (
              <h3 key={index} className="text-lg font-bold mt-4 mb-2">
                {line.substring(4)}
              </h3>
            );
          } else if (
            line.trim().startsWith("- ") ||
            line.trim().startsWith("* ")
          ) {
            return (
              <li key={index} className="ml-6">
                {line.trim().substring(2)}
              </li>
            );
          } else if (line.trim().match(/^\d+\./)) {
            return (
              <li key={index} className="ml-6">
                {line
                  .trim()
                  .substring(line.indexOf(".") + 1)
                  .trim()}
              </li>
            );
          } else if (line.trim() === "") {
            return <div key={index} className="my-2"></div>;
          } else {
            return (
              <p key={index} className="my-2">
                {line}
              </p>
            );
          }
        })}

        {/* Show a cursor animation at the end while typing */}
        {isLoading && (
          <span className="inline-block w-2 h-4 bg-primary animate-pulse"></span>
        )}
      </div>
    </Card>
  );
}
```

### 4. Create Markdown Parser Utility

Create a utility to parse markdown into our ContentItem structure:

````typescript
// my-app/utils/markdown-parser.ts
import { ContentItem } from "@/app/blueprints/[id]/types";

export function parseMarkdownToContentItems(markdown: string): ContentItem[] {
  const lines = markdown.split("\n");
  const contentItems: ContentItem[] = [];
  let currentList: string[] = [];
  let currentCodeBlock: string | null = null;
  let currentCodeLanguage: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Handle code blocks
    if (line.startsWith("```")) {
      if (currentCodeBlock === null) {
        // Start of code block
        currentCodeLanguage = line.substring(3).trim();
        currentCodeBlock = "";
      } else {
        // End of code block
        contentItems.push({
          type: "code",
          content: currentCodeBlock,
          language: currentCodeLanguage || undefined,
        });
        currentCodeBlock = null;
        currentCodeLanguage = null;
      }
      continue;
    }

    // If we're inside a code block, append to it
    if (currentCodeBlock !== null) {
      currentCodeBlock += (currentCodeBlock ? "\n" : "") + line;
      continue;
    }

    // Skip empty lines outside code blocks
    if (!line) continue;

    // Check for headings
    if (line.startsWith("# ")) {
      if (currentList.length > 0) {
        contentItems.push({ type: "list", items: [...currentList] });
        currentList = [];
      }
      contentItems.push({ type: "heading", content: line.substring(2) });
    }
    // Check for h2/h3 headings
    else if (line.startsWith("## ") || line.startsWith("### ")) {
      if (currentList.length > 0) {
        contentItems.push({ type: "list", items: [...currentList] });
        currentList = [];
      }
      contentItems.push({
        type: "heading",
        content: line.startsWith("## ") ? line.substring(3) : line.substring(4),
      });
    }
    // Check for list items
    else if (
      line.startsWith("- ") ||
      line.startsWith("* ") ||
      /^\d+\.\s/.test(line)
    ) {
      const itemContent = line.replace(/^-\s|\*\s|\d+\.\s/, "");
      currentList.push(itemContent);
    }
    // Everything else is a paragraph
    else {
      if (currentList.length > 0) {
        contentItems.push({ type: "list", items: [...currentList] });
        currentList = [];
      }
      contentItems.push({ type: "paragraph", content: line });
    }
  }

  // Don't forget to add the last list if it exists
  if (currentList.length > 0) {
    contentItems.push({ type: "list", items: [...currentList] });
  }

  return contentItems;
}
````

### 5. Add API Route for Updating a Blueprint

Create an API endpoint to update a blueprint with the generated content:

```typescript
// my-app/app/api/blueprints/[id]/route.ts
import { NextResponse } from "next/server";
import { updateBlueprint, getBlueprintById } from "@/utils/models";
import { BlueprintUpdateSchema } from "@/utils/validation";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET endpoint for a specific blueprint
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const blueprint = await getBlueprintById(params.id);

    if (!blueprint) {
      return NextResponse.json(
        { error: "Blueprint not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ blueprint });
  } catch (error) {
    console.error("Error fetching blueprint:", error);
    return NextResponse.json(
      { error: "Failed to fetch blueprint" },
      { status: 500 }
    );
  }
}

// PATCH endpoint for updating a blueprint
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const blueprint = await getBlueprintById(params.id);

    if (!blueprint) {
      return NextResponse.json(
        { error: "Blueprint not found" },
        { status: 404 }
      );
    }

    // Get request data
    const data = await request.json();

    // Validate the update data
    const validationResult = BlueprintUpdateSchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid update data",
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    // Update the blueprint
    const updatedBlueprint = await updateBlueprint(params.id, data);

    return NextResponse.json({ blueprint: updatedBlueprint });
  } catch (error) {
    console.error("Error updating blueprint:", error);
    return NextResponse.json(
      { error: "Failed to update blueprint" },
      { status: 500 }
    );
  }
}
```

## Implementation Steps

1. **Create New Utility Files**:

   - Create `markdown-parser.ts` utility for parsing markdown to ContentItem[]
   - Update `validation.ts` with any required schema updates

2. **Create New API Routes**:

   - Create streaming API route for blueprint generation
   - Create or update PATCH API route for updating blueprints

3. **Update Blueprint Components**:

   - Modify `CreateBlueprintModal` to redirect to blueprint page with streaming=true
   - Update `BlueprintPage` to handle streaming parameter
   - Create new `BlueprintStreaming` component for real-time content generation

4. **Update Models and Utilities**:

   - Ensure the validation schemas support streaming content
   - Update blueprint models to support saving streamed content

5. **Testing**:
   - Test the blueprint creation flow end-to-end
   - Test streaming functionality with different prompt lengths
   - Test handling of errors in streaming and content saving

## Future Enhancements

1. **Progress Indicator**: Add a progress bar or percentage to show streaming completion
2. **Save Partial Drafts**: Allow saving partially generated content in case of errors
3. **Streaming Controls**: Add pause/resume/cancel buttons for long-running generations
4. **Blueprint Templates**: Create pre-defined templates for common blueprint types

## Conclusion

This implementation plan outlines how to enhance the blueprint creation flow with streaming functionality using Vercel AI SDK. By implementing this plan, users will be able to see a real-time generation of their blueprint content, providing a more engaging and interactive experience.
