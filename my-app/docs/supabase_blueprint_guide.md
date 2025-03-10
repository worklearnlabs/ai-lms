# Blueprint System with Supabase - Implementation Guide

This guide explains how to implement and use the Blueprint system with Supabase in your Next.js application.

## 1. Database Schema Overview

> **NOTE**: For the complete database schema definition including tables, fields, relationships, and RLS policies, please refer to the [Blueprint System Database Schema](./blueprint_system_schema.md) documentation.

The Blueprint system utilizes the following tables in Supabase:

- **blueprints**: Main blueprints storage with metadata
- **blueprint_steps**: Individual steps for each blueprint
- **blueprint_subtasks**: Subtasks within each step
- **blueprint_comments**: Comments on blueprints or specific steps
- **reasoning_sessions**: Sessions for multi-turn AI reasoning
- **reasoning_messages**: Individual messages within reasoning sessions

## 2. Running the Migration

To set up the Blueprint system in your Supabase database:

1. Make sure you have the following environment variables in your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

2. You can run the migrations using the SQL Editor in Supabase:

   - All SQL commands are available in a private folder in Supabase for reference
   - Run the commands incrementally to ensure proper table creation and relationship setup

3. Update the TypeScript types:

```bash
npm install -g supabase
supabase gen types typescript --project-id YOUR_PROJECT_ID > ./types/supabase.ts
```

## 3. Accessing the Blueprint API

The project includes a utility file with a comprehensive API for interacting with the Blueprint system:

```typescript
import { blueprintApi, serverBlueprintApi } from "@/utils/blueprints-api";
```

### 3.1 Client-Side API (Browser Environment)

The `blueprintApi` object provides functions for client-side operations:

```typescript
// Get all blueprints
const { data: blueprints, error } = await blueprintApi.getBlueprints();

// Get a specific blueprint with its steps
const { data: blueprint, error } = await blueprintApi.getBlueprintById(
  "123e4567-e89b-12d3-a456-426614174000"
);

// Create a new blueprint
const { data: newBlueprint, error } = await blueprintApi.createBlueprint({
  title: "My Blueprint",
  description: "Description of my blueprint",
  content: {
    /* blueprint content */
  },
  search_query: "search terms",
  visibility: "private", // 'private', 'public', or 'team'
  skill_level: "beginner", // 'beginner', 'intermediate', or 'advanced'
});

// Add a step to a blueprint
const { data: step, error } = await blueprintApi.createBlueprintStep({
  blueprint_id: "123e4567-e89b-12d3-a456-426614174000",
  number: 1,
  title: "First Step",
  instructions: ["Do this", "Then do that"],
  tools: ["react", "nextjs"],
});

// Update step status
await blueprintApi.updateStepStatus("step-id-here", "completed");
```

### 3.2 Real-time Updates with Supabase

The API includes real-time subscription functions:

```typescript
// Subscribe to new messages in a reasoning session
const subscription = blueprintApi.subscribeToMessages(
  "session-id",
  (payload) => {
    console.log("New message:", payload.new);
    // Update UI with the new message
  }
);

// Subscribe to step changes
const stepSubscription = blueprintApi.subscribeToStepChanges(
  "blueprint-id",
  (payload) => {
    console.log("Step updated:", payload.new);
    // Update UI with the new step data
  }
);

// Unsubscribe when component unmounts
useEffect(() => {
  return () => {
    subscription.unsubscribe();
    stepSubscription.unsubscribe();
  };
}, []);
```

### 3.3 Server-Side API (API Routes and Server Components)

The `serverBlueprintApi` object provides server-side operations with admin privileges:

```typescript
// In a server component or API route:
import { serverBlueprintApi } from "@/utils/blueprints-api";

// Get a blueprint with full details (steps, subtasks, comments, reasoning sessions)
const { data: fullBlueprint } =
  await serverBlueprintApi.getBlueprintWithFullDetails("blueprint-id");

// Verify a blueprint (admin operation)
await serverBlueprintApi.verifyBlueprint("blueprint-id");
```

## 4. Using Blueprints in React Components

### 4.1 Creating a New Blueprint with Multi-turn Reasoning

