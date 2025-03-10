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
  skill_level?: SkillLevelType;
  learning_objective?: string;
  complexity?: ComplexityType;
  estimated_time?: string;
  prompt?: string;
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
  async getBlueprints() {
    const supabase = createClientSupabase();
    return await supabase
      .from('blueprints')
      .select('*')
      .order('created_at', { ascending: false });
  },

  async getBlueprintById(id: string) {
    const supabase = createClientSupabase();
    return await supabase
      .from('blueprints')
      .select(`
        *,
        steps:blueprint_steps(*)
      `)
      .eq('id', id)
      .single();
  },

  async createBlueprint(data: BlueprintInput) {
    const supabase = createClientSupabase();
    return await supabase
      .from('blueprints')
      .insert({
        title: data.title,
        description: data.description || null,
        content: data.content,
        search_query: data.search_query || null,
        visibility: data.visibility || 'private',
        team_id: data.team_id || null,
        skill_level: data.skill_level || null,
        learning_objective: data.learning_objective || null,
        complexity: data.complexity || null,
        estimated_time: data.estimated_time || null,
        prompt: data.prompt || null,
        status: 'draft',
        is_verified: false,
      })
      .select('id')
      .single();
  },

  async updateBlueprint(id: string, data: Partial<BlueprintInput>) {
    const supabase = createClientSupabase();
    return await supabase
      .from('blueprints')
      .update(data)
      .eq('id', id)
      .select()
      .single();
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