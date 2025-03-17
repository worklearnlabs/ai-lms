# Supabase SQL Scripts Inventory

This document catalogs all SQL scripts that have been manually executed in the Supabase SQL Editor for the AI-LMS project. This inventory should be updated whenever new scripts are added or existing scripts are modified.

## Scripts Overview

| Current Script Name                              | Suggested Name                       | Purpose                                                                                                           | Last Updated |
| ------------------------------------------------ | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------ |
| Blueprint Questions Table Structure and Policies | blueprint_questions_schema           | Define the blueprint_questions table structure and its RLS policies                                               | TBD          |
| Manage Temporary Blueprints                      | temporary_blueprints_management      | Scripts for handling temporary blueprints creation and cleanup                                                    | TBD          |
| Blueprints Policy Management                     | blueprints_rls_policies              | Define and maintain RLS policies for the blueprints table                                                         | TBD          |
| Untitled query                                   | blueprint_questions_rls_policies     | Create RLS policies for the blueprint_questions table                                                             | TBD          |
| Blueprint Questions Store Function               | blueprint_questions_store_function   | Create a stored procedure to safely store blueprint questions                                                     | TBD          |
| Execute SQL Function                             | execute_sql_function                 | Create a stored procedure to execute arbitrary SQL                                                                | TBD          |
| Allow inserts for development/testing            | development_testing_permissions      | Grant additional permissions for development/testing environments                                                 | TBD          |
| Blueprint Questions Table                        | blueprint_questions_table_creation   | Create the blueprint_questions table                                                                              | TBD          |
| RLS Policy for Reasoning Messages                | reasoning_messages_rls               | RLS policies for the reasoning_messages table                                                                     | TBD          |
| Reasoning Sessions RLS Policy                    | reasoning_sessions_rls               | RLS policies for the reasoning_sessions table                                                                     | TBD          |
| Blueprint Comments RLS Policies                  | blueprint_comments_rls               | RLS policies for blueprint comments                                                                               | TBD          |
| Blueprint Subtasks RLS Policies                  | blueprint_subtasks_rls               | RLS policies for blueprint subtasks                                                                               | TBD          |
| Blueprint Steps RLS Policies                     | blueprint_steps_rls                  | RLS policies for blueprint steps                                                                                  | TBD          |
| Blueprints RLS Policies                          | blueprints_rls_main                  | Main RLS policies for the blueprints table                                                                        | 2025-03-13   |
| Blueprint Delete Policies                        | blueprint_delete_policies            | RLS policies for blueprint deletion operations                                                                    | 2025-03-15   |
| Enable Row-Level Security for Tables             | enable_rls_all_tables                | Enable RLS on all blueprint-related tables                                                                        | TBD          |
| Blueprint Content Migration Function             | content_migration_function           | Function to migrate blueprint content from old to new schema                                                      | TBD          |
| Create reasoning_message table                   | reasoning_message_table_creation     | Create the table for storing reasoning messages                                                                   | TBD          |
| Reasoning Sessions Table                         | reasoning_sessions_table_creation    | Create the table for reasoning sessions                                                                           | TBD          |
| Blueprint Comments Table                         | blueprint_comments_table_creation    | Create the blueprint comments table                                                                               | TBD          |
| Blueprint Subtasks Table                         | blueprint_subtasks_table_creation    | Create the blueprint subtasks table                                                                               | TBD          |
| Blueprint Steps Table                            | blueprint_steps_table_creation       | Create the blueprint steps table                                                                                  | TBD          |
| Add Missing Columns to Blueprints Table          | blueprints_table_updates             | Add new columns to existing blueprints table                                                                      | TBD          |
| Retrieve Enum Types and Values                   | enum_types_retrieval                 | Script to retrieve enum types and their values                                                                    | TBD          |
| Enum Types for Application States                | application_states_enums             | Define enum types for application states                                                                          | TBD          |
| Temporary Blueprint Questions Policy             | temporary_blueprint_questions_policy | Create RLS policy to allow operations on blueprint questions for temporary blueprints                             | 2025-03-25   |
| Blueprint Research Table                         | blueprint_research_table_creation    | Create the table for storing Perplexity API research data                                                         | TBD          |
| Blueprint Research RLS Policies                  | blueprint_research_rls_policies      | RLS policies for the blueprint_research table                                                                     | TBD          |
| Temporary Blueprint Cleanup                      | temporary_blueprint_cleanup          | Script to delete all temporary blueprints from the database                                                       | 2025-03-15   |
| Database Schema Restructure                      | database_schema_restructure          | Comprehensive update to fix naming conflicts and add B2B organization support                                     | 2025-03-28   |
| Marketing Analytics Infrastructure               | marketing_analytics_infrastructure   | Create tables and functions for marketing analytics and PostHog integration                                       | 2025-03-30   |
| Organization Structure Enhancements              | organization_structure_enhancements  | Enhanced organization typing, classification, and role-based access control                                       | 2025-04-01   |
| Workspace Model Implementation                   | workspace_model_implementation       | Migration from Organizations to Workspaces with multi-workspace support, invitations, collections and improved UI | 2025-04-05   |

## Script Contents

### blueprint_questions_schema

```sql
-- 1. Check blueprint_questions table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'blueprint_questions';

-- 2. Check RLS policies for blueprint_questions
SELECT policyname, permissive, cmd, qual
FROM pg_policies
WHERE tablename = 'blueprint_questions';

-- 3. Check temporary blueprint policy
SELECT policyname, permissive, cmd, qual
FROM pg_policies
WHERE tablename = 'blueprints' AND policyname LIKE '%temporary%';
```

### temporary_blueprints_management

