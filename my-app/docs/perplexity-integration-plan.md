# Perplexity Research Agent Integration Plan

## Overview

This document outlines the implementation strategy for integrating the Perplexity API as a research agent within our Adaptive Learning System. This integration directly supports the project's goal of providing personalized AI workflow blueprints by enriching them with research-backed content that enhances user learning and implementation success.

The research agent will leverage Perplexity's AI capabilities to generate structured, relevant content based on blueprint topics, which will be displayed to users alongside their blueprints. This aligns with the project's commitment to blending human validation with automated processes for an enhanced learning experience.

## System Architecture

```
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│                │    │                │    │                │
│  Frontend UI   │◄───┤  Blueprint API │◄───┤ Perplexity API │
│  (Blueprint    │    │  (NextJS API   │    │ (External AI   │
│   Display)     │    │   Routes)      │    │  Service)      │
│                │    │                │    │                │
└────────────────┘    └────────────────┘    └────────────────┘
                            │
                            ▼
                      ┌────────────────┐
                      │                │
                      │   Supabase     │
                      │   Database     │
                      │                │
                      └────────────────┘
```

## Data Flow

### New Blueprint Creation Flow

1. User creates a new blueprint by entering a prompt
2. We call the OpenAI API (reasoning agent) with the prompt to generate a list of clarifying questions that will help us generate a better `search_query`
3. The user answers each individual question that's stored in the database, and then we call the OpenAI API again to formulate the `search_query`
4. We use the `search_query` to call Perplexity API with structured prompts to return a JSON response containing:

   - Ordered steps with estimated completion times, instructions, and tools
   - Attribution sources for the research content
   - Usage metrics for monitoring and analytics

5. Data is stored in the database and linked to the blueprint
6. Frontend renders the enhanced content in the blueprint page using React Flow to create visual flow diagrams

### Existing Blueprint Update Flow

1. User accesses an existing blueprint and modifies the prompt
2. The system detects the change and offers to regenerate the blueprint
3. Upon confirmation, we call the OpenAI API with the updated prompt to regenerate clarifying questions
4. We present the new questions to the user, prepopulating with previous responses where possible (for questions that are similar)
5. The user reviews and answers all questions (updating previous responses as needed)
6. Once complete, we call the OpenAI API again with the updated Q&A to regenerate the `search_query`
7. The system presents the option to regenerate research using the new search query
8. Upon confirmation, the Perplexity API is called with the new search query
9. The updated research results replace the previous research in the database
10. The frontend refreshes to display the new research content with updated visualizations

### Research Refresh Flow (Without Prompt Changes)

1. User accesses an existing blueprint with research already generated
2. User clicks the "Refresh Research" button (without changing the prompt)
3. System uses the existing `search_query` to regenerate research from Perplexity
4. New research results are stored alongside the previous results with version tracking
5. Frontend updates to display the latest research while providing access to previous versions

### Step-Specific Refresh Flow

1. User views an existing blueprint with research already generated
2. User selects a specific step they want to update or improve
3. User clicks the "Refresh Step" button for that particular step
4. System crafts a targeted query specifically for that step's content
5. A focused API call is made to Perplexity to regenerate just that step's information
6. The new step information is merged into the existing research data, replacing only the targeted step
7. Frontend updates to show the refreshed step while maintaining all other steps
8. The change is logged in the step's revision history for tracking purposes

This granular refresh approach allows users to iteratively improve specific parts of the blueprint implementation plan without regenerating the entire research document, resulting in more precise refinements and better conservation of API resources.

## JSON Response Formats and Source Handling

### Perplexity API Response Structure

Based on the Vercel AI SDK documentation, Perplexity returns sources as a separate property in the response, not integrated within the content structure:

```javascript
// Example response from Perplexity API via Vercel AI SDK
const { text, sources, providerMetadata } = await generateText({
  model: perplexity("sonar-pro"),
  prompt: "Research query...",
});

// Sources array (separate from the content)
console.log(sources);
// Example: [{ title: "Source Title", url: "https://example.com" }, ...]

// Additional metadata
console.log(providerMetadata);
// Example:
// {
//   perplexity: {
//     usage: { citationTokens: 5286, numSearchQueries: 1 },
//     images: [
//       { imageUrl: "https://example.com/image1.jpg", originUrl: "https://elsewhere.com/page1", height: 1280, width: 720 }
//     ]
//   }
// }
```

### Our Blueprint Research Structure

Taking into account Perplexity's response format, we'll adapt our blueprint research structure in the following ways:

1. Store step-by-step content in our structured JSON format
2. Store sources separately at the top level
3. Capture usage metrics for monitoring and analytics

### Simplified Response Format

We'll use a single, simplified response format for all blueprint research:

