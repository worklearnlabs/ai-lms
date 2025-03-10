-- Blueprint System - Supabase Migration
-- ==========================================
-- This migration implements the enhanced Blueprint system as described
-- in the blueprint_creation_flow.md documentation.

-- 1. Create Enum Types
-- ==========================================
CREATE TYPE public.visibility_type AS ENUM ('private', 'public', 'team');
CREATE TYPE public.skill_level_type AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE public.complexity_type AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.step_status_type AS ENUM ('not_started', 'in_progress', 'completed');
CREATE TYPE public.session_status_type AS ENUM ('active', 'completed', 'failed');
CREATE TYPE public.message_role_type AS ENUM ('system', 'user', 'assistant');

-- 2. Modify Blueprints Table
-- ==========================================
-- Backup existing blueprints table data
CREATE TABLE IF NOT EXISTS public.blueprints_backup AS SELECT * FROM public.blueprints;

-- Alter the blueprints table to change id type from serial to uuid
ALTER TABLE public.blueprints 
ALTER COLUMN id SET DATA TYPE uuid 
    USING gen_random_uuid(); -- This will generate new UUIDs for existing records

-- Add new columns to blueprints table
ALTER TABLE public.blueprints
  ADD COLUMN IF NOT EXISTS search_query text,
  ADD COLUMN IF NOT EXISTS visibility visibility_type DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS team_id uuid,
  ADD COLUMN IF NOT EXISTS skill_level skill_level_type,
  ADD COLUMN IF NOT EXISTS learning_objective text,
  ADD COLUMN IF NOT EXISTS complexity complexity_type,
  ADD COLUMN IF NOT EXISTS estimated_time text,
  ADD COLUMN IF NOT EXISTS prompt text,
  ADD COLUMN IF NOT EXISTS clone_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS steps_count integer,
  ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- 3. Create Blueprint Steps Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.blueprint_steps (
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
CREATE INDEX IF NOT EXISTS idx_blueprint_steps_blueprint_id ON public.blueprint_steps (blueprint_id);

-- 4. Create Blueprint Subtasks Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.blueprint_subtasks (
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
CREATE INDEX IF NOT EXISTS idx_blueprint_subtasks_step_id ON public.blueprint_subtasks (step_id);

-- 5. Create Blueprint Comments Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.blueprint_comments (
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
CREATE INDEX IF NOT EXISTS idx_blueprint_comments_blueprint_id ON public.blueprint_comments (blueprint_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_comments_step_id ON public.blueprint_comments (step_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_comments_user_id ON public.blueprint_comments (user_id);

-- 6. Create Reasoning Sessions Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.reasoning_sessions (
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
CREATE INDEX IF NOT EXISTS idx_reasoning_sessions_blueprint_id ON public.reasoning_sessions (blueprint_id);

-- 7. Create Reasoning Messages Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.reasoning_messages (
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
CREATE INDEX IF NOT EXISTS idx_reasoning_messages_session_id ON public.reasoning_messages (session_id);

-- 8. Migration Function for Existing Blueprint Content
-- ==========================================
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

-- Execute the migration function (after schema changes are applied)
SELECT public.migrate_blueprint_content();

-- Drop the function after migration is complete
DROP FUNCTION public.migrate_blueprint_content();

-- 9. Enable Row-Level Security (RLS)
-- ==========================================
-- Enable RLS on all tables
ALTER TABLE public.blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reasoning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reasoning_messages ENABLE ROW LEVEL SECURITY;

-- 10. Set up RLS Policies
-- ==========================================
-- Blueprints RLS Policies
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

-- Blueprint Steps RLS Policies
CREATE POLICY blueprint_steps_owner_all ON public.blueprint_steps
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE user_id = auth.uid()
  ))
  WITH CHECK (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE user_id = auth.uid()
  ));

CREATE POLICY blueprint_steps_team_view ON public.blueprint_steps FOR SELECT
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints 
    WHERE visibility = 'team' 
    AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  ));

CREATE POLICY blueprint_steps_public_view ON public.blueprint_steps FOR SELECT
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE visibility = 'public'
  ));

-- Blueprint Subtasks RLS Policies
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

CREATE POLICY blueprint_subtasks_team_view ON public.blueprint_subtasks FOR SELECT
  USING (step_id IN (
    SELECT id FROM public.blueprint_steps 
    WHERE blueprint_id IN (
      SELECT id FROM public.blueprints 
      WHERE visibility = 'team' 
      AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  ));

CREATE POLICY blueprint_subtasks_public_view ON public.blueprint_subtasks FOR SELECT
  USING (step_id IN (
    SELECT id FROM public.blueprint_steps 
    WHERE blueprint_id IN (
      SELECT id FROM public.blueprints WHERE visibility = 'public'
    )
  ));

-- Blueprint Comments RLS Policies
CREATE POLICY blueprint_comments_owner_all ON public.blueprint_comments
  USING (user_id = auth.uid() OR blueprint_id IN (
    SELECT id FROM public.blueprints WHERE user_id = auth.uid()
  ))
  WITH CHECK (user_id = auth.uid());

CREATE POLICY blueprint_comments_team_view ON public.blueprint_comments FOR SELECT
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints 
    WHERE visibility = 'team' 
    AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  ));

CREATE POLICY blueprint_comments_public_view ON public.blueprint_comments FOR SELECT
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE visibility = 'public'
  ));

-- Reasoning Sessions RLS Policies
CREATE POLICY reasoning_sessions_owner_all ON public.reasoning_sessions
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE user_id = auth.uid()
  ))
  WITH CHECK (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE user_id = auth.uid()
  ));

-- Reasoning Messages RLS Policies
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