```sql
-- First, add the is_temporary column to the blueprints table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'blueprints' AND column_name = 'is_temporary'
    ) THEN
        ALTER TABLE public.blueprints
        ADD COLUMN is_temporary BOOLEAN DEFAULT false;

        -- Add a comment explaining the column's purpose
        COMMENT ON COLUMN public.blueprints.is_temporary IS 'Indicates if this is a temporary blueprint created during the question/answer flow';
    END IF;
END
$$;

-- Now create the policy for temporary blueprints
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM pg_policies
        WHERE tablename = 'blueprints' AND policyname = 'allow_temporary_blueprints'
    ) THEN
        DROP POLICY allow_temporary_blueprints ON public.blueprints;
    END IF;
END
$$;

CREATE POLICY allow_temporary_blueprints ON public.blueprints
    FOR INSERT
    WITH CHECK (is_temporary = true);

-- Ensure there's a policy for authenticated users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies
        WHERE tablename = 'blueprints' AND policyname = 'allow_own_blueprints'
    ) THEN
        CREATE POLICY allow_own_blueprints ON public.blueprints
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;
```

### blueprints_rls_policies

```sql
-- First, check if the policy already exists and drop it if it does
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM pg_policies
        WHERE tablename = 'blueprints' AND policyname = 'allow_temporary_blueprints'
    ) THEN
        DROP POLICY allow_temporary_blueprints ON public.blueprints;
    END IF;
END
$$;

-- Create policy to allow insertion of temporary blueprints
CREATE POLICY allow_temporary_blueprints ON public.blueprints
    FOR INSERT
    WITH CHECK (is_temporary = true);

-- Note: This policy will allow ANY user to create temporary blueprints
-- You may want to add additional restrictions in production

-- Additionally, make sure you have a policy for authenticated users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies
        WHERE tablename = 'blueprints' AND policyname = 'allow_own_blueprints'
    ) THEN
        CREATE POLICY allow_own_blueprints ON public.blueprints
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;
```

### blueprint_questions_rls_policies

```sql
-- Add this policy to allow users to insert their own blueprint questions
CREATE POLICY blueprint_questions_insert ON public.blueprint_questions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- If you need to allow users to view and update their own questions
CREATE POLICY blueprint_questions_select ON public.blueprint_questions
  FOR SELECT USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE user_id = auth.uid()
  ));

CREATE POLICY blueprint_questions_update ON public.blueprint_questions
  FOR UPDATE USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE user_id = auth.uid()
  ));
```

### development_testing_permissions

```sql
   -- Allow inserts for development/testing
   CREATE POLICY blueprint_questions_dev_insert ON public.blueprint_questions
   FOR INSERT WITH CHECK (
     current_setting('app.environment', true) = 'development'
   );
```

### blueprint_questions_table_creation

```sql
CREATE TABLE public.blueprint_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies to match the blueprints table
ALTER TABLE public.blueprint_questions ENABLE ROW LEVEL SECURITY;

-- Owner can do anything (based on blueprint ownership)
CREATE POLICY blueprint_questions_owner_all ON public.blueprint_questions
  USING (blueprint_id IN (SELECT id FROM blueprints WHERE user_id = auth.uid()))
  WITH CHECK (blueprint_id IN (SELECT id FROM blueprints WHERE user_id = auth.uid()));

-- Anyone can view public blueprint questions
CREATE POLICY blueprint_questions_public_view ON public.blueprint_questions FOR SELECT
  USING (blueprint_id IN (
    SELECT id FROM blueprints WHERE visibility = 'public'
  ));
```

### reasoning_messages_rls

```sql
-- Reasoning Messages RLS Policies
-- Owner access through sessions and blueprints tables
CREATE POLICY reasoning_messages_owner_all ON public.reasoning_messages
  USING (session_id IN (
    SELECT id FROM public.reasoning_sessions
    WHERE blueprint_id IN (
      SELECT id FROM public.blueprints WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (session_id IN (
    SELECT id FROM public.reasoning_sessions
    WHERE blueprint_id IN (
      SELECT id FROM public.blueprints WHERE user_id = auth.uid()
    )
  ));

-- We're restricting access to just the blueprint owner since these are
-- private conversations related to blueprint creation
```

### reasoning_sessions_rls

```sql
-- Reasoning Sessions RLS Policies
-- Owner access through blueprints table
CREATE POLICY reasoning_sessions_owner_all ON public.reasoning_sessions
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE user_id = auth.uid()
  ))
  WITH CHECK (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE user_id = auth.uid()
  ));

-- We'll just restrict access to the blueprint owner for now since these are
-- tied to the reasoning process and not generally meant to be shared
```

### blueprint_comments_rls

```sql
-- Blueprint Comments RLS Policies
-- Users can see and manage their own comments, and see comments on their blueprints
CREATE POLICY blueprint_comments_owner_all ON public.blueprint_comments
  USING (user_id = auth.uid() OR blueprint_id IN (
    SELECT id FROM public.blueprints WHERE user_id = auth.uid()
  ))
  WITH CHECK (user_id = auth.uid());

-- Public view access for comments on public blueprints
CREATE POLICY blueprint_comments_public_view ON public.blueprint_comments FOR SELECT
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE visibility = 'public'
  ));

-- Team policy is omitted for now
```

### blueprint_subtasks_rls

```sql
-- Blueprint Subtasks RLS Policies
-- Owner access through steps and blueprints tables
CREATE POLICY blueprint_subtasks_owner_all ON public.blueprint_subtasks
  USING (step_id IN (
    SELECT id FROM public.blueprint_steps
    WHERE blueprint_id IN (
      SELECT id FROM public.blueprints WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (step_id IN (
    SELECT id FROM public.blueprint_steps
    WHERE blueprint_id IN (
      SELECT id FROM public.blueprints WHERE user_id = auth.uid()
    )
  ));

-- Public view access
CREATE POLICY blueprint_subtasks_public_view ON public.blueprint_subtasks FOR SELECT
  USING (step_id IN (
    SELECT id FROM public.blueprint_steps
    WHERE blueprint_id IN (
      SELECT id FROM public.blueprints WHERE visibility = 'public'
    )
  ));

-- Team policy is omitted for now
```

### blueprint_steps_rls

