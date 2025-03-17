-- Create a new RPC function for safely fetching blueprint questions without triggering infinite recursion
CREATE OR REPLACE FUNCTION public.get_blueprint_questions(p_blueprint_id UUID, p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_questions jsonb;
    v_responses jsonb;
    v_created_at timestamptz;
    v_updated_at timestamptz;
    v_has_access boolean := false;
    v_is_temporary boolean;
    v_blueprint_user_id uuid;
    v_blueprint_workspace_id uuid;
    v_visibility text;
BEGIN
    -- Get blueprint info to check permissions
    SELECT 
        is_temporary, 
        user_id,
        workspace_id,
        visibility
    INTO 
        v_is_temporary,
        v_blueprint_user_id,
        v_blueprint_workspace_id,
        v_visibility
    FROM public.blueprints
    WHERE id = p_blueprint_id;
    
    -- Check if user has access by any of these conditions:
    -- 1. Blueprint is temporary
    -- 2. User is the owner
    -- 3. Blueprint visibility is public
    -- 4. User is in the workspace that owns the blueprint
    IF v_is_temporary = true OR 
       v_blueprint_user_id = p_user_id OR 
       v_visibility = 'public' OR
       EXISTS (
         SELECT 1 FROM public.workspace_members 
         WHERE workspace_id = v_blueprint_workspace_id
         AND user_id = p_user_id
       )
    THEN
        v_has_access := true;
    END IF;
    
    IF NOT v_has_access THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You do not have access to this blueprint',
            'status', 403
        );
    END IF;
    
    -- Get the questions data
    SELECT 
        jsonb_build_object(
            'questions', COALESCE(questions, '[]'::jsonb),
            'responses', COALESCE(responses, '{}'::jsonb),
            'created_at', created_at,
            'updated_at', updated_at
        )
    INTO v_questions
    FROM public.blueprint_questions
    WHERE blueprint_id = p_blueprint_id;
    
    -- If no questions found, return empty arrays
    IF v_questions IS NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'data', jsonb_build_object(
                'questions', '[]'::jsonb,
                'responses', '{}'::jsonb
            ),
            'status', 200
        );
    END IF;
    
    -- Return questions data
    RETURN jsonb_build_object(
        'success', true,
        'data', v_questions,
        'status', 200
    );
END;
$$; 