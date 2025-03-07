Below is the updated, end‐to‐end Blueprint Creation Flow Implementation Document that integrates Supabase’s real‐time features and streaming AI responses, along with our revised UI/UX for a multi-turn reasoning and step‐based blueprint creation process.

---

# Blueprint Creation Flow Implementation Document

This document outlines the full requirements, user journey, and technical implementation for the “Create Blueprint” functionality. It covers everything from the modal experience (with multi-turn reasoning) to the streaming generation of detailed implementation steps—all integrated with Supabase for real-time chat and persistence.

---

## 1. Overview

**User Story:**  
As a user, I want to create a blueprint by simply providing a high-level prompt. The system will engage in a guided Q&A (via a reasoning agent) to clarify my request and generate a structured JSON containing a blueprint title and a refined search query. Once confirmed, the blueprint is saved, and I’m taken to a dedicated Blueprint Page. There, the research agent streams a detailed, step-by-step implementation plan in real time. Each step is shown individually—with a step number, title, estimated time to completion, bullet-point instructions, and tool tags. I can interact with each step (e.g., “Regenerate Step” with a contextual prompt) and mark it complete. When all steps are complete, the blueprint is verified.

---

## 2. User Flow

### 2.1 Blueprint Creation Modal

1. **User Initiates Blueprint Creation:**
   - Click “Create Blueprint” from the dashboard or blueprint list.
2. **Prompt Input:**
   - A modal opens with a large text area titled “What do you want to do with AI?”
   - The user enters a high-level prompt describing the desired AI functionality.
3. **Multi-turn Reasoning Q&A:**
   - The reasoning agent (via a dedicated API route) initiates a chat-like conversation within the modal.
   - It asks clarifying questions (e.g., “Do you have specific topics or constraints?”) until it gathers enough context.
4. **Final Review:**
   - The agent outputs a JSON object (e.g., `{ "title": "Daily LinkedIn Posts Summarizer", "searchQuery": "LinkedIn post ideas for venture capital, AI, and Google Bard updates" }`).
   - This output is shown in editable fields for the blueprint title and refined search query.
5. **Confirmation:**
   - The user reviews and, if needed, edits the fields, then clicks “Create Blueprint.”

### 2.2 Blueprint Record Creation

1. **API Call:**
   - The frontend sends a `POST /api/blueprints` request with the final blueprint JSON.
2. **Database Persistence:**
   - A new record is inserted into the `blueprints` table (with `is_verified = false`).
3. **Redirect:**
   - The response returns the new blueprint’s `id`, and the user is redirected to `/blueprints/[id]`.

### 2.3 Blueprint Page & Research Agent Streaming

1. **Blueprint Page Layout:**
   - **Central Pane:** Displays the blueprint’s implementation steps in sequence.
     - Each step includes:
       - **Step Number**
       - **Step Title**
       - **Estimated Time to Completion**
       - **Implementation Instructions** (bullet points)
       - **Tool Tags** (displayed as badges)
     - Each step has a “Regenerate Step” button that opens a pre-populated modal for step-specific prompt editing.
   - **Right Pane:** Shows blueprint metadata, agent logs, or additional context.
2. **Streaming Generation:**
   - On page load, the research agent is triggered by sending the refined search query (from the blueprint record) to the `POST /api/blueprints/generate` endpoint.
   - Using Vercel AI SDK’s streaming capabilities, the research agent sends back step-by-step content incrementally.
   - As each chunk (representing a step) arrives, the UI updates in real time.
3. **Step Interactivity:**
   - Users can click “Regenerate Step” to update a single step. This calls the research agent with a step-specific prompt, and the resulting new step data replaces the old one.
   - Users mark steps as complete. Once all steps are complete, the blueprint’s `is_verified` flag is updated to true.

### 2.4 Real-Time Chat with Supabase

- **Supabase Integration:**
  - Supabase is already installed and configured.
  - Use Supabase’s real-time messaging to manage the reasoning agent conversation within the modal.
  - Chat messages are stored in the `messages` table and subscribed to via Supabase’s realtime API, ensuring that both the multi-turn Q&A and subsequent chat interactions (for step regeneration) update live without building a custom backend.
  - Real-time events update the UI instantly as new clarifying questions or agent responses arrive.

---

## 3. Technical Requirements

### 3.1 Frontend

#### 3.1.1 Create Blueprint Modal

- **Components:**

  - **Prompt Input Area:**  
    A large text area for the high-level prompt.
  - **Chat-like Interface for Q&A:**  
    Display agent questions and user responses in a conversational format.
    - Use a state hook to manage conversation history.
    - Integrate with Supabase’s realtime subscriptions to handle live updates (if needed).
  - **Final Review Panel:**  
    Editable fields showing the AI-generated blueprint title and refined search query.
  - **Navigation Controls:**  
    “Continue,” “Back,” “Confirm,” and “Cancel” buttons.