```sql
-- Blueprint Steps RLS Policies
-- First drop existing policies to avoid conflicts
DROP POLICY IF EXISTS blueprint_steps_owner_all ON public.blueprint_steps;
DROP POLICY IF EXISTS blueprint_steps_public_view ON public.blueprint_steps;
DROP POLICY IF EXISTS blueprint_steps_owner_delete ON public.blueprint_steps;
DROP POLICY IF EXISTS blueprint_steps_temporary_delete ON public.blueprint_steps;

-- Owner access through blueprints table
CREATE POLICY blueprint_steps_owner_all ON public.blueprint_steps
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE user_id = auth.uid()
  ))
  WITH CHECK (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE user_id = auth.uid()
  ));

-- Public view access
CREATE POLICY blueprint_steps_public_view ON public.blueprint_steps FOR SELECT
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE visibility = 'public'
  ));

-- Explicit deletion policy for blueprint steps
CREATE POLICY blueprint_steps_owner_delete ON public.blueprint_steps
  FOR DELETE
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE user_id = auth.uid()
  ));

-- Explicit deletion policy for temporary blueprint steps
CREATE POLICY blueprint_steps_temporary_delete ON public.blueprint_steps
  FOR DELETE
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE is_temporary = true
  ));

-- Team policy is omitted for now since team_members table doesn't exist
```

### blueprints_rls_main

```sql
-- Blueprints RLS Policies (without team reference)
-- First drop existing policies to avoid conflicts
DROP POLICY IF EXISTS blueprint_owner_all ON public.blueprints;
DROP POLICY IF EXISTS blueprint_public_view ON public.blueprints;
DROP POLICY IF EXISTS blueprint_temporary_view ON public.blueprints;

-- Owner can do everything
CREATE POLICY blueprint_owner_all ON public.blueprints
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Anyone can view public blueprints
CREATE POLICY blueprint_public_view ON public.blueprints FOR SELECT
  USING (visibility = 'public');

-- Allow anyone to access temporary blueprints
CREATE POLICY blueprint_temporary_view ON public.blueprints FOR SELECT
  USING (is_temporary = true);

-- Placeholder for team policy - commented out until team_members table exists
-- CREATE POLICY blueprint_team_view ON public.blueprints FOR SELECT
--   USING (visibility = 'team' AND team_id IN (
--     SELECT team_id FROM team_members WHERE user_id = auth.uid()
--   ));
```

### enable_rls_all_tables

```sql
-- Enable Row-Level Security (RLS)
ALTER TABLE public.blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reasoning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reasoning_messages ENABLE ROW LEVEL SECURITY;
```

### content_migration_function

