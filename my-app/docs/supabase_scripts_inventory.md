# Supabase SQL Scripts Inventory

This document catalogs all SQL scripts that have been manually executed in the Supabase SQL Editor for the AI-LMS project. This inventory should be updated whenever new scripts are added or existing scripts are modified.

## Scripts Overview

| Current Script Name                              | Suggested Name                     | Purpose                                                             | Last Updated |
| ------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------- | ------------ |
| Blueprint Questions Table Structure and Policies | blueprint_questions_schema         | Define the blueprint_questions table structure and its RLS policies | TBD          |
| Manage Temporary Blueprints                      | temporary_blueprints_management    | Scripts for handling temporary blueprints creation and cleanup      | TBD          |
| Blueprints Policy Management                     | blueprints_rls_policies            | Define and maintain RLS policies for the blueprints table           | TBD          |
| Untitled query                                   | blueprint_questions_rls_policies   | Create RLS policies for the blueprint_questions table               | TBD          |
| Blueprint Questions Store Function               | blueprint_questions_store_function | Create a stored procedure to safely store blueprint questions       | TBD          |
| Execute SQL Function                             | execute_sql_function               | Create a stored procedure to execute arbitrary SQL                  | TBD          |
| Allow inserts for development/testing            | development_testing_permissions    | Grant additional permissions for development/testing environments   | TBD          |
| Blueprint Questions Table                        | blueprint_questions_table_creation | Create the blueprint_questions table                                | TBD          |
| RLS Policy for Reasoning Messages                | reasoning_messages_rls             | RLS policies for the reasoning_messages table                       | TBD          |
| Reasoning Sessions RLS Policy                    | reasoning_sessions_rls             | RLS policies for the reasoning_sessions table                       | TBD          |
| Blueprint Comments RLS Policies                  | blueprint_comments_rls             | RLS policies for blueprint comments                                 | TBD          |
| Blueprint Subtasks RLS Policies                  | blueprint_subtasks_rls             | RLS policies for blueprint subtasks                                 | TBD          |
| Blueprint Steps RLS Policies                     | blueprint_steps_rls                | RLS policies for blueprint steps                                    | TBD          |
| Blueprints RLS Policies                          | blueprints_rls_main                | Main RLS policies for the blueprints table                          | TBD          |
| Enable Row-Level Security for Tables             | enable_rls_all_tables              | Enable RLS on all blueprint-related tables                          | TBD          |
| Blueprint Content Migration Function             | content_migration_function         | Function to migrate blueprint content from old to new schema        | TBD          |
| Create reasoning_message table                   | reasoning_message_table_creation   | Create the table for storing reasoning messages                     | TBD          |
| Reasoning Sessions Table                         | reasoning_sessions_table_creation  | Create the table for reasoning sessions                             | TBD          |
| Blueprint Comments Table                         | blueprint_comments_table_creation  | Create the blueprint comments table                                 | TBD          |
| Blueprint Subtasks Table                         | blueprint_subtasks_table_creation  | Create the blueprint subtasks table                                 | TBD          |
| Blueprint Steps Table                            | blueprint_steps_table_creation     | Create the blueprint steps table                                    | TBD          |
| Add Missing Columns to Blueprints Table          | blueprints_table_updates           | Add new columns to existing blueprints table                        | TBD          |
| Retrieve Enum Types and Values                   | enum_types_retrieval               | Script to retrieve enum types and their values                      | TBD          |
| Enum Types for Application States                | application_states_enums           | Define enum types for application states                            | TBD          |

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

-- Team policy is omitted for now since team_members table doesn't exist
```

### blueprints_rls_main

```sql
-- Blueprints RLS Policies (without team reference)
-- Owner can do everything
CREATE POLICY blueprint_owner_all ON public.blueprints
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Anyone can view public blueprints
CREATE POLICY blueprint_public_view ON public.blueprints FOR SELECT
  USING (visibility = 'public');

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