- **API Integration:**
  - Call the `POST /api/blueprints/reason` endpoint for multi-turn reasoning.
  - On final confirmation, call `POST /api/blueprints` to create the blueprint record.

#### 3.1.2 Blueprint Page

- **Layout:**
  - **Central Pane:**  
    Render a list of steps. Each step is displayed in a card or panel with its details (number, title, time estimate, instructions, tool tags).
  - **Right Pane:**  
    Display blueprint metadata (e.g., title, agent logs) and extra controls.
- **Step Interactivity:**
  - Each step includes a “Regenerate Step” button that opens a modal with the current step’s prompt pre-populated for editing.
  - Allow marking each step as complete. Update local state and send a PATCH request to update the blueprint status if all steps are complete.
- **Streaming:**
  - Use the Vercel AI SDK’s streaming functions (like `streamText`) in the `POST /api/blueprints/generate` endpoint.
  - Incrementally render each incoming step as it arrives in the UI.

### 3.2 Backend

#### 3.2.1 Reasoning Agent Endpoint

- **Endpoint:** `POST /api/blueprints/reason`
- **Input:**
  - User prompt and optionally conversation context.
- **Process:**
  - Call the reasoning agent (e.g., OpenAI o1) with instructions to ask clarifying questions and then generate a structured JSON `{ title, searchQuery }`.
- **Output:**
  - Either the next clarifying question or the final JSON.
- **Error Handling:**
  - Return structured error responses on failure.

#### 3.2.2 Create Blueprint Endpoint

- **Endpoint:** `POST /api/blueprints`
- **Input:**
  - Final blueprint JSON with `title` and `searchQuery`, and optionally the original prompt.
- **Process:**
  - Validate input and insert a new record in the `blueprints` table with `is_verified = false`.
- **Output:**
  - Return the new blueprint’s `id`.

#### 3.2.3 Research Agent Streaming Endpoint

- **Endpoint:** `POST /api/blueprints/generate`
- **Input:**
  - Blueprint ID and `searchQuery` from the reasoning phase.
- **Process:**
  - Call the research agent (e.g., Perplexity) with the refined query.
  - Use the Vercel AI SDK’s `streamText` (or similar) to produce a streaming response.
  - Format the stream so that each chunk includes:
    - **Step Number**
    - **Step Title**
    - **Estimated Time**
    - **Implementation Instructions (as bullet points)**
    - **Tool Tags**
- **Output:**
  - A streaming HTTP response that sends the steps incrementally.
- **Error Handling:**
  - Return error chunks if streaming fails.

#### 3.2.4 Optional: Blueprint Steps Table

- **Schema Suggestion:**
  - **Table:** `blueprint_steps`
  - **Columns:**
    - `id` (UUID, primary key)
    - `blueprint_id` (UUID, foreign key to `blueprints`)
    - `step_number` (integer)
    - `title` (text)
    - `estimated_time` (text/integer)
    - `instructions` (JSON or text)
    - `tools` (JSON or an array of strings)
    - `status` (e.g., draft, completed)
    - Timestamps (`created_at`, `updated_at`)
- **Benefits:**
  - Allows independent updates, versioning, and granular queries for steps.

### 3.3 Supabase Integration

- **Authentication & Realtime Messaging:**
  - Supabase is already installed and configured.
  - Use Supabase Auth to manage user sessions and retrieve the current user’s `id`.
  - Leverage Supabase’s realtime features by subscribing to changes in the `messages` table to handle the reasoning agent’s multi-turn conversation and any other chat interactions.
- **Chat Infrastructure:**
  - Use Supabase’s out-of-the-box features to store and retrieve chat messages without building a custom backend.
  - Configure the appropriate RLS policies so that users only see messages for their own blueprint creation sessions.
- **Database Persistence:**
  - Store blueprint records in the `blueprints` table and optionally steps in the `blueprint_steps` table.

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
                                               ▼
                       ┌────────────────────────────────────┐
                       │ Client UI: Blueprint Page           │
                       │ (Central Pane: Steps; Right Pane: Metadata)  │
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

   - The modal collects only a high-level prompt.
   - A multi-turn conversation with the reasoning agent occurs, with clarifying questions and user answers.
   - Final JSON containing a blueprint title and search query is displayed for review and can be edited before confirmation.

2. **Blueprint Creation:**

   - On confirmation, a blueprint record is created with the generated title, search query, and `is_verified = false`.
   - The user is redirected to the blueprint page.

