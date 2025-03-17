-- RPC Functions to assist with safe blueprint deletion
-- For direct use in the Supabase SQL editor

/* 
 * INSTRUCTIONS FOR USING THESE RPC FUNCTIONS
 * ------------------------------------------
 * 1. Log in to your Supabase dashboard
 * 2. Navigate to the SQL Editor
 * 3. Create a new query, paste the entire contents of this file
 * 4. Run the query to create these functions
 * 5. These functions are defined with SECURITY DEFINER which means they
 *    will run with the privileges of the database role that created them,
 *    bypassing Row Level Security policies.
 * 
 * THESE FUNCTIONS IMPLEMENT:
 * - check_blueprint_access: Safely checks if a blueprint exists and if a user can access it
 * - delete_blueprint_steps: Safely deletes steps associated with a blueprint
 * - delete_blueprint: A complete function to safely delete a blueprint with authorization
 *
 * USAGE EXAMPLES:
 * 
 * -- Check if a blueprint exists and if user can access it
 * SELECT * FROM check_blueprint_access('blueprint-uuid-here', 'user-uuid-here');
 * 
 * -- Delete steps for a blueprint
 * SELECT * FROM delete_blueprint_steps('blueprint-uuid-here');
 * 
 * -- Delete a blueprint with authorization check
 * SELECT * FROM delete_blueprint('blueprint-uuid-here', 'user-uuid-here');
 */

-- Function to check if a blueprint exists and if the user has access to it
CREATE OR REPLACE FUNCTION check_blueprint_access(p_blueprint_id UUID, p_user_id UUID)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  blueprint_record RECORD;
BEGIN
  -- Get the blueprint directly without RLS
  SELECT id, user_id, is_temporary
  INTO blueprint_record
  FROM blueprints
  WHERE id = p_blueprint_id;
  
  -- Return null if blueprint doesn't exist
  IF blueprint_record IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Check if user can access it (is owner or blueprint is temporary)
  IF blueprint_record.user_id = p_user_id OR blueprint_record.is_temporary = true THEN
    RETURN row_to_json(blueprint_record);
  ELSE
    -- Return only id for security reasons if user doesn't own it
    RETURN json_build_object('id', blueprint_record.id, 'is_accessible', false);
  END IF;
END;
$$;

-- Function to safely delete blueprint steps
CREATE OR REPLACE FUNCTION delete_blueprint_steps(p_blueprint_id UUID)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete the blueprint steps directly without RLS
  WITH deleted AS (
    DELETE FROM blueprint_steps
    WHERE blueprint_id = p_blueprint_id
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN json_build_object('deleted_count', deleted_count);
END;
$$;

-- Function to safely delete a blueprint with authorization
CREATE OR REPLACE FUNCTION delete_blueprint(p_blueprint_id UUID, p_user_id UUID)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  blueprint_record RECORD;
  deleted_record RECORD;
BEGIN
  -- First check if the blueprint exists and user has access
  SELECT id, user_id, is_temporary
  INTO blueprint_record
  FROM blueprints
  WHERE id = p_blueprint_id;
  
  -- Return error if blueprint doesn't exist
  IF blueprint_record IS NULL THEN
    RETURN json_build_object('error', 'Blueprint not found', 'status', 404);
  END IF;
  
  -- Check if user can delete it (is owner or blueprint is temporary)
  IF blueprint_record.user_id != p_user_id AND NOT blueprint_record.is_temporary THEN
    RETURN json_build_object('error', 'Not authorized to delete this blueprint', 'status', 403);
  END IF;
  
  -- First delete any steps
  PERFORM delete_blueprint_steps(p_blueprint_id);
  
  -- Then delete the blueprint
  DELETE FROM blueprints
  WHERE id = p_blueprint_id
  RETURNING id, title, user_id, is_temporary INTO deleted_record;
  
  IF deleted_record IS NULL THEN
    RETURN json_build_object('error', 'Blueprint deletion failed', 'status', 500);
  END IF;
  
  RETURN row_to_json(deleted_record);
END;
$$; 