-- Database Schema Restructure Script
-- This script implements the changes outlined in database_schema_restructure.md
-- IMPORTANT: Review each section carefully before execution

-- =============================================
-- STEP 1: Create new tables for B2B support - Workspace Model
-- =============================================

-- Workspaces Table (renamed from Organizations)
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text,
  logo_url text,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by_user_id uuid REFERENCES auth.users(id)
);

-- Add comments for clarity
COMMENT ON TABLE public.workspaces IS 'Workspaces for collaboration (personal or team workspaces)';
COMMENT ON COLUMN public.workspaces.domain IS 'Primary email domain for auto-assignment';
COMMENT ON COLUMN public.workspaces.settings IS 'Workspace-specific settings and preferences';
COMMENT ON COLUMN public.workspaces.created_by_user_id IS 'User who created this workspace';

-- Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add comments for clarity
COMMENT ON TABLE public.teams IS 'Teams within workspaces';
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

-- Workspace Members Table (for multi-workspace support)
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member', -- member, admin, owner
  is_primary boolean DEFAULT false, -- User's primary workspace
  joined_at timestamp with time zone DEFAULT now(),
  last_active_at timestamp with time zone DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Add indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_is_primary ON public.workspace_members(is_primary) WHERE is_primary = true;

-- Add comments
COMMENT ON TABLE public.workspace_members IS 'Associates users with workspaces they belong to';
COMMENT ON COLUMN public.workspace_members.role IS 'User''s role within the workspace (member, admin, owner)';
COMMENT ON COLUMN public.workspace_members.is_primary IS 'Whether this is the user''s primary workspace';

-- Workspace Invitation System
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  email text,
  role text DEFAULT 'member',
  invitation_token text UNIQUE NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  status text DEFAULT 'pending', -- pending, accepted, expired, revoked
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON public.workspace_invitations(email);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON public.workspace_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_status ON public.workspace_invitations(status);

-- Add comments
COMMENT ON TABLE public.workspace_invitations IS 'Tracks invitations to join workspaces';
COMMENT ON COLUMN public.workspace_invitations.invitation_token IS 'Unique token for verifying invitation';
COMMENT ON COLUMN public.workspace_invitations.expires_at IS 'When this invitation expires';

-- Invitation Links for bulk invitations
CREATE TABLE IF NOT EXISTS public.workspace_invitation_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  invitation_token text UNIQUE NOT NULL,
  max_uses integer,
  use_count integer DEFAULT 0,
  default_role text DEFAULT 'member',
  expires_at timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_invitation_links_token ON public.workspace_invitation_links(invitation_token);
CREATE INDEX IF NOT EXISTS idx_invitation_links_active ON public.workspace_invitation_links(is_active) WHERE is_active = true;

-- Add comments
COMMENT ON TABLE public.workspace_invitation_links IS 'Shareable invitation links for bulk inviting users';
COMMENT ON COLUMN public.workspace_invitation_links.max_uses IS 'Maximum number of times this link can be used (null = unlimited)';
COMMENT ON COLUMN public.workspace_invitation_links.use_count IS 'Number of times this link has been used';
COMMENT ON COLUMN public.workspace_invitation_links.default_role IS 'Default role assigned to users who join via this link';

-- Track invitation link usage
CREATE TABLE IF NOT EXISTS public.invitation_link_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_link_id uuid NOT NULL REFERENCES public.workspace_invitation_links(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  joined_at timestamp with time zone DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invitation_link_uses_link_id ON public.invitation_link_uses(invitation_link_id);

-- Blueprint Organization - Collections
CREATE TABLE IF NOT EXISTS public.blueprint_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  color text,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id),
  is_default boolean DEFAULT false,
  collection_type text NOT NULL DEFAULT 'project', -- project, department, topic, community
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  -- Ensure collection belongs to either workspace, team, or user
  CONSTRAINT collection_ownership CHECK (
    (workspace_id IS NOT NULL AND team_id IS NULL AND owner_id IS NULL) OR
    (workspace_id IS NULL AND team_id IS NOT NULL AND owner_id IS NULL) OR
    (workspace_id IS NULL AND team_id IS NULL AND owner_id IS NOT NULL)
  )
);

