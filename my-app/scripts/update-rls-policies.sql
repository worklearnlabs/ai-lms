-- Script to update RLS policies for blueprint deletion
-- Run this script in the Supabase SQL editor or using the Supabase CLI

-- First, drop existing policies to avoid conflicts
DROP POLICY IF EXISTS blueprint_steps_owner_all ON public.blueprint_steps;
DROP POLICY IF EXISTS blueprint_steps_public_view ON public.blueprint_steps;
DROP POLICY IF EXISTS blueprint_steps_owner_delete ON public.blueprint_steps;
DROP POLICY IF EXISTS blueprint_steps_temporary_delete ON public.blueprint_steps;

-- Re-create the owner access policy
CREATE POLICY blueprint_steps_owner_all ON public.blueprint_steps
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE user_id = auth.uid()
  ))
  WITH CHECK (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE user_id = auth.uid()
  ));

-- Re-create the public view access policy
CREATE POLICY blueprint_steps_public_view ON public.blueprint_steps FOR SELECT
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE visibility = 'public'
  ));

-- Create explicit deletion policies for blueprint steps
-- Policy for owners to delete their steps
CREATE POLICY blueprint_steps_owner_delete ON public.blueprint_steps
  FOR DELETE
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE user_id = auth.uid()
  ));

-- Policy for temporary blueprint steps deletion
CREATE POLICY blueprint_steps_temporary_delete ON public.blueprint_steps
  FOR DELETE
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE is_temporary = true
  ));

-- Make sure RLS is enabled on the table
ALTER TABLE public.blueprint_steps ENABLE ROW LEVEL SECURITY;

-- Also verify that the blueprint deletion policies exist
DROP POLICY IF EXISTS blueprint_temporary_delete ON public.blueprints;
DROP POLICY IF EXISTS blueprint_owner_delete ON public.blueprints;

-- Recreate blueprint deletion policies
CREATE POLICY blueprint_temporary_delete ON public.blueprints
  FOR DELETE
  USING (is_temporary = true);

CREATE POLICY blueprint_owner_delete ON public.blueprints
  FOR DELETE
  USING (user_id = auth.uid());

-- Make sure RLS is enabled on blueprints table
ALTER TABLE public.blueprints ENABLE ROW LEVEL SECURITY; 