```typescript
// In a React component
import { useState } from "react";
import { useRouter } from "next/navigation";
import { blueprintApi } from "@/utils/blueprints-api";

export default function CreateBlueprintForm() {
  const [prompt, setPrompt] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState([]);
  const router = useRouter();

  // Initialize reasoning session
  const startReasoning = async () => {
    const { data } = await blueprintApi.createReasoningSession({
      blueprint_id: "temp-id", // This will be replaced when the blueprint is created
    });

    setSessionId(data.id);

    // Subscribe to messages
    blueprintApi.subscribeToMessages(data.id, (payload) => {
      setMessages((prev) => [...prev, payload.new]);
    });

    // Send initial prompt
    await blueprintApi.createReasoningMessage({
      session_id: data.id,
      role: "user",
      content: prompt,
    });

    // API route will trigger AI response
  };

  // Create the blueprint after reasoning
  const createBlueprint = async (finalData) => {
    const { data } = await blueprintApi.createBlueprint({
      title: finalData.title,
      content: {},
      search_query: finalData.searchQuery,
      prompt,
    });

    router.push(`/blueprints/${data.id}`);
  };

  return (
    <div>
      <h1>Create Blueprint</h1>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="What do you want to do with AI?"
      />

      <button onClick={startReasoning}>Start</button>

      {/* Render chat messages */}
      <div className="chat">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>

      {/* Final confirmation UI shown when reasoning is complete */}
      {/* ... */}
    </div>
  );
}
```

### 4.2 Displaying a Blueprint with Steps

```typescript
// In a Blueprint detail component
import { useEffect, useState } from "react";
import { blueprintApi } from "@/utils/blueprints-api";

export default function BlueprintDetail({ blueprintId }) {
  const [blueprint, setBlueprint] = useState(null);
  const [steps, setSteps] = useState([]);

  useEffect(() => {
    // Load blueprint data
    const loadBlueprint = async () => {
      const { data: blueprintData } = await blueprintApi.getBlueprintById(
        blueprintId
      );
      setBlueprint(blueprintData);

      const { data: stepsData } = await blueprintApi.getBlueprintSteps(
        blueprintId
      );
      setSteps(stepsData);

      // Subscribe to step changes
      blueprintApi.subscribeToStepChanges(blueprintId, (payload) => {
        if (payload.eventType === "INSERT") {
          setSteps((prev) => [...prev, payload.new]);
        } else if (payload.eventType === "UPDATE") {
          setSteps((prev) =>
            prev.map((step) =>
              step.id === payload.new.id ? payload.new : step
            )
          );
        }
      });
    };

    loadBlueprint();
  }, [blueprintId]);

  const markStepComplete = async (stepId) => {
    await blueprintApi.updateStepStatus(stepId, "completed");
  };

  if (!blueprint) return <div>Loading...</div>;

  return (
    <div>
      <h1>{blueprint.title}</h1>
      <p>{blueprint.description}</p>

      <div className="steps">
        {steps.map((step) => (
          <div key={step.id} className={`step step-${step.status}`}>
            <h3>
              {step.number}. {step.title}
            </h3>
            <div className="estimated-time">
              Estimated time: {step.estimated_time}
            </div>

            <div className="instructions">
              {step.instructions &&
                step.instructions.map((instruction, i) => (
                  <div key={i} className="instruction">
                    {instruction}
                  </div>
                ))}
            </div>

            <div className="tools">
              {step.tools &&
                step.tools.map((tool, i) => (
                  <span key={i} className="tool-tag">
                    {tool}
                  </span>
                ))}
            </div>

            <button
              onClick={() => markStepComplete(step.id)}
              disabled={step.status === "completed"}
            >
              {step.status === "completed" ? "Completed" : "Mark Complete"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 5. Security and Access Control

The Blueprint system uses Row-Level Security (RLS) policies to control access to data. For detailed information on these policies, please refer to the [Blueprint System Database Schema](./blueprint_system_schema.md#row-level-security-rls-policies) document.

In general, the access control model follows these principles:

1. **Private blueprints**: Only the creator can view and edit
2. **Team blueprints**: Team members can view, only the creator can edit
3. **Public blueprints**: Anyone can view, only the creator can edit

## 6. Troubleshooting

### 6.1 Missing Permissions

If you encounter permission errors, ensure:

1. Your service role key has the necessary permissions
2. RLS policies are properly set up
3. Users are authenticated when making requests

### 6.2 Real-time Updates Not Working

If real-time updates aren't working:

1. Verify that Supabase real-time is enabled for your project
2. Check the subscription syntax in your code
3. Make sure you've enabled real-time for the specific tables

### 6.3 Type Errors

If you encounter TypeScript errors:

1. Regenerate your Supabase types
2. Ensure the generated types match your database schema
3. Use the correct import paths for types

## 7. Related Documentation

- [Blueprint System Database Schema](./blueprint_system_schema.md) - Complete database schema reference
- [Supabase Integration Guide](./supabase_integration_guide.md) - General Supabase setup and configuration
- [Supabase CRUD Guide](./supabase-crud-guide.md) - Common CRUD operations with Supabase
