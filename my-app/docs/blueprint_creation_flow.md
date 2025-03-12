# Blueprint Creation Flow Implementation Document (Updated with Dynamic Flow Chart via React Flow)

This document outlines the full requirements, user journey, and technical implementation for the "Create Blueprint" functionality. In addition to a traditional list view, users can now toggle to a dynamic flow chart view (powered by React Flow) to visualize the blueprint's step-by-step implementation. The system leverages Supabase's real-time features and Vercel AI SDK's streaming capabilities, and it supports multi-turn reasoning, dynamic step regeneration, and interactive flow chart editing.

> **Developer Note:** For detailed technical implementation notes, including resolved issues related to data storage and user identity, please see [Blueprint Creation Technical Notes](./blueprint_creation_technical_notes.md).

---

## 1. Overview

**User Story:**  
As a user, I want to create a blueprint by simply providing a high-level prompt. The system engages in a guided multi-turn Q&A (via a reasoning agent) to clarify my request and generate a structured JSON with a blueprint title and a refined search query. Once confirmed, the blueprint is saved and I'm taken to a dedicated Blueprint Page. There, the research agent streams a detailed, step-by-step implementation plan in real time. I can view the steps either as a list or as a dynamic flow chart. In the flow chart view, nodes represent each step (with labels for step number, title, estimated time, instructions, and tool tags) and edges depict dependencies or relationships between tasks. I can interact with individual nodes (e.g., "Regenerate Step") through direct prompts, mark steps complete, and when all steps are validated, the blueprint is verified.

---

## 2. User Flow

### 2.1 Blueprint Creation Modal

1. **User Initiates Blueprint Creation:**
   - Click "Create Blueprint" from the dashboard or blueprint list.
2. **Prompt Input:**
   - A modal opens with a large text area labeled "What do you want to do with AI?".
   - The user enters a high-level prompt describing the desired AI functionality.
3. **Multi-turn Reasoning Q&A:**
   - The reasoning agent (via a dedicated API route) receives the user's prompt, and returns the blueprint title and follow-up clarifying questions.
   - The clarifying questions (e.g., "Do you have specific topics or constraints?") are rendered as structured objects, which are render as question cards in the right side and input text fields in the left side of the modal.
4. **Final Review:**
   - With the responses + user background information (skill level and learning objective) the agent returns a structured JSON (e.g., `{"searchQuery": "The user is a begginner, and wants to learn AI to implement at his job as a customer service rep. Search for how to create a step by step guide to implement a LinkedIn post data scraper to extract post ideas for venture capital, AI, and Google Bard updates" }`).
   - Perplexity API will return a step by step guide to help the user accomplish the goal. The JSON should be structured as a list of steps, each with a title, estimated time for execution, tools required, and instructions.
5. **Confirmation:**
   - Once the research agent returns the step by The user reviews and, if needed, edits the output, then clicks "Create Blueprint."

### 2.2 Blueprint Record Creation

1. **API Call:**
   - The frontend sends a `POST /api/blueprints` request with the final blueprint JSON.
2. **Database Persistence:**
   - A new record is inserted into the `blueprints` table (with `is_verified = false`).
3. **Redirect:**
   - The new blueprint's `id` is returned, and the user is redirected to `/blueprints/[id]`.

### 2.3 Blueprint Page & Research Agent Streaming

1. **Blueprint Page Layout:**

   - **Toggle View Control:**  
     A switch or toggle button allows the user to alternate between a **List View** and a **Flow Chart View**.
   - **List View (Central Pane):**
     - Displays each implementation step in a sequential list.
     - Each step includes:
       - **Step Number**
       - **Step Title**
       - **Estimated Time to Completion**
       - **Bullet-Point Implementation Instructions**
       - **Tool Tags** (displayed as badges)
     - Each step has a "Regenerate Step" button that opens a modal for step-specific prompt editing.
   - **Flow Chart View (React Flow Integration):**
     - Uses React Flow to render the blueprint steps as nodes.
     - **Custom Nodes:**  
       Each node shows step number, title, time estimate, instructions summary, and tool tags.
     - **Edges & Groups:**  
       Edges represent dependencies or relationships between steps. Nodes can be grouped (e.g., at the step level) to display task-level details.
     - Nodes (or groups) are interactive; clicking a node opens a modal for direct prompt-based regeneration.
   - **Right Pane:**
     - Displays blueprint metadata, agent logs, and additional context.