```sql
-- Migration Function for Existing Blueprint Content
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

### reasoning_message_table_creation

```sql
-- Create Reasoning Messages Table
CREATE TABLE IF NOT EXISTS public.reasoning_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.reasoning_sessions(id) ON DELETE CASCADE,
  role message_role_type NOT NULL,
  content text NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT reasoning_messages_pkey PRIMARY KEY (id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_reasoning_messages_session_id ON public.reasoning_messages (session_id);
```

### reasoning_sessions_table_creation

```sql
-- Create Reasoning Sessions Table
CREATE TABLE IF NOT EXISTS public.reasoning_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blueprint_id uuid NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  status session_status_type DEFAULT 'active',
  context jsonb,
  skill_level skill_level_type,
  learning_objective text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT reasoning_sessions_pkey PRIMARY KEY (id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_reasoning_sessions_blueprint_id ON public.reasoning_sessions (blueprint_id);
```

### blueprint_comments_table_creation

```sql
-- Create Blueprint Comments Table
CREATE TABLE IF NOT EXISTS public.blueprint_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blueprint_id uuid NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  step_id uuid REFERENCES public.blueprint_steps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT blueprint_comments_pkey PRIMARY KEY (id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_blueprint_comments_blueprint_id ON public.blueprint_comments (blueprint_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_comments_step_id ON public.blueprint_comments (step_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_comments_user_id ON public.blueprint_comments (user_id);
```

### blueprint_subtasks_table_creation

```sql
-- Create Blueprint Subtasks Table
CREATE TABLE IF NOT EXISTS public.blueprint_subtasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  step_id uuid NOT NULL REFERENCES public.blueprint_steps(id) ON DELETE CASCADE,
  task_number integer NOT NULL,
  description text NOT NULL,
  status step_status_type DEFAULT 'not_started',
  estimated_time text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT blueprint_subtasks_pkey PRIMARY KEY (id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_blueprint_subtasks_step_id ON public.blueprint_subtasks (step_id);
```

### blueprint_steps_table_creation

```sql
-- Create Blueprint Steps Table
CREATE TABLE IF NOT EXISTS public.blueprint_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blueprint_id uuid NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  number integer NOT NULL,
  title text NOT NULL,
  estimated_time text,
  instructions jsonb,
  tools jsonb,
  status step_status_type DEFAULT 'not_started',
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT blueprint_steps_pkey PRIMARY KEY (id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_blueprint_steps_blueprint_id ON public.blueprint_steps (blueprint_id);
```

### blueprints_table_updates

```sql
-- Add missing columns to blueprints table
ALTER TABLE public.blueprints
  ADD COLUMN IF NOT EXISTS search_query text,
  ADD COLUMN IF NOT EXISTS visibility visibility_type DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS team_id uuid,
  ADD COLUMN IF NOT EXISTS skill_level skill_level_type,
  ADD COLUMN IF NOT EXISTS learning_objective text,
  ADD COLUMN IF NOT EXISTS complexity complexity_type,
  ADD COLUMN IF NOT EXISTS estimated_time text;
```

### enum_types_retrieval

```sql
SELECT
    typname AS enum_name,
    enumlabel AS enum_value
FROM pg_type
JOIN pg_enum ON pg_enum.enumtypid = pg_type.oid
JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
WHERE pg_namespace.nspname = 'public'
ORDER BY enum_name, enumsortorder;
```

### application_states_enums

```sql
-- Create Enum Types Safely
DO $$
BEGIN
    -- Create visibility_type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type JOIN pg_namespace ON pg_type.typnamespace = pg_namespace.oid
                   WHERE typname = 'visibility_type' AND nspname = 'public') THEN
        CREATE TYPE public.visibility_type AS ENUM ('private', 'public', 'team');
    END IF;

    -- Create skill_level_type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type JOIN pg_namespace ON pg_type.typnamespace = pg_namespace.oid
                   WHERE typname = 'skill_level_type' AND nspname = 'public') THEN
        CREATE TYPE public.skill_level_type AS ENUM ('beginner', 'intermediate', 'advanced');
    END IF;

    -- Create complexity_type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type JOIN pg_namespace ON pg_type.typnamespace = pg_namespace.oid
                   WHERE typname = 'complexity_type' AND nspname = 'public') THEN
        CREATE TYPE public.complexity_type AS ENUM ('low', 'medium', 'high');
    END IF;

    -- Create step_status_type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type JOIN pg_namespace ON pg_type.typnamespace = pg_namespace.oid
                   WHERE typname = 'step_status_type' AND nspname = 'public') THEN
        CREATE TYPE public.step_status_type AS ENUM ('not_started', 'in_progress', 'completed');
    END IF;

    -- Create session_status_type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type JOIN pg_namespace ON pg_type.typnamespace = pg_namespace.oid
                   WHERE typname = 'session_status_type' AND nspname = 'public') THEN
        CREATE TYPE public.session_status_type AS ENUM ('active', 'completed', 'failed');
    END IF;

    -- Create message_role_type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type JOIN pg_namespace ON pg_type.typnamespace = pg_namespace.oid
                   WHERE typname = 'message_role_type' AND nspname = 'public') THEN
        CREATE TYPE public.message_role_type AS ENUM ('system', 'user', 'assistant');
    END IF;
END
$$;
```

### blueprint_questions_store_function

```sql
-- Create a function to safely store blueprint questions
CREATE OR REPLACE FUNCTION public.store_blueprint_questions(
  p_blueprint_id UUID,
  p_questions JSONB
) RETURNS void AS $$
BEGIN
  -- Check if the record exists
  IF EXISTS (
    SELECT 1 FROM public.blueprint_questions
    WHERE blueprint_id = p_blueprint_id
  ) THEN
    -- Update existing record
    UPDATE public.blueprint_questions
    SET
      questions = p_questions,
      updated_at = NOW()
    WHERE blueprint_id = p_blueprint_id;
  ELSE
    -- Insert new record
    INSERT INTO public.blueprint_questions (
      blueprint_id,
      questions,
      responses,
      created_at,
      updated_at
    )
    VALUES (
      p_blueprint_id,
      p_questions,
      '{}'::jsonb,
      NOW(),
      NOW()
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### execute_sql_function

```sql
-- Create a function to execute arbitrary SQL (with proper security checks)
-- WARNING: This is a powerful function and should only be used by service roles
CREATE OR REPLACE FUNCTION public.execute_sql(sql_query text)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Execute the SQL query and capture the results as JSON
  EXECUTE 'SELECT json_agg(t) FROM (' || sql_query || ') t' INTO result;
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error information
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'detail', SQLSTATE,
      'query', sql_query
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure the function - only allow it to be executed by service roles
REVOKE ALL ON FUNCTION public.execute_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO service_role;
```

### temporary_blueprint_questions_policy

```sql
-- First, check if the policy already exists and drop it if it does
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM pg_policies
        WHERE tablename = 'blueprint_questions' AND policyname = 'allow_temporary_blueprint_questions'
    ) THEN
        DROP POLICY allow_temporary_blueprint_questions ON public.blueprint_questions;
    END IF;
END
$$;

-- Create policy to allow operations on questions for temporary blueprints
CREATE POLICY allow_temporary_blueprint_questions ON public.blueprint_questions
    USING (blueprint_id IN (SELECT id FROM public.blueprints WHERE is_temporary = true))
    WITH CHECK (blueprint_id IN (SELECT id FROM public.blueprints WHERE is_temporary = true));

-- Add a comment explaining the policy
COMMENT ON POLICY allow_temporary_blueprint_questions ON public.blueprint_questions IS
    'Allows operations on blueprint questions for temporary blueprints without requiring authentication';
```

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

### blueprint_delete_policies

```sql
-- Create a policy to allow deletion of temporary blueprints
CREATE POLICY blueprint_temporary_delete ON public.blueprints
  FOR DELETE
  USING (is_temporary = true);

-- Create explicit delete policy for owners
CREATE POLICY blueprint_owner_delete ON public.blueprints
  FOR DELETE
  USING (user_id = auth.uid());
```

### temporary_blueprint_cleanup

```sql
-- Blueprint Temporary Records Cleanup
-- This script deletes all blueprints flagged as is_temporary=true
-- Use with caution as this will permanently remove data

-- First, count and identify the temporary blueprints (for logging)
WITH temp_blueprint_info AS (
  SELECT
    COUNT(*) as total_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record,
    array_agg(id) as blueprint_ids
  FROM public.blueprints
  WHERE is_temporary = true
)
SELECT
  'Found ' || total_count || ' temporary blueprints to clean up. ' ||
  'Date range: ' || oldest_record || ' to ' || newest_record || '.' as cleanup_info,
  blueprint_ids
FROM temp_blueprint_info;

-- Start a transaction block
BEGIN;

-- Delete related records from blueprint_questions first (if this table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'blueprint_questions'
  ) THEN
    DELETE FROM public.blueprint_questions
    WHERE blueprint_id IN (
      SELECT id FROM public.blueprints WHERE is_temporary = true
    );

    RAISE NOTICE 'Deleted related blueprint_questions records';
  END IF;
END
$$;

-- Now delete the temporary blueprints
-- The deletion of related records in other tables should be handled by CASCADE constraints
DELETE FROM public.blueprints
WHERE is_temporary = true
RETURNING id, title, created_at;

-- Verify that all temporary blueprints have been deleted
SELECT COUNT(*) as remaining_temporary_blueprints
FROM public.blueprints
WHERE is_temporary = true;

-- Uncomment the next line to finalize the deletion:
-- COMMIT;

-- Or uncomment the next line to undo all changes:
-- ROLLBACK;
```

### database_schema_restructure

```sql
-- Database Schema Restructure Script
-- This script implements the changes outlined in database_schema_restructure.md
-- IMPORTANT: Review each section carefully before execution

-- =============================================
-- STEP 1: Create new tables for B2B support
-- =============================================

-- Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text,
  logo_url text,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add comments for clarity
COMMENT ON TABLE public.organizations IS 'Organizations for B2B clients';
COMMENT ON COLUMN public.organizations.domain IS 'Primary email domain for auto-assignment';
COMMENT ON COLUMN public.organizations.settings IS 'Organization-specific settings and preferences';

-- Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add comments for clarity
COMMENT ON TABLE public.teams IS 'Teams within organizations';
COMMENT ON COLUMN public.teams.settings IS 'Team-specific settings and preferences';

-- Team Members Table
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Add indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);

-- Add comments
COMMENT ON TABLE public.team_members IS 'Associates users with teams they belong to';
COMMENT ON COLUMN public.team_members.role IS 'User''s role within the team (member, admin, etc.)';

-- =============================================
-- STEP 2: Create mapping view
-- =============================================

-- Create a view to document the mapping between user skill levels and blueprint complexity
CREATE OR REPLACE VIEW public.skill_complexity_mapping AS
SELECT
    'beginner' AS user_skill_level,
    'low' AS blueprint_complexity,
    'Beginner users typically work with low complexity blueprints' AS description
UNION ALL
SELECT
    'intermediate' AS user_skill_level,
    'medium' AS blueprint_complexity,
    'Intermediate users typically work with medium complexity blueprints' AS description
UNION ALL
SELECT
    'advanced' AS user_skill_level,
    'high' AS blueprint_complexity,
    'Advanced users typically work with high complexity blueprints' AS description;

-- Add comment to the view
COMMENT ON VIEW public.skill_complexity_mapping IS 'Documents the mapping between user skill levels and blueprint complexity';

-- =============================================
-- STEP 3: Update User table structure
-- =============================================

-- First check if columns exist to avoid errors
DO $$
BEGIN
    -- If skill_level exists, rename it
    IF EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'skill_level'
    ) THEN
        ALTER TABLE public.users RENAME COLUMN skill_level TO user_skill_level;
    END IF;

    -- If learning_objectives exists, rename it
    IF EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'learning_objectives'
    ) THEN
        ALTER TABLE public.users RENAME COLUMN learning_objectives TO user_learning_goals;
    END IF;
END
$$;

-- Add organization and team relationships if they don't exist
DO $$
BEGIN
    -- Add organization_id if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.users ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
    END IF;

    -- Add primary_team_id if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'primary_team_id'
    ) THEN
        ALTER TABLE public.users ADD COLUMN primary_team_id uuid REFERENCES public.teams(id);
    END IF;
END
$$;

-- Update field comments
COMMENT ON COLUMN public.users.user_skill_level IS 'Self-assessed skill level of the user (beginner, intermediate, advanced)';
COMMENT ON COLUMN public.users.experience IS 'General experience level in the field (years or category)';
COMMENT ON COLUMN public.users.user_learning_goals IS 'User''s learning objectives and goals';
COMMENT ON COLUMN public.users.preferred_learning_style IS 'User''s preferred learning approach (visual, hands-on, etc.)';
COMMENT ON COLUMN public.users.organization_id IS 'Organization the user belongs to (for B2B)';
COMMENT ON COLUMN public.users.primary_team_id IS 'Primary team the user belongs to';

-- =============================================
-- STEP 4: Update Blueprint table structure
-- =============================================

-- First check if columns exist to avoid errors
DO $$
BEGIN
    -- If learning_objective exists, rename it
    IF EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'blueprints' AND column_name = 'learning_objective'
    ) THEN
        ALTER TABLE public.blueprints RENAME COLUMN learning_objective TO blueprint_learning_focus;
    END IF;
END
$$;

-- Add comments
COMMENT ON COLUMN public.blueprints.skill_level IS 'Recommended user skill level for this blueprint (beginner, intermediate, advanced)';
COMMENT ON COLUMN public.blueprints.complexity IS 'Objective complexity rating of the blueprint tasks (low, medium, high)';
COMMENT ON COLUMN public.blueprints.blueprint_learning_focus IS 'Specific learning focus or objective of this blueprint';
COMMENT ON COLUMN public.blueprints.team_id IS 'Team that owns this blueprint';

-- =============================================
-- STEP 6: Row-Level Security Updates
-- =============================================

-- Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Organization policies (admins can manage)
CREATE POLICY org_admin_all ON public.organizations
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

-- Users can view their own organization
CREATE POLICY org_user_view ON public.organizations FOR SELECT
  USING (id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  ));

-- Team policies
CREATE POLICY team_member_view ON public.teams FOR SELECT
  USING (id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

-- Organization admins can manage teams
CREATE POLICY team_org_admin_all ON public.teams
  USING (organization_id IN (
    SELECT organization_id FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Update blueprint policies to include team access
CREATE POLICY blueprint_team_access ON public.blueprints FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));
```

### marketing_analytics_infrastructure

```sql
-- Marketing Analytics Infrastructure
-- This script creates tables and functions for marketing analytics and PostHog integration

-- User Analytics Table
CREATE TABLE IF NOT EXISTS public.user_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_login_at timestamp with time zone,
  login_count integer DEFAULT 0,
  feature_usage jsonb DEFAULT '{}'::jsonb,
  referral_source text,
  acquisition_channel text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  first_session_date timestamp with time zone,
  onboarding_completed_at timestamp with time zone,
  nps_score integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add comments for clarity
COMMENT ON TABLE public.user_analytics IS 'Tracks individual user engagement metrics and attribution data';
COMMENT ON COLUMN public.user_analytics.feature_usage IS 'JSON object tracking usage counts of various features';
COMMENT ON COLUMN public.user_analytics.acquisition_channel IS 'Channel through which the user was acquired (organic, paid, referral, etc.)';
COMMENT ON COLUMN public.user_analytics.nps_score IS 'Latest Net Promoter Score submitted by the user';

-- Organization Analytics Table
CREATE TABLE IF NOT EXISTS public.organization_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  total_users integer DEFAULT 0,
  active_users_7d integer DEFAULT 0,
  active_users_30d integer DEFAULT 0,
  blueprint_count integer DEFAULT 0,
  last_activity_at timestamp with time zone,
  subscription_tier text,
  subscription_status text,
  billing_cycle text,
  mrr numeric(10,2) DEFAULT 0,
  feature_usage jsonb DEFAULT '{}'::jsonb,
  health_score integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add comments for clarity
COMMENT ON TABLE public.organization_analytics IS 'Aggregates organization-level metrics for B2B accounts';
COMMENT ON COLUMN public.organization_analytics.health_score IS 'Calculated score (0-100) representing overall account health';
COMMENT ON COLUMN public.organization_analytics.mrr IS 'Monthly Recurring Revenue for this organization';

-- Marketing Touchpoints Table
CREATE TABLE IF NOT EXISTS public.marketing_touchpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  touchpoint_type text NOT NULL, -- email_opened, webinar_attended, demo_requested, etc.
  touchpoint_details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Add comments for clarity
COMMENT ON TABLE public.marketing_touchpoints IS 'Records all marketing interactions with users and organizations';
COMMENT ON COLUMN public.marketing_touchpoints.touchpoint_type IS 'Type of marketing interaction (email_opened, webinar_attended, etc.)';
COMMENT ON COLUMN public.marketing_touchpoints.touchpoint_details IS 'JSON object with additional details about the touchpoint';

-- Feature Engagement Tracking
CREATE TABLE IF NOT EXISTS public.feature_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature_name text NOT NULL,
  usage_count integer DEFAULT 1,
  first_used_at timestamp with time zone DEFAULT now(),
  last_used_at timestamp with time zone DEFAULT now()
);

-- Add comments for clarity
COMMENT ON TABLE public.feature_usage_logs IS 'Detailed tracking of feature usage for product analytics';
COMMENT ON COLUMN public.feature_usage_logs.feature_name IS 'Name of the feature being used';
COMMENT ON COLUMN public.feature_usage_logs.usage_count IS 'Number of times this feature has been used';

-- Upsell Opportunity Tracking
CREATE TABLE IF NOT EXISTS public.upsell_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  opportunity_type text NOT NULL, -- feature_limit_reached, high_usage, etc.
  trigger_details jsonb,
  status text DEFAULT 'identified', -- identified, presented, converted, dismissed
  presented_at timestamp with time zone,
  converted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add comments for clarity
COMMENT ON TABLE public.upsell_opportunities IS 'Identifies and tracks potential upgrade opportunities';
COMMENT ON COLUMN public.upsell_opportunities.opportunity_type IS 'Type of upsell opportunity (feature_limit_reached, high_usage, etc.)';
COMMENT ON COLUMN public.upsell_opportunities.status IS 'Current status of the opportunity (identified, presented, converted, dismissed)';

-- User Feedback Table
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  feedback_type text NOT NULL, -- nps, feature_request, bug_report, etc.
  score integer, -- For numeric ratings
  content text, -- Text feedback
  context jsonb, -- Information about where feedback was given
  created_at timestamp with time zone DEFAULT now()
);

-- Add comments for clarity
COMMENT ON TABLE public.user_feedback IS 'Structured collection of user feedback';
COMMENT ON COLUMN public.user_feedback.feedback_type IS 'Type of feedback (nps, feature_request, bug_report, etc.)';
COMMENT ON COLUMN public.user_feedback.context IS 'JSON object with information about where/when feedback was given';

-- PostHog Integration Table
CREATE TABLE IF NOT EXISTS public.analytics_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  posthog_distinct_id text,
  segment_anonymous_id text,
  ga_client_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Add comments for clarity
COMMENT ON TABLE public.analytics_identifiers IS 'Maps internal user IDs to external analytics platform identifiers';
COMMENT ON COLUMN public.analytics_identifiers.posthog_distinct_id IS 'PostHog distinct_id for this user';
COMMENT ON COLUMN public.analytics_identifiers.ga_client_id IS 'Google Analytics client ID for this user';

-- Add marketing fields to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_stage text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone;

-- Add marketing fields to organizations table
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS lifecycle_stage text DEFAULT 'onboarding',
  ADD COLUMN IF NOT EXISTS customer_success_manager text,
  ADD COLUMN IF NOT EXISTS next_renewal_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS usage_alerts jsonb DEFAULT '{}'::jsonb;

-- Add indices for faster queries
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON public.user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_org_analytics_org_id ON public.organization_analytics(organization_id);
CREATE INDEX IF NOT EXISTS idx_marketing_touchpoints_user_id ON public.marketing_touchpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_touchpoints_org_id ON public.marketing_touchpoints(organization_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_logs_user_id ON public.feature_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_logs_feature_name ON public.feature_usage_logs(feature_name);
CREATE INDEX IF NOT EXISTS idx_upsell_opportunities_status ON public.upsell_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON public.user_feedback(feedback_type);

-- Login counter update function
CREATE OR REPLACE FUNCTION update_login_count()
RETURNS trigger AS $$
BEGIN
  -- First check if the user has an analytics record
  IF NOT EXISTS (SELECT 1 FROM public.user_analytics WHERE user_id = NEW.id) THEN
    -- Create one if it doesn't exist
    INSERT INTO public.user_analytics (user_id, login_count, last_login_at)
    VALUES (NEW.id, 1, NOW());
  ELSE
    -- Update existing record
    UPDATE public.user_analytics
    SET
      login_count = login_count + 1,
      last_login_at = NOW()
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Organization metrics update function
CREATE OR REPLACE FUNCTION update_org_analytics()
RETURNS void AS $$
BEGIN
  -- For each organization
  FOR org_id IN (SELECT id FROM public.organizations) LOOP
    -- Check if org has an analytics record
    IF NOT EXISTS (SELECT 1 FROM public.organization_analytics WHERE organization_id = org_id) THEN
      -- Create one if it doesn't exist
      INSERT INTO public.organization_analytics (organization_id)
      VALUES (org_id);
    END IF;

    -- Update the metrics
    UPDATE public.organization_analytics oa
    SET
      total_users = (
        SELECT COUNT(DISTINCT user_id)
        FROM public.users
        WHERE organization_id = org_id
      ),
      active_users_7d = (
        SELECT COUNT(DISTINCT user_id)
        FROM public.user_analytics ua
        JOIN public.users u ON ua.user_id = u.id
        WHERE u.organization_id = org_id
        AND ua.last_login_at > NOW() - INTERVAL '7 days'
      ),
      active_users_30d = (
        SELECT COUNT(DISTINCT user_id)
        FROM public.user_analytics ua
        JOIN public.users u ON ua.user_id = u.id
        WHERE u.organization_id = org_id
        AND ua.last_login_at > NOW() - INTERVAL '30 days'
      ),
      blueprint_count = (
        SELECT COUNT(*)
        FROM public.blueprints
        WHERE team_id IN (
          SELECT id FROM public.teams WHERE organization_id = org_id
        )
      ),
      last_activity_at = (
        SELECT MAX(last_login_at)
        FROM public.user_analytics ua
        JOIN public.users u ON ua.user_id = u.id
        WHERE u.organization_id = org_id
      ),
      updated_at = NOW()
    WHERE organization_id = org_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on analytics tables
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upsell_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_identifiers ENABLE ROW LEVEL SECURITY;

-- Basic policies for user analytics data access
CREATE POLICY user_analytics_own ON public.user_analytics FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'analytics')
  ));

-- Org admin policies for organizational analytics
CREATE POLICY org_analytics_admin ON public.organization_analytics FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND (role = 'admin' OR organization_id = organization_id)
  ));

-- Policies for other analytics tables
CREATE POLICY marketing_touchpoints_access ON public.marketing_touchpoints FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'analytics', 'marketing')
  ));

CREATE POLICY feature_logs_access ON public.feature_usage_logs FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'analytics', 'product')
  ));
```

### organization_structure_enhancements

```sql
-- Organization Structure Enhancements
-- This script enhances the organization structure with classification, roles, and B2B fields

-- Add owner/primary contact fields to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS primary_contact_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS account_owner_id uuid REFERENCES auth.users(id);

-- Create organization type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_type') THEN
    CREATE TYPE org_type AS ENUM (
      'academic',
      'enterprise',
      'government',
      'non_profit',
      'smb',
      'startup',
      'individual'
    );
  END IF;
END$$;

-- Create organization size category enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_size_category') THEN
    CREATE TYPE org_size_category AS ENUM (
      'individual',
      'small_team', -- 2-10 employees
      'smb',        -- 11-200 employees
      'mid_market', -- 201-1000 employees
      'enterprise'  -- 1000+ employees
    );
  END IF;
END$$;

-- Add organization classification fields
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS org_type org_type DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS size_category org_size_category DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS employee_count integer;

-- Add additional metadata
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS billing_email text,
  ADD COLUMN IF NOT EXISTS billing_address jsonb,
  ADD COLUMN IF NOT EXISTS subscription_plan text,
  ADD COLUMN IF NOT EXISTS max_users integer,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create organization roles table for fine-grained permissions
CREATE TABLE IF NOT EXISTS public.organization_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member', -- org_admin, billing_admin, member, etc.
  permissions jsonb DEFAULT '{}'::jsonb, -- For custom permission sets
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(organization_id, user_id, role)
);

-- Add index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_org_roles_user_org ON public.organization_roles(user_id, organization_id);

-- Apply RLS
ALTER TABLE public.organization_roles ENABLE ROW LEVEL SECURITY;

-- Add policy for viewing roles
CREATE POLICY org_roles_view ON public.organization_roles FOR SELECT
  USING (
    -- Users can see their own roles
    user_id = auth.uid()
    OR
    -- Org admins can see all roles in their org
    EXISTS (
      SELECT 1 FROM public.organization_roles
      WHERE user_id = auth.uid()
      AND organization_id = organization_roles.organization_id
      AND role = 'org_admin'
    )
  );

-- Add policies for managing roles
CREATE POLICY org_roles_manage ON public.organization_roles
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_roles
      WHERE user_id = auth.uid()
      AND organization_id = organization_roles.organization_id
      AND role = 'org_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_roles
      WHERE user_id = auth.uid()
      AND organization_id = organization_roles.organization_id
      AND role = 'org_admin'
    )
  );

-- Add comments for clarity
COMMENT ON TABLE public.organization_roles IS 'Stores user roles at the organization level for fine-grained permissions';
COMMENT ON COLUMN public.organization_roles.role IS 'Role name (org_admin, billing_admin, member, etc.)';
COMMENT ON COLUMN public.organization_roles.permissions IS 'JSON object containing custom permission settings';

COMMENT ON COLUMN public.organizations.org_type IS 'Type of organization (academic, enterprise, government, non_profit, smb, startup, individual)';
COMMENT ON COLUMN public.organizations.size_category IS 'Size category of the organization (individual, small_team, smb, mid_market, enterprise)';
COMMENT ON COLUMN public.organizations.industry IS 'Industry or sector the organization operates in';
COMMENT ON COLUMN public.organizations.primary_contact_id IS 'Primary technical contact user for the organization';
COMMENT ON COLUMN public.organizations.account_owner_id IS 'Account owner/manager user for the organization';
```

### workspace_model_implementation

```sql
-- Workspace Model Implementation
-- This script implements the changes outlined in workspace_model_implementation.md
-- IMPORTANT: Review each section carefully before execution

-- =============================================
-- STEP 1: Create new tables for Workspace support
-- =============================================

-- Workspaces Table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add comments for clarity
COMMENT ON TABLE public.workspaces IS 'Workspaces for multi-workspace support';
COMMENT ON COLUMN public.workspaces.name IS 'Name of the workspace';
COMMENT ON COLUMN public.workspaces.description IS 'Description of the workspace';

-- Workspace Members Table
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Add indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);

-- Add comments
COMMENT ON TABLE public.workspace_members IS 'Associates users with workspaces they belong to';
COMMENT ON COLUMN public.workspace_members.role IS 'User''s role within the workspace (member, admin, etc.)';

-- =============================================
-- STEP 2: Create mapping view
-- =============================================

-- Create a view to document the mapping between user skill levels and workspace complexity
CREATE OR REPLACE VIEW public.skill_complexity_mapping AS
SELECT
    'beginner' AS user_skill_level,
    'low' AS workspace_complexity,
    'Beginner users typically work with low complexity workspaces' AS description
UNION ALL
SELECT
    'intermediate' AS user_skill_level,
    'medium' AS workspace_complexity,
    'Intermediate users typically work with medium complexity workspaces' AS description
UNION ALL
SELECT
    'advanced' AS user_skill_level,
    'high' AS workspace_complexity,
    'Advanced users typically work with high complexity workspaces' AS description;

-- Add comment to the view
COMMENT ON VIEW public.skill_complexity_mapping IS 'Documents the mapping between user skill levels and workspace complexity';

-- =============================================
-- STEP 3: Update User table structure
-- =============================================

-- First check if columns exist to avoid errors
DO $$
BEGIN
    -- If skill_level exists, rename it
    IF EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'skill_level'
    ) THEN
        ALTER TABLE public.users RENAME COLUMN skill_level TO user_skill_level;
    END IF;

    -- If learning_objectives exists, rename it
    IF EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'learning_objectives'
    ) THEN
        ALTER TABLE public.users RENAME COLUMN learning_objectives TO user_learning_goals;
    END IF;
END
$$;

-- Add organization and workspace relationships if they don't exist
DO $$
BEGIN
    -- Add organization_id if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.users ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
    END IF;

    -- Add primary_workspace_id if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'primary_workspace_id'
    ) THEN
        ALTER TABLE public.users ADD COLUMN primary_workspace_id uuid REFERENCES public.workspaces(id);
    END IF;
END
$$;

-- Update field comments
COMMENT ON COLUMN public.users.user_skill_level IS 'Self-assessed skill level of the user (beginner, intermediate, advanced)';
COMMENT ON COLUMN public.users.experience IS 'General experience level in the field (years or category)';
COMMENT ON COLUMN public.users.user_learning_goals IS 'User''s learning objectives and goals';
COMMENT ON COLUMN public.users.preferred_learning_style IS 'User''s preferred learning approach (visual, hands-on, etc.)';
COMMENT ON COLUMN public.users.organization_id IS 'Organization the user belongs to (for B2B)';
COMMENT ON COLUMN public.users.primary_workspace_id IS 'Primary workspace the user belongs to';

-- =============================================
-- STEP 4: Update Blueprint table structure
-- =============================================

-- First check if columns exist to avoid errors
DO $$
BEGIN
    -- If learning_objective exists, rename it
    IF EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'blueprints' AND column_name = 'learning_objective'
    ) THEN
        ALTER TABLE public.blueprints RENAME COLUMN learning_objective TO blueprint_learning_focus;
    END IF;
END
$$;

-- Add comments
COMMENT ON COLUMN public.blueprints.skill_level IS 'Recommended user skill level for this blueprint (beginner, intermediate, advanced)';
COMMENT ON COLUMN public.blueprints.complexity IS 'Objective complexity rating of the blueprint tasks (low, medium, high)';
COMMENT ON COLUMN public.blueprints.blueprint_learning_focus IS 'Specific learning focus or objective of this blueprint';
COMMENT ON COLUMN public.blueprints.team_id IS 'Team that owns this blueprint';

-- =============================================
-- STEP 6: Row-Level Security Updates
-- =============================================

-- Enable RLS on new tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Organization policies (admins can manage)
CREATE POLICY org_admin_all ON public.organizations
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

-- Users can view their own organization
CREATE POLICY org_user_view ON public.organizations FOR SELECT
  USING (id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  ));

-- Workspace policies
CREATE POLICY workspace_member_view ON public.workspaces FOR SELECT
  USING (id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Organization admins can manage workspaces
CREATE POLICY workspace_org_admin_all ON public.workspaces
  USING (organization_id IN (
    SELECT organization_id FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Update blueprint policies to include workspace access
CREATE POLICY blueprint_workspace_access ON public.blueprints FOR SELECT
  USING (team_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));
```

## Maintenance Guidelines

1. **Adding New Scripts**:

   - Add the script name, suggested name, purpose, and date to the overview table
   - Create a new section with the script content
   - Document any dependencies or relationships with other scripts

2. **Updating Existing Scripts**:

   - Update the "Last Updated" field in the overview table
   - Add the new script content, keeping the old version with a comment noting it was replaced
   - Document the reason for the update

3. **Script Naming Convention**:
   - Use snake_case for suggested script names
   - Be descriptive but concise
   - Include the object type (table, policy, function, etc.) in the name

## Debugging Tools

### Blueprint Access Tester

We've created a special debugging tool at `/debug/blueprint-tester` that helps identify and troubleshoot database access and RLS policy issues. This tool allows you to:

1. **Test Standard API**: Test normal API endpoint access to blueprints.
2. **Test Direct API**: Bypass normal auth to check if a blueprint exists at all.
3. **Test Debug Info**: Get detailed diagnostics about permissions and database state.
4. **Test DB Access**: Check database connectivity and table access permissions.
5. **Test RLS Policies**: Analyze which Row Level Security policies are affecting access.

This tool was crucial in identifying an issue where temporary blueprints were inaccessible due to missing RLS policies. It helped diagnose that while a blueprint existed in the database (visible via service role), it wasn't accessible to authenticated users due to RLS restrictions.

#### Implementation Note

The blueprint-tester provides valuable information that can help maintain proper RLS policies. When adding new tables or modifying access patterns, consider running tests to ensure permissions work as expected, especially for:

- Temporary resources that should be accessible across users
- Public vs. private visibility settings
- Complex ownership chains (e.g., steps → blueprint → user)