```json
{
  "complexity": "low|medium|high",
  "steps": [
    {
      "number": 1,
      "title": "Step Title",
      "estimated_time": 30, // Integer in minutes
      "instructions": [
        "First instruction bullet point",
        "Second instruction bullet point",
        "Third instruction bullet point"
      ],
      "tools": ["n8n", "Google Docs", "ChatGPT"],
      "subtasks": [
        {
          "task_number": 1,
          "description": "Subtask description",
          "estimated_time": 10 // Integer in minutes
        }
      ]
    }
    // Additional steps...
  ],
  "sources": [
    {
      "title": "Source Title",
      "url": "https://example.com/source",
      "snippet": "Relevant excerpt from this source..."
    }
  ],
  "usage_metrics": {
    "citation_tokens": 5286,
    "search_queries": 1
  }
}
```

## React Flow Integration

The JSON structure above maps directly to React Flow components in the frontend, where we can implement different visualization approaches:

### Linear Flow Visualization

For simple linear flows, we can automatically generate sequential edges:

```typescript
// Example mapping logic for linear visualization
steps.forEach((step, index) => {
  // Create node for each step
  nodes.push({
    id: `step-${step.number}`,
    type: "stepNode",
    position: { x: 350, y: index * 300 },
    data: { ...step },
  });

  // Create edge from previous step (if not first step)
  if (index > 0) {
    edges.push({
      id: `edge-${index - 1}-to-${index}`,
      source: `step-${steps[index - 1].number}`,
      target: `step-${step.number}`,
      type: "smoothstep",
      label: "Next Step",
    });
  }
});
```

### Complex Flow Visualization

For complex visualization, we can implement a custom algorithm to create more sophisticated edge arrangements:

```typescript
// Example mapping logic for complex visualization
steps.forEach((step) => {
  // Create node for each step
  nodes.push({
    id: `step-${step.number}`,
    type: "stepNode",
    // Position would be calculated based on graph layout algorithm
    position: calculateNodePosition(step.number),
    data: { ...step },
  });
});

// Create edges based on dependencies or relationships
// This logic would be implemented in the frontend based on step analysis
createCustomEdges(steps, nodes, edges);
```

The visualization mode can be selected by the user in the frontend without changing the API response format.

## Task Breakdown

### Phase 1: Database Schema and Backend Implementation

#### Task 1.1: Create Blueprint Research Database Table

- **Description:** Implement the database table to store Perplexity-generated research content
- **Dependencies:** None
- **Subtasks:**
  - [ ] Create SQL script for the `blueprint_research` table
  - [ ] Add appropriate indexes for query optimization
  - [ ] Implement Row-Level Security (RLS) policies
  - [ ] Execute and verify the schema creation
- **Expected Outcome:** A functioning database table that can store research data linked to blueprints

#### Task 1.2: Perplexity API Integration

- **Description:** Create a wrapper for the Perplexity API to generate research content
- **Dependencies:** None
- **Subtasks:**
  - [ ] Implement TypeScript interfaces for API requests and responses
  - [ ] Create utility functions for making API calls with proper error handling
  - [ ] Set up environment variables for API configuration
  - [ ] Create test harness to verify API functionality
  - [ ] Implement source extraction and formatting
- **Expected Outcome:** A reliable API wrapper that can communicate with Perplexity and return structured research data

#### Task 1.3: Research API Endpoints

- **Description:** Create backend API routes to handle research generation and retrieval
- **Dependencies:** Task 1.1, Task 1.2
- **Subtasks:**
  - [ ] Implement POST endpoint for generating new research
  - [ ] Implement GET endpoint for retrieving existing research
  - [ ] Add proper authentication and authorization checks
  - [ ] Implement error handling and logging
- **Expected Outcome:** Functioning API endpoints that can generate and retrieve research content

### Phase 2: Frontend Integration

#### Task 2.1: Research Component Implementation

- **Description:** Create a React component to display research content in blueprints
- **Dependencies:** Task 1.3
- **Subtasks:**
  - [ ] Design and implement the research component UI
  - [ ] Add loading states and error handling
  - [ ] Implement tabs for different sections of research content
  - [ ] Create source attribution and external linking functionality
  - [ ] Create visualization selector (linear vs complex display)
- **Expected Outcome:** A polished, user-friendly component for displaying research content

#### Task 2.2: Blueprint Page Integration

- **Description:** Integrate the research component into the blueprint page
- **Dependencies:** Task 2.1
- **Subtasks:**
  - [ ] Add the research component to the blueprint page layout
  - [ ] Implement context sharing between blueprint and research components
  - [ ] Add responsive design adjustments for different screen sizes
  - [ ] Test integration with various blueprint types and states
- **Expected Outcome:** Research content seamlessly integrated into the blueprint experience

#### Task 2.3: React Flow Visualization Implementation

- **Description:** Create visualization rendering logic for displaying blueprint steps
- **Dependencies:** Task 2.1
- **Subtasks:**
  - [ ] Implement linear flow visualization logic
  - [ ] Implement complex flow visualization logic
  - [ ] Create toggle UI to switch between visualization modes
  - [ ] Add interactive features (zoom, pan, click interactions)
  - [ ] Implement responsive design for different screen sizes
- **Expected Outcome:** Interactive, visually appealing flow diagrams for blueprint steps

### Phase 3: Prompt Engineering and Content Optimization

#### Task 3.1: Research Prompt Template Development