2. **Streaming Generation:**
   - On page load, the research agent is triggered (using the refined search query) via `POST /api/blueprints/generate`.
   - Using the Vercel AI SDK's streaming functions, each implementation step is streamed as a data chunk.
   - The UI updates in real time, either appending to the list view or updating the React Flow diagram with new nodes and edges.
3. **Step Interactivity:**
   - Users can regenerate individual steps by clicking "Regenerate Step" (or by interacting with a node in flow chart view), which re-opens a modal pre-populated with the existing prompt.
   - Users mark steps as complete; when all steps are complete, a PATCH request updates the blueprint's `is_verified` flag to true.

### 2.4 Real-Time Chat with Supabase

- **Supabase Integration:**
  - Use Supabase's realtime messaging for managing the reasoning agent's multi-turn conversation in the modal.
  - Chat messages are stored in a `messages` table and updated in real time via Supabase subscriptions.
  - This ensures that clarifying questions and agent responses update live without requiring a custom chat backend.

---

## 3. Technical Requirements

### 3.1 Frontend

#### 3.1.1 Create Blueprint Modal

- **Components:**

  - **Prompt Input Area:**  
    A text area for the high-level prompt.
  - **Chat-like Interface for Q&A:**  
    Displays agent questions and user responses.
    - Managed via local state (or context) and optionally synced via Supabase realtime.
  - **Final Review Panel:**  
    Editable fields for the AI-generated blueprint title and refined search query.
  - **Navigation Controls:**  
    Buttons for "Continue," "Back," "Confirm," and "Cancel."

- **API Integration:**
  - Call `POST /api/blueprints/reason` for multi-turn reasoning.
  - On confirmation, call `POST /api/blueprints` to create the blueprint record.

#### 3.1.2 Blueprint Page

