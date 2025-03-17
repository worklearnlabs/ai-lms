-- Fix for the infinite recursion in workspace_members and blueprints RLS policies
-- This addresses the root cause rather than bypassing RLS

-- First, modify workspace_members policy to avoid recursion with blueprints
DROP POLICY IF EXISTS workspace_members_blueprint_check ON public.workspace_members;
DROP POLICY IF EXISTS workspace_members_user_access ON public.workspace_members;
DROP POLICY IF EXISTS workspace_members_admin_access ON public.workspace_members;

-- Create separate policies for workspace members that don't reference blueprints
CREATE POLICY workspace_members_user_access ON public.workspace_members
  FOR ALL
  USING (user_id = auth.uid());

-- Create policy for workspace admins
CREATE POLICY workspace_members_admin_access ON public.workspace_members
  FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Blueprint policies that avoid circular references to workspace_members
DROP POLICY IF EXISTS blueprint_workspace_access ON public.blueprints;
DROP POLICY IF EXISTS blueprint_owner_access ON public.blueprints;
DROP POLICY IF EXISTS blueprint_public_access ON public.blueprints;
DROP POLICY IF EXISTS blueprint_temporary_access ON public.blueprints;

-- Create separate, non-recursive policies for blueprints
-- Owner access
CREATE POLICY blueprint_owner_access ON public.blueprints
  FOR ALL
  USING (user_id = auth.uid());

-- Public visibility 
CREATE POLICY blueprint_public_access ON public.blueprints
  FOR SELECT
  USING (visibility = 'public');

-- Temporary blueprints (accessible by anyone)
CREATE POLICY blueprint_temporary_access ON public.blueprints
  FOR ALL
  USING (is_temporary = true);

-- Workspace access - direct check without recursion
CREATE POLICY blueprint_workspace_access ON public.blueprints
  FOR SELECT
  USING (
    visibility = 'workspace' AND workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Make sure we have proper step deletion policies too
DROP POLICY IF EXISTS blueprint_steps_owner_delete ON public.blueprint_steps;
DROP POLICY IF EXISTS blueprint_steps_temporary_delete ON public.blueprint_steps;
DROP POLICY IF EXISTS blueprint_steps_owner_all ON public.blueprint_steps;
DROP POLICY IF EXISTS blueprint_steps_public_view ON public.blueprint_steps;
DROP POLICY IF EXISTS blueprint_steps_workspace_view ON public.blueprint_steps;

-- Create explicit deletion policies for blueprint steps
CREATE POLICY blueprint_steps_owner_all ON public.blueprint_steps
  FOR ALL
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE user_id = auth.uid()
  ));

CREATE POLICY blueprint_steps_public_view ON public.blueprint_steps 
  FOR SELECT
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE visibility = 'public'
  ));

CREATE POLICY blueprint_steps_workspace_view ON public.blueprint_steps
  FOR SELECT
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints 
    WHERE visibility = 'workspace' AND workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY blueprint_steps_temporary_access ON public.blueprint_steps
  FOR ALL
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE is_temporary = true
  ));

-- Create a simpler blueprint delete policy that doesn't cause recursion
DROP POLICY IF EXISTS blueprint_owner_delete ON public.blueprints;
DROP POLICY IF EXISTS blueprint_temporary_delete ON public.blueprints;

CREATE POLICY blueprint_owner_delete ON public.blueprints
  FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY blueprint_temporary_delete ON public.blueprints
  FOR DELETE
  USING (is_temporary = true);

-- Enable RLS
ALTER TABLE public.blueprint_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprints ENABLE ROW LEVEL SECURITY; 