- **Description:** Create and refine prompt templates for both linear and complex modes
- **Dependencies:** Task 1.2
- **Subtasks:**
  - [ ] Design base prompt template structure
  - [ ] Create specialized prompts for linear flow mode
  - [ ] Create specialized prompts for complex flow mode
  - [ ] Test and iterate on prompts with various blueprint types
- **Expected Outcome:** Optimized prompt templates that generate consistent, high-quality research for both modes

#### Task 3.2: Content Presentation Optimization

- **Description:** Enhance the presentation and formatting of research content
- **Dependencies:** Task 2.1
- **Subtasks:**
  - [ ] Implement syntax highlighting for code snippets
  - [ ] Add expandable/collapsible sections for long content
  - [ ] Optimize source linking and attribution
  - [ ] Improve mobile experience for research content
- **Expected Outcome:** Enhanced content presentation that maximizes readability and usability

### Phase 4: Testing and Rollout

#### Task 4.1: Integration Testing

- **Description:** Comprehensive testing of the entire research generation and display flow
- **Dependencies:** All previous tasks
- **Subtasks:**
  - [ ] Create test cases for various blueprint scenarios
  - [ ] Test database operations and RLS policies
  - [ ] Verify API response handling and error scenarios
  - [ ] Test frontend component rendering and interactions
- **Expected Outcome:** Verified functionality across all components of the system

#### Task 4.2: Performance Optimization

- **Description:** Optimize performance of research generation and display
- **Dependencies:** Task 4.1
- **Subtasks:**
  - [ ] Implement caching for research content
  - [ ] Optimize database queries
  - [ ] Add pagination or lazy loading for large research content
  - [ ] Measure and improve API response times
- **Expected Outcome:** High-performance research functionality that scales well

#### Task 4.3: Phased Rollout

- **Description:** Gradually deploy the feature to users
- **Dependencies:** Task 4.2
- **Subtasks:**
  - [ ] Set up feature flag system for controlled rollout
  - [ ] Deploy to 10% of users initially
  - [ ] Monitor performance and gather feedback
  - [ ] Gradually increase rollout percentage based on metrics
- **Expected Outcome:** Successful deployment with minimal disruption and maximum stability

## SQL Scripts

### blueprint_research_table_creation

```sql
-- Create Blueprint Research Table
-- This table stores AI-generated research content for blueprints

DO $$
BEGIN
    -- Create enum for research status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type JOIN pg_namespace ON pg_type.typnamespace = pg_namespace.oid
                   WHERE typname = 'research_status_type' AND nspname = 'public') THEN
        CREATE TYPE public.research_status_type AS ENUM ('pending', 'complete', 'failed');
    END IF;

    -- Note: We're not using flow_mode_type anymore as the visualization mode is handled in the frontend
END
$$;

-- Create the blueprint_research table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.blueprint_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  research_data JSONB NOT NULL,
  sources JSONB,
  usage_metrics JSONB,
  status research_status_type DEFAULT 'complete',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_blueprint_research_blueprint_id
ON public.blueprint_research(blueprint_id);

-- Add comment describing the table
COMMENT ON TABLE public.blueprint_research IS 'Stores AI-generated research content for blueprints from Perplexity API';

-- Enable Row Level Security
ALTER TABLE public.blueprint_research ENABLE ROW LEVEL SECURITY;
```

### blueprint_research_rls_policies

```sql
-- RLS Policies for Blueprint Research
-- These policies control access to the blueprint_research table

-- Allow users to view research for blueprints they own
CREATE POLICY blueprint_research_owner_select ON public.blueprint_research
  FOR SELECT USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE user_id = auth.uid()
  ));

-- Allow users to create research for blueprints they own
CREATE POLICY blueprint_research_owner_insert ON public.blueprint_research
  FOR INSERT WITH CHECK (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE user_id = auth.uid()
  ));

-- Allow users to update research for blueprints they own
CREATE POLICY blueprint_research_owner_update ON public.blueprint_research
  FOR UPDATE USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE user_id = auth.uid()
  ));

-- Allow users to view research for public blueprints
CREATE POLICY blueprint_research_public_view ON public.blueprint_research
  FOR SELECT USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE visibility = 'public'
  ));

-- Add comments explaining the policies
COMMENT ON POLICY blueprint_research_owner_select ON public.blueprint_research IS
  'Allow users to view research for blueprints they own';
COMMENT ON POLICY blueprint_research_owner_insert ON public.blueprint_research IS
  'Allow users to create research for blueprints they own';
COMMENT ON POLICY blueprint_research_owner_update ON public.blueprint_research IS
  'Allow users to update research for blueprints they own';
COMMENT ON POLICY blueprint_research_public_view ON public.blueprint_research IS
  'Allow users to view research for public blueprints';
```

## Implementation Details

### Perplexity API Wrapper

