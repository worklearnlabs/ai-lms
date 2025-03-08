# Blueprint Creation Flow Implementation Document (Updated with Dynamic Flow Chart via React Flow)

This document outlines the full requirements, user journey, and technical implementation for the “Create Blueprint” functionality. In addition to a traditional list view, users can now toggle to a dynamic flow chart view (powered by React Flow) to visualize the blueprint’s step-by-step implementation. The system leverages Supabase’s real‐time features and Vercel AI SDK’s streaming capabilities, and it supports multi-turn reasoning, dynamic step regeneration, and interactive flow chart editing.

---

## 1. Overview

**User Story:**  
As a user, I want to create a blueprint by simply providing a high-level prompt. The system engages in a guided multi-turn Q&A (via a reasoning agent) to clarify my request and generate a structured JSON with a blueprint title and a refined search query. Once confirmed, the blueprint is saved and I’m taken to a dedicated Blueprint Page. There, the research agent streams a detailed, step-by-step implementation plan in real time. I can view the steps either as a list or as a dynamic flow chart. In the flow chart view, nodes represent each step (with labels for step number, title, estimated time, instructions, and tool tags) and edges depict dependencies or relationships between tasks. I can interact with individual nodes (e.g., “Regenerate Step”) through direct prompts, mark steps complete, and when all steps are validated, the blueprint is verified.

---

## 2. User Flow

### 2.1 Blueprint Creation Modal

1. **User Initiates Blueprint Creation:**
   - Click “Create Blueprint” from the dashboard or blueprint list.
2. **Prompt Input:**
   - A modal opens with a large text area labeled “What do you want to do with AI?”.
   - The user enters a high-level prompt describing the desired AI functionality.
3. **Multi-turn Reasoning Q&A:**
   - The reasoning agent (via a dedicated API route) initiates a chat-like conversation in the modal.
   - It asks clarifying questions (e.g., “Do you have specific topics or constraints?”) until sufficient context is gathered.
4. **Final Review:**
   - The agent returns a structured JSON (e.g., `{ "title": "Daily LinkedIn Posts Summarizer", "searchQuery": "LinkedIn post ideas for venture capital, AI, and Google Bard updates" }`).
   - The JSON is displayed in editable fields for blueprint title and refined search query.
5. **Confirmation:**
   - The user reviews and, if needed, edits the output, then clicks “Create Blueprint.”

### 2.2 Blueprint Record Creation

1. **API Call:**
   - The frontend sends a `POST /api/blueprints` request with the final blueprint JSON.
2. **Database Persistence:**
   - A new record is inserted into the `blueprints` table (with `is_verified = false`).
3. **Redirect:**
   - The new blueprint’s `id` is returned, and the user is redirected to `/blueprints/[id]`.

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
     - Each step has a “Regenerate Step” button that opens a modal for step-specific prompt editing.
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
   - Using the Vercel AI SDK’s streaming functions, each implementation step is streamed as a data chunk.
   - The UI updates in real time, either appending to the list view or updating the React Flow diagram with new nodes and edges.
3. **Step Interactivity:**
   - Users can regenerate individual steps by clicking “Regenerate Step” (or by interacting with a node in flow chart view), which re-opens a modal pre-populated with the existing prompt.
   - Users mark steps as complete; when all steps are complete, a PATCH request updates the blueprint’s `is_verified` flag to true.

### 2.4 Real-Time Chat with Supabase

- **Supabase Integration:**
  - Use Supabase’s realtime messaging for managing the reasoning agent’s multi-turn conversation in the modal.
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
    Buttons for “Continue,” “Back,” “Confirm,” and “Cancel.”

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
  - “Regenerate Step” functionality via modal for step-specific editing.
  - Mark steps as complete, and update blueprint status accordingly.
- **Streaming UI:**
  - Use Vercel AI SDK streaming hooks (e.g., `useChat`) to handle incoming step data and update the view in real time.

#### 3.1.3 Supabase Integration for Realtime Chat

- **Setup:**
  - Use the existing Supabase client (already installed and configured) to subscribe to the `messages` table.
- **Realtime Messaging:**
  - Ensure the modal’s chat interface updates live as new messages are inserted.
  - Authenticate users via Supabase Auth and use the user’s ID for message association.

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
  Return the new blueprint’s `id`.

#### 3.2.3 Research Agent Streaming Endpoint

- **Endpoint:** `POST /api/blueprints/generate`
- **Input:**  
  Blueprint ID and `searchQuery`.
- **Process:**  
  Call the research agent (e.g., Perplexity) with the refined query.
  - Use Vercel AI SDK’s streaming functions to send back data.
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
  - Subscribe to the `messages` table for realtime updates in the reasoning agent’s chat.
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
                    “Regenerate Step” opens a pre-populated modal,
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
   - The reasoning agent conversation uses Supabase’s realtime messaging.

5. **Interactivity & Verification:**

   - Users can update step-specific prompts and regenerate steps.
   - When all steps are marked complete, the blueprint’s `is_verified` flag is updated.

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
  - [ ] Design a split layout with a central pane for steps.
  - [ ] Implement a toggle switch to alternate between List View and Flow Chart View.
  - [ ] In List View, render steps with step details and “Regenerate Step” buttons.
  - [ ] In Diagram View, integrate React Flow to dynamically display nodes and edges.
  - [ ] Enable interactivity on each node for direct prompt editing.
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