3. **Research & Streaming Steps:**

   - On the blueprint page, the research agent is triggered to stream implementation steps.
   - Each step is rendered as soon as its data arrives (including step number, title, estimated time, instructions, and tool tags).
   - Each step can be individually regenerated and updated.

4. **Data Persistence & Real-Time Updates:**

   - Blueprint records (and optionally steps) are stored in Supabase.
   - The reasoning agent conversation uses Supabase’s realtime chat capabilities to manage multi-turn Q&A.

5. **Interactivity & Verification:**

   - Users can modify prompts for individual steps, triggering updates via the research agent.
   - When all steps are marked complete, the blueprint’s `is_verified` flag updates to true.

6. **Error Handling:**
   - Any errors from AI calls or DB operations are surfaced to the user with clear messages and options to retry.

---

## 6. Implementation Steps

1. **Frontend Development:**

   - **Modal Creation:**  
     Build a multi-step modal with:
     - A prompt input.
     - A chat-like Q&A interface for the reasoning agent.
     - A final review screen showing the AI-generated blueprint title and search query.
   - **Blueprint Page:**  
     Develop a split layout with:
     - A central pane displaying each streaming step (step number, title, estimated time, bullet-point instructions, tool tags).
     - A right pane for blueprint metadata and additional controls.
   - **Step Interactivity:**  
     Implement “Regenerate Step” functionality via a modal that allows step-specific prompt editing.
   - **Integrate Supabase’s Realtime Chat:**  
     Use Supabase’s prebuilt realtime features to manage the multi-turn reasoning agent conversation and any additional chat interactions.
   - **Streaming UI:**  
     Use the Vercel AI SDK’s hooks (e.g., `useChat`) to handle streaming of research agent responses.

2. **Backend Development:**

   - **Reasoning Agent Endpoint:**  
     Create `POST /api/blueprints/reason` to conduct multi-turn Q&A and eventually return structured JSON.
   - **Create Blueprint Endpoint:**  
     Create `POST /api/blueprints` to insert a new blueprint record into Supabase.
   - **Research Agent Streaming Endpoint:**  
     Create `POST /api/blueprints/generate` to call the research agent (using the refined search query) and stream implementation steps.
   - **Optional Steps Table:**  
     Define a `blueprint_steps` table (with a foreign key to `blueprints`) if step-level management is desired.
   - **Patch Endpoint:**  
     Create `PATCH /api/blueprints/[id]` to update blueprint status or individual step data as steps are regenerated or marked complete.

3. **Database Setup (Supabase):**

   - Ensure the `blueprints` table is created with columns for title, search query, original prompt, `is_verified`, and timestamps.
   - Optionally, create a `blueprint_steps` table to store individual step data.
   - Set up realtime replication for relevant tables (e.g., messages for the reasoning agent chat, blueprints, and steps).

4. **Integration & Testing:**
   - Write unit tests for each endpoint (mock AI responses where needed).
   - Conduct integration tests to simulate the full user flow.
   - Perform manual QA:
     - Test the multi-turn modal.
     - Verify streaming responses display correctly.
     - Ensure that regenerating and marking steps complete updates both the UI and Supabase.
     - Confirm that realtime chat works as expected for the reasoning agent conversation.

---

## 7. Conclusion

This comprehensive Blueprint Creation Flow Implementation Document details every aspect of the “Create Blueprint” functionality—from a guided, multi-turn reasoning modal that produces a blueprint title and refined search query, to a blueprint page where a research agent streams step-by-step implementation details. By leveraging Supabase’s realtime chat and persistence capabilities alongside the Vercel AI SDK’s streaming functionality, this plan delivers a seamless, interactive, and agent-driven blueprint creation experience. Following this document will allow your team to execute all tasks and ensure robust, user-friendly blueprint creation.

---

# Tasks for "Create Blueprint" User Story

## 1. Frontend Development

### 1.1 Create Blueprint Modal

- [ ] **Design & Build Modal UI:**
  - [ ] Create a modal component that opens on clicking “Create Blueprint”.
  - [ ] Include a large text area labeled “What do you want to do with AI?”.
  - [ ] Design a chat-like area inside the modal for the multi-turn reasoning Q&A.
  - [ ] Add navigation buttons: “Continue”, “Back”, “Confirm”, and “Cancel”.
- [ ] **Integrate Reasoning Agent API:**
  - [ ] Hook up the modal to call `POST /api/blueprints/reason` with the user’s prompt and conversation context.
  - [ ] Display the agent’s follow-up questions and allow user responses.
  - [ ] On completion of the conversation, display the final JSON output with `title` and `searchQuery` in editable fields.
- [ ] **Finalize Modal Flow:**
  - [ ] Allow the user to confirm the final output.
  - [ ] On confirmation, trigger a call to `POST /api/blueprints` to create the blueprint record.
  - [ ] Handle error states and allow retries.