- **Layout & Toggle:**
  - Implement a toggle switch to alternate between List View and Flow Chart View.
  - **List View:**  
    Displays steps sequentially in a vertical list.
  - **Flow Chart View (React Flow):**
    - Integrate React Flow using its API (refer to https://reactflow.dev/api-reference).
    - Render each step as a custom node.
    - Use labeled groups and edges to represent step relationships.
    - Nodes are interactive, supporting direct prompt-based regeneration.
- **Step Interactivity:**
  - "Regenerate Step" functionality via modal for step-specific editing.
  - Mark steps as complete, and update blueprint status accordingly.
- **Streaming UI:**
  - Use Vercel AI SDK streaming hooks (e.g., `useChat`) to handle incoming step data and update the view in real time.

#### 3.1.3 Supabase Integration for Realtime Chat

- **Setup:**
  - Use the existing Supabase client (already installed and configured) to subscribe to the `messages` table.
- **Realtime Messaging:**
  - Ensure the modal's chat interface updates live as new messages are inserted.
  - Authenticate users via Supabase Auth and use the user's ID for message association.

### 3.2 Backend

#### 3.2.1 Reasoning Agent Endpoint

- **Endpoint:** `POST /api/blueprints/reason`
- **Input:**  
  User prompt and conversation context.
- **Process:**  
  Call the reasoning agent (e.g., OpenAI o1) with instructions to ask clarifying questions and eventually output JSON:
  ```json
  { "title": "...", "searchQuery": "..." }
  ```
- **Output:**  
  Next clarifying question or final JSON.
- **Error Handling:**  
  Structured error responses on failure.

#### 3.2.2 Create Blueprint Endpoint

- **Endpoint:** `POST /api/blueprints`
- **Input:**  
  Blueprint JSON with `title`, `searchQuery`, and optionally the original prompt.
- **Process:**  
  Validate and insert a new record into the `blueprints` table with `is_verified = false`.
- **Output:**  
  Return the new blueprint's `id`.

#### 3.2.3 Research Agent Streaming Endpoint

- **Endpoint:** `POST /api/blueprints/generate`
- **Input:**  
  Blueprint ID and `searchQuery`.
- **Process:**  
  Call the research agent (e.g., Perplexity) with the refined query.
  - Use Vercel AI SDK's streaming functions to send back data.
  - Format each chunk to include:
    - **Step Number**
    - **Step Title**
    - **Estimated Time**
    - **Implementation Instructions** (bullet points)
    - **Tool Tags**
- **Output:**  
  A streaming HTTP response delivering steps incrementally.
- **Error Handling:**  
  Stream error chunks if needed.

#### 3.2.4 Optional: Blueprint Steps Table

- **Schema Suggestion:**
  - **Table:** `blueprint_steps`
  - **Columns:**
    - `id` (UUID, PK)
    - `blueprint_id` (UUID, FK to `blueprints`)
    - `step_number` (integer)
    - `title` (text)
    - `estimated_time` (text/integer)
    - `instructions` (JSON or text)
    - `tools` (JSON or array of strings)
    - `status` (e.g., draft, completed)
    - Timestamps (`created_at`, `updated_at`)
- **Benefits:**  
  Independent step updates and granular queries.

### 3.3 Supabase Integration

- **Authentication & Realtime Messaging:**
  - Use Supabase Auth to manage user sessions.
  - Subscribe to the `messages` table for realtime updates in the reasoning agent's chat.
- **Persistence:**
  - Store blueprint records and optionally steps in Supabase.
  - Configure Row-Level Security (RLS) policies to restrict access appropriately.

---

## 4. Data Flow Diagram

```
                                 ┌────────────────────────────┐
                                 │         Client UI          │
                                 │ (Next.js Pages & Components)│
                                 └─────────────┬──────────────┘
                                               │
                        User enters high-level prompt in modal
                                               │
                                               ▼
                       ┌────────────────────────────────────┐
                       │ POST /api/blueprints/reason          │
                       │ (Reasoning Agent – Multi-turn Q&A)   │
                       └─────────────┬──────────────────────┘
                                               │
                                Returns clarifying Qs or final JSON:
                                 { "title", "searchQuery" }
                                               │
                                               ▼
                       ┌────────────────────────────────────┐
                       │ User Reviews & Confirms in Modal   │
                       └─────────────┬──────────────────────┘
                                               │
                       ┌────────────────────────────────────┐
                       │ POST /api/blueprints               │
                       │ (Create Blueprint Record in DB)    │
                       └─────────────┬──────────────────────┘
                                               │
                                               ▼
                       ┌────────────────────────────────────┐
                       │ Redirect to /blueprints/[id]         │
                       └─────────────┬──────────────────────┘
                                               │
                        Blueprint Page Loads & Initiates Streaming
                                               │
                                               ▼
                       ┌────────────────────────────────────┐
                       │ POST /api/blueprints/generate        │
                       │ (Research Agent Streaming Endpoint)  │
                       └─────────────┬──────────────────────┘
                                               │
                Streaming Response: Each chunk contains step data:
          (Step #, Title, Estimated Time, Instructions, Tool Tags)
                                               │
                        ┌────────────────────────────┐
                        │ Toggle: List View ↔ Flow Chart   │
                        │ (React Flow integration)         │
                        └─────────────┬────────────────────┘
                                               │
                       ┌────────────────────────────────────┐
                       │ Client UI: Blueprint Page           │
                       │ (Central Pane: Steps/Flow Chart;    │
                       │  Right Pane: Metadata & Logs)       │
                       └─────────────┬──────────────────────┘
                                               │
                         User Interacts with Each Step:
                    "Regenerate Step" opens a pre-populated modal,
                    marking steps complete triggers PATCH updates.
                                               │
                                               ▼
                       ┌────────────────────────────────────┐
                       │ PATCH /api/blueprints/[id]           │
                       │ (Update Blueprint / Step Status)     │
                       └────────────────────────────────────┘
```

---

## 5. Acceptance Criteria

1. **Modal & Reasoning Agent:**

   - The modal collects a single high-level prompt.
   - A multi-turn conversation with the reasoning agent occurs, with clarifying questions and user responses.
   - Final JSON with a blueprint title and refined search query is displayed and editable before confirmation.

2. **Blueprint Creation:**

   - A new blueprint record is created with the generated title, search query, and `is_verified = false`.
   - The user is redirected to the blueprint page.

3. **Research & Streaming Steps:**

   - On the blueprint page, the research agent streams implementation steps in real time.
   - Each step includes Step Number, Title, Estimated Time, Instructions, and Tool Tags.
   - The UI supports toggling between a list view and a dynamic flow chart view (via React Flow).
   - Each node (or list item) can be individually regenerated and marked complete.

4. **Data Persistence & Real-Time Updates:**

   - Blueprint records (and optionally steps) are stored in Supabase.
   - The reasoning agent conversation uses Supabase's realtime messaging.

5. **Interactivity & Verification:**

   - Users can update step-specific prompts and regenerate steps.
   - When all steps are marked complete, the blueprint's `is_verified` flag is updated.

6. **Error Handling:**
   - Errors in AI calls or DB operations are surfaced with clear messages and options to retry.

---

## 6. Implementation Tasks

### 6.1 Frontend Development

- **Create Blueprint Modal:**
  - [x] Build a multi-step modal with:
    - Prompt input for a high-level request.
    - Chat-like interface for multi-turn reasoning.
    - Final review screen displaying AI-generated blueprint title and search query.
  - [ ] Integrate API calls to `/api/blueprints/reason` and `/api/blueprints`.
- **Blueprint Page:**
  - [x] Design a split layout with a central pane for steps and right sidebar for details.
  - [x] Implement navigation between steps with left/right arrows in the sidebar.
  - [x] Display blueprint information with dynamic complexity indicator based on step count.
  - [x] In the right sidebar, show step-specific information with regenerate functionality.
  - [x] In Flow Diagram View, integrate React Flow to dynamically display nodes and edges.
  - [x] Enable node selection to update the sidebar with step details.
  - [x] Support "General" view and step-specific views in the sidebar with clear navigation.
  - [ ] Complete final UI polish for accessibility (focus states have been handled).
- **Supabase Integration:**
  - [ ] Use the existing Supabase client to subscribe to the `messages` table for real-time chat in the modal.
  - [ ] Ensure proper user authentication and message association.

### 6.2 Backend Development

- **Reasoning Agent Endpoint:**
  - [ ] Create `POST /api/blueprints/reason` to handle multi-turn Q&A.
  - [ ] Integrate AI call to generate final JSON with `{ title, searchQuery }`.
- **Create Blueprint Endpoint:**
  - [ ] Create `POST /api/blueprints` to insert a new blueprint record into Supabase.
- **Research Agent Streaming Endpoint:**
  - [ ] Create `POST /api/blueprints/generate` to stream implementation steps using the refined search query.
  - [ ] Format each streaming chunk with step details.
- **Optional: Blueprint Steps Table:**
  - [ ] Define `blueprint_steps` table schema and integrate it with endpoints.
- **Patch Endpoint:**
  - [ ] Create `PATCH /api/blueprints/[id]` to update blueprint or step status.

### 6.3 Testing & Integration

- [ ] Write unit tests for backend endpoints.
- [ ] Conduct integration tests to simulate full user flow.
- [ ] Perform manual QA to verify:
  - Multi-turn reasoning modal.
  - Blueprint record creation.
  - Real-time streaming and toggling between list and flow chart views.
  - Step regeneration and verification functionality.

### 6.4 Data Model

#### 6.4.1 Core Tables

**`blueprints` Table:**

- `id` (UUID, PK)
- `title` (text)
- `prompt` (text) - Original user prompt
- `search_query` (text) - Refined search query for research
- `is_verified` (boolean)
- `visibility` (enum: 'private', 'public', 'team') - Controls who can view the blueprint
- `owner_id` (UUID, FK to users)
- `team_id` (UUID, FK to teams, nullable)
- `skill_level` (enum: 'beginner', 'intermediate', 'advanced')
- `learning_objective` (text, nullable)
- `complexity` (enum: 'low', 'medium', 'high')
- `estimated_time` (text)
- `created_at`, `updated_at` (timestamps)

**`blueprint_steps` Table:**

- `id` (UUID, PK)
- `blueprint_id` (UUID, FK to blueprints)
- `number` (integer) - Step number for ordering
- `title` (text)
- `estimated_time` (text)
- `instructions` (JSONB array) - Bullet-point instructions
- `tools` (JSONB array) - Tool tags
- `status` (enum: 'not_started', 'in_progress', 'completed')
- `created_at`, `updated_at` (timestamps)

**`blueprint_subtasks` Table:**

- `id` (UUID, PK)
- `step_id` (UUID, FK to blueprint_steps)
- `task_number` (integer) - Subtask number for ordering
- `description` (text)
- `status` (enum: 'not_started', 'in_progress', 'completed')
- `estimated_time` (text, nullable)
- `created_at`, `updated_at` (timestamps)

**`blueprint_comments` Table:**

- `id` (UUID, PK)
- `blueprint_id` (UUID, FK to blueprints)
- `step_id` (UUID, FK to blueprint_steps, nullable)
- `user_id` (UUID, FK to users)
- `content` (text)
- `created_at` (timestamp)

#### 6.4.2 Reasoning & Agent Data

**`reasoning_sessions` Table:**

- `id` (UUID, PK)
- `blueprint_id` (UUID, FK to blueprints)
- `status` (enum: 'active', 'completed', 'failed')
- `context` (JSONB) - Additional context for the session
- `skill_level` (enum: 'beginner', 'intermediate', 'advanced')
- `learning_objective` (text, nullable)
- `created_at`, `updated_at` (timestamps)

**`reasoning_messages` Table:**

- `id` (UUID, PK)
- `session_id` (UUID, FK to reasoning_sessions)
- `role` (enum: 'system', 'user', 'assistant')
- `content` (text)
- `created_at` (timestamp)

#### 6.4.3 Entity Relationship Diagram

```
                    ┌─────────────────┐
                    │    blueprints   │
                    └────────┬────────┘
                             │
                             │
          ┌─────────────────┬┴──────────────────┐
          │                 │                   │
          │                 │                   │
┌─────────▼──────┐ ┌────────▼───────┐ ┌─────────▼──────┐
│ blueprint_steps │ │reasoning_sessions│ │blueprint_comments│
└────────┬────────┘ └────────┬────────┘ └────────────────┘
         │                   │
         │                   │
┌────────▼────────┐ ┌────────▼────────┐
│blueprint_subtasks│ │reasoning_messages│
└─────────────────┘ └─────────────────┘
```

### 6.5 AI System Prompts

#### 6.5.1 Reasoning Agent Prompt

```
You are a blueprint creation assistant helping users define AI automation tasks.
Based on the user's initial request, ask clarifying questions to understand:

1. Their skill level: {skill_level} (if provided, otherwise determine)
2. Their learning objective: {learning_objective} (if provided, otherwise determine)
3. Specific constraints or requirements for the task

Once you have sufficient understanding, provide a structured JSON with:
{
  "title": "Clear descriptive title for the blueprint",
  "searchQuery": "Refined search terms for research",
  "complexity": "beginner|intermediate|advanced",
  "estimatedTime": "Approximate completion time",
  "prerequisites": ["Any prerequisites needed"]
}

Always ensure your questions are tailored to the user's apparent skill level.
For beginners, ask about their familiarity with tools and suggest simpler approaches.
For intermediate users, focus on specific implementation details and preferences.
For advanced users, probe for optimization requirements and scaling concerns.
```

#### 6.5.2 Research Agent Prompt

```
You are a step-by-step implementation planner.
Create a detailed implementation plan for: "{searchQuery}"

For each step:
1. Provide a clear title
2. Estimate completion time
3. List specific tools/technologies needed
4. Break down into bullet-point instructions
5. Include any code snippets or examples

Return a structured JSON array of steps:
[
  {
    "number": 1,
    "title": "Step title",
    "estimatedTime": "Time estimate",
    "toolTags": ["Tool1", "Tool2"],
    "instructions": ["Instruction 1", "Instruction 2"],
    "subtasks": [
      {"number": 1, "description": "Subtask description"}
    ],
    "codeSnippets": [{"language": "js", "code": "// Code here"}]
  }
]

Adapt content to skill level: {skill_level}
Focus on learning objective: {learning_objective}

For beginner users: Include more explanations, use simpler tools, and provide more detailed steps.
For intermediate users: Balance between explanations and efficiency, introduce more powerful tools.
For advanced users: Focus on optimization, advanced tools, and efficient workflows.
```

#### 6.5.3 Research Agent Response Format

The research agent (Perplexity API) must return a structured response with specific fields to properly populate the blueprint. The core response structure should include:

```json
{
  // Optional metadata fields
  "title": "Project Title", // Optional - may already exist from reasoning agent
  "complexity": "low|medium|high", // Assessment of overall complexity
  "estimated_time": "Total completion time estimate", // Total time for all steps

  // Required: Steps array - this is the crucial part
  "steps": [
    {
      "number": 1, // Step number for ordering
      "title": "Step Title", // Clear, action-oriented title
      "estimated_time": "30 minutes", // Time estimate for this specific step
      "instructions": [
        "First instruction bullet point",
        "Second instruction bullet point",
        "Third instruction bullet point"
      ],
      "tools": ["Python", "API Tool", "VS Code"]
      // Optional subtasks (if needed)
      // "subtasks": [
      //   { "task_number": 1, "description": "Subtask description", "estimated_time": "10 minutes" }
      // ]
    }
    // Additional steps...
  ]
}
```

#### Key Requirements:

1. **Steps**: Each step must include:

   - `number`: Sequential number for ordering
   - `title`: Clear, descriptive title for the step
   - `estimated_time`: Time estimate for completing just this step
   - `instructions`: Array of bullet-point instructions (text strings)
   - `tools`: Array of required tools/technologies (text strings)

2. **Fields Not Required**:

   - IDs (generated by the database)
   - Status fields (managed by the application)
   - User/visibility settings (managed by the application)
   - Created/updated timestamps (handled by the database)

3. **Optional Metadata**:
   - `complexity`: Assessment of overall project complexity
   - `estimated_time`: Total time to complete all steps
   - Supplementary information like prerequisites

#### 6.5.4 Streaming Implementation

The Research Agent uses Vercel AI SDK's streaming capabilities to deliver step data in real-time chunks:

1. **Setup**:

   - The streaming is initiated via `POST /api/blueprints/generate` when the blueprint page loads
   - The API route uses the Vercel AI SDK to stream chunks of data back to the client

2. **Chunk Format**:
   Each streamed chunk should represent a complete step and conform to this format:

   ```json
   {
     "type": "step",
     "data": {
       "number": 1,
       "title": "Step Title",
       "estimated_time": "30 minutes",
       "instructions": ["Instruction 1", "Instruction 2"],
       "tools": ["Tool1", "Tool2"]
     }
   }
   ```

3. **Client-Side Processing**:

   - The client subscribes to the stream via the Vercel AI SDK's streaming hooks
   - As each step chunk arrives, it updates both the List View and Flow Chart View
   - For the Flow Chart View, new nodes and edges are dynamically added to the React Flow diagram

4. **Error Handling**:
   - If chunk processing fails, an error chunk is sent:
     ```json
     { "type": "error", "message": "Error description" }
     ```
   - The client displays appropriate error messages and retry options

#### 6.5.5 Frontend Integration

The streaming data from the Research Agent integrates with both List View and Flow Chart View components:

1. **List View Integration**:

   - Each step is rendered as a card in the vertical list
   - The card displays step number, title, estimated time, instructions, and tool tags
   - "Regenerate Step" button enables step-specific prompting

2. **Flow Chart View Integration**:

   - Each step becomes a node in the React Flow diagram
   - Node design shows number, title, time estimate, and a preview of instructions
   - Tool tags are displayed as badges within the node
   - Edges represent sequential steps (1→2→3) by default
   - Node selection shows full step details in the right sidebar

3. **Reactive Updates**:
   - Both views update simultaneously as new step data streams in
   - When regenerating a specific step, only that node/card updates
   - Status changes (e.g., marking a step complete) update both views

This structured approach ensures that the Research Agent delivers precisely the data needed for the React Flow diagram and list view without unnecessary fields, while maintaining real-time interactivity through streaming.

### 6.6 Blueprint Visibility & Access Control

#### 6.6.1 Visibility Levels

- **Private:** Only accessible by the owner
- **Team:** Accessible by all members of the owner's team
- **Public:** Accessible by any authenticated user

#### 6.6.2 Row-Level Security Policies

**Blueprints Table RLS:**

```sql
-- Enable RLS
ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;

-- Owner can do anything
CREATE POLICY blueprint_owner_all ON blueprints
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Team members can view team blueprints
CREATE POLICY blueprint_team_view ON blueprints FOR SELECT
  USING (visibility = 'team' AND team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

-- Anyone can view public blueprints
CREATE POLICY blueprint_public_view ON blueprints FOR SELECT
  USING (visibility = 'public');
```

**Related Tables:**
Similar policies should be created for blueprint_steps, blueprint_subtasks, and blueprint_comments to ensure proper access control.

#### 6.6.3 Blueprint Forking

Forking will:

1. Create a copy of the blueprint record with the current user as owner
2. Copy all associated steps and subtasks
3. Set visibility to 'private' by default

### 6.7 Adaptive Learning System Integration

#### 6.7.1 User Skill Tracking

- Track completion rate of blueprints by skill level
- Monitor time spent on steps vs. estimated time
- Analyze modification patterns to steps and subtasks

#### 6.7.2 Blueprint Recommendation

- Based on completed blueprints and skill progression
- Consider learning objectives and technologies of interest
- Suggest next-level blueprints when skill mastery is demonstrated

#### 6.7.3 Skill Level Progression

- **Beginner → Intermediate:** Successfully complete 5+ blueprints with good completion rates
- **Intermediate → Advanced:** Demonstrate proficiency with complex tools, complete challenging blueprints

### 6.8 Extended API Specifications

#### 6.8.1 Blueprint Management

- **GET /api/blueprints** - List blueprints (filtered by visibility)
- **GET /api/blueprints/{id}** - Get blueprint details
- **POST /api/blueprints** - Create new blueprint
- **PATCH /api/blueprints/{id}** - Update blueprint
- **DELETE /api/blueprints/{id}** - Delete blueprint
- **PATCH /api/blueprints/{id}/visibility** - Update blueprint visibility
- **POST /api/blueprints/{id}/fork** - Create a copy of a blueprint

#### 6.8.2 Step Management

- **GET /api/blueprints/{id}/steps** - List all steps for a blueprint
- **GET /api/blueprints/{id}/steps/{step_id}** - Get specific step
- **POST /api/blueprints/{id}/steps** - Create new step
- **PATCH /api/blueprints/{id}/steps/{step_id}** - Update step
- **DELETE /api/blueprints/{id}/steps/{step_id}** - Delete step
- **PATCH /api/blueprints/{id}/steps/{step_id}/status** - Update step status

#### 6.8.3 Subtask Management

- **GET /api/blueprints/{id}/steps/{step_id}/subtasks** - List subtasks
- **POST /api/blueprints/{id}/steps/{step_id}/subtasks** - Create subtask
- **PATCH /api/blueprints/{id}/steps/{step_id}/subtasks/{subtask_id}** - Update subtask
- **PATCH /api/blueprints/{id}/steps/{step_id}/subtasks/{subtask_id}/status** - Update subtask status

#### 6.8.4 Comments & Collaboration

- **GET /api/blueprints/{id}/comments** - Get all comments
- **POST /api/blueprints/{id}/comments** - Add comment
- **DELETE /api/blueprints/{id}/comments/{comment_id}** - Delete comment

#### 6.8.5 AI Reasoning

- **POST /api/blueprints/reason** - Start/continue reasoning session
- **GET /api/reasoning/{session_id}/messages** - Get messages in a reasoning session

### 6.9 Implementation Phases

#### 6.9.1 Phase 1: Core Data Model (Weeks 1-2)

- Set up all database tables with proper relationships
- Implement basic CRUD API endpoints
- Configure RLS policies for visibility control
- Build blueprint listing and detail views

#### 6.9.2 Phase 2: AI Integration (Weeks 3-4)

- Implement reasoning agent with multi-turn chat
- Develop research agent for blueprint generation
- Store and retrieve reasoning sessions
- Connect frontend with streaming APIs

#### 6.9.3 Phase 3: Advanced Features (Weeks 5-6)

- Add user skill tracking
- Implement blueprint forking and sharing
- Build commenting and collaboration features
- Develop recommendation system based on user history

### 6.10 AI Orchestration

To maximize efficiency in blueprint creation, we employ an AI orchestration framework that leverages specialized models for distinct tasks:

- **Reasoning (o3-mini):**

  - Handles the multi-turn Q&A process for refining the initial high-level prompt.
  - Asks clarifying questions to produce a structured blueprint JSON containing key details (title, search query, complexity, estimated time, etc.).

- **Research (perplexicity sonnar):**
  - Once the blueprint metadata is confirmed, this model generates a detailed, step-by-step implementation plan.
  - Streams instructions, tool tags, and code examples in real time to the UI.

**Workflow:**

1. The user submits a high-level prompt.
2. The reasoning controller routes the prompt to the o3-mini model, engaging in multi-turn Q&A until a refined blueprint JSON is produced.
3. After user confirmation, the research controller invokes the perplexicity sonnar model to stream a comprehensive implementation plan.
4. This dual-model approach ensures that each model is utilized for its specialized task, enhancing overall system efficiency and accuracy.

---

## 7. Testing Plan

### 7.1 Unit Testing

- Test all API endpoints for proper data handling
- Validate AI agent response parsing
- Ensure RLS policies work as expected
- Verify database relationships and constraints

### 7.2 Integration Testing

- Test full user flows from blueprint creation to completion
- Verify multi-turn reasoning agent conversation flows
- Test blueprint sharing across different visibility levels
- Validate adaptive learning system recommendations

### 7.3 User Acceptance Testing

- Conduct UAT with users of varying skill levels
- Gather feedback on AI agent helpfulness
- Assess recommendation quality and relevance
- Evaluate overall user experience and learning progression

### 7.4 Performance Testing

- Test blueprint generation speed with complex prompts
- Assess streaming response performance
- Measure database query performance with large blueprint collections
- Evaluate real-time collaboration performance