-- Add indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_blueprint_collections_workspace_id ON public.blueprint_collections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_collections_team_id ON public.blueprint_collections(team_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_collections_owner_id ON public.blueprint_collections(owner_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_collections_type ON public.blueprint_collections(collection_type);

-- Add comments
COMMENT ON TABLE public.blueprint_collections IS 'Collections for organizing blueprints';
COMMENT ON COLUMN public.blueprint_collections.collection_type IS 'Type of collection (project, department, topic, community)';
COMMENT ON COLUMN public.blueprint_collections.is_default IS 'Whether this is a default collection';

-- Blueprint to Collection Assignment
CREATE TABLE IF NOT EXISTS public.blueprint_collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id uuid NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES public.blueprint_collections(id) ON DELETE CASCADE,
  added_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(blueprint_id, collection_id)
);

-- Add indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_blueprint_collection_items_blueprint_id ON public.blueprint_collection_items(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_collection_items_collection_id ON public.blueprint_collection_items(collection_id);

-- Add comments
COMMENT ON TABLE public.blueprint_collection_items IS 'Associates blueprints with collections';

-- Community Topics
CREATE TABLE IF NOT EXISTS public.community_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  slug text UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_community_topics_slug ON public.community_topics(slug);

-- Add comments
COMMENT ON TABLE public.community_topics IS 'Topics in the community that users can follow';

-- User Followed Topics
CREATE TABLE IF NOT EXISTS public.user_followed_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.community_topics(id) ON DELETE CASCADE,
  followed_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

-- Add indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_followed_topics_user_id ON public.user_followed_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_followed_topics_topic_id ON public.user_followed_topics(topic_id);

-- Add comments
COMMENT ON TABLE public.user_followed_topics IS 'Tracks which community topics users follow';

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

-- Update workspace and team relationships
DO $$
BEGIN
    -- If organization_id exists, rename it to workspace_id
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.users RENAME COLUMN organization_id TO workspace_id;
    END IF;

    -- Add workspace_id if it doesn't exist (if it wasn't renamed)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'workspace_id'
    ) THEN
        ALTER TABLE public.users ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id);
    END IF;

    -- Add primary_team_id if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'primary_team_id'
    ) THEN
        ALTER TABLE public.users ADD COLUMN primary_team_id uuid REFERENCES public.teams(id);
    END IF;
    
    -- Add last_active_workspace_id for workspace switching
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_active_workspace_id'
    ) THEN
        ALTER TABLE public.users ADD COLUMN last_active_workspace_id uuid REFERENCES public.workspaces(id);
    END IF;
END
$$;

-- Update field comments
COMMENT ON COLUMN public.users.user_skill_level IS 'Self-assessed skill level of the user (beginner, intermediate, advanced)';
COMMENT ON COLUMN public.users.experience IS 'General experience level in the field (years or category)';
COMMENT ON COLUMN public.users.user_learning_goals IS 'User''s learning objectives and goals';
COMMENT ON COLUMN public.users.preferred_learning_style IS 'User''s preferred learning approach (visual, hands-on, etc.)';
COMMENT ON COLUMN public.users.workspace_id IS 'Primary workspace the user belongs to';
COMMENT ON COLUMN public.users.primary_team_id IS 'Primary team the user belongs to';
COMMENT ON COLUMN public.users.last_active_workspace_id IS 'Last workspace the user was active in';

-- =============================================
-- STEP 4: Update Blueprint table structure
-- =============================================

-- Handle visibility enum type in a separate transaction
DO $$
BEGIN
    -- Check if visibility is an enum type
    IF EXISTS (
        SELECT FROM pg_type t 
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        JOIN pg_catalog.pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'visibility_type' AND n.nspname = 'public'
    ) THEN
        -- Check if the enum value exists before trying to add it
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'visibility_type') 
            AND enumlabel = 'workspace'
        ) THEN
            -- Add the workspace value to the enum type
            ALTER TYPE visibility_type ADD VALUE 'workspace';
        END IF;
    END IF;
END
$$;

-- COMMIT the enum changes before proceeding
COMMIT;

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
    
    -- Add workspace_id to blueprints
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'blueprints' AND column_name = 'workspace_id'
    ) THEN
        ALTER TABLE public.blueprints ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id);
    END IF;
    
    -- Handle visibility field - check if it's an enum type first
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'blueprints' AND column_name = 'visibility'
    ) THEN
        -- Check if visibility is an enum type
        IF EXISTS (
            SELECT FROM pg_type t 
            JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
            JOIN pg_catalog.pg_enum e ON e.enumtypid = t.oid
            WHERE t.typname = 'visibility_type' AND n.nspname = 'public'
        ) THEN
            -- Enum values have been added in a previous transaction
            -- Now we can safely set the default
            BEGIN
                -- Set default to private - the enum value already exists
                ALTER TABLE public.blueprints ALTER COLUMN visibility SET DEFAULT 'private';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not set default value for visibility column: %', SQLERRM;
            END;
        ELSE
            -- It's not an enum, use CHECK constraint
            -- Drop old constraint if it exists
            ALTER TABLE public.blueprints DROP CONSTRAINT IF EXISTS valid_visibility;
            
            -- Add new constraint
            ALTER TABLE public.blueprints 
                ADD CONSTRAINT valid_visibility CHECK (
                    visibility IN ('private', 'team', 'workspace', 'public')
                );
                
            -- Set default to private
            ALTER TABLE public.blueprints ALTER COLUMN visibility SET DEFAULT 'private';
        END IF;
    END IF;