### 1.2 Blueprint Page & Step Streaming

- [ ] **Page Layout Design:**
  - [ ] Design a split layout with a central pane (for step-by-step implementation plan) and a right-side pane (for blueprint metadata and agent logs).
- [ ] **Implement Streaming of Research Agent Steps:**
  - [ ] Integrate the Vercel AI SDK streaming hook (e.g., `useChat`) to call `POST /api/blueprints/generate`.
  - [ ] Render each incoming chunk as a discrete step with:
    - [ ] Step Number
    - [ ] Step Title
    - [ ] Estimated Time to Completion
    - [ ] Bullet-point Implementation Instructions
    - [ ] Tool Tags (as badges)
- [ ] **Step Interactivity:**
  - [ ] Add a “Regenerate Step” button for each step.
  - [ ] Build a modal for step-specific prompt editing, pre-populated with the existing step prompt.
  - [ ] Enable users to mark steps as complete.
  - [ ] Update the blueprint status (PATCH /api/blueprints/[id]) when all steps are marked complete (set `is_verified` to true).

### 1.3 Supabase Integration for Real-Time Chat

- [ ] **Configure Real-Time Messaging:**
  - [ ] Use the existing Supabase client setup to subscribe to a `messages` table (or a similar collection) for handling the reasoning agent’s conversation.
  - [ ] Ensure that the modal chat area updates in real time as new messages are inserted.
- [ ] **Authentication & User Session:**
  - [ ] Confirm Supabase Auth is set up and integrated.
  - [ ] Retrieve the current user’s ID for associating chat messages and blueprint records.

## 2. Backend Development

### 2.1 Reasoning Agent Endpoint

- [ ] **Create Endpoint:**
  - [ ] Build `POST /api/blueprints/reason` to accept the initial prompt and conversation context.
- [ ] **AI Integration:**
  - [ ] Call the reasoning agent (OpenAI o1) with a system prompt instructing it to ask clarifying questions.
  - [ ] Support multi-turn conversation and return either a clarifying question or a final JSON with `{ title, searchQuery }`.
- [ ] **Error Handling:**
  - [ ] Return structured errors if the AI call fails.

### 2.2 Create Blueprint Endpoint

- [ ] **Create Endpoint:**
  - [ ] Build `POST /api/blueprints` to create a new blueprint record.
- [ ] **Database Insertion:**
  - [ ] Validate incoming JSON (with blueprint title, search query, and original prompt if needed).
  - [ ] Insert a record in the `blueprints` table with `is_verified = false`.
  - [ ] Return the new blueprint’s `id`.

### 2.3 Research Agent Streaming Endpoint

- [ ] **Create Endpoint:**
  - [ ] Build `POST /api/blueprints/generate` to trigger the research agent.
- [ ] **Streaming Response:**
  - [ ] Call the research agent (e.g., Perplexity) with the refined `searchQuery`.
  - [ ] Use Vercel AI SDK’s streaming functions (e.g., `streamText`) to stream data.
  - [ ] Format each chunk to include:
    - Step Number
    - Step Title
    - Estimated Time to Completion
    - Implementation Instructions (bullet points)
    - Tool Tags
- [ ] **Error Handling:**
  - [ ] Return appropriate error responses in the stream if issues occur.

### 2.4 (Optional) Blueprint Steps Table

- [ ] **Database Schema:**
  - [ ] Create a `blueprint_steps` table with columns:
    - `id` (UUID, PK)
    - `blueprint_id` (UUID, FK to `blueprints`)
    - `step_number` (integer)
    - `title` (text)
    - `estimated_time` (text or integer)
    - `instructions` (JSON or text for bullet points)
    - `tools` (JSON or array of strings)
    - `status` (e.g., draft, completed)
    - Timestamps (`created_at`, `updated_at`)
- [ ] **Integration:**
  - [ ] Link individual steps to their blueprint via foreign key.
  - [ ] Update endpoints to optionally store and update steps in this table.

## 3. Testing & Integration

- [ ] **Unit Testing:**
  - [ ] Write unit tests for each backend endpoint (mock AI responses).
  - [ ] Test validation logic and error handling.
- [ ] **Integration Testing:**
  - [ ] Simulate the full user flow from modal input to blueprint creation and step streaming.
- [ ] **Manual QA:**
  - [ ] Verify that the modal correctly handles multi-turn reasoning.
  - [ ] Confirm that blueprint records are created in Supabase.
  - [ ] Test streaming updates on the blueprint page.
  - [ ] Ensure step interactivity (regeneration, editing, marking complete) works as expected.
- [ ] **Real-Time Functionality:**
  - [ ] Test the Supabase realtime subscriptions for chat messages in the modal.