```typescript
// utils/perplexity-api.ts
import { VercelAI } from "@vercel/ai";
import { perplexity } from "@ai-sdk/perplexity";

// Define source structure based on Perplexity's response format
export interface PerplexitySource {
  title: string;
  url: string;
  snippet?: string;
}

// Define usage metrics structure
export interface UsageMetrics {
  citation_tokens: number;
  search_queries: number;
}

export interface PerplexityResearchRequest {
  query: string;
  context?: string;
  options?: {
    max_steps?: number;
    complexity?: "low" | "medium" | "high";
    depth?: "basic" | "detailed" | "comprehensive";
  };
}

// Define step structure
export interface BlueprintStep {
  number: number;
  title: string;
  estimated_time: number; // Integer in minutes
  instructions: string[];
  tools: string[];
  subtasks?: Array<{
    task_number: number;
    description: string;
    estimated_time: number; // Integer in minutes
  }>;
}

// Research response structure
export interface PerplexityResearchResponse {
  complexity: "low" | "medium" | "high";
  steps: BlueprintStep[];
  sources: PerplexitySource[];
  usage_metrics: UsageMetrics;
}

export async function generateResearch(
  request: PerplexityResearchRequest
): Promise<PerplexityResearchResponse> {
  try {
    // Create prompt
    const prompt = createPrompt(request);

    // Initialize the Vercel AI client with Perplexity provider
    const ai = new VercelAI({
      apiKey: process.env.PERPLEXITY_API_KEY!,
    });

    // Generate text using Perplexity
    const { text, sources, providerMetadata } = await ai.generateText({
      model: perplexity("sonar-pro-online"),
      prompt,
      temperature: 0.7,
      maxTokens: 4000,
      providerOptions: {
        perplexity: {
          // Any additional Perplexity-specific options
        },
      },
    });

    // Parse the JSON response
    const researchData = JSON.parse(text) as Omit<
      PerplexityResearchResponse,
      "sources" | "usage_metrics"
    >;

    // Extract usage metrics from provider metadata
    const usageMetrics: UsageMetrics = {
      citation_tokens: providerMetadata?.perplexity?.usage?.citationTokens || 0,
      search_queries:
        providerMetadata?.perplexity?.usage?.numSearchQueries || 0,
    };

    // Format sources from Perplexity response
    const formattedSources: PerplexitySource[] = (sources || []).map(
      (source: any) => ({
        title: source.title || "Unknown Source",
        url: source.url || "",
        snippet: source.snippet || "",
      })
    );

    // Combine everything into our final response format
    return {
      ...researchData,
      sources: formattedSources,
      usage_metrics: usageMetrics,
    } as PerplexityResearchResponse;
  } catch (error) {
    console.error("Error calling Perplexity API:", error);
    throw new Error("Failed to generate research");
  }
}

// Helper to create the prompt
function createPrompt(request: PerplexityResearchRequest): string {
  return `
    You are a step-by-step implementation planner.
    Create a detailed implementation plan for: "${request.query}"
    
    For each step:
    1. Provide a clear title
    2. Estimate completion time (in minutes as an integer)
    3. List specific tools/technologies needed
    4. Break down into bullet-point instructions
    5. Include any code snippets or examples if needed
    
    Return a structured JSON with sequential steps:
    {
      "complexity": "${request.options?.complexity || "medium"}",
      "steps": [
        {
          "number": 1,
          "title": "Step title",
          "estimated_time": 30, 
          "instructions": ["Instruction 1", "Instruction 2"],
          "tools": ["Tool1", "Tool2"],
          "subtasks": [
            {"task_number": 1, "description": "Subtask description", "estimated_time": 10}
          ]
        }
      ]
    }
    
    Note:
    - DO NOT include a title for the overall project; we already have the blueprint title
    - estimated_time should be an integer representing minutes
    - The step's estimated_time should include the time for all subtasks plus any additional work
    - Steps should be in logical sequence from first to last
    - DO NOT include sources in your JSON - they will be added separately
  `;
}
```

### Blueprint Research API

