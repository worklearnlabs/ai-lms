# [ARCHIVED] Supabase Database Implementation Plan: Blueprint System

> **IMPORTANT NOTICE**: This document has been archived. Please refer to [blueprint_system_schema.md](./blueprint_system_schema.md) for the definitive source of truth regarding the Blueprint system database schema.

The content below is maintained for historical reference only.

---

## 1. Overview

This document outlines the implementation plan for modifying the existing Supabase database structure to support the enhanced Blueprint system as described in the `blueprint_creation_flow.md` documentation. The implementation will ensure data consistency, backward compatibility, and proper relational structure.

## 2. Current Database State

### 2.1 Existing Tables (from image)

- blueprints
- businesses
- courses
- enrollments
- users

### 2.2 Current Blueprint Table Structure

```sql
create table public.blueprints (
  title text not null,
  details text null,
  content jsonb not null,
  is_verified boolean null default false,
  created_at timestamp without time zone not null default now(),
  updated_at timestamp without time zone not null default now(),
  user_id uuid null,
  id uuid not null default gen_random_uuid (),
  prompt text null,
  clone_count integer null default 0,
  steps_count integer null,
  constraint blueprints_pkey primary key (id),
  constraint blueprints_id_key unique (id),
  constraint blueprints_user_id_fkey foreign KEY (user_id) references users (id)
)
```

## 3. Target Database State

### 3.1 Required Tables

Based on the documentation in `blueprint_creation_flow.md`, we need the following tables:

1. **blueprints** (modified existing table)
2. **blueprint_steps** (new)
3. **blueprint_subtasks** (new)
4. **blueprint_comments** (new)
5. **reasoning_sessions** (new)
6. **reasoning_messages** (new)

### 3.2 Required Enums

The following custom enum types are needed:

1. **visibility_type**: 'private', 'public', 'team'
2. **skill_level_type**: 'beginner', 'intermediate', 'advanced'
3. **complexity_type**: 'low', 'medium', 'high'
4. **step_status_type**: 'not_started', 'in_progress', 'completed'
5. **session_status_type**: 'active', 'completed', 'failed'
6. **message_role_type**: 'system', 'user', 'assistant'

## 4. Implementation Plan

### 4.1 Phase 1: Schema Modifications

#### 4.1.1 Create Required Enum Types

```sql
-- Create enum types for new fields
CREATE TYPE public.visibility_type AS ENUM ('private', 'public', 'team');
CREATE TYPE public.skill_level_type AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE public.complexity_type AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.step_status_type AS ENUM ('not_started', 'in_progress', 'completed');
CREATE TYPE public.session_status_type AS ENUM ('active', 'completed', 'failed');
CREATE TYPE public.message_role_type AS ENUM ('system', 'user', 'assistant');
```

#### 4.1.2 Modify Blueprints Table

```sql
-- Add missing columns to existing blueprints table
ALTER TABLE public.blueprints
  ADD COLUMN search_query text,
  ADD COLUMN visibility visibility_type DEFAULT 'private',
  ADD COLUMN team_id uuid, -- FK to be added after teams table is verified
  ADD COLUMN skill_level skill_level_type,
  ADD COLUMN learning_objective text,
  ADD COLUMN complexity complexity_type,
  ADD COLUMN estimated_time text;

-- Note: We're keeping existing fields like clone_count, steps_count, details, and content
-- for backward compatibility and data preservation
```

#### 4.1.3 Create Blueprint Steps Table

```sql
CREATE TABLE public.blueprint_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blueprint_id uuid NOT NULL,
  number integer NOT NULL,
  title text NOT NULL,
  estimated_time text,
  instructions jsonb, -- Array of bullet-point instructions
  tools jsonb, -- Array of tool tags
  status step_status_type DEFAULT 'not_started',
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT blueprint_steps_pkey PRIMARY KEY (id),
  CONSTRAINT blueprint_steps_blueprint_id_fkey FOREIGN KEY (blueprint_id)
    REFERENCES public.blueprints (id) ON DELETE CASCADE
);

-- Index for faster queries on blueprint_id
CREATE INDEX idx_blueprint_steps_blueprint_id ON public.blueprint_steps (blueprint_id);
```

