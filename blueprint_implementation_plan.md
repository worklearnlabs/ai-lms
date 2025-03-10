# Blueprint Creation Implementation Plan

This document outlines the implementation tasks for the Blueprint Creation feature, organized to follow the natural user flow from blueprint creation to visualization and interaction.

## Overview

The implementation is structured to follow the user's journey:

1. **Blueprint Creation Modal** - User enters a high-level prompt
2. **Reasoning Flow** - System refines the prompt through multi-turn Q&A
3. **Blueprint Record Creation** - System creates a database record with refined data
4. **Research Generation** - System generates implementation steps
5. **Blueprint Page Interaction** - User views, interacts with, and completes steps

## Task Breakdown

### Phase 1: Blueprint Creation Modal & Reasoning Flow

#### Task 1.1: Reasoning Agent Endpoint

- **Description:** Implement the multi-turn Q&A endpoint to refine the user's high-level prompt
- **Endpoint:** `POST /api/blueprints/reason`
- **Subtasks:**
  - [ ] Create API route file in Next.js structure
  - [ ] Implement conversation context management
  - [ ] Integrate with o3-mini model using appropriate system prompt
  - [ ] Store conversation in `reasoning_sessions` and `reasoning_messages` tables
  - [ ] Add error handling and validation
  - [ ] Set up Supabase real-time updates for chat messages
- **Expected Outcome:** A functioning endpoint that can engage in multi-turn conversation and eventually return structured JSON with blueprint details

#### Task 1.2: Blueprint Creation Endpoint

- **Description:** Implement endpoint to create a new blueprint record in the database
- **Endpoint:** `POST /api/blueprints`
- **Dependencies:** Task 1.1 (reasoning endpoint)
- **Subtasks:**
  - [ ] Create API route file
  - [ ] Implement validation for incoming blueprint data
  - [ ] Insert record into the `blueprints` table
  - [ ] Set appropriate defaults (e.g., `is_verified = false`)
  - [ ] Set up proper RLS for the created record
  - [ ] Add error handling
- **Expected Outcome:** An endpoint that successfully creates blueprint records with proper ownership and returns the new ID

### Phase 2: Blueprint Page & Research Generation

#### Task 2.1: Research Agent Streaming Endpoint

- **Description:** Implement endpoint to generate and stream implementation steps
- **Endpoint:** `POST /api/blueprints/generate`
- **Dependencies:** Task 1.2 (blueprint creation endpoint)
- **Subtasks:**
  - [ ] Create API route file with streaming response support
  - [ ] Integrate with perplexicity sonnar model using appropriate system prompt
  - [ ] Implement streaming response format for step details
  - [ ] Store generated steps in the `blueprint_steps` table
  - [ ] Format data for both list and flow chart views
  - [ ] Add error handling for streaming responses
- **Expected Outcome:** An endpoint that streams implementation steps in real-time and persists them to the database

#### Task 2.2: Blueprint Update Endpoint

- **Description:** Implement endpoint to update blueprint verification status
- **Endpoint:** `PATCH /api/blueprints/[id]`
- **Dependencies:** Task 2.1 (research agent endpoint)
- **Subtasks:**
  - [ ] Create API route file
  - [ ] Implement validation for update operations
  - [ ] Update blueprint records with requested changes
  - [ ] Add logic to check if all steps are complete to mark blueprint as verified
  - [ ] Add proper error handling
- **Expected Outcome:** An endpoint that can update blueprint metadata, particularly verification status

#### Task 2.3: Step Update Endpoint

- **Description:** Implement endpoint to update step status and handle regeneration
- **Endpoint:** `PATCH /api/blueprints/[id]/steps/[step_id]`
- **Dependencies:** Task 2.1 (research agent endpoint)
- **Subtasks:**
  - [ ] Create API route file
  - [ ] Implement validation for step update operations
  - [ ] Add logic to update step status
  - [ ] Support step regeneration through the research agent
  - [ ] Add error handling
- **Expected Outcome:** An endpoint that can update step status and trigger regeneration of individual steps

### Phase 3: Frontend Integration

#### Task 3.1: Reasoning Agent Integration

- **Description:** Connect the multi-step modal UI to the reasoning endpoint
- **Dependencies:** Task 1.1 (reasoning endpoint), existing UI components
- **Subtasks:**
  - [ ] Integrate API calls to `/api/blueprints/reason`
  - [ ] Implement real-time chat updates using Supabase subscriptions
  - [ ] Add loading states and error handling
  - [ ] Implement final review screen for AI-generated blueprint details
- **Expected Outcome:** A functioning modal that can engage in multi-turn conversation with the reasoning agent

#### Task 3.2: Blueprint Creation Integration

- **Description:** Connect the modal's confirmation step to the blueprint creation endpoint
- **Dependencies:** Task 1.2 (blueprint creation endpoint), Task 3.1 (reasoning integration)
- **Subtasks:**
  - [ ] Integrate API calls to `/api/blueprints`
  - [ ] Add form validation and error handling
  - [ ] Implement redirect to blueprint page on successful creation
- **Expected Outcome:** The ability to create new blueprint records from the modal

#### Task 3.3: Research Agent Integration

- **Description:** Connect the blueprint page to the research agent streaming endpoint
- **Dependencies:** Task 2.1 (research agent endpoint), existing blueprint page UI
- **Subtasks:**
  - [ ] Integrate API calls to `/api/blueprints/generate`
  - [ ] Implement streaming UI updates for both list and flow chart views
  - [ ] Add loading states and error handling
- **Expected Outcome:** A blueprint page that displays streaming steps in real-time

