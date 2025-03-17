import { createClientSupabase } from './supabase';
import { createStandardServerClient } from './supabase';
import {
  VisibilityType,
  SkillLevelType,
  ComplexityType,
  StepStatusType,
  MessageRoleType
} from '@/types/schema';

// Types
export interface BlueprintInput {
  title: string;
  description?: string;
  content: Record<string, unknown>;
  search_query?: string;
  visibility?: VisibilityType;
  team_id?: string;
  workspace_id?: string;
  skill_level?: SkillLevelType;
  user_skill_level?: SkillLevelType;
  learning_objective?: string;
  blueprint_learning_focus?: string;
  complexity?: ComplexityType;
  estimated_time?: string;
  prompt?: string;
  is_temporary?: boolean;
  user_id?: string;
}

export interface BlueprintStepInput {
  blueprint_id: string;
  number: number;
  title: string;
  estimated_time?: string;
  instructions?: Record<string, unknown>[];
  tools?: string[];
  status?: StepStatusType;
}

export interface BlueprintSubtaskInput {
  step_id: string;
  task_number: number;
  description: string;
  status?: StepStatusType;
  estimated_time?: string;
}

export interface BlueprintCommentInput {
  blueprint_id: string;
  step_id?: string;
  content: string;
}

export interface ReasoningSessionInput {
  blueprint_id: string;
  context?: Record<string, unknown>;
  skill_level?: SkillLevelType;
  learning_objective?: string;
}

export interface ReasoningMessageInput {
  session_id: string;
  role: MessageRoleType;
  content: string;
}