```typescript
// app/api/blueprints/[id]/research/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase-admin";
import {
  generateResearch,
  PerplexityResearchRequest,
} from "@/utils/perplexity-api";
import { createRouteHandler } from "@/utils/route-handlers";

export const POST = createRouteHandler(
  ["POST"],
  async (req: NextRequest, { params, user }) => {
    try {
      const { id } = params as { id: string };

      // Parse request body for options (optional)
      const { complexity = "medium", maxSteps = 10 } = (await req.json()) as {
        complexity?: "low" | "medium" | "high";
        maxSteps?: number;
      };

      // Get the blueprint data
      const supabase = createServiceRoleClient();
      const { data: blueprint, error } = await supabase
        .from("blueprints")
        .select("title, prompt, details, search_query")
        .eq("id", id)
        .single();

      if (error || !blueprint) {
        return NextResponse.json(
          { error: "Blueprint not found" },
          { status: 404 }
        );
      }

      // Generate research query from search_query or blueprint content
      const query =
        blueprint.search_query ||
        `Research about: ${blueprint.title}. ${blueprint.details || ""}`;

      // Configure options
      const options = {
        max_steps: maxSteps,
        complexity,
        depth: "detailed" as const,
      };

      // Call Perplexity API
      const researchData = await generateResearch({
        query,
        context: blueprint.prompt,
        options,
      });

      // Extract sources and usage metrics to store separately
      const { sources, usage_metrics, ...stepData } = researchData;

      // Store research data
      const { data: research, error: insertError } = await supabase
        .from("blueprint_research")
        .upsert({
          blueprint_id: id,
          search_query: query,
          research_data: stepData,
          sources,
          usage_metrics,
          updated_at: new Date().toISOString(),
          status: "complete",
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json(
          { error: "Failed to save research data" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        research_id: research.id,
        data: researchData,
      });
    } catch (error) {
      console.error("Error generating research:", error);
      return NextResponse.json(
        { error: "Failed to generate research" },
        { status: 500 }
      );
    }
  }
);

export const GET = createRouteHandler(
  ["GET"],
  async (req: NextRequest, { params }) => {
    try {
      const { id } = params as { id: string };

      const supabase = createServiceRoleClient();
      const { data, error } = await supabase
        .from("blueprint_research")
        .select("*")
        .eq("blueprint_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return NextResponse.json(
            { error: "Research not found" },
            { status: 404 }
          );
        }

        return NextResponse.json(
          { error: "Failed to fetch research" },
          { status: 500 }
        );
      }

      return NextResponse.json(data);
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to fetch research data" },
        { status: 500 }
      );
    }
  }
);
```

### Research Component with Visualization Options

