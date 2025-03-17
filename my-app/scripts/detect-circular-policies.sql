-- Script to detect and fix circular references in RLS policies
-- Run this in the Supabase SQL editor to find and resolve policy recursion issues

-- List all policies with circular references
SELECT 
    p.policyname,
    p.tablename,
    p.cmd AS operation,
    p.qual AS policy_definition
FROM 
    pg_policies p
WHERE 
    -- Look for policies that reference other tables that might have policies referencing back
    p.qual::text ~* 'workspace_members' OR
    p.qual::text ~* 'blueprints' OR
    p.qual::text ~* 'blueprint_steps'
ORDER BY 
    p.tablename, p.policyname;

-- Check for tables with RLS enabled that might be involved in circular references
SELECT 
    c.relname AS table_name, 
    c.relrowsecurity AS rls_enabled
FROM 
    pg_class c
JOIN 
    pg_namespace n ON n.oid = c.relnamespace
WHERE 
    n.nspname = 'public' AND 
    c.relkind = 'r' AND
    (c.relname = 'workspace_members' OR c.relname = 'blueprints' OR c.relname = 'blueprint_steps');

/*
IMPORTANT: Guidelines for avoiding circular references in RLS policies

1. Identify Policy Direction:
   - Decide which table should reference the other, but not vice versa
   - Example: Blueprints can reference workspace_members, but workspace_members shouldn't reference blueprints

2. Use Simple Conditions:
   - Keep policies simple, focusing on direct ownership checks (user_id = auth.uid())
   - Avoid complex joins between tables that might have mutual references

3. Use Intermediate Tables:
   - For complex authorization needs, consider using junction tables without circular references
   - Example: workspace_user_permissions table can be referenced by both without circularity

4. Fix Strategy:
   - Drop circular policies
   - Redefine policies using simpler, non-circular logic
   - Test thoroughly after changes
*/

-- To fix a circular policy, use the following template:
-- DROP POLICY IF EXISTS policy_name ON table_name;
-- CREATE POLICY policy_name ON table_name FOR operation USING (non_circular_condition); 