#### Task 3.4: Step Interaction Integration

- **Description:** Implement step status updates and regeneration functionality
- **Dependencies:** Tasks 2.2 and 2.3 (update endpoints), Task 3.3 (research integration)
- **Subtasks:**
  - [ ] Integrate API calls to step update endpoints
  - [ ] Implement UI for marking steps as complete
  - [ ] Add regeneration modal for individual steps
  - [ ] Update UI based on blueprint verification status
- **Expected Outcome:** Full interaction capabilities with blueprint steps

### Phase 4: Testing & Polish

#### Task 4.1: Unit Testing

- **Description:** Write unit tests for all API endpoints
- **Dependencies:** All API implementation tasks
- **Subtasks:**
  - [ ] Set up testing environment
  - [ ] Write tests for reasoning endpoint
  - [ ] Write tests for blueprint creation endpoint
  - [ ] Write tests for research agent endpoint
  - [ ] Write tests for update endpoints
- **Expected Outcome:** Comprehensive test coverage for all API functionality

#### Task 4.2: Integration Testing

- **Description:** Test full user flows from blueprint creation to completion
- **Dependencies:** All implementation tasks
- **Subtasks:**
  - [ ] Test reasoning agent conversation flows
  - [ ] Test blueprint creation and redirection
  - [ ] Test research agent streaming and visualization
  - [ ] Test step interaction and blueprint verification
- **Expected Outcome:** Verification that all components work together smoothly

#### Task 4.3: UI Polish

- **Description:** Final UI refinements and accessibility improvements
- **Dependencies:** All frontend integration tasks
- **Subtasks:**
  - [ ] Address any accessibility issues
  - [ ] Improve error messaging and user feedback
  - [ ] Optimize performance for streaming updates
  - [ ] Test with various input scenarios
- **Expected Outcome:** A polished, accessible, and robust user experience

### Phase 5: Debugging and Fixes

#### Task 5.1: Fix Reasoning Agent Session Creation

- **Description:** Address issues related to reasoning agent session creation
- **Dependencies:** Task 1.1 (reasoning endpoint)
- **Subtasks:**
  - [ ] Identify and fix session creation issues
  - [ ] Implement session recovery mechanism
  - [ ] Add error handling for session creation failures
- **Expected Outcome:** A stable reasoning agent session creation process

#### Task 5.2: Enhanced Dev API for Realistic Responses

- **Description:** Update the development API to generate dynamic responses based on the input prompt rather than using hardcoded responses.
- **Dependencies:** Task 1.1 (reasoning endpoint)
- **Subtasks:**
  - [ ] Implement dynamic response generation logic
  - [ ] Test and verify the new API functionality
- **Expected Outcome:** A reliable and dynamic development API for more realistic testing scenarios

#### Task 5.3: Test Complete User Flow

- **Description:** Verify the complete user flow from blueprint creation to completion
- **Dependencies:** All implementation tasks
- **Subtasks:**
  - [ ] Test full user flow from start to end
  - [ ] Verify data consistency across all stages
  - [ ] Add error handling for complete user flow failures
- **Expected Outcome:** A complete and error-free user flow

## Implementation Timeline

- **Phase 1** (Blueprint Creation & Reasoning): Week 1
- **Phase 2** (Research Generation & Updates): Week 2
- **Phase 3** (Frontend Integration): Week 3
- **Phase 4** (Testing & Polish): Week 4
- **Phase 5** (Debugging & Fixes): Week 5

## Progress Tracking

Use this section to track progress by marking tasks as completed:

- [x] Phase 1: Blueprint Creation Modal & Reasoning Flow
  - [x] Task 1.1: Reasoning Agent Endpoint
  - [x] Task 1.2: Blueprint Creation Endpoint
- [x] Phase 2: Blueprint Page & Research Generation
  - [x] Task 2.1: Research Agent Streaming Endpoint
  - [x] Task 2.2: Blueprint Update Endpoint
  - [x] Task 2.3: Step Update Endpoint
- [x] Phase 3: Frontend Integration
  - [x] Task 3.1: Reasoning Agent Integration
  - [x] Task 3.2: Blueprint Creation Integration
  - [x] Task 3.3: Research Agent Integration
  - [x] Task 3.4: Step Interaction Integration
- [ ] Phase 4: Testing & Polish
  - [ ] Task 4.1: Unit Testing
  - [ ] Task 4.2: Integration Testing
  - [ ] Task 4.3: UI Polish
- [ ] Phase 5: Debugging & Fixes
  - [x] Task 5.1: Fix Reasoning Agent Session Creation
  - [x] Task 5.2: Enhanced Dev API for Realistic Responses
  - [ ] Task 5.3: Test Complete User Flow

## Recent Updates

### 2023-03-10

- **Fixed Reasoning Session Creation**: Resolved issue with creating reasoning sessions by ensuring the blueprint_id field is properly handled. Added additional error handling.
- **Enhanced Development API**: Updated the development API to generate dynamic responses based on the input prompt rather than using hardcoded responses. This provides more realistic testing scenarios.
- **Modal Improvements**: Fixed the blueprint creation modal to properly handle API responses and redirect users to the appropriate page after blueprint creation.
- **Fixed Complexity Value Mapping**: Ensured complexity values are correctly mapped between API values and database values.
- **Implemented Adaptive Learning Flow**: Updated the blueprint creation process to properly extract and utilize skill level and learning objective from user conversations, ensuring blueprints are tailored to the user's ability level and goals.
- **Improved Multi-turn Conversation**: Enhanced the conversation flow to incorporate proper multi-turn Q&A rather than bypassing this important step.