```typescript
// app/blueprints/[id]/components/blueprint-research.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LinkIcon,
  BookOpenIcon,
  RefreshCw,
  ListIcon,
  ShareIcon,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import ReactFlow, { Controls, Background } from "reactflow";
import {
  PerplexityResearchResponse,
  PerplexitySource,
  UsageMetrics,
  BlueprintStep,
} from "@/utils/perplexity-api";

// Define visualization modes
type VisualizationMode = "linear" | "complex";

interface BlueprintResearchProps {
  blueprintId: string;
}

export default function BlueprintResearch({
  blueprintId,
}: BlueprintResearchProps) {
  const [research, setResearch] = useState<PerplexityResearchResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [visualizationMode, setVisualizationMode] =
    useState<VisualizationMode>("linear");
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const fetchResearch = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/blueprints/${blueprintId}/research`);

      if (!response.ok) {
        if (response.status === 404) {
          setResearch(null);
          return;
        }
        throw new Error("Failed to fetch research");
      }

      const data = await response.json();
      setResearch(data.research_data);
    } catch (err) {
      setError("Could not load research data");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateResearch = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/blueprints/${blueprintId}/research`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to generate research");
      }

      const data = await response.json();
      setResearch(data.data);
    } catch (err) {
      setError("Failed to generate research");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (blueprintId) {
      fetchResearch();
    }
  }, [blueprintId]);

  // Generate flow diagram based on steps and visualization mode
  const generateFlowDiagram = (
    steps: BlueprintStep[],
    mode: VisualizationMode
  ) => {
    const newNodes = [];
    const newEdges = [];

    // Create nodes from steps
    steps.forEach((step, index) => {
      newNodes.push({
        id: `step-${step.number}`,
        type: "stepNode", // Custom node type we'll implement
        position: { x: 350, y: index * 300 },
        data: { ...step },
      });
    });

    // Create edges based on visualization mode
    if (mode === "linear") {
      // Simple linear connections
      steps.forEach((step, index) => {
        if (index > 0) {
          newEdges.push({
            id: `edge-${index - 1}-to-${index}`,
            source: `step-${steps[index - 1].number}`,
            target: `step-${step.number}`,
            type: "smoothstep",
            label: "Next",
          });
        }
      });
    } else {
      // Complex connections with dependencies
      // This would use a more complex algorithm to determine relationships
      // For demonstration purposes, we'll create some non-linear connections
      // In a real implementation, this would analyze step content to determine dependencies

      steps.forEach((step, index) => {
        if (index > 0) {
          // Always connect to previous step
          newEdges.push({
            id: `edge-${index - 1}-to-${index}`,
            source: `step-${steps[index - 1].number}`,
            target: `step-${step.number}`,
            type: "smoothstep",
          });

          // Add some cross-connections for complexity
          if (index > 2 && index % 2 === 0) {
            newEdges.push({
              id: `edge-${index - 2}-to-${index}`,
              source: `step-${steps[index - 2].number}`,
              target: `step-${step.number}`,
              type: "smoothstep",
              style: { stroke: "#555" },
              label: "Depends on",
            });
          }
        }
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  };

  // Update flow when research or mode changes
  useEffect(() => {
    if (research?.steps) {
      generateFlowDiagram(research.steps, visualizationMode);
    }
  }, [research, visualizationMode]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-[250px]" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-[300px]" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full mb-4" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!research) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Blueprint Research</CardTitle>
          <CardDescription>
            Generate research to enhance this blueprint
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <BookOpenIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground mb-4">
            No research has been generated for this blueprint yet.
          </p>
          <Button onClick={generateResearch} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Research"
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Blueprint Research</CardTitle>
            <CardDescription>
              AI-generated research for this blueprint
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generateResearch}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              "Refresh Research"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Implementation Steps</h3>
            <ToggleGroup
              type="single"
              value={visualizationMode}
              onValueChange={(value) =>
                value && setVisualizationMode(value as VisualizationMode)
              }
            >
              <ToggleGroupItem value="linear" aria-label="Linear flow">
                <ListIcon className="h-4 w-4 mr-2" />
                Linear
              </ToggleGroupItem>
              <ToggleGroupItem value="complex" aria-label="Complex flow">
                <ShareIcon className="h-4 w-4 mr-2" />
                Complex
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="h-[500px] border rounded-md">
            <ReactFlow nodes={nodes} edges={edges} fitView>
              <Controls />
              <Background />
            </ReactFlow>
          </div>
        </div>

        <Tabs defaultValue="steps">
          <TabsList className="mb-4">
            <TabsTrigger value="steps">Steps</TabsTrigger>
            <TabsTrigger value="sources">
              Sources ({research?.sources?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="steps">
            {research?.steps.map((step, index) => (
              <div key={index} className="mb-6 border-b pb-4 last:border-b-0">
                <h4 className="text-lg font-semibold mb-2">
                  {step.number}. {step.title}
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Estimated time: {step.estimated_time} minutes
                </p>

                {step.tools?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-sm font-medium mb-1">Tools</h5>
                    <div className="flex flex-wrap gap-2">
                      {step.tools.map((tool, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <h5 className="text-sm font-medium mb-1">Instructions</h5>
                  <ul className="list-disc pl-5 space-y-1">
                    {step.instructions.map((instruction, i) => (
                      <li key={i} className="text-sm">
                        {instruction}
                      </li>
                    ))}
                  </ul>
                </div>

                {step.subtasks && step.subtasks.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium mb-1">Subtasks</h5>
                    <ul className="list-disc pl-5 space-y-1">
                      {step.subtasks.map((subtask) => (
                        <li key={subtask.task_number} className="text-sm">
                          {subtask.description} ({subtask.estimated_time} min)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="sources">
            <div className="space-y-4">
              {research?.sources.map((source, index) => (
                <div key={index} className="border rounded-md p-3">
                  <div className="flex items-center mb-2">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {source.title}
                    </a>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {source.snippet}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
```

## Prompt Template for Research Generation

```
You are a step-by-step implementation planner.
Create a detailed implementation plan for: "{blueprint_title}"

Blueprint details: {blueprint_details}

For each step:
1. Provide a clear title
2. Estimate completion time (in minutes as an integer)
3. List specific tools/technologies needed
4. Break down into bullet-point instructions

FORMAT YOUR RESPONSE AS A JSON OBJECT with the following structure:
{
  "complexity": "low|medium|high",
  "steps": [
    {
      "number": 1,
      "title": "Step title",
      "estimated_time": 30,
      "instructions": ["Instruction 1", "Instruction 2"],
      "tools": ["Tool1", "Tool2"],
      "subtasks": [
        {"task_number": 1, "description": "Subtask description", "estimated_time": 10}
      ]
    }
  ]
}

IMPORTANT NOTES:
- DO NOT include a title for the overall project in your response; we already have one
- estimated_time should be an integer representing minutes
- The step's estimated_time should include time for all subtasks plus any additional work
- Steps should be in logical sequence from first to last
- DO NOT include sources in your JSON - they will be added separately through the Perplexity API
```

## Environment Configuration

Add the necessary environment variables to your `.env` file:

```
PERPLEXITY_API_KEY=your_api_key_here
```

## Integration with Adaptive Learning System

This research agent integration directly supports several key aspects of the Adaptive Learning System:

1. **Personalized Learning**: The research content is contextually relevant to each blueprint
2. **Multi-AI Integration**: Leverages Perplexity AI alongside existing OpenAI and Anthropic integrations
3. **Robust Error Handling**: Implements fallback mechanisms for API failures
4. **Enhanced User Experience**: Provides valuable research content with flexible visualization options
5. **Adaptive Complexity**: Offers both simple linear displays and complex relationship displays based on user preference

The integration aligns with the project's goal of blending automated AI processes with human validation, as users can review and act upon the AI-generated research.

## Implementation Timeline

- **Phase 1 (Database & Backend)**: Week 1
- **Phase 2 (Frontend Integration)**: Week 2
- **Phase 3 (Prompt Engineering)**: Week 3
- **Phase 4 (Testing & Rollout)**: Week 4

## Progress Tracking

Use this section to track progress by marking tasks as completed:

- [ ] Phase 1: Database Schema and Backend Implementation
  - [x] Task 1.1: Create Blueprint Research Database Table (Partial - structure for search query implemented)
  - [ ] Task 1.2: Perplexity API Integration
  - [ ] Task 1.3: Research API Endpoints
- [ ] Phase 2: Frontend Integration
  - [ ] Task 2.1: Research Component Implementation
  - [ ] Task 2.2: Blueprint Page Integration
  - [ ] Task 2.3: React Flow Visualization Implementation
- [ ] Phase 3: Prompt Engineering and Content Optimization
  - [x] Task 3.1: Research Prompt Template Development (Complete for reasoning agent)
  - [ ] Task 3.2: Content Presentation Optimization
- [ ] Phase 4: Testing and Rollout
  - [ ] Task 4.1: Integration Testing
  - [ ] Task 4.2: Performance Optimization
  - [ ] Task 4.3: Phased Rollout

## Recent Updates

### 2025-03-30

- Initial implementation plan created
- Added SQL scripts for database schema
- Defined implementation phases and tasks

### 2025-03-31

- Added support for different visualization modes in the frontend
- Updated JSON response formats to align with React Flow implementation
- Enhanced prompt templates for clearer step definition

### 2025-04-01

- Updated JSON response formats to include sources for attribution
- Changed time formats to integer values (minutes) for easier calculation
- Removed redundant title and total estimated time fields
- Enhanced prompts to ensure proper formatting of time values

### 2025-04-02

- Updated source handling to match Perplexity API's actual response format
- Added separate database fields for sources and usage metrics
- Modified prompt templates to not include sources in the JSON response
- Updated component to display sources and usage metrics separately
- Integrated with Vercel AI SDK for proper Perplexity API integration

### 2025-04-03

- Simplified API response format by removing the "mode" field
- Moved visualization logic entirely to the frontend for cleaner separation of concerns
- Updated database schema to remove the flow_mode column
- Improved frontend component to handle both linear and complex visualizations from the same data
- Enhanced React Flow integration with proper node and edge handling

### 2025-04-04

- Completed the reasoning agent implementation for generating search queries
- Fixed search query storage in the database - now properly saved and retrieved
- Improved UX by adding toast notifications for search query generation
- Fixed error handling for blueprint creation flow
- Completed end-to-end testing of the reasoning step in the blueprint creation process

## Resources

1. [Perplexity API Documentation](https://docs.perplexity.ai)
2. [Vercel AI SDK Perplexity Provider](https://sdk.vercel.ai/providers/ai-sdk-providers/perplexity)
3. [NextJS API Routes Documentation](https://nextjs.org/docs/api-routes/introduction)
4. [Supabase JSON Data Type Documentation](https://supabase.com/docs/guides/database/json-data-type)
5. [React Flow Documentation](https://reactflow.dev/docs/)

## Search Query Generation

The `search_query` is a critical component that bridges user input with the Perplexity research. It must be carefully crafted to yield the most relevant research results while considering the user's skill level and learning objectives.

### Search Query Generation Implementation

```typescript
// utils/search-query-generator.ts
import { OpenAI } from "openai";

const openaiSDK = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SearchQueryGenerationParams {
  questions: Array<{ id: number; title: string; content: string }>;
  responses: Record<string, string>;
  skillLevel: "beginner" | "intermediate" | "advanced";
  learningObjective?: string;
  blueprintTitle: string;
}

export async function generateSearchQuery(
  params: SearchQueryGenerationParams
): Promise<string> {
  try {
    const {
      questions,
      responses,
      skillLevel,
      learningObjective,
      blueprintTitle,
    } = params;

    // Format the questions and answers for the prompt
    const questionsAndAnswers = questions
      .map((q) => {
        const response = responses[q.id.toString()] || "No answer provided";
        return `Question: ${q.content}\nAnswer: ${response}`;
      })
      .join("\n\n");

    // Call OpenAI to generate an optimized search query
    const completion = await openaiSDK.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `You are an expert at formulating precise research queries. 
          You create search queries that are adapted to the user's skill level (${skillLevel}) 
          and learning objectives. Your queries should yield comprehensive results 
          when used with the Perplexity research engine.`,
        },
        {
          role: "user",
          content: `Blueprint Title: ${blueprintTitle}
          
          User Skill Level: ${skillLevel}
          
          ${learningObjective ? `Learning Objective: ${learningObjective}` : ""}
          
          Based on these questions and answers, generate an optimized search query that will 
          yield comprehensive research results appropriate for a ${skillLevel}-level user:
          
          ${questionsAndAnswers}
          
          Return ONLY the search query with no additional explanation. 
          The query should be detailed enough to yield specific results but concise enough to be effective.`,
        },
      ],
      temperature: 0.3,
    });

    // Extract and return the search query
    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating search query:", error);
    throw new Error("Failed to generate search query");
  }
}
```

### Integration with Blueprint Finalization

The search query generation is integrated into the blueprint creation flow at the final step:

```typitten
// To be added to the generateFinalBlueprint function in create-blueprint-modal.tsx
// After processing the responses and before setting finalData

// Generate and save the search query if not already present
if (!data.search_query) {
  try {
    const generatedSearchQuery = await generateSearchQuery({
      questions,
      responses,
      skillLevel: data.skill_level || "beginner",
      learningObjective: data.learning_objective,
      blueprintTitle: data.title || title,
    });

    // Update the blueprint with the generated search query
    const updateResponse = await fetch(`/api/blueprints/${blueprintId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        search_query: generatedSearchQuery,
      }),
    });

    if (updateResponse.ok) {
      console.log("Search query saved to blueprint:", generatedSearchQuery);
      // Update the local state
      setFinalData((prev) => ({
        ...prev,
        search_query: generatedSearchQuery,
      }));
    }
  } catch (error) {
    console.error("Error saving search query:", error);
    // Continue with the process even if search query generation fails
  }
}
```

### API Endpoint Update for Search Query Generation

```typescript
// app/api/blueprints/[id]/search-query/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase-admin";
import { generateSearchQuery } from "@/utils/search-query-generator";
import { createRouteHandler } from "@/utils/route-handlers";

export const POST = createRouteHandler(
  ["POST"],
  async (req: NextRequest, { params }) => {
    try {
      const { id } = params as { id: string };

      // Get the blueprint data including questions and responses
      const supabase = createServiceRoleClient();
      const { data: blueprint, error: blueprintError } = await supabase
        .from("blueprints")
        .select("title, skill_level, learning_objective")
        .eq("id", id)
        .single();

      if (blueprintError) {
        return NextResponse.json(
          { error: "Blueprint not found" },
          { status: 404 }
        );
      }

      // Get the questions for this blueprint
      const { data: questionsData, error: questionsError } = await supabase
        .from("blueprint_questions")
        .select("questions")
        .eq("blueprint_id", id)
        .single();

      if (questionsError) {
        return NextResponse.json(
          { error: "Questions not found" },
          { status: 404 }
        );
      }

      // Get the responses for this blueprint
      const { data: responsesData, error: responsesError } = await supabase
        .from("blueprint_responses")
        .select("responses")
        .eq("blueprint_id", id)
        .single();

      if (responsesError && responsesError.code !== "PGRST116") {
        // Ignore not found error for responses
        return NextResponse.json(
          { error: "Failed to fetch responses" },
          { status: 500 }
        );
      }

      // Generate the search query
      const searchQuery = await generateSearchQuery({
        questions: questionsData.questions || [],
        responses: responsesData?.responses || {},
        skillLevel: blueprint.skill_level || "beginner",
        learningObjective: blueprint.learning_objective,
        blueprintTitle: blueprint.title,
      });

      // Update the blueprint with the search query
      const { error: updateError } = await supabase
        .from("blueprints")
        .update({ search_query: searchQuery })
        .eq("id", id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update search query" },
          { status: 500 }
        );
      }

      return NextResponse.json({ search_query: searchQuery });
    } catch (error) {
      console.error("Error generating search query:", error);
      return NextResponse.json(
        { error: "Failed to generate search query" },
        { status: 500 }
      );
    }
  }
);
```

## Current Implementation Status

### Already Implemented:

- ✅ Blueprint creation flow with question generation
- ✅ User response collection and storage
- ✅ Database structure for blueprints with `search_query` field
- ✅ API routes for basic blueprint CRUD operations
- ✅ Final blueprint generation in UI
- ✅ Search query generation with OpenAI (considering skill level and learning objectives)
- ✅ Search query storage and retrieval in database

### Needs Implementation:

- 📝 Perplexity API integration via Vercel AI SDK
- 📝 Database tables for blueprint research
- 📝 Frontend components for research display
- 📝 React Flow visualization
- 📝 Blueprint finalization (changing is_temporary to FALSE)
- 📝 Integration of search query with Perplexity search agent

## Testing Plan

### Testing Search Query Generation

#### Unit Tests

- Test search query generation with different skill levels (beginner, intermediate, advanced)
- Verify learning objectives are properly incorporated into the query
- Test handling of edge cases (missing responses, incomplete skill information)

#### Integration Tests

- Verify search query is correctly saved to the blueprint
- Test end-to-end flow from blueprint creation to query generation
- Validate that generated queries produce relevant Perplexity research results

#### Acceptance Criteria

- Search queries should be adapted to the user's skill level
- Queries should incorporate learning objectives when provided
- Generated queries should yield relevant and appropriate results in Perplexity
- Queries should be detailed yet concise (typically 2-4 sentences)

### Testing Perplexity Integration

#### Unit Tests

- Test Perplexity API wrapper functions with mock responses
- Verify proper handling of API errors and retries
- Test extraction and formatting of sources and usage metrics

#### Integration Tests

- Test the complete flow from blueprint to research generation
- Verify proper storage of research data in the database
- Test frontend rendering of research data

#### End-to-End Tests

- Complete user journey from blueprint creation to research viewing
- Verify visualization options work correctly
- Test performance with various research response sizes

## Quality Assurance Checklist

Before releasing the Perplexity integration, verify:

- [ ] Search queries appropriately reflect user skill level
- [ ] Research results are relevant to the blueprint topic
- [ ] Source attribution is properly displayed
- [ ] React Flow visualizations work in both modes
- [ ] Database queries are optimized and indexed
- [ ] Error states are handled gracefully in the UI
- [ ] All permissions and RLS policies are correctly implemented
- [ ] Research generation respects rate limits of the Perplexity API