// Client-side API functions (browser environment)
export const blueprintApi = {
  // Blueprints
  async getBlueprints(userId?: string) {
    const supabase = createClientSupabase();

    // If userId is provided, fetch user's blueprints and public ones
    if (userId) {
      return await supabase
        .from('blueprints')
        .select('*')
        .or(`user_id.eq.${userId},visibility.eq.public`)
        .order('created_at', { ascending: false });
    }

    // Otherwise, just return public blueprints
    return await supabase
      .from('blueprints')
      .select('*')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });
  },

  // Clean up stale temporary blueprints
  // DEPRECATED: This functionality has been removed in the current workspace architecture.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async cleanupTemporaryBlueprints(userId?: string, maxAgeHours: number = 24) {
    // This is a no-op function that returns success to prevent errors in legacy code
    console.log('ℹ️ Note: The automatic cleanup of temporary blueprints has been disabled');
    return {
      success: true,
      data: [],
      deletedCount: 0
    };
  },

  async getBlueprintById(id: string) {
    try {
      console.log(`blueprintApi.getBlueprintById: Fetching blueprint with ID ${id}`);
      const supabase = createClientSupabase();
      
      // First, try to get the authenticated user to debug permission issues
      const { data: authData } = await supabase.auth.getSession();
      const isAuthenticated = !!authData.session?.user;
      console.log(`blueprintApi.getBlueprintById: User authenticated: ${isAuthenticated}`);
      
      if (isAuthenticated) {
        console.log(`blueprintApi.getBlueprintById: User ID: ${authData.session?.user.id}`);
      }
      
      // Make a simpler query first to check if the blueprint exists at all
      const checkResponse = await supabase
        .from('blueprints')
        .select('id, title, is_temporary, user_id')
        .eq('id', id)
        .maybeSingle();
      
      if (checkResponse.error) {
        console.error(`blueprintApi.getBlueprintById: Error checking if blueprint ${id} exists:`, 
          JSON.stringify(checkResponse.error));
        
        // Log specific error codes for debugging
        if (checkResponse.error.code) {
          console.error(`Error code: ${checkResponse.error.code}, Message: ${checkResponse.error.message}`);
        }
        
        if (checkResponse.error.code === 'PGRST116' || checkResponse.error.code === 'PGRST104') {
          console.error(`blueprintApi.getBlueprintById: Blueprint not found or inaccessible due to permissions: ${id}`);
          return { 
            data: null, 
            error: { 
              message: 'Blueprint not found or inaccessible', 
              code: checkResponse.error.code 
            } 
          };
        }
        
        return checkResponse;
      }
      
      if (!checkResponse.data) {
        console.error(`blueprintApi.getBlueprintById: Blueprint ${id} not found in database`);
        return { 
          data: null, 
          error: { message: 'Blueprint not found', code: 'NOT_FOUND' } 
        };
      }
      
      console.log(`blueprintApi.getBlueprintById: Blueprint exists check passed for ${id}:`, checkResponse.data);
      
      // If this is a temporary blueprint, log that information
      if (checkResponse.data.is_temporary) {
        console.log(`blueprintApi.getBlueprintById: Blueprint ${id} is marked as temporary`);
      }
      
      // If authenticated, check if this blueprint belongs to the current user
      if (isAuthenticated && checkResponse.data.user_id) {
        const isMine = checkResponse.data.user_id === authData.session?.user.id;
        console.log(`blueprintApi.getBlueprintById: Blueprint belongs to current user: ${isMine}`);
      }
      
      // Now fetch the full blueprint data
      const response = await supabase
        .from('blueprints')
        .select(`
          *,
          steps:blueprint_steps(*)
        `)
        .eq('id', id)
        .single();

      if (response.error) {
        console.error(`blueprintApi.getBlueprintById: Error fetching full blueprint ${id}:`, 
          JSON.stringify(response.error));
        return response;
      } 
      
      if (response.data) {
        console.log(`blueprintApi.getBlueprintById: Successfully retrieved full blueprint data`);
      } else {
        console.warn(`blueprintApi.getBlueprintById: No data returned for blueprint ${id}`);
      }

      return response;
    } catch (error) {
      console.error(`blueprintApi.getBlueprintById: Exception when fetching blueprint ${id}:`, error);
      return { 
        data: null, 
        error: error instanceof Error 
          ? { message: error.message, name: error.name } 
          : { message: 'Unknown error' } 
      };
    }
  },

  async createBlueprint(data: BlueprintInput) {
    try {
      console.log('Creating blueprint with input:', JSON.stringify({
        title: data.title,
        type: data.is_temporary ? 'temporary' : 'permanent',
        userId: data.user_id
      }));
      
      // Cast data to unknown then to any to allow dynamic properties - this is a temporary solution
      // because we're in a migration period with both old and new field names
      const dataWithMappings = {
        title: data.title,
        details: data.description, // Map description to details for clarity
        search_query: data.search_query,
        content: data.content,
        prompt: data.prompt,
        is_temporary: data.is_temporary || false,
        user_id: data.user_id,
        visibility: data.visibility || 'private',
        team_id: data.team_id || null,
        workspace_id: data.workspace_id || null,
        
        // Use new field names if provided, otherwise use old ones
        skill_level: data.skill_level || null,
        user_skill_level: data.user_skill_level || data.skill_level || null,
        
        // For learning objective, prefer the new field name if available
        learning_objective: data.learning_objective || null,
        blueprint_learning_focus: data.blueprint_learning_focus || data.learning_objective || null,
        
        complexity: data.complexity || null,
        estimated_time: data.estimated_time || null,
      };

      const supabase = createClientSupabase();
      const { data: blueprint, error } = await supabase
        .from('blueprints')
        .insert([dataWithMappings])
        .select()
        .single();

      if (error) {
        console.error('Error creating blueprint:', error);
        throw error;
      }

      return blueprint;
    } catch (err) {
      console.error('Exception during blueprint creation:', err);
      throw err;
    }
  },

  async updateBlueprint(id: string, data: Partial<BlueprintInput>) {
    try {
      console.log(`Updating blueprint ${id} with data keys:`, Object.keys(data).join(', '));
      
      // Define a more complete type for database fields including both old and new names
      interface BlueprintUpdateData extends Partial<BlueprintInput> {
        details?: string;
      }
      
      // Prepare update data with mapped fields
      const updateData: BlueprintUpdateData = { ...data };
      
      // Map fields appropriately
      if (data.description) {
        updateData.details = data.description;
      }
      
      // Make sure new field names are populated from old ones (for backward compatibility)
      if (data.skill_level && !data.user_skill_level) {
        updateData.user_skill_level = data.skill_level;
      }
      
      if (data.learning_objective && !data.blueprint_learning_focus) {
        updateData.blueprint_learning_focus = data.learning_objective;
      }
      
      const supabase = createClientSupabase();
      const { data: blueprint, error } = await supabase
        .from('blueprints')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Error updating blueprint ${id}:`, error);
        throw error;
      }

      return blueprint;
    } catch (err) {
      console.error(`Exception during blueprint update for ${id}:`, err);
      throw err;
    }
  },

  async deleteBlueprint(id: string) {
    try {
      console.log(`Deleting blueprint with ID: ${id}`);
      const supabase = createClientSupabase();
      
      // Try client-side deletion first - check for workspace recursion issues
      try {
        // First attempt: try to delete steps
        console.log(`Attempting to delete steps for blueprint ${id}`);
        try {
          await supabase
            .from('blueprint_steps')
            .delete()
            .eq('blueprint_id', id);
            
          console.log(`Successfully deleted steps for blueprint ${id}`);
        } catch (error) {
          // Just log the error and continue - we'll try blueprint deletion anyway
          console.log(`Step deletion failed, but continuing: ${error instanceof Error ? error.message : 'Unknown step error'}`);
        }
        
        // Now try to delete the blueprint
        console.log(`Attempting to delete blueprint ${id}`);
        const { data, error } = await supabase
          .from('blueprints')
          .delete()
          .eq('id', id)
          .select()
          .maybeSingle();
          
        if (error) {
          console.log(`Error deleting blueprint ${id}:`, error);
          // Check for any RLS or other errors and fall back to API endpoint
          throw error;
        }
        
        console.log(`Successfully deleted blueprint ${id} via client-side operation`);
        return { success: true, data };
      } catch (clientError) {
        // If any error occurs, use the API endpoint which has better error handling
        console.log(`Client-side deletion failed for ${id}, falling back to API endpoint`);
        console.log(`Error details: ${clientError instanceof Error ? clientError.message : 'Unknown error'}`);
        
        try {
          const response = await fetch(`/api/blueprints/${id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-Bypass-Recursion': 'true' // Signal to the API that we need to bypass recursion
            }
          });
          
          // Check if response is available before trying to parse JSON
          if (!response.ok) {
            console.log(`API deletion failed for ${id} with status ${response.status}`);
            
            try {
              const responseData = await response.json();
              console.log(`API error details:`, responseData);
              return { 
                success: false, 
                error: responseData.error || `HTTP error ${response.status}`
              };
            } catch (_) {
              // If JSON parsing fails, return a simpler error
              return { 
                success: false, 
                error: `API call failed with status ${response.status}`
              };
            }
          }
          
          try {
            const responseData = await response.json();
            console.log(`Successfully deleted blueprint ${id} via API endpoint`);
            return { 
              success: true, 
              data: responseData.data || responseData 
            };
          } catch (_) {
            // If response was OK but JSON parsing fails, still consider it a success
            console.log(`Successfully deleted blueprint ${id} via API endpoint (response parse error)`);
            return { success: true };
          }
        } catch (apiError) {
          // Handle any network or fetch errors
          console.log(`API request error for ${id}:`, apiError);
          return { 
            success: false, 
            error: apiError instanceof Error ? apiError.message : 'API request failed'
          };
        }
      }
    } catch (error) {
      // Final fallback for any unexpected errors
      console.log(`Fatal exception in deleteBlueprint for ${id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete blueprint'
      };
    }
  },

  // Blueprint Steps
  async getBlueprintSteps(blueprintId: string) {
    const supabase = createClientSupabase();
    return await supabase
      .from('blueprint_steps')
      .select(`
        *,
        subtasks:blueprint_subtasks(*)
      `)
      .eq('blueprint_id', blueprintId)
      .order('number', { ascending: true });
  },

  async createBlueprintStep(data: BlueprintStepInput) {
    const supabase = createClientSupabase();
    return await supabase
      .from('blueprint_steps')
      .insert({
        blueprint_id: data.blueprint_id,
        number: data.number,
        title: data.title,
        estimated_time: data.estimated_time || null,
        instructions: data.instructions || [],
        tools: data.tools || [],
        status: data.status || 'not_started',
      })
      .select()
      .single();
  },

  async updateBlueprintStep(id: string, data: Partial<BlueprintStepInput>) {
    const supabase = createClientSupabase();
    return await supabase
      .from('blueprint_steps')
      .update(data)
      .eq('id', id)
      .select()
      .single();
  },

  async updateStepStatus(id: string, status: StepStatusType) {
    const supabase = createClientSupabase();
    return await supabase
      .from('blueprint_steps')
      .update({ status })
      .eq('id', id);
  },

  // Blueprint Subtasks
  async createBlueprintSubtask(data: BlueprintSubtaskInput) {
    const supabase = createClientSupabase();
    return await supabase
      .from('blueprint_subtasks')
      .insert({
        step_id: data.step_id,
        task_number: data.task_number,
        description: data.description,
        status: data.status || 'not_started',
        estimated_time: data.estimated_time || null,
      })
      .select()
      .single();
  },

  async updateSubtaskStatus(id: string, status: StepStatusType) {
    const supabase = createClientSupabase();
    return await supabase
      .from('blueprint_subtasks')
      .update({ status })
      .eq('id', id);
  },

  // Blueprint Comments
  async getBlueprintComments(blueprintId: string) {
    const supabase = createClientSupabase();
    return await supabase
      .from('blueprint_comments')
      .select(`
        *,
        users(id, first_name, last_name, email)
      `)
      .eq('blueprint_id', blueprintId)
      .order('created_at', { ascending: false });
  },

  async createBlueprintComment(data: BlueprintCommentInput) {
    const supabase = createClientSupabase();
    return await supabase
      .from('blueprint_comments')
      .insert({
        blueprint_id: data.blueprint_id,
        step_id: data.step_id || null,
        content: data.content,
      })
      .select()
      .single();
  },

  // Reasoning Sessions
  async createReasoningSession(data: ReasoningSessionInput) {
    const supabase = createClientSupabase();
    return await supabase
      .from('reasoning_sessions')
      .insert({
        blueprint_id: data.blueprint_id,
        context: data.context || null,
        skill_level: data.skill_level || null,
        learning_objective: data.learning_objective || null,
      })
      .select()
      .single();
  },

  async getReasoningSession(sessionId: string) {
    const supabase = createClientSupabase();
    return await supabase
      .from('reasoning_sessions')
      .select(`
        *,
        messages:reasoning_messages(*)
      `)
      .eq('id', sessionId)
      .single();
  },

  // Reasoning Messages
  async createReasoningMessage(data: ReasoningMessageInput) {
    const supabase = createClientSupabase();
    return await supabase
      .from('reasoning_messages')
      .insert({
        session_id: data.session_id,
        role: data.role,
        content: data.content,
      })
      .select()
      .single();
  },

  async getReasoningMessages(sessionId: string) {
    const supabase = createClientSupabase();
    return await supabase
      .from('reasoning_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
  },

  // Realtime subscriptions
  subscribeToMessages(sessionId: string, callback: (payload: Record<string, unknown>) => void) {
    const supabase = createClientSupabase();

    return supabase
      .channel(`reasoning_messages:session_id=eq.${sessionId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reasoning_messages',
          filter: `session_id=eq.${sessionId}`
        },
        callback
      )
      .subscribe();
  },

  subscribeToStepChanges(blueprintId: string, callback: (payload: Record<string, unknown>) => void) {
    const supabase = createClientSupabase();

    return supabase
      .channel(`blueprint_steps:blueprint_id=eq.${blueprintId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blueprint_steps',
          filter: `blueprint_id=eq.${blueprintId}`
        },
        callback
      )
      .subscribe();
  }
};

// Server-side API functions (Node.js environment with server-side admin privileges)
export const serverBlueprintApi = {
  async migrateBlueprint() {
    const supabase = createStandardServerClient();
    // This is a server-side only operation that would call the migration function
    return await supabase.rpc('migrate_blueprint_content');
  },

  async getBlueprintWithFullDetails(id: string) {
    const supabase = createStandardServerClient();
    return await supabase
      .from('blueprints')
      .select(`
        *,
        steps:blueprint_steps(
          *,
          subtasks:blueprint_subtasks(*)
        ),
        comments:blueprint_comments(
          *,
          user:users(id, first_name, last_name, email)
        ),
        reasoning_sessions(
          *,
          messages:reasoning_messages(*)
        )
      `)
      .eq('id', id)
      .single();
  },

  // Admin function to verify blueprints
  async verifyBlueprint(id: string, isVerified: boolean = true) {
    const supabase = createStandardServerClient();
    return await supabase
      .from('blueprints')
      .update({ is_verified: isVerified })
      .eq('id', id);
  }
}; 