END
$$;

-- Add comments
COMMENT ON COLUMN public.blueprints.skill_level IS 'Recommended user skill level for this blueprint (beginner, intermediate, advanced)';
COMMENT ON COLUMN public.blueprints.complexity IS 'Objective complexity rating of the blueprint tasks (low, medium, high)';
COMMENT ON COLUMN public.blueprints.blueprint_learning_focus IS 'Specific learning focus or objective of this blueprint';
COMMENT ON COLUMN public.blueprints.team_id IS 'Team that owns this blueprint';
COMMENT ON COLUMN public.blueprints.workspace_id IS 'Workspace that owns this blueprint';
COMMENT ON COLUMN public.blueprints.visibility IS 'Visibility of blueprint: private (only creator), team, workspace, or public';

-- =============================================
-- STEP 5: Create Personal Workspace Function
-- =============================================

-- Function to create personal workspace on user signup
CREATE OR REPLACE FUNCTION create_personal_workspace()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id uuid;
BEGIN
  -- Create personal workspace
  INSERT INTO public.workspaces (
    name, 
    org_type,
    size_category,
    created_by_user_id
  ) 
  VALUES (
    NEW.email || '''s Personal Workspace', 
    'individual',
    'individual',
    NEW.id
  )
  RETURNING id INTO workspace_id;
  
  -- Add user as owner of personal workspace
  INSERT INTO public.workspace_members (
    workspace_id,
    user_id,
    role,
    is_primary
  )
  VALUES (
    workspace_id,
    NEW.id,
    'owner',
    true
  );
  
  -- Set as last active workspace
  UPDATE auth.users
  SET raw_app_meta_data = 
    jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb),
      '{last_active_workspace_id}',
      to_jsonb(workspace_id::text)
    )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 6: Row-Level Security Updates
-- =============================================

-- Enable RLS on new tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitation_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_followed_topics ENABLE ROW LEVEL SECURITY;

-- Workspace policies (admins can manage)
CREATE POLICY workspace_admin_all ON public.workspaces
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = workspaces.id
    AND workspace_members.user_id = auth.uid() 
    AND workspace_members.role IN ('admin', 'owner')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = workspaces.id
    AND workspace_members.user_id = auth.uid() 
    AND workspace_members.role IN ('admin', 'owner')
  ));

-- Users can view workspaces they're members of
CREATE POLICY workspace_member_view ON public.workspaces FOR SELECT
  USING (id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Team policies
CREATE POLICY team_member_view ON public.teams FOR SELECT
  USING (id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

-- Workspace admins can manage teams
CREATE POLICY team_workspace_admin_all ON public.teams
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  ))
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  ));

-- Update blueprint policies to include workspace access
CREATE POLICY blueprint_workspace_access ON public.blueprints FOR SELECT
  USING (
    -- User is the creator
    user_id = auth.uid()
    OR 
    -- Blueprint is public
    visibility = 'public'
    OR
    -- Blueprint is workspace-visible and user is in the workspace
    (visibility = 'workspace' AND workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ))
    OR
    -- Blueprint is team-visible and user is in the team
    (visibility = 'team' AND team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    ))
  );

-- Blueprint collections policies
CREATE POLICY collection_access ON public.blueprint_collections FOR SELECT
  USING (
    owner_id = auth.uid()
    OR
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  );

-- Collection items visible to those who can see the collection
CREATE POLICY collection_items_access ON public.blueprint_collection_items FOR SELECT
  USING (
    collection_id IN (
      SELECT id FROM public.blueprint_collections WHERE
      owner_id = auth.uid()
      OR
      workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
      OR
      team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    )
  );

-- Workspace members can be seen by other members
CREATE POLICY workspace_members_view ON public.workspace_members FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

-- Workspace admins can manage workspace members
CREATE POLICY workspace_members_manage ON public.workspace_members
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- =============================================
-- STEP 7: User Analytics Table Updates
-- =============================================

-- Rename organization_id to workspace_id in analytics tables
DO $$
BEGIN
    -- Rename in user_analytics if needed
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_analytics' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.user_analytics RENAME COLUMN organization_id TO workspace_id;
    END IF;
    
    -- Rename in organization_analytics and rename table
    IF EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'organization_analytics'
    ) THEN
        ALTER TABLE public.organization_analytics RENAME TO workspace_analytics;
        ALTER TABLE public.workspace_analytics RENAME COLUMN organization_id TO workspace_id;
    END IF;
    
    -- Rename in marketing_touchpoints
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'marketing_touchpoints' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.marketing_touchpoints RENAME COLUMN organization_id TO workspace_id;
    END IF;
    
    -- Rename in feature_usage_logs
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'feature_usage_logs' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.feature_usage_logs RENAME COLUMN organization_id TO workspace_id;
    END IF;
    
    -- Rename in upsell_opportunities
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'upsell_opportunities' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.upsell_opportunities RENAME COLUMN organization_id TO workspace_id;
    END IF;
    
    -- Rename in user_feedback
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_feedback' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.user_feedback RENAME COLUMN organization_id TO workspace_id;
    END IF;
    
    -- Rename in analytics_identifiers
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'analytics_identifiers' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.analytics_identifiers RENAME COLUMN organization_id TO workspace_id;
    END IF;
END
$$;

-- Recreate workspace_analytics if it doesn't exist
CREATE TABLE IF NOT EXISTS public.workspace_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
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
COMMENT ON TABLE public.workspace_analytics IS 'Aggregates workspace-level metrics for teams and organizations';
COMMENT ON COLUMN public.workspace_analytics.health_score IS 'Calculated score (0-100) representing overall account health';
COMMENT ON COLUMN public.workspace_analytics.mrr IS 'Monthly Recurring Revenue for this workspace';

-- Add indices for faster queries
CREATE INDEX IF NOT EXISTS idx_workspace_analytics_workspace_id ON public.workspace_analytics(workspace_id);

-- Update workspace metrics update function
CREATE OR REPLACE FUNCTION update_workspace_analytics()
RETURNS void AS $$
DECLARE
  current_workspace_id uuid;
BEGIN
  -- For each workspace
  FOR current_workspace_id IN (SELECT id FROM public.workspaces) LOOP
    -- Check if workspace has an analytics record
    IF NOT EXISTS (SELECT 1 FROM public.workspace_analytics WHERE workspace_id = current_workspace_id) THEN
      -- Create one if it doesn't exist
      INSERT INTO public.workspace_analytics (workspace_id)
      VALUES (current_workspace_id);
    END IF;
    
    -- Update the metrics
    UPDATE public.workspace_analytics wa
    SET 
      total_users = (
        SELECT COUNT(DISTINCT user_id) 
        FROM public.workspace_members 
        WHERE workspace_id = current_workspace_id
      ),
      active_users_7d = (
        SELECT COUNT(DISTINCT user_id) 
        FROM public.user_analytics ua
        JOIN public.workspace_members wm ON ua.user_id = wm.user_id
        WHERE wm.workspace_id = current_workspace_id 
        AND ua.last_login_at > NOW() - INTERVAL '7 days'
      ),
      active_users_30d = (
        SELECT COUNT(DISTINCT user_id) 
        FROM public.user_analytics ua
        JOIN public.workspace_members wm ON ua.user_id = wm.user_id
        WHERE wm.workspace_id = current_workspace_id 
        AND ua.last_login_at > NOW() - INTERVAL '30 days'
      ),
      blueprint_count = (
        SELECT COUNT(*) 
        FROM public.blueprints 
        WHERE workspace_id = current_workspace_id
        OR team_id IN (
          SELECT id FROM public.teams WHERE workspace_id = current_workspace_id
        )
      ),
      last_activity_at = (
        SELECT MAX(last_active_at) 
        FROM public.workspace_members
        WHERE workspace_id = current_workspace_id
      ),
      updated_at = NOW()
    WHERE wa.workspace_id = current_workspace_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on analytics tables
ALTER TABLE public.workspace_analytics ENABLE ROW LEVEL SECURITY;

-- Workspace admin policies for workspace analytics
CREATE POLICY workspace_analytics_admin ON public.workspace_analytics FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_members.user_id = auth.uid() 
    AND workspace_members.workspace_id = workspace_analytics.workspace_id
    AND workspace_members.role IN ('admin', 'owner')
  ));

-- =============================================
-- STEP 8: Workspace Structure Enhancements
-- =============================================

-- Add owner/primary contact fields to workspaces
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS primary_contact_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS account_owner_id uuid REFERENCES auth.users(id);

-- Create workspace type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_type') THEN
    CREATE TYPE workspace_type AS ENUM (
      'personal',
      'academic', 
      'enterprise', 
      'government', 
      'non_profit', 
      'smb', 
      'startup'
    );
  END IF;
END$$;

-- Create workspace size category enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_size_category') THEN
    CREATE TYPE workspace_size_category AS ENUM (
      'individual',
      'small_team', -- 2-10 users
      'smb',        -- 11-200 users
      'mid_market', -- 201-1000 users
      'enterprise'  -- 1000+ users
    );
  END IF;
END$$;

-- Add workspace classification fields
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS workspace_type workspace_type DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS size_category workspace_size_category DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS user_count integer;

-- Add additional metadata
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS billing_email text,
  ADD COLUMN IF NOT EXISTS billing_address jsonb,
  ADD COLUMN IF NOT EXISTS subscription_plan text,
  ADD COLUMN IF NOT EXISTS max_users integer,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Update workspace role table name
CREATE TABLE IF NOT EXISTS public.workspace_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member', -- workspace_admin, billing_admin, member, etc.
  permissions jsonb DEFAULT '{}'::jsonb, -- For custom permission sets
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(workspace_id, user_id, role)
);

-- Add index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_workspace_roles_user_workspace ON public.workspace_roles(user_id, workspace_id);

-- Apply RLS
ALTER TABLE public.workspace_roles ENABLE ROW LEVEL SECURITY;

-- Add policy for viewing roles
CREATE POLICY workspace_roles_view ON public.workspace_roles FOR SELECT
  USING (
    -- Users can see their own roles
    user_id = auth.uid() 
    OR 
    -- Workspace admins can see all roles in their workspace
    EXISTS (
      SELECT 1 FROM public.workspace_roles 
      WHERE user_id = auth.uid() 
      AND workspace_id = workspace_roles.workspace_id
      AND role = 'workspace_admin'
    )
  );

-- Add policies for managing roles
CREATE POLICY workspace_roles_manage ON public.workspace_roles
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_roles 
      WHERE user_id = auth.uid() 
      AND workspace_id = workspace_roles.workspace_id
      AND role = 'workspace_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_roles 
      WHERE user_id = auth.uid() 
      AND workspace_id = workspace_roles.workspace_id
      AND role = 'workspace_admin'
    )
  );

-- Add comments for clarity
COMMENT ON TABLE public.workspace_roles IS 'Stores user roles at the workspace level for fine-grained permissions';
COMMENT ON COLUMN public.workspace_roles.role IS 'Role name (workspace_admin, billing_admin, member, etc.)';
COMMENT ON COLUMN public.workspace_roles.permissions IS 'JSON object containing custom permission settings';

COMMENT ON COLUMN public.workspaces.workspace_type IS 'Type of workspace (personal, academic, enterprise, government, non_profit, smb, startup)';
COMMENT ON COLUMN public.workspaces.size_category IS 'Size category of the workspace (individual, small_team, smb, mid_market, enterprise)';
COMMENT ON COLUMN public.workspaces.industry IS 'Industry or sector the workspace operates in';
COMMENT ON COLUMN public.workspaces.primary_contact_id IS 'Primary technical contact user for the workspace';
COMMENT ON COLUMN public.workspaces.account_owner_id IS 'Account owner/manager user for the workspace';

-- =============================================
-- STEP 9: Add marketing fields to workspaces
-- =============================================

-- Add marketing fields to workspaces table
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS lifecycle_stage text DEFAULT 'onboarding',
  ADD COLUMN IF NOT EXISTS customer_success_manager text,
  ADD COLUMN IF NOT EXISTS next_renewal_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS usage_alerts jsonb DEFAULT '{}'::jsonb;

-- =============================================
-- STEP 10: Verification Queries
-- =============================================

-- Run these queries to verify the changes
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'blueprints';
-- SELECT * FROM pg_policies WHERE tablename IN ('workspaces', 'teams', 'team_members', 'blueprints');
-- SELECT * FROM pg_policies WHERE tablename IN ('user_analytics', 'workspace_analytics', 'marketing_touchpoints');
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'workspaces';
-- SELECT * FROM pg_policies WHERE tablename = 'workspace_roles'; 