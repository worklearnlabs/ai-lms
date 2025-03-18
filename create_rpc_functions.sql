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

-- Create or replace the RPC function for updating blueprint question responses
CREATE OR REPLACE FUNCTION public.update_blueprint_question_responses(
  p_blueprint_id UUID,
  p_user_id UUID,
  p_responses JSONB
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_has_access boolean := false;
    v_is_temporary boolean;
    v_blueprint_user_id uuid;
    v_blueprint_workspace_id uuid;
    v_visibility text;
    v_record_count integer;
    v_updated jsonb;
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
    
    -- First attempt - try direct update and handle potential multiple rows error
    BEGIN
        -- Try to update the existing record
        UPDATE public.blueprint_questions
        SET
            responses = p_responses,
            updated_at = NOW()
        WHERE blueprint_id = p_blueprint_id
        RETURNING jsonb_build_object(
            'responses', responses
        ) INTO v_updated;
        
        -- If no rows affected, insert a new record
        IF NOT FOUND THEN
            INSERT INTO public.blueprint_questions (
                blueprint_id,
                questions,
                responses,
                created_at,
                updated_at
            )
            VALUES (
                p_blueprint_id,
                '[]'::jsonb,  -- Default empty questions array
                p_responses,
                NOW(),
                NOW()
            )
            RETURNING jsonb_build_object(
                'responses', responses
            ) INTO v_updated;
        END IF;
        
        -- If we get here, the operation succeeded
        RETURN jsonb_build_object(
            'success', true,
            'data', v_updated,
            'status', 200
        );
    EXCEPTION
        -- Handle the case where there are multiple records
        WHEN cardinality_violation THEN
            -- Clean up by deleting all except the most recent
            WITH ranked_records AS (
                SELECT id, ROW_NUMBER() OVER (ORDER BY updated_at DESC) as rn
                FROM public.blueprint_questions
                WHERE blueprint_id = p_blueprint_id
            ),
            deleted AS (
                DELETE FROM public.blueprint_questions
                WHERE id IN (
                    SELECT id FROM ranked_records WHERE rn > 1
                )
            )
            -- Now try the update again
            UPDATE public.blueprint_questions
            SET
                responses = p_responses,
                updated_at = NOW()
            WHERE blueprint_id = p_blueprint_id
            RETURNING jsonb_build_object(
                'responses', responses
            ) INTO v_updated;
            
            -- Return success
            RETURN jsonb_build_object(
                'success', true,
                'data', v_updated,
                'status', 200
            );
    END;
END;
$$; 