#### 4.1.4 Create Blueprint Subtasks Table

```sql
CREATE TABLE public.blueprint_subtasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  step_id uuid NOT NULL,
  task_number integer NOT NULL,
  description text NOT NULL,
  status step_status_type DEFAULT 'not_started',
  estimated_time text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT blueprint_subtasks_pkey PRIMARY KEY (id),
  CONSTRAINT blueprint_subtasks_step_id_fkey FOREIGN KEY (step_id)
    REFERENCES public.blueprint_steps (id) ON DELETE CASCADE
);

-- Index for faster queries on step_id
CREATE INDEX idx_blueprint_subtasks_step_id ON public.blueprint_subtasks (step_id);
```

#### 4.1.5 Create Blueprint Comments Table

```sql
CREATE TABLE public.blueprint_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blueprint_id uuid NOT NULL,
  step_id uuid,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT blueprint_comments_pkey PRIMARY KEY (id),
  CONSTRAINT blueprint_comments_blueprint_id_fkey FOREIGN KEY (blueprint_id)
    REFERENCES public.blueprints (id) ON DELETE CASCADE,
  CONSTRAINT blueprint_comments_step_id_fkey FOREIGN KEY (step_id)
    REFERENCES public.blueprint_steps (id) ON DELETE CASCADE,
  CONSTRAINT blueprint_comments_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.users (id)
);

-- Indexes for faster queries
CREATE INDEX idx_blueprint_comments_blueprint_id ON public.blueprint_comments (blueprint_id);
CREATE INDEX idx_blueprint_comments_step_id ON public.blueprint_comments (step_id);
CREATE INDEX idx_blueprint_comments_user_id ON public.blueprint_comments (user_id);
```

#### 4.1.6 Create Reasoning Sessions Table

```sql
CREATE TABLE public.reasoning_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blueprint_id uuid NOT NULL,
  status session_status_type DEFAULT 'active',
  context jsonb, -- Additional context for the session
  skill_level skill_level_type,
  learning_objective text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT reasoning_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT reasoning_sessions_blueprint_id_fkey FOREIGN KEY (blueprint_id)
    REFERENCES public.blueprints (id) ON DELETE CASCADE
);

-- Index for faster queries on blueprint_id
CREATE INDEX idx_reasoning_sessions_blueprint_id ON public.reasoning_sessions (blueprint_id);
```

#### 4.1.7 Create Reasoning Messages Table

```sql
CREATE TABLE public.reasoning_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  role message_role_type NOT NULL,
  content text NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT reasoning_messages_pkey PRIMARY KEY (id),
  CONSTRAINT reasoning_messages_session_id_fkey FOREIGN KEY (session_id)
    REFERENCES public.reasoning_sessions (id) ON DELETE CASCADE
);

-- Index for faster queries on session_id
CREATE INDEX idx_reasoning_messages_session_id ON public.reasoning_messages (session_id);
```

### 4.2 Phase 2: Data Migration Plan

#### 4.2.1 Blueprint Content Migration Strategy

For existing blueprint records, we need to migrate the `content` JSONB field data to the new schema structure:

1. **Temporary Migration Function**

```sql
CREATE OR REPLACE FUNCTION public.migrate_blueprint_content()
RETURNS void AS $$
DECLARE
  blueprint_record RECORD;
  step_json JSONB;
  step_number INT;
  step_id UUID;
BEGIN
  FOR blueprint_record IN SELECT id, content FROM public.blueprints LOOP
    step_number := 1;

    -- Check if content has steps in it
    IF blueprint_record.content ? 'steps' THEN
      FOR step_json IN SELECT jsonb_array_elements(blueprint_record.content->'steps') LOOP
        -- Insert step record
        INSERT INTO public.blueprint_steps (
          blueprint_id,
          number,
          title,
          estimated_time,
          instructions,
          tools,
          status
        )
        VALUES (
          blueprint_record.id,
          step_number,
          COALESCE(step_json->>'title', 'Step ' || step_number),
          COALESCE(step_json->>'estimatedTime', step_json->>'estimated_time', NULL),
          COALESCE(step_json->'instructions', '[]'::jsonb),
          COALESCE(step_json->'tools', step_json->'toolTags', '[]'::jsonb),
          'not_started'
        )
        RETURNING id INTO step_id;

        -- Migrate subtasks if they exist
        IF step_json ? 'subtasks' THEN
          INSERT INTO public.blueprint_subtasks (
            step_id,
            task_number,
            description,
            status,
            estimated_time
          )
          SELECT
            step_id,
            (subtask->>'number')::integer,
            subtask->>'description',
            'not_started',
            NULL
          FROM jsonb_array_elements(step_json->'subtasks') AS subtask;
        END IF;

        step_number := step_number + 1;
      END LOOP;
    END IF;

    -- Update the steps_count field
    UPDATE public.blueprints
    SET steps_count = step_number - 1
    WHERE id = blueprint_record.id;

    -- Update search_query based on content
    IF blueprint_record.content ? 'searchQuery' THEN
      UPDATE public.blueprints
      SET search_query = blueprint_record.content->>'searchQuery'
      WHERE id = blueprint_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

2. **Execute Migration**

```sql
-- Execute the migration function
SELECT public.migrate_blueprint_content();

-- Drop the function after migration is complete
DROP FUNCTION public.migrate_blueprint_content();
```

### 4.3 Phase 3: Row-Level Security Policies

#### 4.3.1 Enable RLS on All Tables

```sql
-- Enable RLS
ALTER TABLE public.blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reasoning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reasoning_messages ENABLE ROW LEVEL SECURITY;
```

#### 4.3.2 Blueprint RLS Policies

```sql
-- Owner can do anything with their blueprints
CREATE POLICY blueprint_owner_all ON public.blueprints
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Team members can view team blueprints
CREATE POLICY blueprint_team_view ON public.blueprints FOR SELECT
  USING (visibility = 'team' AND team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

-- Anyone can view public blueprints
CREATE POLICY blueprint_public_view ON public.blueprints FOR SELECT
  USING (visibility = 'public');
```

#### 4.3.3 Related Tables RLS Policies

Policies for related tables (steps, subtasks, comments, etc.) would follow similar patterns based on the parent blueprint's visibility and ownership.

## 5. Testing Plan

### 5.1 Database Schema Validation

- Verify all tables and columns exist with correct constraints
- Verify enum types have correct values
- Validate foreign key relationships

### 5.2 Data Migration Validation

- Count records before and after migration to ensure no data loss
- Manually inspect sample records to verify correct data mapping
- Verify JSON structure in new tables matches expected format

### 5.3 RLS Policy Testing

- Test access patterns for different user roles and visibility settings
- Verify correct behavior for team access

### 5.4 API Integration Testing

- Ensure existing API endpoints continue to function
- Test new API endpoints for creating and managing blueprint steps

## 6. Implementation Timeline

### Week 1: Schema Changes and Initial Testing

- Create enum types
- Modify existing blueprints table
- Create new tables
- Perform schema validation tests

### Week 2: Data Migration and RLS Policies

- Implement and test data migration scripts
- Create and test RLS policies
- Document any issues or special cases

### Week 3: API Integration and Final Testing

- Update or create API endpoints
- Perform full integration testing
- Documentation and knowledge transfer

## 7. Rollback Plan

In case of issues, the following rollback strategy should be implemented:

1. Backup all data before making any changes
2. Create rollback scripts that can restore the original schema
3. Test rollback procedures before implementation

## 8. Documentation Updates

After implementation:

1. Update API documentation to reflect new database schema
2. Create entity-relationship diagrams for reference
3. Document any special considerations for developers
